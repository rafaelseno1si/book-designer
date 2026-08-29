import { ObsidianIcon } from './ObsidianIcon';

interface BookDesignerNavigationProps {
	collapsed: boolean;
	activeSection: 'project-file' | 'themes';
	canOpenPreview: boolean;
	onToggleCollapsed: () => void;
	onSelectSection: (section: 'project-file' | 'themes') => void;
	onOpenPreview: () => void;
}

export function BookDesignerNavigation({
	collapsed,
	activeSection,
	canOpenPreview,
	onToggleCollapsed,
	onSelectSection,
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
					className={`book-designer-menu-item${activeSection === 'project-file' ? ' is-selected' : ''}`}
					aria-current={activeSection === 'project-file' ? 'page' : undefined}
					aria-label="Project file"
					title={collapsed ? 'Project file' : undefined}
					onClick={() => onSelectSection('project-file')}
				>
					<ObsidianIcon name="file-cog" />
					<span>Project file</span>
				</button>
				<button
					type="button"
					className={`book-designer-menu-item${activeSection === 'themes' ? ' is-selected' : ''}`}
					aria-current={activeSection === 'themes' ? 'page' : undefined}
					aria-label="Themes"
					title={collapsed ? 'Themes' : undefined}
					onClick={() => onSelectSection('themes')}
				>
					<ObsidianIcon name="palette" />
					<span>Themes</span>
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
