export interface ImportedMockupPosture {
	id: string;
	label: string;
}

export interface ImportedHtmlMockup {
	id: string;
	name: string;
	html: string;
	width: number;
	height: number;
	/** Ordered physical postures declared by the imported mockup. */
	postures: ImportedMockupPosture[];
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
	const postureResult = parseMockupPostures(document);
	if (!postureResult.ok) return postureResult;

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
	const width = dimension(document.documentElement.getAttribute('data-book-designer-width'), 460);
	const height = dimension(document.documentElement.getAttribute('data-book-designer-height'), 700);
	return {
		ok: true,
		mockup: {
			id: `imported-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
			name: name.replace(/\.(html?|xhtml)$/i, '') || 'Imported mockup',
			html: `<!doctype html>${document.documentElement.outerHTML}`,
			width,
			height,
			postures: postureResult.postures,
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
		postures.push({ id: candidate.id, label: typeof candidate.label === 'string' && candidate.label.trim() ? candidate.label.trim() : defaultPostureLabel(candidate.id) });
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
		return postures
			? { ok: true, postures }
			: { ok: false, error: 'Fold postures must begin with "unfold" and continue as "fold1", "fold2", and so on.' };
	} catch {
		return { ok: false, error: 'The book-designer-postures meta tag must contain valid JSON.' };
	}
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
