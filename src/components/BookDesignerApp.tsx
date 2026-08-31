import { useState } from 'react';
import type { ProjectManagementActions } from '../plugin/project-management';
import type { BookProjectStore } from '../plugin/project-store';
import { BookDesignerNavigation, type BookDesignerSection } from './BookDesignerNavigation';
import { ProjectFilePanel } from './ProjectFilePanel';
import { PrintSettingsPanel } from './PrintSettingsPanel';
import { ThemesPanel } from './ThemesPanel';
import { useBookProject } from './useBookProject';
import type { ElementManagementService } from '../plugin/elements/management';
import { ElementServices } from './elements/ElementServices';
import { ElementsPage } from './elements/ElementsPage';

interface BookDesignerAppProps {
	elements: ElementManagementService;
	projectStore: BookProjectStore;
	projectActions: ProjectManagementActions;
	onOpenPreview: () => void;
}

export function BookDesignerApp({
	projectStore,
	projectActions,
	onOpenPreview,
	elements,
}: BookDesignerAppProps) {
	const snapshot = useBookProject(projectStore);
	const [navigationCollapsed, setNavigationCollapsed] = useState(false);
	const [activeSection, setActiveSection] = useState<BookDesignerSection>('project-file');
	const [printSettingsDirty, setPrintSettingsDirty] = useState(false);
	const [pendingSection, setPendingSection] = useState<BookDesignerSection | null>(null);
	const selectSection = (section: BookDesignerSection) => {
		if (activeSection === 'print-settings' && printSettingsDirty && section !== activeSection) {
			setPendingSection(section);
			return;
		}
		setActiveSection(section);
	};
	const discardAndNavigate = () => {
		if (!pendingSection) return;
		setPrintSettingsDirty(false);
		setActiveSection(pendingSection);
		setPendingSection(null);
	};

	return (
		<ElementServices.Provider value={elements}><section
			className={`book-designer-shell${navigationCollapsed ? ' is-navigation-collapsed' : ''}`}
			aria-label="Book Designer"
		>
			<BookDesignerNavigation
				collapsed={navigationCollapsed}
				activeSection={activeSection}
				canOpenPreview={snapshot.activeProject !== null}
				onToggleCollapsed={() => setNavigationCollapsed((collapsed) => !collapsed)}
				onSelectSection={selectSection}
				onOpenPreview={onOpenPreview}
			/>
			<main className="book-designer-workspace">
				{activeSection === 'project-file' ? <ProjectFilePanel
					snapshot={snapshot}
					projectStore={projectStore}
					actions={projectActions}
				/> : activeSection === 'themes'
					? <ThemesPanel snapshot={snapshot} projectStore={projectStore} onManageElements={() => selectSection('elements')} />
					: activeSection === 'elements' ? <ElementsPage />
					: <PrintSettingsPanel snapshot={snapshot} projectStore={projectStore} onDirtyChange={setPrintSettingsDirty} />}
			</main>
			{pendingSection && <div className="book-designer-confirm-backdrop" role="presentation">
				<div className="book-designer-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="book-designer-discard-print-title">
					<h2 id="book-designer-discard-print-title">Discard print setting changes?</h2>
					<p>Your draft has not been applied to this project.</p>
					<div><button type="button" onClick={() => setPendingSection(null)}>Keep editing</button><button type="button" className="mod-warning" onClick={discardAndNavigate}>Discard changes</button></div>
				</div>
			</div>}
		</section></ElementServices.Provider>
	);
}
