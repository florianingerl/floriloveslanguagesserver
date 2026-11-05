import assert from "assert";
import {
  extractFunctionName,
  extractFunctionSignature,
  extractParameterNames,
  formatValue,
  functionSignatureSkeleton,
  isLeanAvailable,
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
  await testErrors();
  await testLean();
  console.log("programming runner tests passed");
}

runTests().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
