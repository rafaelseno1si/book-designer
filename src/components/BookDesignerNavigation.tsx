import { ObsidianIcon } from './ObsidianIcon';

interface BookDesignerNavigationProps {
	collapsed: boolean;
	canOpenPreview: boolean;
	onToggleCollapsed: () => void;
	onOpenPreview: () => void;
}

export function BookDesignerNavigation({
	collapsed,
	canOpenPreview,
	onToggleCollapsed,
	onOpenPreview,
}: BookDesignerNavigationProps) {
	const collapseLabel = collapsed ? 'Expand navigation' : 'Collapse navigation';

	return (
		<aside className="book-designer-navigation">
			<div className="book-designer-navigation-header">
				<div className="book-designer-identity" aria-label="Book Designer" title="Book Designer">
					<ObsidianIcon name="book-open" />
					<span>Book Designer</span>
				</div>
				<button
					type="button"
					className="book-designer-collapse-button"
					onClick={onToggleCollapsed}
					aria-label={collapseLabel}
					title={collapseLabel}
				>
					<ObsidianIcon name={collapsed ? 'panel-left-open' : 'panel-left-close'} />
				</button>
			</div>
			<nav className="book-designer-menu" aria-label="Book Designer sections">
				<button
					type="button"
					className="book-designer-menu-item is-selected"
					aria-current="page"
					aria-label="Project file"
					title={collapsed ? 'Project file' : undefined}
				>
					<ObsidianIcon name="file-cog" />
					<span>Project file</span>
				</button>
				<button
					type="button"
					className="book-designer-menu-item"
					onClick={onOpenPreview}
					disabled={!canOpenPreview}
					aria-label="Open preview"
					title={canOpenPreview ? 'Open preview' : 'Create or open a project before opening Preview'}
				>
					<ObsidianIcon name="eye" />
					<span>Open preview</span>
				</button>
			</nav>
		</aside>
	);
}
