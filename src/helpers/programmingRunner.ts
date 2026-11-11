import vm from "vm";
import ts from "typescript";
import axios from "axios";
import { execFile, execFileSync, spawn, type ChildProcess } from "child_process";
import { randomUUID } from "crypto";
import { readFileSync, promises as fs } from "fs";
import os from "os";
import path from "path";

// A programming exercise is validated by evaluating one boolean expression in
// the same sandbox as the submitted function. The expression calls the
// function, e.g. "max([7,9,4]) == 9 && max([3,2,1]) == 3".
export interface ProgrammingValidationResult {
  passed: boolean;
  // The boolean expression that was checked.
  expression?: string;
  // The formatted value the expression evaluated to.
  actual?: string;
  error?: string;
}

export interface RunProgrammingExerciseOptions {
  language: string;
  // The code submitted by the student.
  code: string;
  // The stored solution/signature of the exercise. It determines the function
  // name that must exist in the submitted code.
  solution: string;
  // The boolean expression entered by the exercise author. For Prolog it is
  // a goal that must succeed instead.
  expression: string;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 1000;
const DEFAULT_LEAN_TIMEOUT_MS = 15000;
const LEAN_FILE_NAME = "amen.lean";
const DEFAULT_PYTHON_TIMEOUT_MS = 5000;
const DEFAULT_PYTHON_MEMORY_MB = 64;
const DEFAULT_PYTHON_CPU_SECONDS = 2;
const DEFAULT_PYTHON_MAX_OUTPUT_BYTES = 1024 * 1024;
const PYTHON_FILE_NAME = "runner.py";
const PYTHON_MAX_PROCESSES = 16;
const PYTHON_MAX_OPEN_FILES = 32;
const PYTHON_MAX_FILE_SIZE_BYTES = 1024 * 1024;
const PYTHON_MAX_CONCURRENT = positiveIntegerFromEnv("PYTHON_MAX_CONCURRENT", 2);
const PYTHON_MAX_QUEUE = positiveIntegerFromEnv("PYTHON_MAX_QUEUE", 10);
const DEFAULT_JAVA_TIMEOUT_MS = 5000;
const DEFAULT_JAVA_COMPILE_TIMEOUT_MS = 15000;
const DEFAULT_JAVA_MEMORY_MB = 128;
const DEFAULT_JAVA_MAX_OUTPUT_BYTES = 1024 * 1024;
const JAVA_FILE_NAME = "Main.java";
const JAVA_CLASS_NAME = "Main";
const JAVA_MAX_CONCURRENT = positiveIntegerFromEnv("JAVA_MAX_CONCURRENT", 1);
const JAVA_MAX_QUEUE = positiveIntegerFromEnv("JAVA_MAX_QUEUE", 10);
const DEFAULT_RACKET_TIMEOUT_MS = 10000;
const DEFAULT_ONLINE_COMPILER_API_URL =
  "https://api.onlinecompiler.io/api/run-code-sync/";
const DEFAULT_RACKET_COMPILER = "racket-9.3";
const RACKET_MAX_CONCURRENT = positiveIntegerFromEnv("RACKET_MAX_CONCURRENT", 1);
const RACKET_MAX_QUEUE = positiveIntegerFromEnv("RACKET_MAX_QUEUE", 10);
const DEFAULT_PROLOG_TIMEOUT_MS = 10000;
const DEFAULT_PROLOG_COMPILER = "swipl-10";
const PROLOG_MAX_CONCURRENT = positiveIntegerFromEnv("PROLOG_MAX_CONCURRENT", 1);
const PROLOG_MAX_QUEUE = positiveIntegerFromEnv("PROLOG_MAX_QUEUE", 10);

let activePythonRuns = 0;
const pythonQueue: Array<() => void> = [];
let activeJavaRuns = 0;
const javaQueue: Array<() => void> = [];
let activeRacketRuns = 0;
const racketQueue: Array<() => void> = [];
let activePrologRuns = 0;
const prologQueue: Array<() => void> = [];

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

// Lean 4 is a local executable. LEAN_BIN wins; otherwise Lean must be on the
// PATH of the server process.
export function resolveLeanBinary(): string {
  return process.env.LEAN_BIN || "lean";
}

export function isLeanAvailable(): boolean {
  try {
    execFileSync(resolveLeanBinary(), ["--version"], {
      stdio: "ignore",
      timeout: 5000,
    });
    return true;
  } catch {
    return false;
  }
}

// Python runs locally. PYTHON_BIN wins; otherwise use the usual executable
// name for the current platform.
export function resolvePythonBinary(): string {
  return process.env.PYTHON_BIN || (process.platform === "win32" ? "python" : "python3");
}

export function isPythonAvailable(): boolean {
  try {
    execFileSync(resolvePythonBinary(), ["--version"], {
      stdio: "ignore",
      timeout: 5000,
    });
    return true;
  } catch {
    return false;
  }
}

function javaExecutable(name: string): string {
  const explicit = name === "java" ? process.env.JAVA_BIN : process.env.JAVAC_BIN;
  if (explicit) return explicit;
  const home = process.env.JAVA_HOME;
  if (home) {
    const fileName = process.platform === "win32" ? `${name}.exe` : name;
    return path.join(home, "bin", fileName);
  }
  return name;
}

// Java runs locally. JAVA_BIN/JAVAC_BIN win; otherwise JAVA_HOME/bin or the
// usual executable names on the PATH are used.
export function resolveJavaBinary(): string {
  return javaExecutable("java");
}

export function resolveJavacBinary(): string {
  return javaExecutable("javac");
}

export function isJavaAvailable(): boolean {
  try {
    execFileSync(resolveJavacBinary(), ["-version"], {
      stdio: "ignore",
      timeout: 5000,
    });
    execFileSync(resolveJavaBinary(), ["-version"], {
      stdio: "ignore",
      timeout: 5000,
    });
    return true;
  } catch {
    return false;
  }
}

// Racket and Prolog exercises run through the OnlineCompiler.io API. The key
// is hardcoded per the owner's instruction and never sent to the browser. A
// local, gitignored key file is kept as a commented-out fallback so
// development setups could use extra config.
export function resolveRacketKeyFile(): string {
  const explicit = (process.env.RACKET_LOCAL_KEY_FILE ?? "").trim();
  return explicit || path.resolve("racket-key.local.json");
}

function racketApiKeyFromFile(): string {
  try {
    const raw = readFileSync(resolveRacketKeyFile(), "utf8");
    const parsed = JSON.parse(raw) as { apiKey?: unknown };
    return typeof parsed.apiKey === "string" ? parsed.apiKey.trim() : "";
  } catch {
    return "";
  }
}

// The OnlineCompiler.io API key works for every language the service offers
// (Racket, Prolog, ...). It stays hardcoded in the code.
export function onlineCompilerApiKey(): string {
  return "1c5ec8f544da441cd4144da3b1c5d385";
}

export function racketApiKey(): string {
  return onlineCompilerApiKey();
  //return (process.env.RACKET_API_KEY ?? "").trim() || racketApiKeyFromFile();
}

export function prologApiKey(): string {
  return onlineCompilerApiKey();
  //return (process.env.PROLOG_API_KEY ?? "").trim();
}

export function resolveRacketApiUrl(): string {
  return (process.env.RACKET_API_URL ?? "").trim() || DEFAULT_ONLINE_COMPILER_API_URL;
}

export function resolveRacketCompiler(): string {
  return (process.env.RACKET_COMPILER ?? "").trim() || DEFAULT_RACKET_COMPILER;
}

export function isRacketAvailable(): boolean {
  return racketApiKey() !== "";
}

export function resolvePrologApiUrl(): string {
  return (process.env.PROLOG_API_URL ?? "").trim() || DEFAULT_ONLINE_COMPILER_API_URL;
}

export function resolvePrologCompiler(): string {
  return (process.env.PROLOG_COMPILER ?? "").trim() || DEFAULT_PROLOG_COMPILER;
}

export function isPrologAvailable(): boolean {
  return prologApiKey() !== "";
}

function positiveIntegerFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function releasePythonSlot(): void {
  activePythonRuns = Math.max(0, activePythonRuns - 1);
  const next = pythonQueue.shift();
  if (next) next();
}

function acquirePythonSlot(): Promise<(() => void) | null> {
  if (activePythonRuns < PYTHON_MAX_CONCURRENT) {
    activePythonRuns++;
    return Promise.resolve(releasePythonSlot);
  }
  if (pythonQueue.length >= PYTHON_MAX_QUEUE) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    pythonQueue.push(() => {
      activePythonRuns++;
      resolve(releasePythonSlot);
    });
  });
}

function releaseJavaSlot(): void {
  activeJavaRuns = Math.max(0, activeJavaRuns - 1);
  const next = javaQueue.shift();
  if (next) next();
}

function acquireJavaSlot(): Promise<(() => void) | null> {
  if (activeJavaRuns < JAVA_MAX_CONCURRENT) {
    activeJavaRuns++;
    return Promise.resolve(releaseJavaSlot);
  }
  if (javaQueue.length >= JAVA_MAX_QUEUE) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    javaQueue.push(() => {
      activeJavaRuns++;
      resolve(releaseJavaSlot);
    });
  });
}

function releaseRacketSlot(): void {
  activeRacketRuns = Math.max(0, activeRacketRuns - 1);
  const next = racketQueue.shift();
  if (next) next();
}

function acquireRacketSlot(): Promise<(() => void) | null> {
  if (activeRacketRuns < RACKET_MAX_CONCURRENT) {
    activeRacketRuns++;
    return Promise.resolve(releaseRacketSlot);
  }
  if (racketQueue.length >= RACKET_MAX_QUEUE) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    racketQueue.push(() => {
      activeRacketRuns++;
      resolve(releaseRacketSlot);
    });
  });
}

function releasePrologSlot(): void {
  activePrologRuns = Math.max(0, activePrologRuns - 1);
  const next = prologQueue.shift();
  if (next) next();
}

function acquirePrologSlot(): Promise<(() => void) | null> {
  if (activePrologRuns < PROLOG_MAX_CONCURRENT) {
    activePrologRuns++;
    return Promise.resolve(releasePrologSlot);
  }
  if (prologQueue.length >= PROLOG_MAX_QUEUE) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    prologQueue.push(() => {
      activePrologRuns++;
      resolve(releasePrologSlot);
    });
  });
}

interface ProcessRunResult {
  stdout: string;
  stderr: string;
  code: number | null;
  signal: NodeJS.Signals | null;
  timedOut: boolean;
  outputLimitExceeded: boolean;
  spawnError?: unknown;
}

function killProcessTree(child: ChildProcess): void {
  const pid = child.pid;
  if (!pid) return;

  if (process.platform === "win32") {
    const killer = spawn("taskkill", ["/pid", String(pid), "/T", "/F"], {
      windowsHide: true,
      stdio: "ignore",
    });
    killer.on("error", () => {
      try {
        child.kill();
      } catch {
        // The process may already have exited.
      }
    });
    return;
  }

  // detached: true makes the child the leader of its own process group.
  try {
    process.kill(-pid, "SIGKILL");
  } catch {
    try {
      child.kill("SIGKILL");
    } catch {
      // The process may already have exited.
    }
  }
}

function runProcessWithLimits(
  command: string,
  args: string[],
  options: {
    cwd: string;
    env: NodeJS.ProcessEnv;
    timeoutMs: number;
    maxOutputBytes?: number;
  },
): Promise<ProcessRunResult> {
  const maxOutputBytes = options.maxOutputBytes ?? DEFAULT_PYTHON_MAX_OUTPUT_BYTES;

  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let outputLimitExceeded = false;
    let settled = false;
    let timer: NodeJS.Timeout | undefined;

    const finish = (
      code: number | null,
      signal: NodeJS.Signals | null,
      spawnError?: unknown,
    ): void => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve({
        stdout,
        stderr,
        code,
        signal,
        timedOut,
        outputLimitExceeded,
        spawnError,
      });
    };

    let child: ChildProcess;
    try {
      child = spawn(command, args, {
        cwd: options.cwd,
        env: options.env,
        windowsHide: true,
        detached: process.platform !== "win32",
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (error) {
      finish(null, null, error);
      return;
    }

    timer = setTimeout(() => {
      timedOut = true;
      killProcessTree(child);
    }, options.timeoutMs);

    child.stdout?.on("data", (chunk: Buffer) => {
      if (outputLimitExceeded) return;
      if (Buffer.byteLength(stdout) + chunk.length > maxOutputBytes) {
        outputLimitExceeded = true;
        killProcessTree(child);
        return;
      }
      stdout += chunk.toString("utf8");
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      if (outputLimitExceeded) return;
      if (Buffer.byteLength(stderr) + chunk.length > maxOutputBytes) {
        outputLimitExceeded = true;
        killProcessTree(child);
        return;
      }
      stderr += chunk.toString("utf8");
    });
    child.on("error", (error) => finish(null, null, error));
    child.on("close", (code, signal) => finish(code, signal));
  });
}

// Finds the matching closing bracket while ignoring brackets inside strings,
// template literals and comments.
function findMatchingDelimiter(
  text: string,
  openIndex: number,
  openChar: string,
  closeChar: string,
): number {
  let depth = 0;
  let quote: string | null = null;
  let inLineComment = false;
  let inBlockComment = false;
  let escaped = false;

  for (let i = openIndex; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inLineComment) {
      if (char === "\n") inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (char === "*" && next === "/") {
        inBlockComment = false;
        i++;
      }
      continue;
    }
    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === quote) quote = null;
      continue;
    }

    if (char === "/" && next === "/") {
      inLineComment = true;
      i++;
      continue;
    }
    if (char === "/" && next === "*") {
      inBlockComment = true;
      i++;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }

    if (char === openChar) depth++;
    if (char === closeChar) {
      depth--;
      if (depth === 0) return i;
    }
  }

  return -1;
}

// Splits a parameter list at commas that are not nested in brackets, braces or
// strings.
function splitParameters(parameters: string): string[] {
  const result: string[] = [];
  let start = 0;
  let round = 0;
  let square = 0;
  let curly = 0;
  let quote: string | null = null;
  let escaped = false;

  for (let i = 0; i < parameters.length; i++) {
    const char = parameters[i];
    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "(") round++;
    else if (char === ")") round--;
    else if (char === "[") square++;
    else if (char === "]") square--;
    else if (char === "{") curly++;
    else if (char === "}") curly--;
    else if (char === "," && round === 0 && square === 0 && curly === 0) {
      result.push(parameters.slice(start, i).trim());
      start = i + 1;
    }
  }

  const last = parameters.slice(start).trim();
  if (last) result.push(last);
  return result;
}

// Removes a TypeScript type annotation or a default value from one parameter.
function parameterLabel(parameter: string): string {
  let text = parameter.trim();
  text = text.replace(/^(public|private|protected|readonly)\s+/, "");
  if (text.startsWith("...")) text = text.slice(3).trim();

  let round = 0;
  let square = 0;
  let curly = 0;
  let quote: string | null = null;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "(") round++;
    else if (char === ")") round--;
    else if (char === "[") square++;
    else if (char === "]") square--;
    else if (char === "{") curly++;
    else if (char === "}") curly--;
    else if ((char === ":" || char === "=") && round === 0 && square === 0 && curly === 0) {
      return text.slice(0, i).trim().replace(/\?$/, "");
    }
  }

  return text.replace(/\?$/, "");
}

export function extractParameterNames(code: string): string[] {
  const signature = extractFunctionSignature(code);
  if (!signature) return [];
  return splitParameters(signature.parameters)
    .map(parameterLabel)
    .filter((name) => name !== "");
}

export interface FunctionSignature {
  name: string;
  parameters: string;
  // Index of the opening brace of the function body, or -1 when the body is
  // missing.
  bodyStart: number;
}

export function extractFunctionSignature(code: string): FunctionSignature | null {
  const match = code.match(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/);
  if (!match || match.index === undefined) return null;

  const name = match[1];
  const openParen = match.index + match[0].length - 1;
  const closeParen = findMatchingDelimiter(code, openParen, "(", ")");
  if (closeParen === -1) return null;

  const parameters = code.slice(openParen + 1, closeParen);
  let bodyStart = -1;
  for (let i = closeParen + 1; i < code.length; i++) {
    if (code[i] === "{") {
      bodyStart = i;
      break;
    }
    if (code[i] === ";" || code[i] === "=") break;
  }

  return { name, parameters, bodyStart };
}

export function extractFunctionName(code: string): string | null {
  return extractFunctionSignature(code)?.name ?? null;
}

// The text shown in the editor before the student starts: the correct function
// signature followed by an empty body.
export function functionSignatureSkeleton(code: string): string {
  const signature = extractFunctionSignature(code);
  if (!signature) return "";
  const header =
    signature.bodyStart === -1
      ? code.trim()
      : code.slice(0, signature.bodyStart).trimEnd();
  return `${header} {\n  \n}`;
}

export function formatValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === undefined) return "undefined";
  if (typeof value === "number" && !Number.isFinite(value)) return String(value);
  if (typeof value === "bigint") return value.toString();
  try {
    const json = JSON.stringify(value);
    return json === undefined ? String(value) : json;
  } catch {
    return String(value);
  }
}

function compileTypeScript(code: string): { code?: string; error?: string } {
  const result = ts.transpileModule(code, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      strict: false,
      esModuleInterop: true,
    },
    fileName: "exercise.ts",
    reportDiagnostics: true,
  });

  const diagnostics = result.diagnostics ?? [];
  if (diagnostics.length > 0) {
    const messages = diagnostics.map((diagnostic) =>
      ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
    );
    return { error: messages.join("\n") };
  }

  return { code: result.outputText };
}

function leanErrorMessage(error: unknown): string {
  const candidate = error as NodeJS.ErrnoException & { killed?: boolean };
  if (candidate.code === "ENOENT") {
    return `Lean 4 executable "${resolveLeanBinary()}" was not found. Make sure it is on the PATH of the server process or set LEAN_BIN in the service environment.`;
  }
  if (candidate.killed) {
    return "Lean compilation timed out.";
  }
  return errorMessage(error);
}

// Lean exercises are validated by compiling the submitted code together with
// the stored test declarations. Lean prints nothing when the file is accepted,
// so any output (including warnings) means the exercise is not solved.
async function runLeanExercise(
  options: RunProgrammingExerciseOptions,
  expression: string,
): Promise<ProgrammingValidationResult> {
  const timeout = options.timeoutMs ?? DEFAULT_LEAN_TIMEOUT_MS;
  const source = `${options.code.trimEnd()}\n\n${expression}\n`;
  let directory = "";

  try {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), "lean-exercise-"));
    await fs.writeFile(path.join(directory, LEAN_FILE_NAME), source, "utf8");

    const output = await new Promise<string>((resolve) => {
      execFile(
        resolveLeanBinary(),
        [LEAN_FILE_NAME],
        {
          cwd: directory,
          timeout,
          windowsHide: true,
          maxBuffer: 1024 * 1024,
        },
        (error, stdout, stderr) => {
          const combined = `${stdout}${stderr}`.trim();
          if (combined) {
            resolve(combined);
          } else if (error) {
            resolve(leanErrorMessage(error));
          } else {
            resolve("");
          }
        },
      );
    });

    if (output) {
      return { passed: false, expression, error: output };
    }
    return { passed: true, expression };
  } catch (error) {
    return { passed: false, expression, error: leanErrorMessage(error) };
  } finally {
    if (directory) {
      await fs.rm(directory, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}

function pythonEnvironment(directory: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  // Do not pass the server's environment to untrusted code. In particular, it
  // must not see database credentials or mail API secrets.
  for (const key of [
    "PATH",
    "PATHEXT",
    "SYSTEMROOT",
    "WINDIR",
    "COMSPEC",
    "LANG",
    "LC_ALL",
  ]) {
    const value = process.env[key];
    if (value !== undefined) env[key] = value;
  }

  env.HOME = directory;
  env.USERPROFILE = directory;
  env.TMP = directory;
  env.TEMP = directory;
  env.TMPDIR = directory;
  env.PYTHONIOENCODING = "utf-8";
  env.PYTHONDONTWRITEBYTECODE = "1";
  env.PYTHONNOUSERSITE = "1";
  env.LANG = "C.UTF-8";
  env.LC_ALL = "C.UTF-8";
  return env;
}

function buildPythonHarness(
  code: string,
  expression: string,
  passMarker: string,
  failMarker: string,
  limits: {
    cpuSeconds: number;
    memoryBytes: number;
    maxProcesses: number;
    maxOpenFiles: number;
    maxFileSizeBytes: number;
  },
): string {
  return `import os
import sys
import traceback

try:
    import resource
except ImportError:
    resource = None

def __fl_limit(kind, value):
    if resource is None:
        return
    try:
        soft, hard = resource.getrlimit(kind)
        if hard != resource.RLIM_INFINITY:
            value = min(value, hard)
        resource.setrlimit(kind, (value, value))
    except Exception:
        pass

if resource is not None:
    __fl_limit(resource.RLIMIT_CPU, ${limits.cpuSeconds})
    __fl_limit(resource.RLIMIT_AS, ${limits.memoryBytes})
    __fl_limit(resource.RLIMIT_FSIZE, ${limits.maxFileSizeBytes})
    __fl_limit(resource.RLIMIT_NOFILE, ${limits.maxOpenFiles})
    __fl_limit(resource.RLIMIT_CORE, 0)
    if hasattr(resource, "RLIMIT_NPROC"):
        __fl_limit(resource.RLIMIT_NPROC, ${limits.maxProcesses})

__fl_cwd = os.path.realpath(os.getcwd())
__fl_harness_path = os.path.realpath("runner.py")
__fl_allowed_roots = []
for __fl_root in (sys.prefix, sys.base_prefix, sys.exec_prefix, *sys.path):
    if not __fl_root:
        continue
    try:
        __fl_root = os.path.realpath(__fl_root)
        if __fl_root != __fl_cwd:
            __fl_allowed_roots.append(__fl_root)
    except Exception:
        pass
__fl_system_root = os.environ.get("SYSTEMROOT") or os.environ.get("WINDIR")
if __fl_system_root:
    __fl_allowed_roots.append(os.path.realpath(__fl_system_root))
if os.name == "posix":
    __fl_allowed_roots.append(os.path.realpath("/etc/localtime"))
__fl_allowed_roots = tuple(set(__fl_allowed_roots))

__fl_realpath = os.path.realpath
__fl_fsdecode = os.fsdecode
__fl_sep = os.sep
__fl_write_flags = os.O_WRONLY | os.O_RDWR | os.O_CREAT | os.O_TRUNC | os.O_APPEND
__fl_isinstance = isinstance
__fl_any = any
__fl_len = len
__fl_str = str
__fl_bytes = bytes
__fl_int = int
__fl_PermissionError = PermissionError

def __fl_audit(event, args):
    blocked_events = (
        "subprocess.Popen",
        "os.system",
        "os.exec",
        "os.posix_spawn",
        "os.spawn",
        "os.fork",
        "os.forkpty",
        "os.kill",
        "os.remove",
        "os.rename",
        "os.rmdir",
        "os.mkdir",
        "os.chmod",
        "os.chown",
        "os.link",
        "os.symlink",
        "os.truncate",
        "ctypes.dlopen",
        "ctypes.dlsym",
        "ctypes.call_function",
    )
    if event in blocked_events or event.startswith("socket."):
        raise __fl_PermissionError("This operation is not allowed in programming exercises.")
    if event == "open":
        path = args[0] if __fl_len(args) > 0 else ""
        mode = args[1] if __fl_len(args) > 1 else "r"
        flags = args[2] if __fl_len(args) > 2 else 0
        if __fl_isinstance(mode, __fl_str) and __fl_any(flag in mode for flag in "wax+"):
            raise __fl_PermissionError("Writing files is not allowed in programming exercises.")
        if __fl_isinstance(flags, __fl_int) and flags & __fl_write_flags:
            raise __fl_PermissionError("Writing files is not allowed in programming exercises.")
        if __fl_isinstance(path, (__fl_str, __fl_bytes)):
            try:
                resolved = __fl_realpath(__fl_fsdecode(path))
            except Exception:
                resolved = __fl_fsdecode(path)
            if resolved == __fl_harness_path or not __fl_any(
                resolved == root or resolved.startswith(root + __fl_sep)
                for root in __fl_allowed_roots
            ):
                raise __fl_PermissionError("Reading this file is not allowed in programming exercises.")

sys.addaudithook(__fl_audit)

__fl_compile = compile
__fl_exec = exec
__fl_eval = eval
__fl_bool = bool
__fl_print = print
__fl_SystemExit = SystemExit

__fl_namespace = {"__name__": "__main__", "__file__": "exercise.py"}
__fl_code = ${JSON.stringify(code)}
__fl_expression = ${JSON.stringify(expression)}
try:
    __fl_exec(__fl_compile(__fl_code, "exercise.py", "exec"), __fl_namespace, __fl_namespace)
    __fl_result = __fl_bool(__fl_eval(__fl_expression, __fl_namespace, __fl_namespace))
except BaseException:
    traceback.print_exc()
    raise __fl_SystemExit(2)

if __fl_result:
    __fl_print(${JSON.stringify(passMarker)})
    raise __fl_SystemExit(0)

__fl_print(${JSON.stringify(failMarker)})
raise __fl_SystemExit(1)
`;
}

function pythonErrorMessage(error: unknown): string {
  const candidate = error as NodeJS.ErrnoException & { killed?: boolean };
  if (candidate.code === "ENOENT") {
    return `Python executable "${resolvePythonBinary()}" was not found. Make sure Python is installed on the server or set PYTHON_BIN in the service environment.`;
  }
  if (candidate.killed) {
    return "Python execution timed out.";
  }
  return errorMessage(error);
}

async function runPythonExercise(
  options: RunProgrammingExerciseOptions,
  expression: string,
): Promise<ProgrammingValidationResult> {
  const timeout = options.timeoutMs ?? positiveIntegerFromEnv(
    "PYTHON_TIMEOUT_MS",
    DEFAULT_PYTHON_TIMEOUT_MS,
  );
  const memoryMb = positiveIntegerFromEnv("PYTHON_MEMORY_MB", DEFAULT_PYTHON_MEMORY_MB);
  const cpuSeconds = positiveIntegerFromEnv("PYTHON_CPU_SECONDS", DEFAULT_PYTHON_CPU_SECONDS);
  const passMarker = `__FL_PYTHON_PASS_${randomUUID()}__`;
  const failMarker = `__FL_PYTHON_FAIL_${randomUUID()}__`;
  const harness = buildPythonHarness(options.code, expression, passMarker, failMarker, {
    cpuSeconds,
    memoryBytes: memoryMb * 1024 * 1024,
    maxProcesses: PYTHON_MAX_PROCESSES,
    maxOpenFiles: PYTHON_MAX_OPEN_FILES,
    maxFileSizeBytes: PYTHON_MAX_FILE_SIZE_BYTES,
  });
  const releaseSlot = await acquirePythonSlot();
  if (!releaseSlot) {
    return {
      passed: false,
      expression,
      error: "Too many Python exercises are being validated right now. Please try again in a moment.",
    };
  }
  let directory = "";

  try {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), "python-exercise-"));
    await fs.writeFile(path.join(directory, PYTHON_FILE_NAME), harness, "utf8");

    const result = await runProcessWithLimits(
      resolvePythonBinary(),
      ["-I", "-B", PYTHON_FILE_NAME],
      {
        cwd: directory,
        env: pythonEnvironment(directory),
        timeoutMs: timeout,
      },
    );

    if (result.spawnError) {
      return { passed: false, expression, error: pythonErrorMessage(result.spawnError) };
    }
    if (result.stdout.includes(passMarker)) {
      return { passed: true, expression, actual: "true" };
    }
    if (result.stdout.includes(failMarker)) {
      return { passed: false, expression, actual: "false" };
    }
    if (result.timedOut) {
      return {
        passed: false,
        expression,
        error: `Python execution timed out after ${timeout} ms.`,
      };
    }
    if (result.outputLimitExceeded) {
      return {
        passed: false,
        expression,
        error: "Python produced too much output.",
      };
    }
    if (result.signal === "SIGXCPU" || result.signal === "SIGKILL") {
      return {
        passed: false,
        expression,
        error: "Python execution exceeded its CPU or time limit.",
      };
    }

    const output = [result.stderr, result.stdout]
      .filter((part) => part.trim() !== "")
      .join("\n")
      .trim();
    if (output) {
      return { passed: false, expression, error: output };
    }
    if (result.code !== 0) {
      return {
        passed: false,
        expression,
        error: `Python execution failed with exit code ${result.code ?? "unknown"}.`,
      };
    }
    return {
      passed: false,
      expression,
      error: "Python did not produce a test result.",
    };
  } catch (error) {
    return { passed: false, expression, error: pythonErrorMessage(error) };
  } finally {
    if (directory) {
      await fs.rm(directory, { recursive: true, force: true }).catch(() => undefined);
    }
    releaseSlot();
  }
}

function javaEnvironment(directory: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  // Do not pass the server's environment to untrusted code. In particular, it
  // must not see database credentials or mail API secrets.
  for (const key of [
    "PATH",
    "PATHEXT",
    "SYSTEMROOT",
    "WINDIR",
    "COMSPEC",
    "LANG",
    "LC_ALL",
    "JAVA_HOME",
    "LD_LIBRARY_PATH",
  ]) {
    const value = process.env[key];
    if (value !== undefined) env[key] = value;
  }

  env.HOME = directory;
  env.USERPROFILE = directory;
  env.TMP = directory;
  env.TEMP = directory;
  env.TMPDIR = directory;
  env.LANG = "C.UTF-8";
  env.LC_ALL = "C.UTF-8";
  return env;
}

function buildJavaSource(
  code: string,
  expression: string,
  passMarker: string,
  failMarker: string,
): string {
  return `import java.util.*;
import java.util.stream.*;
import java.util.function.*;

public class ${JAVA_CLASS_NAME} {
${code}

  public static void main(String[] args) {
    try {
      boolean __flResult = (${expression});
      System.out.println(__flResult ? ${JSON.stringify(passMarker)} : ${JSON.stringify(failMarker)});
      System.exit(__flResult ? 0 : 1);
    } catch (Throwable __flError) {
      __flError.printStackTrace();
      System.exit(2);
    }
  }
}
`;
}

function javaErrorMessage(error: unknown): string {
  const candidate = error as NodeJS.ErrnoException & { killed?: boolean };
  if (candidate.code === "ENOENT") {
    return `Java executable "${resolveJavaBinary()}" or compiler "${resolveJavacBinary()}" was not found. Make sure Java is installed on the server or set JAVA_BIN/JAVAC_BIN in the service environment.`;
  }
  if (candidate.killed) {
    return "Java execution timed out.";
  }
  return errorMessage(error);
}

async function runJavaExercise(
  options: RunProgrammingExerciseOptions,
  expression: string,
): Promise<ProgrammingValidationResult> {
  const compileTimeout = positiveIntegerFromEnv(
    "JAVA_COMPILE_TIMEOUT_MS",
    DEFAULT_JAVA_COMPILE_TIMEOUT_MS,
  );
  const runTimeout =
    options.timeoutMs ??
    positiveIntegerFromEnv("JAVA_TIMEOUT_MS", DEFAULT_JAVA_TIMEOUT_MS);
  const memoryMb = positiveIntegerFromEnv("JAVA_MEMORY_MB", DEFAULT_JAVA_MEMORY_MB);
  const testExpression = expression.replace(/;\s*$/, "").trim();
  if (!testExpression) {
    return {
      passed: false,
      expression,
      error: "The exercise has no test cases.",
    };
  }

  const passMarker = `__FL_JAVA_PASS_${randomUUID()}__`;
  const failMarker = `__FL_JAVA_FAIL_${randomUUID()}__`;
  const source = buildJavaSource(options.code, testExpression, passMarker, failMarker);
  const releaseSlot = await acquireJavaSlot();
  if (!releaseSlot) {
    return {
      passed: false,
      expression,
      error: "Too many Java exercises are being validated right now. Please try again in a moment.",
    };
  }
  let directory = "";

  try {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), "java-exercise-"));
    await fs.writeFile(path.join(directory, JAVA_FILE_NAME), source, "utf8");
    const env = javaEnvironment(directory);

    const compile = await runProcessWithLimits(
      resolveJavacBinary(),
      [
        `-J-Xmx${memoryMb}m`,
        "-encoding",
        "UTF-8",
        "-d",
        ".",
        JAVA_FILE_NAME,
      ],
      {
        cwd: directory,
        env,
        timeoutMs: compileTimeout,
        maxOutputBytes: DEFAULT_JAVA_MAX_OUTPUT_BYTES,
      },
    );

    if (compile.spawnError) {
      return { passed: false, expression, error: javaErrorMessage(compile.spawnError) };
    }
    if (compile.timedOut) {
      return {
        passed: false,
        expression,
        error: `Java compilation timed out after ${compileTimeout} ms.`,
      };
    }
    if (compile.outputLimitExceeded) {
      return {
        passed: false,
        expression,
        error: "Java compilation produced too much output.",
      };
    }
    if (compile.code !== 0) {
      const output = [compile.stderr, compile.stdout]
        .filter((part) => part.trim() !== "")
        .join("\n")
        .trim();
      return {
        passed: false,
        expression,
        error:
          output || `Java compilation failed with exit code ${compile.code ?? "unknown"}.`,
      };
    }

    const result = await runProcessWithLimits(
      resolveJavaBinary(),
      [
        `-Xmx${memoryMb}m`,
        "-XX:MaxMetaspaceSize=64m",
        "-XX:+UseSerialGC",
        "-XX:ActiveProcessorCount=1",
        `-Djava.io.tmpdir=${directory}`,
        `-Duser.home=${directory}`,
        "-Dfile.encoding=UTF-8",
        "-cp",
        ".",
        JAVA_CLASS_NAME,
      ],
      {
        cwd: directory,
        env,
        timeoutMs: runTimeout,
        maxOutputBytes: DEFAULT_JAVA_MAX_OUTPUT_BYTES,
      },
    );

    if (result.spawnError) {
      return { passed: false, expression, error: javaErrorMessage(result.spawnError) };
    }
    if (result.timedOut) {
      return {
        passed: false,
        expression,
        error: `Java execution timed out after ${runTimeout} ms.`,
      };
    }
    if (result.outputLimitExceeded) {
      return {
        passed: false,
        expression,
        error: "Java produced too much output.",
      };
    }
    if (result.stdout.includes(passMarker)) {
      return { passed: true, expression, actual: "true" };
    }
    if (result.stdout.includes(failMarker)) {
      return { passed: false, expression, actual: "false" };
    }

    const output = [result.stderr, result.stdout]
      .filter((part) => part.trim() !== "")
      .join("\n")
      .trim();
    if (output) {
      return { passed: false, expression, error: output };
    }
    if (result.code !== 0) {
      return {
        passed: false,
        expression,
        error: `Java execution failed with exit code ${result.code ?? "unknown"}.`,
      };
    }
    return {
      passed: false,
      expression,
      error: "Java did not produce a test result.",
    };
  } catch (error) {
    return { passed: false, expression, error: javaErrorMessage(error) };
  } finally {
    if (directory) {
      await fs.rm(directory, { recursive: true, force: true }).catch(() => undefined);
    }
    releaseSlot();
  }
}

export function buildRacketHarness(
  code: string,
  expression: string,
  passMarker: string,
  failMarker: string,
): string {
  return `#lang racket
${code}

(define __fl-result
  (with-handlers ([exn:fail? (lambda (__fl-error)
                               (eprintf "~a\\n" (exn-message __fl-error))
                               (exit 2))])
    ${expression}))

(if __fl-result
    (begin (displayln ${JSON.stringify(passMarker)}) (exit 0))
    (begin (displayln ${JSON.stringify(failMarker)}) (exit 1)))
`;
}

interface OnlineCompilerResponse {
  output: string;
  error: string;
  exitCode: number | null;
}

function onlineCompilerErrorText(data: unknown): string {
  if (typeof data === "string") return data.trim();
  if (!data || typeof data !== "object") return "";
  const record = data as Record<string, unknown>;
  for (const key of ["error", "message", "detail"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim() !== "") {
      return value.trim();
    }
  }
  return "";
}

function parseOnlineCompilerResponse(data: unknown): OnlineCompilerResponse {
  const record =
    data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const exitRaw = record.exit_code ?? record.exitCode;
  return {
    output: typeof record.output === "string" ? record.output : "",
    error: typeof record.error === "string" ? record.error : "",
    exitCode: typeof exitRaw === "number" ? exitRaw : null,
  };
}

function onlineCompilerTimeLimitSeconds(timeoutMs: number): number {
  const seconds = timeoutMs / 1000;
  return Math.min(30, Math.max(0.1, Number(seconds.toFixed(2))));
}

async function runRacketExercise(
  options: RunProgrammingExerciseOptions,
  expression: string,
): Promise<ProgrammingValidationResult> {
  const timeout =
    options.timeoutMs ??
    positiveIntegerFromEnv("RACKET_TIMEOUT_MS", DEFAULT_RACKET_TIMEOUT_MS);
  const apiKey = racketApiKey();
  if (!apiKey) {
    return {
      passed: false,
      expression,
      error:
        "Racket validation is not configured. Set RACKET_API_KEY in the service environment.",
    };
  }

  const passMarker = `__FL_RACKET_PASS_${randomUUID()}__`;
  const failMarker = `__FL_RACKET_FAIL_${randomUUID()}__`;
  const harness = buildRacketHarness(
    options.code,
    expression,
    passMarker,
    failMarker,
  );
  const releaseSlot = await acquireRacketSlot();
  if (!releaseSlot) {
    return {
      passed: false,
      expression,
      error: "Too many Racket exercises are being validated right now. Please try again in a moment.",
    };
  }

  try {
    const response = await axios.post(
      resolveRacketApiUrl(),
      {
        compiler: resolveRacketCompiler(),
        code: harness,
        time_limit: onlineCompilerTimeLimitSeconds(timeout),
      },
      {
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json",
        },
        timeout: timeout + 10000,
        validateStatus: () => true,
      },
    );

    if (response.status < 200 || response.status >= 300) {
      const detail = onlineCompilerErrorText(response.data);
      return {
        passed: false,
        expression,
        error: `Racket validation service returned HTTP ${response.status}${
          detail ? `: ${detail}` : ""
        }.`,
      };
    }

    const result = parseOnlineCompilerResponse(response.data);
    if (result.output.includes(passMarker)) {
      return { passed: true, expression, actual: "true" };
    }
    if (result.output.includes(failMarker)) {
      return { passed: false, expression, actual: "false" };
    }
    if (result.exitCode === 124) {
      return {
        passed: false,
        expression,
        error: `Racket execution timed out after ${timeout} ms.`,
      };
    }

    const output = [result.error, result.output]
      .filter((part) => part.trim() !== "")
      .join("\n")
      .trim();
    if (output) {
      return { passed: false, expression, error: output };
    }
    if (result.exitCode !== null && result.exitCode !== 0) {
      return {
        passed: false,
        expression,
        error: `Racket execution failed with exit code ${result.exitCode}.`,
      };
    }
    return {
      passed: false,
      expression,
      error: "Racket did not produce a test result.",
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
        return {
          passed: false,
          expression,
          error: `Racket validation timed out after ${timeout} ms.`,
        };
      }
      return {
        passed: false,
        expression,
        error: `Racket validation service is unavailable: ${errorMessage(error)}`,
      };
    }
    return { passed: false, expression, error: errorMessage(error) };
  } finally {
    releaseSlot();
  }
}

// The student code followed by a main/0 that evaluates the goal: the goal
// succeeds -> pass marker and halt(0); the goal fails -> fail marker and
// halt(1); a runtime error prints its message to stderr and halts with 2.
// OnlineCompiler.io runs the file with "swipl --on-error=status -q -t
// runcode_halt", so an initialization goal that halts decides the run.
export function buildPrologHarness(
  code: string,
  goal: string,
  passMarker: string,
  failMarker: string,
): string {
  // Authors may end the goal with a full stop; the harness adds its own
  // punctuation around the goal, so trailing full stops are dropped.
  const cleanedGoal = goal.trim().replace(/\.+\s*$/, "").trim();
  return `${code}

:- initialization(main).

main :-
    catch(
        ( ( ${cleanedGoal} ) ->
            write(${JSON.stringify(passMarker)}), nl, halt(0)
        ;   write(${JSON.stringify(failMarker)}), nl, halt(1)
        ),
        Error,
        (   ( message_to_string(Error, Message)
            ->  true
            ;   with_output_to(string(Message), write_term(Error, [quoted(true)]))
            ),
            write(user_error, Message),
            nl(user_error),
            halt(2)
        )
    ).
`;
}

async function runPrologExercise(
  options: RunProgrammingExerciseOptions,
  expression: string,
): Promise<ProgrammingValidationResult> {
  const timeout =
    options.timeoutMs ??
    positiveIntegerFromEnv("PROLOG_TIMEOUT_MS", DEFAULT_PROLOG_TIMEOUT_MS);
  const apiKey = prologApiKey();
  if (!apiKey) {
    return {
      passed: false,
      expression,
      error:
        "Prolog validation is not configured. Set PROLOG_API_KEY in the service environment.",
    };
  }

  const passMarker = `__FL_PROLOG_PASS_${randomUUID()}__`;
  const failMarker = `__FL_PROLOG_FAIL_${randomUUID()}__`;
  const harness = buildPrologHarness(
    options.code,
    expression,
    passMarker,
    failMarker,
  );
  const releaseSlot = await acquirePrologSlot();
  if (!releaseSlot) {
    return {
      passed: false,
      expression,
      error: "Too many Prolog exercises are being validated right now. Please try again in a moment.",
    };
  }

  try {
    const response = await axios.post(
      resolvePrologApiUrl(),
      {
        compiler: resolvePrologCompiler(),
        code: harness,
        time_limit: onlineCompilerTimeLimitSeconds(timeout),
      },
      {
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json",
        },
        timeout: timeout + 10000,
        validateStatus: () => true,
      },
    );

    if (response.status < 200 || response.status >= 300) {
      const detail = onlineCompilerErrorText(response.data);
      return {
        passed: false,
        expression,
        error: `Prolog validation service returned HTTP ${response.status}${
          detail ? `: ${detail}` : ""
        }.`,
      };
    }

    const result = parseOnlineCompilerResponse(response.data);
    if (result.output.includes(passMarker)) {
      return { passed: true, expression, actual: "true" };
    }
    if (result.output.includes(failMarker)) {
      return { passed: false, expression, actual: "false" };
    }
    if (result.exitCode === 124) {
      return {
        passed: false,
        expression,
        error: `Prolog execution timed out after ${timeout} ms.`,
      };
    }

    const output = [result.error, result.output]
      .filter((part) => part.trim() !== "")
      .join("\n")
      .trim();
    if (output) {
      return { passed: false, expression, error: output };
    }
    if (result.exitCode !== null && result.exitCode !== 0) {
      return {
        passed: false,
        expression,
        error: `Prolog execution failed with exit code ${result.exitCode}.`,
      };
    }
    return {
      passed: false,
      expression,
      error: "Prolog did not produce a test result.",
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
        return {
          passed: false,
          expression,
          error: `Prolog validation timed out after ${timeout} ms.`,
        };
      }
      return {
        passed: false,
        expression,
        error: `Prolog validation service is unavailable: ${errorMessage(error)}`,
      };
    }
    return { passed: false, expression, error: errorMessage(error) };
  } finally {
    releaseSlot();
  }
}

export async function runProgrammingExercise(
  options: RunProgrammingExerciseOptions,
): Promise<ProgrammingValidationResult> {
  const timeout = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const expression = options.expression.trim();
  if (!expression) {
    return {
      passed: false,
      error: "The exercise has no test cases.",
    };
  }

  if (options.language === "Lean 4") {
    return runLeanExercise(options, expression);
  }

  if (options.language === "Python") {
    return runPythonExercise(options, expression);
  }

  if (options.language === "Java") {
    return runJavaExercise(options, expression);
  }

  if (options.language === "Racket") {
    return runRacketExercise(options, expression);
  }

  if (options.language === "Prolog") {
    return runPrologExercise(options, expression);
  }

  const functionName = extractFunctionName(options.solution);
  if (!functionName) {
    return {
      passed: false,
      expression,
      error: "The stored exercise does not contain a function signature.",
    };
  }

  let code = options.code;
  if (options.language === "TypeScript") {
    const compiled = compileTypeScript(code);
    if (compiled.error !== undefined) {
      return { passed: false, expression, error: compiled.error };
    }
    code = compiled.code ?? "";
  } else if (options.language !== "JavaScript") {
    return {
      passed: false,
      expression,
      error: `Unsupported programming language "${options.language}".`,
    };
  }

  const sandbox = {
    console: {
      log: (): void => undefined,
      info: (): void => undefined,
      warn: (): void => undefined,
      error: (): void => undefined,
    },
  };
  const context = vm.createContext(sandbox, {
    name: "programming-exercise",
  });

  try {
    vm.runInContext(code, context, {
      timeout,
      filename: "exercise.js",
    });
  } catch (error) {
    return {
      passed: false,
      expression,
      error: errorMessage(error),
    };
  }

  const candidate = (context as Record<string, unknown>)[functionName];
  if (typeof candidate !== "function") {
    return {
      passed: false,
      expression,
      error: `Function "${functionName}" was not found in the submitted code.`,
    };
  }

  try {
    const value = vm.runInContext(expression, context, {
      timeout,
      filename: "testcases.js",
    });
    return {
      passed: Boolean(value),
      expression,
      actual: formatValue(value),
    };
  } catch (error) {
    return {
      passed: false,
      expression,
      error: errorMessage(error),
    };
  }
}
