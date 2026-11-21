export const MAX_BILD_BYTES = 8 * 1024 * 1024;

export const ERLAUBTE_BILD_TYPEN = [
	"image/png",
	"image/jpeg",
	"image/jpg",
	"image/gif",
	"image/webp",
	"image/bmp",
	"image/svg+xml",
];

export interface ParsedImageDataUrl {
	contentType: string;
	data: Buffer;
}

export function parseImageDataUrl(
	datenUrl: string,
	erlaubteTypen: readonly string[] = ERLAUBTE_BILD_TYPEN,
): ParsedImageDataUrl | null {
	const treffer =
		/^data:([a-zA-Z0-9.+-]+\/[a-zA-Z0-9.+-]+);base64,([\s\S]*)$/.exec(datenUrl);
	if (!treffer) return null;
	const contentType = treffer[1].toLowerCase();
	if (!erlaubteTypen.includes(contentType)) return null;
	const data = Buffer.from(treffer[2], "base64");
	if (data.length === 0) return null;
	return { contentType, data };
}
