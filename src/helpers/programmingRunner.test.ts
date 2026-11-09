import assert from "assert";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import {
  extractFunctionName,
  extractFunctionSignature,
  extractParameterNames,
  formatValue,
  functionSignatureSkeleton,
  isJavaAvailable,
  isLeanAvailable,
  isPythonAvailable,
  resolveJavaBinary,
  resolveJavacBinary,
  resolveLeanBinary,
  resolvePythonBinary,
  runProgrammingExercise,
} from "./programmingRunner";

function testSignatureParsing(): void {
  const solution =
    "function add(a: number, b?: number): number { return a + (b ?? 0); }";

  assert.strictEqual(extractFunctionName(solution), "add");
  assert.deepStrictEqual(extractParameterNames(solution), ["a", "b"]);

  const signature = extractFunctionSignature(solution);
  assert.ok(signature);
  assert.strictEqual(signature?.name, "add");
  assert.ok((signature?.bodyStart ?? -1) > 0);

  assert.strictEqual(
    functionSignatureSkeleton(solution),
    "function add(a: number, b?: number): number {\n  \n}",
  );
  assert.strictEqual(functionSignatureSkeleton("not a function"), "");

  const commentedSolution =
    "function add(a, b) {\n  // return a + b;\n}";
  assert.strictEqual(extractFunctionName(commentedSolution), "add");
}

function testValueConversion(): void {
  assert.strictEqual(formatValue("hello"), "hello");
  assert.strictEqual(formatValue(5), "5");
  assert.strictEqual(formatValue([1, 2]), "[1,2]");
  assert.strictEqual(formatValue(true), "true");
  assert.strictEqual(formatValue(undefined), "undefined");
}

async function testJavaScript(): Promise<void> {
  const solution = "function add(a, b) { return a + b; }";

  const passed = await runProgrammingExercise({
    language: "JavaScript",
    code: solution,
    solution,
    expression: "add(2, 3) == 5 && add(-1, 1) == 0",
  });
  assert.strictEqual(passed.passed, true);
  assert.strictEqual(passed.actual, "true");

  const failed = await runProgrammingExercise({
    language: "JavaScript",
    code: "function add(a, b) { return a - b; }",
    solution,
    expression: "add(2, 3) == 5",
  });
  assert.strictEqual(failed.passed, false);
  assert.strictEqual(failed.actual, "false");
}

async function testTypeScript(): Promise<void> {
  const solution =
    "function add(a: number, b: number): number { return a + b; }";

  const result = await runProgrammingExercise({
    language: "TypeScript",
    code: solution,
    solution,
    expression: "add(2, 3) == 5",
  });
  assert.strictEqual(result.passed, true);
}

async function testCommentedSolution(): Promise<void> {
  const solution = "function add(a, b) {\n  // return a + b;\n}";

  const result = await runProgrammingExercise({
    language: "JavaScript",
    code: "function add(a, b) { return a + b; }",
    solution,
    expression: "add(2, 3) == 5",
  });
  assert.strictEqual(result.passed, true);
}

async function testErrors(): Promise<void> {
  const solution = "function add(a, b) { return a + b; }";

  const compileError = await runProgrammingExercise({
    language: "TypeScript",
    code: "function add(a: number {",
    solution,
    expression: "add(1, 2) == 3",
  });
  assert.strictEqual(compileError.passed, false);
  assert.ok(compileError.error);

  const runtimeError = await runProgrammingExercise({
    language: "JavaScript",
    code: 'function add() { throw new Error("boom"); }',
    solution,
    expression: "add(1, 2) == 3",
  });
  assert.strictEqual(runtimeError.passed, false);
  assert.match(runtimeError.error ?? "", /boom/);

  const missingFunction = await runProgrammingExercise({
    language: "JavaScript",
    code: "const add = 3;",
    solution,
    expression: "add(1, 2) == 3",
  });
  assert.strictEqual(missingFunction.passed, false);
  assert.match(missingFunction.error ?? "", /not found/);

  const emptyExpression = await runProgrammingExercise({
    language: "JavaScript",
    code: solution,
    solution,
    expression: "   ",
  });
  assert.strictEqual(emptyExpression.passed, false);
  assert.match(emptyExpression.error ?? "", /no test cases/);

  const timeout = await runProgrammingExercise({
    language: "JavaScript",
    code: "function spin() { while (true) {} }",
    solution: "function spin() { while (true) {} }",
    expression: "spin()",
    timeoutMs: 50,
  });
  assert.strictEqual(timeout.passed, false);
  assert.ok(timeout.error);
}

function testLeanBinaryResolution(): void {
  const previous = process.env.LEAN_BIN;
  try {
    process.env.LEAN_BIN = "/custom/lean";
    assert.strictEqual(resolveLeanBinary(), "/custom/lean");

    delete process.env.LEAN_BIN;
    assert.strictEqual(resolveLeanBinary(), "lean");
  } finally {
    if (previous === undefined) delete process.env.LEAN_BIN;
    else process.env.LEAN_BIN = previous;
  }
}

function testPythonBinaryResolution(): void {
  const previous = process.env.PYTHON_BIN;
  try {
    process.env.PYTHON_BIN = "/custom/python";
    assert.strictEqual(resolvePythonBinary(), "/custom/python");

    delete process.env.PYTHON_BIN;
    assert.strictEqual(
      resolvePythonBinary(),
      process.platform === "win32" ? "python" : "python3",
    );
  } finally {
    if (previous === undefined) delete process.env.PYTHON_BIN;
    else process.env.PYTHON_BIN = previous;
  }
}

function testJavaBinaryResolution(): void {
  const previousJava = process.env.JAVA_BIN;
  const previousJavac = process.env.JAVAC_BIN;
  const previousHome = process.env.JAVA_HOME;
  try {
    process.env.JAVA_BIN = "/custom/java";
    process.env.JAVAC_BIN = "/custom/javac";
    assert.strictEqual(resolveJavaBinary(), "/custom/java");
    assert.strictEqual(resolveJavacBinary(), "/custom/javac");

    delete process.env.JAVA_BIN;
    delete process.env.JAVAC_BIN;
    process.env.JAVA_HOME = "/custom/jdk";
    assert.strictEqual(
      resolveJavaBinary(),
      path.join(
        "/custom/jdk",
        "bin",
        process.platform === "win32" ? "java.exe" : "java",
      ),
    );
    assert.strictEqual(
      resolveJavacBinary(),
      path.join(
        "/custom/jdk",
        "bin",
        process.platform === "win32" ? "javac.exe" : "javac",
      ),
    );

    delete process.env.JAVA_HOME;
    assert.strictEqual(resolveJavaBinary(), "java");
    assert.strictEqual(resolveJavacBinary(), "javac");
  } finally {
    if (previousJava === undefined) delete process.env.JAVA_BIN;
    else process.env.JAVA_BIN = previousJava;
    if (previousJavac === undefined) delete process.env.JAVAC_BIN;
    else process.env.JAVAC_BIN = previousJavac;
    if (previousHome === undefined) delete process.env.JAVA_HOME;
    else process.env.JAVA_HOME = previousHome;
  }
}

async function testJava(): Promise<void> {
  if (!isJavaAvailable()) {
    console.log("Java is not installed; skipping Java tests");
    return;
  }

  const solution = `static int add(int a, int b) {
  return a + b;
}`;

  const passed = await runProgrammingExercise({
    language: "Java",
    code: solution,
    solution,
    expression: "add(2, 3) == 5 && add(-1, 1) == 0",
  });
  assert.strictEqual(passed.passed, true, passed.error ?? "");
  assert.strictEqual(passed.actual, "true");

  const streams = await runProgrammingExercise({
    language: "Java",
    code: `static int sumEven(List<Integer> numbers) {
  return numbers.stream().filter(n -> n % 2 == 0).mapToInt(Integer::intValue).sum();
}`,
    solution,
    expression: "sumEven(List.of(1, 2, 3, 4)) == 6 && sumEven(List.of()) == 0",
  });
  assert.strictEqual(streams.passed, true, streams.error ?? "");

  const failed = await runProgrammingExercise({
    language: "Java",
    code: `static int add(int a, int b) {
  return a - b;
}`,
    solution,
    expression: "add(2, 3) == 5",
  });
  assert.strictEqual(failed.passed, false);
  assert.strictEqual(failed.actual, "false");

  const syntaxError = await runProgrammingExercise({
    language: "Java",
    code: "static int add(int a, int b) {",
    solution,
    expression: "add(2, 3) == 5",
  });
  assert.strictEqual(syntaxError.passed, false);
  assert.ok(syntaxError.error);

  const runtimeError = await runProgrammingExercise({
    language: "Java",
    code: `static int add(int a, int b) {
  throw new IllegalArgumentException("boom");
}`,
    solution,
    expression: "add(2, 3) == 5",
  });
  assert.strictEqual(runtimeError.passed, false);
  assert.match(runtimeError.error ?? "", /boom/);

  const timeout = await runProgrammingExercise({
    language: "Java",
    code: `static boolean spin() {
  while (true) {}
}`,
    solution: "static boolean spin() { return true; }",
    expression: "spin()",
    timeoutMs: 200,
  });
  assert.strictEqual(timeout.passed, false);
  assert.match(timeout.error ?? "", /timed out/);

  const previousSecret = process.env.FL_JAVA_SECRET;
  process.env.FL_JAVA_SECRET = "should-not-be-visible";
  try {
    const secretHidden = await runProgrammingExercise({
      language: "Java",
      code: `static int add(int a, int b) {
  if (System.getenv("FL_JAVA_SECRET") != null) return -1;
  return a + b;
}`,
      solution,
      expression: "add(2, 3) == 5",
    });
    assert.strictEqual(secretHidden.passed, true, secretHidden.error ?? "");
  } finally {
    if (previousSecret === undefined) delete process.env.FL_JAVA_SECRET;
    else process.env.FL_JAVA_SECRET = previousSecret;
  }
}

async function testPython(): Promise<void> {
  if (!isPythonAvailable()) {
    console.log("Python is not installed; skipping Python tests");
    return;
  }

  const solution = "def add(a, b):\n    return a + b";

  const passed = await runProgrammingExercise({
    language: "Python",
    code: solution,
    solution,
    expression: "add(2, 3) == 5 and add(-1, 1) == 0",
  });
  assert.strictEqual(passed.passed, true, passed.error ?? "");
  assert.strictEqual(passed.actual, "true");

  const stdlib = await runProgrammingExercise({
    language: "Python",
    code: "import math\n\ndef add(a, b):\n    return a + b",
    solution,
    expression: "math.sqrt(9) == 3 and add(2, 3) == 5",
  });
  assert.strictEqual(stdlib.passed, true, stdlib.error ?? "");

  const monkeypatched = await runProgrammingExercise({
    language: "Python",
    code:
      "import builtins\nbuiltins.eval = lambda *args, **kwargs: True\nbuiltins.bool = lambda value: True\n\ndef add(a, b):\n    return a - b",
    solution,
    expression: "add(2, 3) == 5",
  });
  assert.strictEqual(monkeypatched.passed, false);
  assert.strictEqual(monkeypatched.actual, "false");

  const harnessRead = await runProgrammingExercise({
    language: "Python",
    code: "def add(a, b):\n    open('runner.py').read()\n    return a + b",
    solution,
    expression: "add(2, 3) == 5",
  });
  assert.strictEqual(harnessRead.passed, false);
  assert.match(harnessRead.error ?? "", /not allowed/i);

  const secretFile = path.join(
    os.tmpdir(),
    `python-read-secret-${process.pid}-${Date.now()}.txt`,
  );
  await fs.writeFile(secretFile, "secret", "utf8");
  try {
    const fileRead = await runProgrammingExercise({
      language: "Python",
      code: `def add(a, b):\n    with open(${JSON.stringify(secretFile)}, "r") as handle:\n        handle.read()\n    return a + b`,
      solution,
      expression: "add(2, 3) == 5",
    });
    assert.strictEqual(fileRead.passed, false);
    assert.match(fileRead.error ?? "", /not allowed/i);
  } finally {
    await fs.rm(secretFile, { force: true });
  }

  const failed = await runProgrammingExercise({
    language: "Python",
    code: "def add(a, b):\n    return a - b",
    solution,
    expression: "add(2, 3) == 5",
  });
  assert.strictEqual(failed.passed, false);
  assert.strictEqual(failed.actual, "false");

  const syntaxError = await runProgrammingExercise({
    language: "Python",
    code: "def add(a, b)\n    return a + b",
    solution,
    expression: "add(2, 3) == 5",
  });
  assert.strictEqual(syntaxError.passed, false);
  assert.ok(syntaxError.error);

  const runtimeError = await runProgrammingExercise({
    language: "Python",
    code: "def add(a, b):\n    raise ValueError('boom')",
    solution,
    expression: "add(2, 3) == 5",
  });
  assert.strictEqual(runtimeError.passed, false);
  assert.match(runtimeError.error ?? "", /boom/);

  const timeout = await runProgrammingExercise({
    language: "Python",
    code: "def spin():\n    while True:\n        pass",
    solution: "def spin():\n    pass",
    expression: "spin()",
    timeoutMs: 100,
  });
  assert.strictEqual(timeout.passed, false);
  assert.match(timeout.error ?? "", /timed out|time limit/);

  const fileWrite = await runProgrammingExercise({
    language: "Python",
    code: "def add(a, b):\n    open('x', 'w').write('x')\n    return a + b",
    solution,
    expression: "add(2, 3) == 5",
  });
  assert.strictEqual(fileWrite.passed, false);
  assert.match(fileWrite.error ?? "", /not allowed/i);

  const subprocess = await runProgrammingExercise({
    language: "Python",
    code:
      "def add(a, b):\n    import subprocess\n    subprocess.run(['echo', 'x'])\n    return a + b",
    solution,
    expression: "add(2, 3) == 5",
  });
  assert.strictEqual(subprocess.passed, false);
  assert.match(subprocess.error ?? "", /not allowed/i);
}

async function testLean(): Promise<void> {
  if (!isLeanAvailable()) {
    console.log("Lean 4 is not installed; skipping Lean tests");
    return;
  }

  const timeoutMs = 60000;

  const funSolution = "def double := fun (x : Nat) => x + x";
  const funPassed = await runProgrammingExercise({
    language: "Lean 4",
    code: funSolution,
    solution: funSolution,
    expression: "example : double 7 = 14 := rfl",
    timeoutMs,
  });
  assert.strictEqual(funPassed.passed, true, funPassed.error ?? "");

  const defSolution = "def double (x : Nat) : Nat := x + x";
  const defPassed = await runProgrammingExercise({
    language: "Lean 4",
    code: defSolution,
    solution: defSolution,
    expression: "example : double 7 = 14 := rfl",
    timeoutMs,
  });
  assert.strictEqual(defPassed.passed, true, defPassed.error ?? "");

  const failed = await runProgrammingExercise({
    language: "Lean 4",
    code: "def double (x : Nat) : Nat := x + 1",
    solution: defSolution,
    expression: "example : double 7 = 14 := rfl",
    timeoutMs,
  });
  assert.strictEqual(failed.passed, false);
  assert.ok(failed.error);
}

async function runTests(): Promise<void> {
  testSignatureParsing();
  testValueConversion();
  await testJavaScript();
  await testTypeScript();
  await testCommentedSolution();
  await testErrors();
  testLeanBinaryResolution();
  testPythonBinaryResolution();
  testJavaBinaryResolution();
  await testPython();
  await testJava();
  await testLean();
  console.log("programming runner tests passed");
}

runTests().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
