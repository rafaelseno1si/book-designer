export interface MockupFrameBounds {
	/** Native CSS pixels, measured from the mockup document's top-left corner. */
	left: number;
	top: number;
	width: number;
	height: number;
}

export interface ImportedMockupPosture {
	id: string;
	label: string;
	/** Final visual frame bounds for this posture. Required for foldable imports. */
	frame: MockupFrameBounds | null;
}

export type MockupColorMode = 'none' | 'tonal-ramp';
export type MockupHardwareColorMode = 'fixed' | 'dynamic';
export interface MockupColorConfig {
	/** `tonal-ramp` exposes the Frame color picker; `none` keeps authored colors. */
	mode: MockupColorMode;
	/** Whether authored buttons/cameras intentionally follow the selected frame hue. */
	hardware: MockupHardwareColorMode;
}
export const DEFAULT_MOCKUP_COLOR_CONFIG: MockupColorConfig = { mode: 'none', hardware: 'fixed' };

export interface ImportedHtmlMockup {
	id: string;
	name: string;
	html: string;
	width: number;
	height: number;
	/** Ordered physical postures declared by the imported mockup. */
	postures: ImportedMockupPosture[];
	/** Declared color capability; no declaration means no color picker. */
	color: MockupColorConfig;
	/** Screen technology determines the reader simulation and available controls. */
	display: DeviceDisplayProfile;
}

export type HtmlMockupImportResult =
	| { ok: true; mockup: ImportedHtmlMockup }
	| { ok: false; error: string };

/**
 * Imports an HTML/CSS skin into a sandboxed outer iframe. The book preview is
 * mounted later into the required [data-book-designer-screen] slot.
 */
export function importHtmlMockup(source: string, name: string): HtmlMockupImportResult {
	const document = new DOMParser().parseFromString(source, 'text/html');
	const slot = document.querySelector<HTMLElement>('[data-book-designer-screen]');
	if (!slot) return { ok: false, error: 'Add an element with data-book-designer-screen where the book viewport should appear.' };
	const frameBounds = Array.from(document.querySelectorAll<HTMLElement>('[data-book-designer-frame]'));
	if (frameBounds.length > 1) return { ok: false, error: 'Use only one data-book-designer-frame element per mockup.' };
	if (frameBounds[0] && !frameBounds[0].contains(slot)) return { ok: false, error: 'The data-book-designer-frame element must contain data-book-designer-screen.' };
	const width = dimension(document.documentElement.getAttribute('data-book-designer-width'), 460);
	const height = dimension(document.documentElement.getAttribute('data-book-designer-height'), 700);
	const postureResult = parseMockupPostures(document);
	if (!postureResult.ok) return postureResult;
	if (postureResult.postures.length > 1 && !frameBounds[0]) return { ok: false, error: 'Foldable mockups must wrap their device and screen in one data-book-designer-frame element.' };
	if (postureResult.postures.some((posture) => posture.frame && (posture.frame.left + posture.frame.width > width || posture.frame.top + posture.frame.height > height))) {
		return { ok: false, error: 'A fold posture frame must stay inside the declared native mockup dimensions.' };
	}
	const colorResult = parseMockupColorConfig(document);
	if (!colorResult.ok) return colorResult;
	const displayResult = parseDisplayProfile(document);
	if (!displayResult.ok) return displayResult;
	if (colorResult.color.mode === 'tonal-ramp' && !Array.from(document.querySelectorAll('style')).some((style) => style.textContent?.includes('--book-designer-frame-color'))) {
		return { ok: false, error: 'A tonal-ramp mockup must use --book-designer-frame-color in its self-contained CSS.' };
	}

	for (const element of Array.from(document.querySelectorAll('script, noscript, base, link, iframe, object, embed'))) element.remove();
	for (const element of Array.from(document.querySelectorAll<HTMLElement>('*'))) {
		for (const attribute of Array.from(element.attributes)) {
			if (attribute.name.toLowerCase().startsWith('on')) element.removeAttribute(attribute.name);
		}
	}
	for (const style of Array.from(document.querySelectorAll('style'))) {
		style.textContent = sanitizeCss(style.textContent ?? '');
	}
	// An imported frame is rendered inside a fixed-size iframe. Mockup authors
	// often use overflow: visible for decorative device controls extending past
	// the body, which becomes a pair of iframe scrollbars. Keep the viewport
	// itself fixed and scrollbar-free instead.
	const viewportStyle = document.createElement('style');
	viewportStyle.dataset.bookDesignerMockupViewport = '';
	viewportStyle.textContent = 'html,body{overflow:hidden!important;scrollbar-width:none}html::-webkit-scrollbar,body::-webkit-scrollbar{display:none}';
	document.head.append(viewportStyle);

	slot.replaceChildren();
	slot.setAttribute('data-book-designer-screen', '');
	return {
		ok: true,
		mockup: {
			id: `imported-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
			name: name.replace(/\.(html?|xhtml)$/i, '') || 'Imported mockup',
			html: `<!doctype html>${document.documentElement.outerHTML}`,
			width,
			height,
			postures: postureResult.postures,
			color: colorResult.color,
			display: displayResult.display,
		},
	};
}

/**
 * Validates the deliberately small posture vocabulary so imported CSS can
 * depend on stable, predictable selectors. The declaration order is retained
 * because it is also the cycle order used by the preview control.
 */
export function normalizeMockupPostures(value: unknown): ImportedMockupPosture[] | null {
	if (!Array.isArray(value)) return null;
	const seen = new Set<string>();
	const postures: ImportedMockupPosture[] = [];
	for (const candidate of value) {
		if (!isRecord(candidate) || typeof candidate.id !== 'string' || !/^(unfold|fold[1-9]\d*)$/.test(candidate.id) || seen.has(candidate.id)) return null;
		seen.add(candidate.id);
		postures.push({
			id: candidate.id,
			label: typeof candidate.label === 'string' && candidate.label.trim() ? candidate.label.trim() : defaultPostureLabel(candidate.id),
			frame: normalizeMockupFrameBounds(candidate.frame),
		});
	}
	if (postures.length === 0 || postures[0]?.id !== 'unfold') return null;
	for (let index = 1; index < postures.length; index += 1) {
		if (postures[index]?.id !== `fold${index}`) return null;
	}
	return postures;
}

function parseMockupPostures(document: Document): { ok: true; postures: ImportedMockupPosture[] } | { ok: false; error: string } {
	const declaration = document.querySelector('meta[name="book-designer-postures"]')?.getAttribute('content');
	if (!declaration) return { ok: true, postures: [] };
	try {
		const postures = normalizeMockupPostures(JSON.parse(declaration));
		if (!postures) return { ok: false, error: 'Fold postures must begin with "unfold" and continue as "fold1", "fold2", and so on.' };
		if (postures.length > 1 && postures.some((posture) => !posture.frame)) {
			return { ok: false, error: 'Every fold posture must declare final frame bounds: { "frame": { "left": 0, "top": 0, "width": 390, "height": 844 } }.' };
		}
		return { ok: true, postures }
	} catch {
		return { ok: false, error: 'The book-designer-postures meta tag must contain valid JSON.' };
	}
}

/** Kept public for registry migration and focused validation tests. */
export function normalizeMockupColorConfig(value: unknown): MockupColorConfig | null {
	if (!isRecord(value) || (value.mode !== 'none' && value.mode !== 'tonal-ramp') || (value.hardware !== 'fixed' && value.hardware !== 'dynamic')) return null;
	return { mode: value.mode, hardware: value.hardware };
}

function parseMockupColorConfig(document: Document): { ok: true; color: MockupColorConfig } | { ok: false; error: string } {
	const declaration = document.querySelector('meta[name="book-designer-color"]')?.getAttribute('content');
	if (!declaration) return { ok: true, color: { ...DEFAULT_MOCKUP_COLOR_CONFIG } };
	try {
		const color = normalizeMockupColorConfig(JSON.parse(declaration));
		return color
			? { ok: true, color }
			: { ok: false, error: 'The book-designer-color meta tag must be { "mode": "none" | "tonal-ramp", "hardware": "fixed" | "dynamic" }.' };
	} catch {
		return { ok: false, error: 'The book-designer-color meta tag must contain valid JSON.' };
	}
}

function parseDisplayProfile(document: Document): { ok: true; display: DeviceDisplayProfile } | { ok: false; error: string } {
	const declaration = document.querySelector('meta[name="book-designer-display"]')?.getAttribute('content');
	if (!declaration) return { ok: true, display: { ...DEFAULT_DISPLAY_PROFILE } };
	try {
		const display = normalizeDisplayProfile(JSON.parse(declaration));
		return display
			? { ok: true, display }
			: { ok: false, error: 'The book-designer-display meta tag must be { "category": "oled-lcd" | "eink" }.' };
	} catch {
		return { ok: false, error: 'The book-designer-display meta tag must contain valid JSON.' };
	}
}

export function normalizeMockupFrameBounds(value: unknown): MockupFrameBounds | null {
	if (!isRecord(value)) return null;
	const { left, top, width, height } = value;
	if (typeof left !== 'number' || !Number.isFinite(left)
		|| typeof top !== 'number' || !Number.isFinite(top)
		|| typeof width !== 'number' || !Number.isFinite(width)
		|| typeof height !== 'number' || !Number.isFinite(height)) return null;
	if (left < 0 || top < 0 || width < 1 || height < 1) return null;
	return { left, top, width, height };
}

function defaultPostureLabel(id: string): string {
	return id === 'unfold' ? 'Unfolded' : `Fold ${id.slice('fold'.length)}`;
}

function sanitizeCss(css: string): string {
	return css
		.replace(/@import[^;]*;/gi, '')
		.replace(/url\([^)]*\)/gi, 'none')
		.replace(/expression\([^)]*\)/gi, '');
}

function dimension(value: string | null, fallback: number): number {
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed >= 200 && parsed <= 2000 ? Math.round(parsed) : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
import {
	DEFAULT_DISPLAY_PROFILE,
	normalizeDisplayProfile,
	type DeviceDisplayProfile,
} from './display-profile';
