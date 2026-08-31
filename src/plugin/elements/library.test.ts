import { describe, expect, it } from 'vitest';
import {
	BUILTIN_ELEMENT,
	elementUses,
	parseLibraryEntry,
	replacementRegistry,
	verifyEntryDigest,
} from './library';
import { singleHtmlPackage, inspectElementPackage } from '../../core/elements/manifest';
import { resolveElementSettings } from '../../core/elements/settings';
import { BookProjectStore, emptyProjectRegistry } from '../project-store';
import { parseProjectFileJson, serializeProjectFile } from '../project-file';

function setup() {
	let id = 0;
	const store = new BookProjectStore(
		emptyProjectRegistry(),
		'phone',
		async () => undefined,
		() => `project-${++id}`,
	);
	store.createProject('First', 'First');
	const theme = store.duplicateTheme('classic');
	store.updateCustomTheme(theme.id, {
		design: {
			elements: {
				blockquote: {
					elementId: 'custom-quote',
					presetId: 'classic-rule',
					settingsOverrides: { inset: 2 },
				},
			},
		},
	});
	store.applyTheme(theme.id);
	store.duplicateProject('project-1', 'Second');
	const registry = store.getSnapshot().registry;
	registry.elements = [{ ...BUILTIN_ELEMENT, id: 'custom-quote' }];
	return { store, registry, theme };
}
describe('vault-wide element library', () => {
	it('protects built-in identities and validates imported HTML without executing it', () => {
		expect(() => parseLibraryEntry(BUILTIN_ELEMENT)).toThrow(/Built-in/);
		const entry = parseLibraryEntry({ ...BUILTIN_ELEMENT, id: 'custom-quote', approved: true });
		expect(entry).not.toHaveProperty('approved');
	});
	it('finds references in closed projects and saved custom themes', () => {
		const { registry } = setup();
		expect(elementUses(registry, 'custom-quote')).toHaveLength(3);
	});
	it('replaces globally, preserves effective values, and retains one backup', () => {
		const { registry } = setup();
		const replacement = singleHtmlPackage(
			BUILTIN_ELEMENT.package.files['index.html']
				.replace('"inset": 1.25', '"inset": 0.5')
				.replace('"spacing": 1.5', '"spacing": 2'),
		);
		const changed = replacementRegistry(registry, 'custom-quote', replacement);
		for (const use of elementUses(changed, 'custom-quote')) {
			expect(
				resolveElementSettings(
					inspectElementPackage(replacement).manifest,
					use.design.elements!.blockquote!,
				),
			).toMatchObject({ inset: 2, spacing: 1.5 });
		}
		expect(changed.elements?.[0]?.id).toBe('custom-quote');
		expect(changed.elements?.[0]?.previousPackage).toEqual(BUILTIN_ELEMENT.package);
		expect(registry.elements?.[0]?.previousPackage).toBeUndefined();
	});
	it('blocks missing presets and settings incompatible with any affected assignment', () => {
		const { registry } = setup();
		for (const html of [
			BUILTIN_ELEMENT.package.files['index.html'].replace('"classic-rule"', '"renamed"'),
			BUILTIN_ELEMENT.package.files['index.html'].replace('"maximum": 3', '"maximum": 1.5'),
		])
			expect(() => replacementRegistry(registry, 'custom-quote', singleHtmlPackage(html))).toThrow(
				/Import as new/,
			);
	});
	it('does not publish failed or stale library transactions', async () => {
		const registry = setup().registry;
		const store = new BookProjectStore(registry, 'phone', async () => {
			throw new Error('Disk full');
		});
		const snapshot = store.getSnapshot();
		await expect(
			store.commitElementRegistry({ ...registry, elements: [] }, snapshot.registryRevision),
		).rejects.toThrow('Disk full');
		expect(store.getSnapshot()).toBe(snapshot);
		await expect(store.commitElementRegistry(registry, 999)).rejects.toThrow(/changed/);
	});
	it('round-trips only referenced current packages, never backup or approval state', () => {
		const { registry } = setup();
		const project = registry.projects[0]!;
		const entry = { ...registry.elements![0]!, previousPackage: BUILTIN_ELEMENT.package };
		const serialized = serializeProjectFile({
			project,
			themes: registry.themes,
			mockups: [],
			elements: [entry, { ...entry, id: 'unrelated' }],
		});
		expect(serialized).not.toContain('previousPackage');
		expect(serialized).not.toContain('unrelated');
		expect(serialized).not.toContain('approved');
		const parsed = parseProjectFileJson(serialized);
		expect(parsed.elements).toHaveLength(1);
		expect(parsed.project.design.elements).toEqual(project.design.elements);
	});
	it('reuses identical content but independently installs and remaps conflicting content', () => {
		const { registry } = setup();
		const installed = registry.elements![0]!;
		const incomingProject = registry.projects[0]!;
		const store = new BookProjectStore(registry);
		store.importProject(incomingProject, [], registry.themes, 'copy', [installed]);
		expect(store.getSnapshot().registry.elements).toHaveLength(1);
		const changed = {
			...installed,
			package: singleHtmlPackage(installed.package.files['index.html'].replace('1.0.0', '1.1.0')),
		};
		const imported = store.importProject(incomingProject, [], registry.themes, 'copy', [changed]);
		expect(store.getSnapshot().registry.elements).toHaveLength(2);
		expect(imported.design.elements?.blockquote?.elementId).not.toBe(installed.id);
		expect(store.getSnapshot().registry.projects[0]?.design.elements?.blockquote?.elementId).toBe(
			installed.id,
		);
	});
	it('keeps unavailable assignments through project import and supports v2 migration', () => {
		const { registry } = setup();
		const serialized = serializeProjectFile({
			project: registry.projects[0]!,
			themes: registry.themes,
			mockups: [],
		});
		const parsed = parseProjectFileJson(serialized);
		expect(parsed.project.design.elements?.blockquote?.elementId).toBe('custom-quote');
		const v2 = JSON.parse(serialized) as Record<string, unknown>;
		v2.version = 2;
		delete v2.elements;
		expect(parseProjectFileJson(JSON.stringify(v2)).project.print).toEqual(parsed.project.print);
	});
	it('does not bind unresolved imports to colliding installed library IDs', () => {
		const { registry } = setup();
		const store = new BookProjectStore(registry);
		const imported = store.importProject(registry.projects[0]!, [], registry.themes, 'copy');
		expect(imported.design.elements?.blockquote?.elementId).toMatch(/^unresolved-/);
		expect(store.getSnapshot().registry.projects[0]!.design.elements!.blockquote!.elementId).toBe(
			'custom-quote',
		);
	});
	it('stores verified digests without trusting supplied values', async () => {
		const verified = await verifyEntryDigest({
			...BUILTIN_ELEMENT,
			id: 'imported',
			contentDigest: 'wrong',
		});
		expect(verified.contentDigest).toMatch(/^[a-f0-9]{64}$/);
	});
	it('retains missing preset references on portable import with a warning', () => {
		const { registry } = setup();
		const project = registry.projects[0]!;
		project.design.elements!.blockquote!.presetId = 'missing';
		const parsed = parseProjectFileJson(
			serializeProjectFile({
				project,
				themes: registry.themes,
				mockups: [],
				elements: registry.elements,
			}),
		);
		expect(parsed.project.design.elements!.blockquote!.presetId).toBe('missing');
		expect(parsed.warnings?.[0]).toMatch(/Preset.*missing/);
	});
	it('ignores transient preview revisions while saving but blocks concurrent durable changes', async () => {
		const { registry } = setup();
		let resume!: () => void;
		let writes = 0;
		const store = new BookProjectStore(registry, 'phone', async () => {
			if (++writes === 1)
				await new Promise<void>((resolve) => {
					resume = resolve;
				});
		});
		const revision = store.getSnapshot().registryRevision;
		const saved = store.commitElementRegistry({ ...registry, elements: [] }, revision);
		await Promise.resolve();
		await Promise.resolve();
		store.setElementDiagnostic('Preview changed');
		resume();
		await saved;
		expect(store.getSnapshot().registry.elements).toEqual([]);
		let continueSave!: () => void;
		let count = 0;
		const conflicting = new BookProjectStore(registry, 'phone', async () => {
			if (++count === 1)
				await new Promise<void>((resolve) => {
					continueSave = resolve;
				});
		});
		const pending = conflicting.commitElementRegistry({ ...registry, elements: [] }, 0);
		await Promise.resolve();
		await Promise.resolve();
		conflicting.updateMetadata({ title: 'Concurrent title' });
		continueSave();
		await expect(pending).rejects.toThrow(/changed while saving/);
		expect(conflicting.getSnapshot().registry.elements).toHaveLength(1);
		await conflicting.whenPersisted();
	});
});
