import assert from "assert";
import {
	validateDrawing,
	WHITEBOARD_FILE_FORMAT,
	WHITEBOARD_FILE_VERSION,
} from "./imageDrawing";

const png =
	"data:image/png;base64," + Buffer.from([137, 80, 78, 71]).toString("base64");

function json(objects: unknown[] = []): string {
	return JSON.stringify({
		format: WHITEBOARD_FILE_FORMAT,
		version: WHITEBOARD_FILE_VERSION,
		title: "Exercise image",
		savedAt: "2026-01-01T00:00:00.000Z",
		objects,
	});
}

const gueltig = { pngDataUrl: png, json: json() };

const ergebnis = validateDrawing(gueltig);
assert.strictEqual(ergebnis.ok, true);
if (ergebnis.ok) {
	assert.strictEqual(ergebnis.value.contentType, "image/png");
	assert.strictEqual(ergebnis.value.data.length, 4);
}

assert.strictEqual(validateDrawing(null).ok, false);
assert.strictEqual(validateDrawing({ ...gueltig, pngDataUrl: "" }).ok, false);
assert.strictEqual(
	validateDrawing({ ...gueltig, pngDataUrl: png.replace("image/png", "image/gif") }).ok,
	false,
);
assert.strictEqual(validateDrawing({ ...gueltig, json: "no json" }).ok, false);
assert.strictEqual(
	validateDrawing({
		...gueltig,
		json: JSON.stringify({ ...JSON.parse(json()), format: "something-else" }),
	}).ok,
	false,
);
assert.strictEqual(
	validateDrawing({
		...gueltig,
		json: json([{ id: "a", type: "unknown" }]),
	}).ok,
	false,
);
assert.strictEqual(
	validateDrawing({ ...gueltig, json: json([{ id: "a", type: "pen", points: [0, 0, 1, 1] }]) }).ok,
	true,
);

console.log("imageDrawing tests passed");
