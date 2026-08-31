import { canonical } from '../../core/elements/validation';
import type { BookProjectStore } from '../project-store';
import { elementContext } from './context';
import { libraryEntries } from './library';
import type { ElementCompiler } from './compiler';

export class ElementRenderRuntime {
	private key = '';
	private projectId: string | null = null;
	private generation = 0;
	private cancelCompilation: (() => void) | null = null;
	private unsubscribe: () => void;
	private message: string | null = null;
	get diagnostic(): string | null {
		return this.message;
	}
	set diagnostic(message: string | null) {
		this.message = message;
		this.store.setElementDiagnostic(message);
	}
	constructor(
		private readonly store: BookProjectStore,
		private readonly compiler: ElementCompiler,
		private readonly notify: () => void,
	) {
		this.unsubscribe = store.subscribe(() => this.refresh());
		this.refresh();
	}
	refresh(force = false): void {
		const snapshot = this.store.getSnapshot();
		const project = snapshot.activeProject;
		const design = snapshot.runtime.previewDesign ?? project?.design;
		const assignment = design?.elements?.blockquote;
		const entry = assignment
			? libraryEntries(snapshot.registry).find((entry) => entry.id === assignment.elementId)
			: null;
		const context = design
			? elementContext(project, design, snapshot.runtime.previewPrintSettings)
			: null;
		const key = canonical({
			project: project?.id,
			assignment,
			source: entry?.package,
			enabled: entry?.enabled,
			context,
		});
		if (!force && key === this.key) return;
		this.key = key;
		const generation = ++this.generation;
		this.cancelCompilation?.();
		const changedProject = this.projectId !== project?.id;
		this.projectId = project?.id ?? null;
		if (changedProject || !assignment || !entry?.enabled || force) this.store.setElementArtifact(null);
		this.diagnostic = null;
		if (!assignment || !project || !context) {
			this.notify();
			return;
		}
		if (!entry) {
			this.diagnostic = 'Assigned element is unavailable. Using a standard blockquote.';
			this.notify();
			return;
		}
		this.cancelCompilation = this.compiler.schedule(
			entry,
			assignment,
			context,
			(artifact) => {
				if (generation !== this.generation) return;
				this.store.setElementArtifact(artifact);
				this.diagnostic = null;
				this.notify();
			},
			(error: unknown) => {
				if (generation !== this.generation) return;
				this.store.setElementArtifact(null);
				this.diagnostic = error instanceof Error ? error.message : 'Element compilation failed.';
				this.notify();
			},
		);
	}
	dispose(): void {
		this.generation++;
		this.cancelCompilation?.();
		this.unsubscribe();
	}
}
