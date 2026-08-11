import { ItemView, WorkspaceLeaf } from 'obsidian';
import { StrictMode } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { BookDesignerApp } from '../components/BookDesignerApp';
import { BOOK_DESIGNER_ICON, BOOK_DESIGNER_VIEW_TYPE } from '../plugin/constants';
import type { BookProjectStore } from '../plugin/project-store';

export class BookDesignerView extends ItemView {
	private root: Root | null = null;
	private readonly projectStore: BookProjectStore;

	constructor(leaf: WorkspaceLeaf, projectStore: BookProjectStore) {
		super(leaf);
		this.projectStore = projectStore;
	}

	getViewType() {
		return BOOK_DESIGNER_VIEW_TYPE;
	}

	getDisplayText() {
		return 'Book designer';
	}

	getIcon() {
		return BOOK_DESIGNER_ICON;
	}

	async onOpen() {
		this.contentEl.empty();
		this.contentEl.addClass('book-designer-view-host');

		const mountEl = this.contentEl.createDiv({
			cls: 'book-designer-react-root',
		});

		this.root = createRoot(mountEl);
		this.root.render(
			<StrictMode>
				<BookDesignerApp projectStore={this.projectStore} />
			</StrictMode>,
		);
	}

	async onClose() {
		this.root?.unmount();
		this.root = null;
		this.contentEl.empty();
		this.contentEl.removeClass('book-designer-view-host');
	}
}
