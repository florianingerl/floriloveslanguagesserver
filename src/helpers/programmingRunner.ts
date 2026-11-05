import vm from "vm";
import ts from "typescript";

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
  // The boolean expression entered by the exercise author.
  expression: string;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 1000;

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
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

export function runProgrammingExercise(
  options: RunProgrammingExerciseOptions,
): ProgrammingValidationResult {
  const timeout = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const expression = options.expression.trim();
  if (!expression) {
    return {
      passed: false,
      error: "The exercise has no test cases.",
    };
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
