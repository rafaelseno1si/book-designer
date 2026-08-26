import type { BookProject } from '../plugin/project-store';
import { ObsidianIcon } from './ObsidianIcon';

interface ProjectListProps {
	projects: BookProject[];
	activeProjectId: string | null;
	onSelect: (projectId: string) => void;
	onRename: (projectId: string) => void;
	onDelete: (projectId: string) => void;
}

export function ProjectList({ projects, activeProjectId, onSelect, onRename, onDelete }: ProjectListProps) {
	if (projects.length === 0) {
		return (
			<div className="book-designer-project-empty">
				<ObsidianIcon name="files" />
				<h2>No projects yet</h2>
				<p>Create a project from a manuscript folder, or open a portable <code>.book-designer.json</code> file.</p>
			</div>
		);
	}

	return (
		<div className="book-designer-project-list-wrap">
			<div className="book-designer-list-heading" aria-hidden="true">
				<span>Project</span>
				<span>Manuscript folder</span>
				<span>Actions</span>
			</div>
			<ul className="book-designer-project-list" aria-label="Saved Book Designer projects">
				{projects.map((project) => {
					const active = project.id === activeProjectId;
					return (
						<li key={project.id} className={active ? 'is-active' : undefined}>
							<button
								type="button"
								className="book-designer-project-open"
								onClick={() => onSelect(project.id)}
								aria-pressed={active}
							>
								<span className="book-designer-project-name">
									<strong>{project.name}</strong>
									{active && <span className="book-designer-active-badge"><ObsidianIcon name="check" />Active</span>}
								</span>
								<span className="book-designer-project-path" title={project.source.path || 'Vault root'}>
									<ObsidianIcon name="folder" />
									<span>{project.source.path || 'Vault root'}</span>
								</span>
							</button>
							<div className="book-designer-row-actions">
								<button type="button" onClick={() => onRename(project.id)} aria-label={`Rename ${project.name}`} title="Rename project"><ObsidianIcon name="pencil" /></button>
								<button type="button" className="is-danger" onClick={() => onDelete(project.id)} aria-label={`Delete ${project.name}`} title="Delete project"><ObsidianIcon name="trash-2" /></button>
							</div>
						</li>
					);
				})}
			</ul>
		</div>
	);
}
