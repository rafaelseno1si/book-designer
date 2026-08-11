import { ItemView, WorkspaceLeaf } from 'obsidian';
import { StrictMode } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { BookDesignerApp } from '../components/BookDesignerApp';
import { BOOK_DESIGNER_ICON, BOOK_DESIGNER_VIEW_TYPE } from '../plugin/constants';
import type { BookProjectStore } from '../plugin/project-store';

export class BookDesignerView extends ItemView {
	private root: Root | null = null;
	private readonly projectStore: BookProjectStore;
	private readonly openPreview: () => void;
	private readonly createProject: () => void;

	constructor(
		leaf: WorkspaceLeaf,
		projectStore: BookProjectStore,
		openPreview: () => void,
		createProject: () => void,
	) {
		super(leaf);
		this.projectStore = projectStore;
		this.openPreview = openPreview;
		this.createProject = createProject;
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
				<BookDesignerApp
					projectStore={this.projectStore}
					onOpenPreview={this.openPreview}
					onCreateProject={this.createProject}
				/>
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
