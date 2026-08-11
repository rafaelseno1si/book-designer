import { ItemView, WorkspaceLeaf } from 'obsidian';
import { StrictMode } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { BookPreviewApp } from '../components/BookPreviewApp';
import {
	BOOK_PREVIEW_ICON,
	BOOK_PREVIEW_VIEW_TYPE,
} from '../plugin/constants';
import type { BookProjectStore } from '../plugin/project-store';
import type { BookDesignerSettings } from '../plugin/settings';

export class BookPreviewView extends ItemView {
	private root: Root | null = null;
	private readonly projectStore: BookProjectStore;
	private readonly getSettings: () => BookDesignerSettings;

	constructor(
		leaf: WorkspaceLeaf,
		projectStore: BookProjectStore,
		getSettings: () => BookDesignerSettings,
	) {
		super(leaf);
		this.projectStore = projectStore;
		this.getSettings = getSettings;
	}

	getViewType() {
		return BOOK_PREVIEW_VIEW_TYPE;
	}

	getDisplayText() {
		return 'Book preview';
	}

	getIcon() {
		return BOOK_PREVIEW_ICON;
	}

	async onOpen() {
		this.contentEl.empty();
		this.contentEl.addClass('book-preview-view-host');

		const mountEl = this.contentEl.createDiv({
			cls: 'book-preview-react-root',
		});

		this.root = createRoot(mountEl);
		this.root.render(
			<StrictMode>
				<BookPreviewApp
					projectStore={this.projectStore}
					settings={this.getSettings()}
				/>
			</StrictMode>,
		);
	}

	async onClose() {
		this.root?.unmount();
		this.root = null;
		this.contentEl.empty();
		this.contentEl.removeClass('book-preview-view-host');
	}
}
