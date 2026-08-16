export const PREVIEW_MOCKUP_IDS = ['plain', 'kindle-paperwhite'] as const;
export type PreviewMockupId = (typeof PREVIEW_MOCKUP_IDS)[number];

export interface PreviewMockupDefinition {
	id: PreviewMockupId;
	name: string;
	screen: {
		top: number;
		left: number;
		width: number;
		height: number;
		borderRadius: number;
	};
}

/**
 * Built-in mockups use the same declarative geometry expected from future
 * imported manifests. The frame remains outside the preview iframe, while the
 * book renderer always mounts in the screen slot.
 */
export const PREVIEW_MOCKUPS: Record<PreviewMockupId, PreviewMockupDefinition> = {
	plain: {
		id: 'plain', name: 'Plain frame',
		screen: { top: 0, left: 0, width: 100, height: 100, borderRadius: 0 },
	},
	'kindle-paperwhite': {
		id: 'kindle-paperwhite', name: 'Kindle Paperwhite',
		// Derived from the supplied mockup: 106.9 × 142.08 mm screen inside a
		// 127.6 × 176.7 mm body, with a 10.9 mm top inset.
		screen: { top: 6.17, left: 8.11, width: 83.78, height: 80.41, borderRadius: 1.25 },
	},
};

export function isPreviewMockupId(value: unknown): value is PreviewMockupId {
	return typeof value === 'string' && PREVIEW_MOCKUP_IDS.some((id) => id === value);
}

export function previewMockup(id: PreviewMockupId): PreviewMockupDefinition {
	return PREVIEW_MOCKUPS[id];
}

/**
 * Contract for future user-imported mockups. Importers should parse only this
 * JSON shape and should never inject arbitrary HTML, CSS, or JavaScript.
 */
export interface ImportedMockupManifest {
	version: 1;
	id: string;
	name: string;
	screen: PreviewMockupDefinition['screen'];
	frame: {
		background: string;
		borderColor: string;
		borderRadius: number;
	};
}

export function parseImportedMockupManifest(value: unknown): ImportedMockupManifest | null {
	if (!isRecord(value) || value.version !== 1 || typeof value.id !== 'string' || typeof value.name !== 'string' || !isRecord(value.screen) || !isRecord(value.frame)) return null;
	const screen = value.screen;
	const frame = value.frame;
	if (!validPercentage(screen.top) || !validPercentage(screen.left) || !validPercentage(screen.width) || !validPercentage(screen.height) || !validRadius(screen.borderRadius)) return null;
	if (!isSafeColor(frame.background) || !isSafeColor(frame.borderColor) || !validRadius(frame.borderRadius)) return null;
	return {
		version: 1,
		id: value.id,
		name: value.name,
		screen: { top: screen.top, left: screen.left, width: screen.width, height: screen.height, borderRadius: screen.borderRadius },
		frame: { background: frame.background, borderColor: frame.borderColor, borderRadius: frame.borderRadius },
	};
}

function validPercentage(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100; }
function validRadius(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 50; }
function isSafeColor(value: unknown): value is string { return typeof value === 'string' && /^#[\da-f]{3,8}$/i.test(value); }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
