import type { ProjectManagementActions } from '../plugin/project-management';
import type { BookProjectSnapshot, BookProjectStore } from '../plugin/project-store';
import { ObsidianIcon } from './ObsidianIcon';
import { ProjectList } from './ProjectList';

interface ProjectFilePanelProps {
	snapshot: BookProjectSnapshot;
	projectStore: BookProjectStore;
	actions: ProjectManagementActions;
}

export function ProjectFilePanel({ snapshot, projectStore, actions }: ProjectFilePanelProps) {
	const activeProjectId = snapshot.activeProject?.id ?? null;

	return (
		<section className="book-designer-project-panel" aria-labelledby="book-designer-project-heading">
			<header className="book-designer-project-header">
				<div>
					<p className="book-designer-section-label">Workspace</p>
					<h1 id="book-designer-project-heading">Project file</h1>
					<p>Manage saved project configurations. Manuscript notes stay in their vault folders.</p>
				</div>
				<div className="book-designer-project-count" aria-label={`${snapshot.registry.projects.length} saved projects`}>
					<strong>{snapshot.registry.projects.length}</strong>
					<span>{snapshot.registry.projects.length === 1 ? 'project' : 'projects'}</span>
				</div>
			</header>

			<div className="book-designer-project-toolbar" aria-label="Project actions">
				<ActionButton icon="plus" label="Create new" primary onClick={() => { void actions.createProject(); }} />
				<ActionButton icon="copy" label="Save as" disabled={!activeProjectId} onClick={() => { if (activeProjectId) void actions.saveProjectAs(activeProjectId); }} />
				<ActionButton icon="folder-open" label="Open/import" onClick={() => { void actions.importProject(); }} />
				<ActionButton icon="upload" label="Export" disabled={!activeProjectId} onClick={() => { if (activeProjectId) void actions.exportProject(activeProjectId); }} />
			</div>

			<ProjectList
				projects={snapshot.registry.projects}
				activeProjectId={activeProjectId}
				onSelect={(projectId) => projectStore.selectProject(projectId)}
				onRename={(projectId) => { void actions.renameProject(projectId); }}
				onDelete={(projectId) => { void actions.deleteProject(projectId); }}
			/>
		</section>
	);
}

function ActionButton({
	icon,
	label,
	primary = false,
	disabled = false,
	onClick,
}: {
	icon: Parameters<typeof ObsidianIcon>[0]['name'];
	label: string;
	primary?: boolean;
	disabled?: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			className={`book-designer-toolbar-button${primary ? ' is-primary' : ''}`}
			disabled={disabled}
			onClick={onClick}
		>
			<ObsidianIcon name={icon} />
			<span>{label}</span>
		</button>
	);
}
