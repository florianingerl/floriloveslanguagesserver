import assert from "assert";
import {
  extractFunctionName,
  extractFunctionSignature,
  extractParameterNames,
  formatValue,
  functionSignatureSkeleton,
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

function testJavaScript(): void {
  const solution = "function add(a, b) { return a + b; }";

  const passed = runProgrammingExercise({
    language: "JavaScript",
    code: solution,
    solution,
    expression: "add(2, 3) == 5 && add(-1, 1) == 0",
  });
  assert.strictEqual(passed.passed, true);
  assert.strictEqual(passed.actual, "true");

  const failed = runProgrammingExercise({
    language: "JavaScript",
    code: "function add(a, b) { return a - b; }",
    solution,
    expression: "add(2, 3) == 5",
  });
  assert.strictEqual(failed.passed, false);
  assert.strictEqual(failed.actual, "false");
}

function testTypeScript(): void {
  const solution =
    "function add(a: number, b: number): number { return a + b; }";

  const result = runProgrammingExercise({
    language: "TypeScript",
    code: solution,
    solution,
    expression: "add(2, 3) == 5",
  });
  assert.strictEqual(result.passed, true);
}

function testErrors(): void {
  const solution = "function add(a, b) { return a + b; }";

  const compileError = runProgrammingExercise({
    language: "TypeScript",
    code: "function add(a: number {",
    solution,
    expression: "add(1, 2) == 3",
  });
  assert.strictEqual(compileError.passed, false);
  assert.ok(compileError.error);

  const runtimeError = runProgrammingExercise({
    language: "JavaScript",
    code: 'function add() { throw new Error("boom"); }',
    solution,
    expression: "add(1, 2) == 3",
  });
  assert.strictEqual(runtimeError.passed, false);
  assert.match(runtimeError.error ?? "", /boom/);

  const missingFunction = runProgrammingExercise({
    language: "JavaScript",
    code: "const add = 3;",
    solution,
    expression: "add(1, 2) == 3",
  });
  assert.strictEqual(missingFunction.passed, false);
  assert.match(missingFunction.error ?? "", /not found/);

  const emptyExpression = runProgrammingExercise({
    language: "JavaScript",
    code: solution,
    solution,
    expression: "   ",
  });
  assert.strictEqual(emptyExpression.passed, false);
  assert.match(emptyExpression.error ?? "", /no test cases/);

  const timeout = runProgrammingExercise({
    language: "JavaScript",
    code: "function spin() { while (true) {} }",
    solution: "function spin() { while (true) {} }",
    expression: "spin()",
    timeoutMs: 50,
  });
  assert.strictEqual(timeout.passed, false);
  assert.ok(timeout.error);
}

function runTests(): void {
  testSignatureParsing();
  testValueConversion();
  testJavaScript();
  testTypeScript();
  testErrors();
  console.log("programming runner tests passed");
}

runTests();
