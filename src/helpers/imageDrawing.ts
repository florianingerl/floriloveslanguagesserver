import { MAX_BILD_BYTES, parseImageDataUrl } from "./imageDataUrl";

export const WHITEBOARD_FILE_FORMAT = "floriloveslanguages-whiteboard";
export const WHITEBOARD_FILE_VERSION = 1;
export const MAX_DRAWING_JSON_BYTES = 2 * 1024 * 1024;
export const MAX_DRAWING_OBJECTS = 5000;

const ERLAUBTE_OBJEKT_ARTEN = [
	"note",
	"text",
	"rect",
	"ellipse",
	"line",
	"pen",
	"image",
];

export interface ValidatedDrawing {
	contentType: "image/png";
	data: Buffer;
	json: string;
}

export type DrawingValidationResult =
	| { ok: true; value: ValidatedDrawing }
	| { ok: false; status: number; message: string };

function istDatensatz(wert: unknown): wert is Record<string, unknown> {
	return typeof wert === "object" && wert !== null && !Array.isArray(wert);
}

function jsonGueltig(json: string): boolean {
	if (Buffer.byteLength(json, "utf8") > MAX_DRAWING_JSON_BYTES) return false;
	let daten: unknown;
	try {
		daten = JSON.parse(json);
	} catch {
		return false;
	}
	if (!istDatensatz(daten)) return false;
	if (daten.format !== WHITEBOARD_FILE_FORMAT) return false;
	if (daten.version !== WHITEBOARD_FILE_VERSION) return false;
	if (!Array.isArray(daten.objects)) return false;
	if (daten.objects.length > MAX_DRAWING_OBJECTS) return false;
	return daten.objects.every((objekt) => {
		if (!istDatensatz(objekt)) return false;
		return (
			typeof objekt.id === "string" &&
			objekt.id.length > 0 &&
			typeof objekt.type === "string" &&
			ERLAUBTE_OBJEKT_ARTEN.includes(objekt.type)
		);
	});
}

export function validateDrawing(body: unknown): DrawingValidationResult {
	if (!istDatensatz(body)) {
		return { ok: false, status: 400, message: "No drawing data was sent." };
	}

	if (typeof body.pngDataUrl !== "string" || body.pngDataUrl.length === 0) {
		return { ok: false, status: 400, message: "No image data was sent." };
	}
	const bild = parseImageDataUrl(body.pngDataUrl, ["image/png"]);
	if (!bild) {
		return {
			ok: false,
			status: 400,
			message: "The drawing is not a supported PNG image.",
		};
	}
	if (bild.data.length > MAX_BILD_BYTES) {
		return {
			ok: false,
			status: 413,
			message: `The image is too large (max. ${Math.round(
				MAX_BILD_BYTES / (1024 * 1024),
			)} MB).`,
		};
	}

	if (typeof body.json !== "string" || !jsonGueltig(body.json)) {
		return {
			ok: false,
			status: 400,
			message: "The whiteboard data is not a valid drawing.",
		};
	}

	return {
		ok: true,
		value: { contentType: "image/png", data: bild.data, json: body.json },
	};
}
