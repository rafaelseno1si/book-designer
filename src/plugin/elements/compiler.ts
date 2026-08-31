import { inspectElementPackage } from '../../core/elements/manifest';
import { validateElementOutput } from '../../core/elements/output-validation';
import { resolveElementSettings } from '../../core/elements/settings';
import {
	BUILTIN_BLOCKQUOTE_ID,
	type ElementArtifact,
	type ElementAssignment,
	type ElementContext,
	type ElementLibraryEntry,
	type InspectedElement,
} from '../../core/elements/types';
import { canonical, contentDigest } from '../../core/elements/validation';
import { ElementApprovals } from './approval';
import { ElementSandbox, verifyElementIsolation } from './sandbox-host';

export class ElementCompiler {
	private readonly scheduled = new Set<() => void>();
	private readonly cache = new Map<string, Promise<ElementArtifact>>();
	private readonly inspected = new Map<string, InspectedElement>();
	private queue: Promise<unknown> = Promise.resolve();
	private runner: ElementSandbox | null = null;
	private readonly editors = new Set<ElementSandbox>();
	private generation = 0;
	private disposed = false;
	private isolation: Promise<boolean> | null = null;
	private readonly isolationAbort = new AbortController();
	private queued = 0;
	constructor(
		private readonly container: HTMLElement,
		readonly approvals: ElementApprovals,
	) {}
	getGeneration(): number {
		return this.generation;
	}
	inspect(entry: ElementLibraryEntry): InspectedElement {
		const html = entry.package.files['index.html'];
		let value = this.inspected.get(html);
		if (!value) {
			value = inspectElementPackage(entry.package);
			if (this.inspected.size >= 32) this.inspected.clear();
			this.inspected.set(html, value);
		}
		return value;
	}
	async digest(entry: ElementLibraryEntry): Promise<string> {
		const digest = await contentDigest(entry.package.files['index.html']);
		if (entry.contentDigest && entry.contentDigest !== digest)
			throw new Error('Element content digest does not match. Replace or reimport the file.');
		return digest;
	}
	async allowed(entry: ElementLibraryEntry): Promise<void> {
		if (this.disposed) throw new Error('Element compiler closed.');
		if (!entry.enabled) throw new Error('Element disabled. Using a standard blockquote.');
		if (entry.id === BUILTIN_BLOCKQUOTE_ID) return;
		if (!this.approvals.has(await this.digest(entry)))
			throw new Error('Approve this element in Elements before running its authoring code.');
		if (!this.isolation) {
			this.isolation = this.queue
				.catch(() => undefined)
				.then(() => verifyElementIsolation(this.container, this.isolationAbort.signal));
			this.queue = this.isolation;
		}
		if (!(await this.isolation))
			throw new Error('Imported execution is disabled: this host did not pass the isolation check.');
	}
	async compile(
		entry: ElementLibraryEntry,
		assignment: ElementAssignment,
		context: ElementContext,
	): Promise<ElementArtifact> {
		const generation = this.generation;
		await this.allowed(entry);
		const inspected = this.inspect(entry);
		const settings = resolveElementSettings(inspected.manifest, assignment);
		const key = await contentDigest(
			canonical({ digest: await this.digest(entry), settings, context, validator: 1 }),
		);
		if (generation !== this.generation || this.disposed)
			throw new Error('Element request was superseded.');
		const cached = this.cache.get(key);
		if (cached) return cached;
		if (this.queued >= 32)
			throw new Error('Element compilation queue is full. Try the preview again shortly.');
		this.queued++;
		const task = this.queue
			.catch(() => undefined)
			.then(async () => {
				if (generation !== this.generation || this.disposed)
					throw new Error('Element request was superseded.');
				const runner = new ElementSandbox(this.container, inspected);
				this.runner = runner;
				try {
					const result = await runner.request('render', { settings, context }, 0);
					if (generation !== this.generation) throw new Error('Element request was superseded.');
					return validateElementOutput(result, key);
				} finally {
					runner.dispose();
					if (this.runner === runner) this.runner = null;
				}
			});
		void task
			.finally(() => {
				this.queued--;
			})
			.catch(() => undefined);
		this.queue = task;
		if (this.cache.size >= 64) this.cache.delete(this.cache.keys().next().value ?? '');
		this.cache.set(key, task);
		void task.catch(() => {
			if (this.cache.get(key) === task) this.cache.delete(key);
		});
		return task;
	}
	/** Shared interactive scheduling; callers cancel on draft/selection changes. */
	schedule(
		entry: ElementLibraryEntry,
		assignment: ElementAssignment,
		context: ElementContext,
		onResult: (artifact: ElementArtifact) => void,
		onError: (error: unknown) => void,
	): () => void {
		let canceled = false;
		const cancel = () => {
			canceled = true;
			window.clearTimeout(timer);
			this.scheduled.delete(cancel);
		};
		const timer = window.setTimeout(() => {
			void this.compile(entry, assignment, context)
				.then((artifact) => {
					if (!canceled) onResult(artifact);
				})
				.catch((error: unknown) => {
					if (!canceled) onError(error);
				})
				.finally(cancel);
		}, 120);
		this.scheduled.add(cancel);
		return cancel;
	}
	async editor(container: HTMLElement, entry: ElementLibraryEntry): Promise<ElementSandbox> {
		const generation = this.generation;
		await this.allowed(entry);
		if (generation !== this.generation || this.disposed)
			throw new Error('Element request was superseded.');
		if (this.editors.size) throw new Error('Close the other element editor before opening this one.');
		const editor = new ElementSandbox(container, this.inspect(entry));
		this.editors.add(editor);
		return editor;
	}
	releaseEditor(editor: ElementSandbox): void {
		editor.dispose();
		this.editors.delete(editor);
	}
	invalidate(): void {
		this.generation++;
		for (const cancel of this.scheduled) cancel();
		this.cache.clear();
		this.runner?.dispose();
		for (const editor of this.editors) editor.dispose();
		this.editors.clear();
	}
	dispose(): void {
		this.disposed = true;
		this.isolationAbort.abort();
		this.invalidate();
		this.container.remove();
	}
}
