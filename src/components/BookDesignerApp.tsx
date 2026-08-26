import { useState } from 'react';
import type { ProjectManagementActions } from '../plugin/project-management';
import type { BookProjectStore } from '../plugin/project-store';
import { BookDesignerNavigation } from './BookDesignerNavigation';
import { ProjectFilePanel } from './ProjectFilePanel';
import { useBookProject } from './useBookProject';

interface BookDesignerAppProps {
	projectStore: BookProjectStore;
	projectActions: ProjectManagementActions;
	onOpenPreview: () => void;
}

export function BookDesignerApp({
	projectStore,
	projectActions,
	onOpenPreview,
}: BookDesignerAppProps) {
	const snapshot = useBookProject(projectStore);
	const [navigationCollapsed, setNavigationCollapsed] = useState(false);

	return (
		<section
			className={`book-designer-shell${navigationCollapsed ? ' is-navigation-collapsed' : ''}`}
			aria-label="Book Designer"
		>
			<BookDesignerNavigation
				collapsed={navigationCollapsed}
				canOpenPreview={snapshot.activeProject !== null}
				onToggleCollapsed={() => setNavigationCollapsed((collapsed) => !collapsed)}
				onOpenPreview={onOpenPreview}
			/>
			<main className="book-designer-workspace">
				<ProjectFilePanel
					snapshot={snapshot}
					projectStore={projectStore}
					actions={projectActions}
				/>
			</main>
		</section>
	);
}
