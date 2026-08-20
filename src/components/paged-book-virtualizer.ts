const PAGE_BUFFER = 2;

interface VirtualPage {
	content: DocumentFragment;
	slot: HTMLElement;
}

/**
 * Virtualizes already-paginated, viewport-height pages. Unlike content
 * virtualization, each page is a complete, independent DOM snapshot: mounting
 * or unmounting one can never cause text from a neighboring page to overlap or
 * repeat.
 */
export class PagedBookVirtualizer {
	private readonly mounted = new Set<number>();

	private constructor(private readonly document: Document, private readonly pages: VirtualPage[]) {}

	static create(document: Document): PagedBookVirtualizer | null {
		const book = document.querySelector<HTMLElement>('.book');
		if (!book) return null;
		const pages = Array.from(book.querySelectorAll<HTMLElement>(':scope > .book-page'));
		if (pages.length === 0) return null;
		const virtualPages = pages.map((page, index) => ({
			content: cloneIntoFragment(document, page),
			slot: createSlot(document, index),
		}));
		book.replaceChildren(...virtualPages.map((page) => page.slot));
		return new PagedBookVirtualizer(document, virtualPages);
	}

	get count(): number { return this.pages.length; }

	update(scrollTop: number): void {
		const active = this.nearestIndex(scrollTop);
		const first = Math.max(0, active - PAGE_BUFFER);
		const last = Math.min(this.pages.length - 1, active + PAGE_BUFFER);
		for (let index = first; index <= last; index += 1) this.mount(index);
		for (const index of Array.from(this.mounted)) {
			if (index < first || index > last) this.unmount(index);
		}
	}

	scrollToIndex(index: number): void {
		const page = this.pages[Math.min(Math.max(index, 0), this.pages.length - 1)];
		// scrollIntoView() is allowed to walk out through ancestor frames. In an
		// imported device it can therefore move Book Preview's outer canvas rather
		// than just the manuscript. Target only the nested reader window.
		this.document.defaultView?.scrollTo({ top: page?.slot.offsetTop ?? 0, left: 0, behavior: 'auto' });
	}

	nearestIndex(scrollTop: number): number {
		let nearestIndex = 0;
		let nearestDistance = Number.POSITIVE_INFINITY;
		for (const [index, page] of this.pages.entries()) {
			const distance = Math.abs(page.slot.offsetTop - scrollTop);
			if (distance < nearestDistance) {
				nearestIndex = index;
				nearestDistance = distance;
			}
		}
		return nearestIndex;
	}

	dispose(): void { this.mounted.clear(); }

	private mount(index: number): void {
		if (this.mounted.has(index)) return;
		const page = this.pages[index];
		if (!page) return;
		page.slot.replaceChildren(page.content.cloneNode(true));
		this.mounted.add(index);
	}

	private unmount(index: number): void {
		const page = this.pages[index];
		if (!page) return;
		page.slot.replaceChildren();
		this.mounted.delete(index);
	}
}

function createSlot(document: Document, index: number): HTMLElement {
	const slot = document.createElement('div');
	slot.className = 'book-page-slot';
	slot.dataset.pageIndex = String(index);
	return slot;
}

function cloneIntoFragment(document: Document, element: Element): DocumentFragment {
	const fragment = document.createDocumentFragment();
	fragment.append(element.cloneNode(true));
	return fragment;
}
