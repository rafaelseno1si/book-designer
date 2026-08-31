import { App, FuzzySuggestModal, Notice, TFile } from 'obsidian';
import { inspectElementPackage, singleHtmlPackage } from '../../core/elements/manifest';
import type { ElementLibraryEntry, ElementPackage } from '../../core/elements/types';
import type { BookProjectRegistry, BookProjectStore } from '../project-store';
import { DEFAULT_PROJECT_DESIGN } from '../project-store';
import { confirmProjectAction, promptForText } from '../../views/ProjectManagementModals';
import { ElementCompiler } from './compiler';
import { ElementApprovals } from './approval';
import { ElementRenderRuntime } from './runtime';
import { elementContext } from './context';
import { cloneEntry, elementUses, libraryEntries, replacementRegistry, verifyEntryDigest } from './library';

export class ElementManagementService {
	readonly compiler: ElementCompiler;
	readonly runtime: ElementRenderRuntime;
	private readonly listeners = new Set<() => void>();
	private revision = 0;
	constructor(
		private readonly app: App,
		readonly store: BookProjectStore,
	) {
		// Obsidian's Node.createDiv appends to its receiver, so use the body,
		// never the Document (which already has its single root element).
		const container = document.body.createDiv({ cls: 'book-designer-element-background' });
		container.setAttribute('aria-hidden', 'true');
		this.compiler = new ElementCompiler(container, new ElementApprovals(app));
		this.runtime = new ElementRenderRuntime(store, this.compiler, () => this.notify());
	}
	subscribe = (listener: () => void): (() => void) => {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	};
	getRevision = (): number => this.revision;
	private notify(): void {
		this.revision++;
		for (const listener of this.listeners) listener();
	}
	entries(): ElementLibraryEntry[] {
		return libraryEntries(this.store.getSnapshot().registry);
	}
	async approve(entry: ElementLibraryEntry): Promise<boolean> {
		let digest: string;
		try {
			digest = await this.compiler.digest(entry);
		} catch (error) {
			new Notice(error instanceof Error ? error.message : 'Unable to verify element content.');
			return false;
		}
		if (this.compiler.approvals.has(digest)) return true;
		const accepted = await confirmProjectAction(
			this.app,
			'Activate element?',
			`“${entry.name}” contains authoring JavaScript. Only activate files from authors you trust. Code runs in an isolated editor, never in publication output. Isolation cannot guarantee CPU/memory limits or total network containment. Approval is ${this.compiler.approvals.remembered ? 'remembered on this device for this vault' : 'for this session only (Obsidian 1.8.7+ supports remembered approval)'}. Content: ${digest.slice(0, 16)}.`,
			'Approve authoring code',
		);
		if (!accepted) return false;
		try {
			this.compiler.approvals.approve(digest);
		} catch {
			new Notice('Approval could not be saved. Element execution remains disabled.');
			return false;
		}
		this.runtime.refresh(true);
		this.notify();
		return true;
	}
	async importElement(): Promise<void> {
		await this.report(async () => {
			const packageValue = await this.pickPackage();
			if (!packageValue) return;
			const manifest = inspectElementPackage(packageValue).manifest;
			const accepted = await confirmProjectAction(
				this.app,
				'Import element?',
				`${manifest.name} · ${manifest.packageVersion} · ${manifest.category}. ${manifest.description ?? ''} This file contains authoring code. Importing does not execute it.`,
				'Import as new',
			);
			if (!accepted) return;
			const entry = await verifyEntryDigest({
				id: `element-${crypto.randomUUID()}`,
				name: manifest.name,
				description: manifest.description ?? '',
				enabled: true,
				package: packageValue,
			});
			await this.save((registry) => ({ ...registry, elements: [...(registry.elements ?? []), entry] }));
			await this.approve(entry);
		});
	}
	async editDetails(entry: ElementLibraryEntry): Promise<void> {
		await this.report(async () => {
			const name = await promptForText(this.app, 'Edit element details', 'Name', entry.name, 'Next');
			if (!name) return;
			const description = await promptForText(
				this.app,
				'Edit element details',
				'Description',
				entry.description,
				'Save',
				true,
			);
			if (description === null) return;
			if (name.length > 200 || description.length > 2000)
				throw new Error('Name or description is too long.');
			await this.save((registry) => ({
				...registry,
				elements: (registry.elements ?? []).map((item) =>
					item.id === entry.id ? { ...item, name: name.trim(), description } : item,
				),
			}));
		});
	}
	async duplicate(entry: ElementLibraryEntry, backup = false): Promise<void> {
		await this.report(async () => {
			const copy = await verifyEntryDigest({
				...cloneEntry(entry),
				id: `element-${crypto.randomUUID()}`,
				name: `${entry.name.slice(0, 195)} copy`,
				package: backup && entry.previousPackage ? entry.previousPackage : entry.package,
				previousPackage: undefined,
			});
			await this.save((registry) => ({ ...registry, elements: [...(registry.elements ?? []), copy] }));
		});
	}
	async toggle(entry: ElementLibraryEntry): Promise<void> {
		await this.report(() =>
			this.save((registry) => ({
				...registry,
				elements: (registry.elements ?? []).map((item) =>
					item.id === entry.id ? { ...item, enabled: !item.enabled } : item,
				),
			})),
		);
	}
	async remove(entry: ElementLibraryEntry): Promise<void> {
		await this.report(async () => {
			const uses = elementUses(this.store.getSnapshot().registry, entry.id);
			if (uses.length)
				throw new Error(
					`Element is still used by: ${uses.map((use) => `${use.kind} “${use.name}”`).join(', ')}.`,
				);
			if (
				!(await confirmProjectAction(
					this.app,
					'Delete element?',
					`Delete “${entry.name}” from the library? Source files are unchanged.`,
					'Delete',
					true,
				))
			)
				return;
			await this.save((registry) => {
				if (elementUses(registry, entry.id).length)
					throw new Error('This element is now referenced and cannot be deleted.');
				return {
					...registry,
					elements: (registry.elements ?? []).filter((item) => item.id !== entry.id),
				};
			});
		});
	}
	async replace(entry: ElementLibraryEntry, restore = false): Promise<void> {
		await this.report(async () => {
			const candidate = restore ? entry.previousPackage : await this.pickPackage();
			if (!candidate) return;
			const snapshot = this.store.getSnapshot();
			const next = replacementRegistry(snapshot.registry, entry.id, candidate);
			const installedCandidate = next.elements?.find((item) => item.id === entry.id);
			if (installedCandidate)
				installedCandidate.contentDigest = (
					await verifyEntryDigest(installedCandidate)
				).contentDigest;
			const uses = elementUses(snapshot.registry, entry.id);
			const accepted = await confirmProjectAction(
				this.app,
				restore ? 'Restore previous element file?' : 'Replace element file?',
				`This changes all uses of “${entry.name}”: ${uses.length ? uses.map((use) => `${use.kind} “${use.name}”`).join(', ') : 'no saved references'}. Existing settings are preserved. One previous package will be retained.`,
				'Continue',
			);
			if (!accepted) return;
			const updated = await verifyEntryDigest({ ...entry, package: candidate, enabled: true });
			if (!(await this.approve(updated))) return;
			const manifest = this.compiler.inspect(updated).manifest;
			const changedUses = elementUses(next, entry.id);
			for (const use of changedUses.length
				? changedUses
				: [{ kind: 'theme', id: '', design: DEFAULT_PROJECT_DESIGN }]) {
				const project =
					snapshot.registry.projects.find((project) => project.id === use.id) ??
					snapshot.activeProject;
				await this.compiler.compile(
					updated,
					use.design.elements?.blockquote ?? {
						elementId: entry.id,
						presetId: manifest.presets[0]?.id ?? '',
						settingsOverrides: {},
					},
					elementContext(project, use.design),
				);
			}
			// Ignore preview-only revisions; compare all durable state before obtaining the commit revision.
			const current = this.store.getSnapshot();
			if (JSON.stringify(current.registry) !== JSON.stringify(snapshot.registry))
				throw new Error('Library or projects changed. Please repeat replacement.');
			await this.store.commitElementRegistry(next, current.registryRevision);
			this.changed();
		});
	}
	private async pickPackage(): Promise<ElementPackage | null> {
		const file = await new Promise<TFile | null>((resolve) => {
			new ElementFilePicker(this.app, resolve).open();
		});
		if (!file) return null;
		if (file.stat.size > 512 * 1024) throw new Error('Element exceeds the 512 KiB package limit.');
		return inspectElementPackage(singleHtmlPackage(await this.app.vault.read(file))).package;
	}
	private async save(update: (registry: BookProjectRegistry) => BookProjectRegistry): Promise<void> {
		const snapshot = this.store.getSnapshot();
		const next = update(snapshot.registry);
		if ((next.elements?.length ?? 0) > 200)
			throw new Error('The element library supports at most 200 entries.');
		await this.store.commitElementRegistry(next, snapshot.registryRevision);
		this.changed();
	}
	private changed(): void {
		this.compiler.invalidate();
		this.runtime.refresh(true);
		this.notify();
	}
	private async report(action: () => Promise<void>): Promise<void> {
		try {
			await action();
		} catch (error) {
			new Notice(error instanceof Error ? error.message : 'Element operation failed.', 10000);
		}
	}
	dispose(): void {
		this.runtime.dispose();
		this.compiler.dispose();
		this.listeners.clear();
	}
}

class ElementFilePicker extends FuzzySuggestModal<TFile> {
	private chosen: TFile | null = null;
	constructor(
		app: App,
		private readonly done: (file: TFile | null) => void,
	) {
		super(app);
		this.setPlaceholder('Select an element HTML file');
	}
	getItems(): TFile[] {
		return this.app.vault.getFiles().filter((file) => file.extension.toLowerCase() === 'html');
	}
	getItemText(file: TFile): string {
		return file.path;
	}
	onChooseItem(file: TFile): void {
		this.chosen = file;
	}
	onClose(): void {
		super.onClose();
		window.setTimeout(() => this.done(this.chosen), 0);
	}
}
