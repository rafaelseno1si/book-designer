import builtinHtml from '../../elements/builtins/basic-blockquote.html';
import { inspectElementPackage, singleHtmlPackage } from '../../core/elements/manifest';
import { cloneDesign, resolveElementSettings, validateSettings } from '../../core/elements/settings';
import {
	BUILTIN_BLOCKQUOTE_ID,
	type ElementAssignment,
	type ElementLibraryEntry,
	type ElementPackage,
} from '../../core/elements/types';
import { contentDigest, fail, record, safeId, text } from '../../core/elements/validation';
import type { BookProjectDesign, BookProjectRegistry } from '../project-store';

export const BUILTIN_ELEMENT: ElementLibraryEntry = {
	id: BUILTIN_BLOCKQUOTE_ID,
	name: 'Basic blockquote',
	description: 'Quiet quotation styling with inherited book typography.',
	enabled: true,
	package: singleHtmlPackage(builtinHtml),
};
export function libraryEntries(registry: Pick<BookProjectRegistry, 'elements'>): ElementLibraryEntry[] {
	return [cloneEntry(BUILTIN_ELEMENT), ...(registry.elements ?? []).map(cloneEntry)];
}
export function cloneEntry(entry: ElementLibraryEntry): ElementLibraryEntry {
	return {
		...entry,
		package: singleHtmlPackage(entry.package.files['index.html']),
		...(entry.previousPackage
			? { previousPackage: singleHtmlPackage(entry.previousPackage.files['index.html']) }
			: {}),
	};
}
export async function verifyEntryDigest(entry: ElementLibraryEntry): Promise<ElementLibraryEntry> {
	return { ...cloneEntry(entry), contentDigest: await contentDigest(entry.package.files['index.html']) };
}
export function parseLibraryEntry(value: unknown): ElementLibraryEntry {
	if (!record(value)) fail('INVALID_LIBRARY', 'Element library entry must be an object.');
	const id = safeId(value.id);
	if (id.startsWith('builtin.'))
		fail('BUILTIN_PROTECTED', 'Built-in identities cannot be imported or replaced.');
	const inspected = inspectElementPackage(value.package);
	return {
		id,
		name: text(value.name, 'Element name'),
		description:
			typeof value.description === 'string' && value.description.length <= 2000
				? value.description
				: '',
		enabled: value.enabled === true,
		package: inspected.package,
		...(typeof value.contentDigest === 'string' && /^[a-f0-9]{64}$/.test(value.contentDigest)
			? { contentDigest: value.contentDigest }
			: {}),
		...(value.previousPackage
			? { previousPackage: inspectElementPackage(value.previousPackage).package }
			: {}),
	};
}
export function normalizeLibrary(value: unknown): ElementLibraryEntry[] {
	if (!Array.isArray(value)) return [];
	const seen = new Set<string>();
	return value.slice(0, 200).flatMap((candidate: unknown) => {
		try {
			const entry = parseLibraryEntry(candidate);
			if (seen.has(entry.id)) return [];
			seen.add(entry.id);
			return [entry];
		} catch {
			return [];
		}
	});
}
export interface ElementUse {
	kind: 'project' | 'theme';
	id: string;
	name: string;
	design: BookProjectDesign;
}
export function elementUses(registry: BookProjectRegistry, elementId: string): ElementUse[] {
	return [
		...registry.projects
			.filter((item) => item.design.elements?.blockquote?.elementId === elementId)
			.map(
				(item): ElementUse => ({
					kind: 'project',
					id: item.id,
					name: item.name,
					design: cloneDesign(item.design),
				}),
			),
		...registry.themes
			.filter((item) => item.design.elements?.blockquote?.elementId === elementId)
			.map(
				(item): ElementUse => ({
					kind: 'theme',
					id: item.id,
					name: item.name,
					design: cloneDesign(item.design),
				}),
			),
	];
}
export function replacementRegistry(
	registry: BookProjectRegistry,
	id: string,
	candidate: ElementPackage,
): BookProjectRegistry {
	const existing = registry.elements?.find((entry) => entry.id === id);
	if (!existing) fail('MISSING_ELEMENT', 'Only custom library entries can be replaced.');
	const oldManifest = inspectElementPackage(existing.package).manifest;
	const nextManifest = inspectElementPackage(candidate).manifest;
	if (oldManifest.category !== nextManifest.category || oldManifest.contract !== nextManifest.contract)
		fail(
			'INCOMPATIBLE_REPLACEMENT',
			'Category and rendering contract must match. Import as new instead.',
		);
	const replace = (design: BookProjectDesign): BookProjectDesign => {
		const assignment = design.elements?.blockquote;
		if (assignment?.elementId !== id) return cloneDesign(design);
		try {
			const effective = resolveElementSettings(oldManifest, assignment);
			const base = resolveElementSettings(nextManifest, { ...assignment, settingsOverrides: {} });
			validateSettings(effective, nextManifest.settingsSchema, true);
			const preserved = validateSettings({ ...base, ...effective }, nextManifest.settingsSchema);
			return {
				...cloneDesign(design),
				elements: {
					blockquote: {
						...assignment,
						settingsOverrides: Object.fromEntries(
							Object.entries(preserved).filter(([key, value]) => value !== base[key]),
						),
					},
				},
			};
		} catch (error) {
			fail(
				'INCOMPATIBLE_REPLACEMENT',
				`${error instanceof Error ? error.message : 'Incompatible settings.'} Import as new instead.`,
			);
		}
	};
	return {
		...registry,
		projects: registry.projects.map((project) => ({ ...project, design: replace(project.design) })),
		themes: registry.themes.map((theme) => ({ ...theme, design: replace(theme.design) })),
		elements: (registry.elements ?? []).map((entry) =>
			entry.id === id
				? {
						...cloneEntry(entry),
						package: candidate,
						contentDigest: undefined,
						previousPackage: existing.package,
					}
				: cloneEntry(entry),
		),
	};
}
export function remapDesignElements(design: BookProjectDesign, ids: Map<string, string>): BookProjectDesign {
	const next = cloneDesign(design);
	const assignment = next.elements?.blockquote;
	if (assignment) assignment.elementId = ids.get(assignment.elementId) ?? assignment.elementId;
	return next;
}
export function referencedElementIds(
	project: { design: BookProjectDesign },
	themes: { design: BookProjectDesign }[],
): Set<string> {
	return new Set(
		[project.design, ...themes.map((theme) => theme.design)].flatMap((design) =>
			design.elements?.blockquote ? [design.elements.blockquote.elementId] : [],
		),
	);
}
export function presetAssignment(elementId: string, presetId: string): ElementAssignment {
	return { elementId, presetId, settingsOverrides: {} };
}
