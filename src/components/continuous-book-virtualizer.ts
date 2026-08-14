const WINDOW_BUFFER = 2;

interface VirtualSection {
	content: DocumentFragment;
	height: number;
	slot: HTMLElement;
}

/**
 * Keeps a small sliding window of book sections attached to the preview DOM.
 * The remaining sections are fixed-height placeholders, preserving the native
 * browser scroll bar without retaining the full manuscript layout tree.
 */
export class ContinuousBookVirtualizer {
	private readonly sections: VirtualSection[];
	private readonly rendered = new Set<number>();
	private offsets: number[] = [];
	private offsetsDirty = true;
	private measurementFrame: number | null = null;

	private constructor(
		private readonly document: Document,
		private readonly book: HTMLElement,
		sections: VirtualSection[],
	) { this.sections = sections; }

	static create(document: Document, estimatedSectionHeight: number): ContinuousBookVirtualizer | null {
		const book = document.querySelector<HTMLElement>('.book');
		if (!book) return null;
		const templates = Array.from(book.querySelectorAll<HTMLTemplateElement>(':scope > template[data-book-section-template]'));
		const existingSections = Array.from(book.querySelectorAll<HTMLElement>(':scope > [data-section-id]'));
		const source = templates.length > 0
			? templates.map((template) => template.content.cloneNode(true) as DocumentFragment)
			: existingSections.map((section) => cloneIntoFragment(document, section));
		if (source.length === 0) return null;
		const sections = source.map((content, index) => ({ content, height: estimatedSectionHeight, slot: createSlot(document, index, estimatedSectionHeight) }));
		book.replaceChildren(...sections.map((section) => section.slot));
		return new ContinuousBookVirtualizer(document, book, sections);
	}

	update(scrollTop: number, viewportHeight: number): void {
		if (this.sections.length === 0) return;
		const visible = this.visibleRange(scrollTop, viewportHeight);
		const first = Math.max(0, visible.first - WINDOW_BUFFER);
		const last = Math.min(this.sections.length - 1, visible.last + WINDOW_BUFFER);
		for (let index = first; index <= last; index += 1) this.mount(index);
		for (const index of Array.from(this.rendered)) {
			if (index < first || index > last) this.unmount(index);
		}
		this.scheduleMeasurement(scrollTop);
	}

	restoreAll(): void {
		this.cancelMeasurement();
		this.book.replaceChildren(...this.sections.map((section) => section.content.cloneNode(true)));
		this.rendered.clear();
	}

	dispose(): void { this.cancelMeasurement(); }

	private visibleRange(scrollTop: number, viewportHeight: number): { first: number; last: number } {
		this.ensureOffsets();
		return {
			first: this.indexAtOffset(scrollTop),
			last: this.indexAtOffset(scrollTop + viewportHeight),
		};
	}

	private mount(index: number): void {
		if (this.rendered.has(index)) return;
		const section = this.sections[index];
		if (!section) return;
		section.slot.style.removeProperty('height');
		section.slot.replaceChildren(section.content.cloneNode(true));
		this.rendered.add(index);
	}

	private unmount(index: number): void {
		const section = this.sections[index];
		if (!section) return;
		section.height = Math.max(1, section.slot.offsetHeight);
		this.offsetsDirty = true;
		section.slot.replaceChildren();
		section.slot.style.height = `${section.height}px`;
		this.rendered.delete(index);
	}

	private scheduleMeasurement(scrollTop: number): void {
		if (this.measurementFrame !== null) return;
		this.measurementFrame = window.requestAnimationFrame(() => {
			this.measurementFrame = null;
			let scrollAdjustment = 0;
			for (const index of this.rendered) {
				const section = this.sections[index];
				if (!section) continue;
				const measuredHeight = Math.max(1, section.slot.offsetHeight);
				if (section.slot.offsetTop < scrollTop) scrollAdjustment += measuredHeight - section.height;
				if (section.height !== measuredHeight) this.offsetsDirty = true;
				section.height = measuredHeight;
			}
			if (scrollAdjustment !== 0) this.document.defaultView?.scrollBy({ top: scrollAdjustment });
		});
	}

	private cancelMeasurement(): void {
		if (this.measurementFrame !== null) window.cancelAnimationFrame(this.measurementFrame);
		this.measurementFrame = null;
	}

	private ensureOffsets(): void {
		if (!this.offsetsDirty) return;
		const firstOffset = this.sections[0]?.slot.offsetTop ?? 0;
		let offset = firstOffset;
		this.offsets = this.sections.map((section) => {
			const start = offset;
			offset += section.height;
			return start;
		});
		this.offsetsDirty = false;
	}

	private indexAtOffset(offset: number): number {
		let low = 0;
		let high = this.sections.length - 1;
		while (low < high) {
			const middle = Math.floor((low + high) / 2);
			const start = this.offsets[middle] ?? 0;
			const height = this.sections[middle]?.height ?? 0;
			if (start + height > offset) high = middle;
			else low = middle + 1;
		}
		return low;
	}
}

function createSlot(document: Document, index: number, height: number): HTMLElement {
	const slot = document.createElement('div');
	slot.className = 'book-virtual-slot';
	slot.dataset.virtualSectionIndex = String(index);
	slot.style.height = `${height}px`;
	return slot;
}

function cloneIntoFragment(document: Document, element: Element): DocumentFragment {
	const fragment = document.createDocumentFragment();
	fragment.append(element.cloneNode(true));
	return fragment;
}
