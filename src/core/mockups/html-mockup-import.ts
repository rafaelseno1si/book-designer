export interface ImportedHtmlMockup {
	id: string;
	name: string;
	html: string;
	width: number;
	height: number;
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
		},
	};
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
