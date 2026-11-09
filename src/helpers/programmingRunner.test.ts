import assert from "assert";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import {
  buildRacketHarness,
  extractFunctionName,
  extractFunctionSignature,
  extractParameterNames,
  formatValue,
  functionSignatureSkeleton,
  isJavaAvailable,
  isLeanAvailable,
  isPythonAvailable,
  isRacketAvailable,
  resolveJavaBinary,
  resolveJavacBinary,
  resolveLeanBinary,
  resolvePythonBinary,
  resolveRacketApiUrl,
  resolveRacketCompiler,
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

async function testRacketConfiguration(): Promise<void> {
  const previousKey = process.env.RACKET_API_KEY;
  const previousKeyFile = process.env.RACKET_LOCAL_KEY_FILE;
  try {
    process.env.RACKET_LOCAL_KEY_FILE = path.join(
      os.tmpdir(),
      `missing-racket-key-${Date.now()}.json`,
    );
    delete process.env.RACKET_API_KEY;
    assert.strictEqual(isRacketAvailable(), false);

    const notConfigured = await runProgrammingExercise({
      language: "Racket",
      code: "(define (double x) (* 2 x))",
      solution: "(define (double x) (* 2 x))",
      expression: "(= (double 7) 14)",
    });
    assert.strictEqual(notConfigured.passed, false);
    assert.match(notConfigured.error ?? "", /RACKET_API_KEY/);

    process.env.RACKET_API_KEY = "test-key";
    assert.strictEqual(isRacketAvailable(), true);
  } finally {
    if (previousKey === undefined) delete process.env.RACKET_API_KEY;
    else process.env.RACKET_API_KEY = previousKey;
    if (previousKeyFile === undefined) delete process.env.RACKET_LOCAL_KEY_FILE;
    else process.env.RACKET_LOCAL_KEY_FILE = previousKeyFile;
  }

  assert.strictEqual(resolveRacketApiUrl(), "https://api.onlinecompiler.io/api/run-code-sync/");
  assert.strictEqual(resolveRacketCompiler(), "racket-9.3");

  const harness = buildRacketHarness(
    "(define (double x) (* 2 x))",
    "(= (double 7) 14)",
    "PASS_MARKER",
    "FAIL_MARKER",
  );
  assert.ok(harness.startsWith("#lang racket"));
  assert.ok(harness.includes("(define (double x) (* 2 x))"));
  assert.ok(harness.includes("(displayln \"PASS_MARKER\")"));
  assert.ok(harness.includes("(displayln \"FAIL_MARKER\")"));
}

async function testRacket(): Promise<void> {
  if (!isRacketAvailable()) {
    console.log("RACKET_API_KEY is not set; skipping Racket API tests");
    return;
  }

  const doubleSolution = `(define (double x)
  (* 2 x))`;

  const passed = await runProgrammingExercise({
    language: "Racket",
    code: doubleSolution,
    solution: doubleSolution,
    expression: "(and (= (double 7) 14) (= (double 0) 0) (= (double -3) -6))",
  });
  assert.strictEqual(passed.passed, true, passed.error ?? "");
  assert.strictEqual(passed.actual, "true");

  const factorial = await runProgrammingExercise({
    language: "Racket",
    code: `(define (factorial n)
  (if (= n 0)
      1
      (* n (factorial (- n 1)))))`,
    solution: doubleSolution,
    expression: "(and (= (factorial 0) 1) (= (factorial 5) 120))",
  });
  assert.strictEqual(factorial.passed, true, factorial.error ?? "");

  const sumList = await runProgrammingExercise({
    language: "Racket",
    code: "(define (sum-list numbers)\n  (foldl + 0 numbers))",
    solution: doubleSolution,
    expression: "(and (= (sum-list (list 1 2 3 4)) 10) (= (sum-list empty) 0))",
  });
  assert.strictEqual(sumList.passed, true, sumList.error ?? "");

  const failed = await runProgrammingExercise({
    language: "Racket",
    code: "(define (double x)\n  (+ x 1))",
    solution: doubleSolution,
    expression: "(= (double 7) 14)",
  });
  assert.strictEqual(failed.passed, false);
  assert.strictEqual(failed.actual, "false");

  const syntaxError = await runProgrammingExercise({
    language: "Racket",
    code: "(define (double x)",
    solution: doubleSolution,
    expression: "(= (double 7) 14)",
  });
  assert.strictEqual(syntaxError.passed, false);
  assert.ok(syntaxError.error);

  const runtimeError = await runProgrammingExercise({
    language: "Racket",
    code: '(define (double x)\n  (error "boom"))',
    solution: doubleSolution,
    expression: "(= (double 7) 14)",
  });
  assert.strictEqual(runtimeError.passed, false);
  assert.match(runtimeError.error ?? "", /boom/);

  const timeout = await runProgrammingExercise({
    language: "Racket",
    code: "(define (spin)\n  (let loop () (loop)))",
    solution: doubleSolution,
    expression: "(spin)",
    timeoutMs: 1000,
  });
  assert.strictEqual(timeout.passed, false);
  assert.match(timeout.error ?? "", /timed out/);

  const previousSecret = process.env.FL_RACKET_SECRET;
  process.env.FL_RACKET_SECRET = "should-not-be-visible";
  try {
    const secretHidden = await runProgrammingExercise({
      language: "Racket",
      code: `(define (double x)
  (if (getenv "FL_RACKET_SECRET") -1 (* 2 x)))`,
      solution: doubleSolution,
      expression: "(= (double 7) 14)",
    });
    assert.strictEqual(secretHidden.passed, true, secretHidden.error ?? "");
  } finally {
    if (previousSecret === undefined) delete process.env.FL_RACKET_SECRET;
    else process.env.FL_RACKET_SECRET = previousSecret;
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
  await testRacketConfiguration();
  await testPython();
  await testJava();
  await testRacket();
  await testLean();
  console.log("programming runner tests passed");
}

runTests().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
