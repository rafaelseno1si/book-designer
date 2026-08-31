import { describe, expect, it } from 'vitest';
import { BookProjectStore, emptyProjectRegistry } from './project-store';
import {
	BOOK_DESIGNER_PROJECT_FORMAT,
	BOOK_DESIGNER_PROJECT_FILE_VERSION,
	ProjectFileValidationError,
	parseProjectFileJson,
	serializeProjectFile,
} from './project-file';

const MOCKUP_HTML = '<!doctype html><html><body><div data-book-designer-screen></div></body></html>';

function projectSnapshot() {
	const store = new BookProjectStore(emptyProjectRegistry(), 'phone', async () => undefined, () => 'project-a');
	store.createProject('Books/Novel', 'Novel');
	store.updateMetadata({ author: 'Author', language: 'english' });
	store.updateDesign({ themeId: 'modern', chapterStyleId: 'numbered' });
	store.addImportedMockup({ id: 'reader-a', name: 'Reader A', html: MOCKUP_HTML, width: 390, height: 844, postures: [], color: { mode: 'none', hardware: 'fixed' }, display: { category: 'oled-lcd' } });
	store.addImportedMockup({ id: 'unrelated-reader', name: 'Unrelated', html: MOCKUP_HTML, width: 400, height: 800, postures: [], color: { mode: 'none', hardware: 'fixed' }, display: { category: 'oled-lcd' } });
	store.updatePreview({ deviceId: 'imported', importedMockupId: 'reader-a', readerScale: 125, pageIndex: 7, activeSectionId: 'chapter-7', scrollTop: 420 });
	store.setRuntimeBook('project-a', {
		id: 'runtime-book',
		metadata: { title: 'Runtime', author: '', language: 'english', publisher: '', isbn: '' },
		sections: [{ id: 'secret', type: 'chapter', title: 'Secret runtime manuscript', source: { vaultPath: 'Books/Novel/01.md' }, blocks: [] }],
	});
	const snapshot = store.getProjectSnapshot('project-a');
	if (!snapshot) throw new Error('Expected a project snapshot.');
	return snapshot;
}

describe('Book Designer project files', () => {
	it('round-trips a valid project and its referenced mockup', () => {
		const source = projectSnapshot();
		const parsed = parseProjectFileJson(serializeProjectFile(source));

		expect(parsed.project).toMatchObject({
			id: 'project-a',
			name: 'Novel',
			source: { type: 'folder', path: 'Books/Novel' },
			metadata: { author: 'Author' },
			design: { themeId: 'modern', chapterStyleId: 'numbered' },
			print: { trimPresetId: '5.5x8.5', imageMode: 'black-white' },
			preview: { deviceId: 'imported', importedMockupId: 'reader-a', readerScale: 125 },
		});
		expect(parsed.mockups.map((mockup) => mockup.id)).toEqual(['reader-a']);
	});

	it('writes version 3 and migrates version 1 print output', () => {
		const value = JSON.parse(serializeProjectFile(projectSnapshot())) as {
			version: number;
			project: { print?: unknown; preview: Record<string, unknown> };
		};
		expect(value.version).toBe(BOOK_DESIGNER_PROJECT_FILE_VERSION);
		value.version = 1;
		delete value.project.print;
		value.project.preview.printColorMode = 'color';
		const parsed = parseProjectFileJson(JSON.stringify(value));
		expect(parsed.project.print).toMatchObject({ imageMode: 'color', trimWidthIn: 5.5, trimHeightIn: 8.5 });
	});

	it('excludes runtime data, manuscript content, unrelated mockups, and transient navigation', () => {
		const snapshot = projectSnapshot();
		snapshot.mockups.push({ id: 'unrelated-reader', name: 'Unrelated', html: MOCKUP_HTML, width: 400, height: 800, postures: [], color: { mode: 'none', hardware: 'fixed' }, display: { category: 'oled-lcd' } });
		const json = serializeProjectFile(snapshot);
		expect(json).not.toContain('Secret runtime manuscript');
		expect(json).not.toContain('renderedHtml');
		expect(json).not.toContain('runtime-book');
		expect(json).not.toContain('unrelated-reader');
		expect(json).not.toContain('pageIndex');
		expect(json).not.toContain('activeSectionId');
		expect(json).not.toContain('scrollTop');
		const parsed = parseProjectFileJson(json);
		expect(parsed.project.preview).toMatchObject({ pageIndex: 0, activeSectionId: null, scrollTop: 0 });
	});

	it('rejects invalid JSON structure and the wrong discriminator', () => {
		expect(() => parseProjectFileJson('[]')).toThrow(ProjectFileValidationError);
		expect(() => parseProjectFileJson(JSON.stringify({ format: 'another-project', version: 1 }))).toThrow(`Expected format "${BOOK_DESIGNER_PROJECT_FORMAT}".`);
	});

	it('rejects unsupported future schema versions', () => {
		expect(() => parseProjectFileJson(JSON.stringify({ format: BOOK_DESIGNER_PROJECT_FORMAT, version: 99 }))).toThrow('newer than this version');
	});

	it('rejects malformed source paths', () => {
		const value = JSON.parse(serializeProjectFile(projectSnapshot())) as { project: { source: { path: string } } };
		value.project.source.path = '../Outside';
		expect(() => parseProjectFileJson(JSON.stringify(value))).toThrow('cannot contain');
	});

	it('rejects unusable custom print geometry', () => {
		const value = JSON.parse(serializeProjectFile(projectSnapshot())) as { project: { print: { trimWidthIn: number; contentInsideIn: number; contentOutsideIn: number } } };
		value.project.print.trimWidthIn = 4;
		value.project.print.contentInsideIn = 2.5;
		value.project.print.contentOutsideIn = 2.5;
		expect(() => parseProjectFileJson(JSON.stringify(value))).toThrow('Content margins must leave usable page width.');
	});

	it('normalizes safe imported values and resets supplied transient navigation', () => {
		const value = JSON.parse(serializeProjectFile(projectSnapshot())) as {
			project: { name: string; source: { path: string }; preview: Record<string, unknown> };
		};
		value.project.name = '  Imported Novel  ';
		value.project.source.path = ' Books/Novel/ ';
		value.project.preview.pageIndex = 42;
		value.project.preview.activeSectionId = 'chapter-42';
		value.project.preview.scrollTop = 999;
		const parsed = parseProjectFileJson(JSON.stringify(value));
		expect(parsed.project).toMatchObject({ name: 'Imported Novel', source: { path: 'Books/Novel' }, preview: { pageIndex: 0, activeSectionId: null, scrollTop: 0 } });
	});

	it('rejects unsafe imported mockup HTML', () => {
		const value = JSON.parse(serializeProjectFile(projectSnapshot())) as { mockups: Array<{ html: string }> };
		if (value.mockups[0]) value.mockups[0].html = '<script>alert(1)</script><div data-book-designer-screen></div>';
		expect(() => parseProjectFileJson(JSON.stringify(value))).toThrow('unsafe HTML');
	});

	it('round-trips the custom theme referenced by the project', () => {
		const store = new BookProjectStore(emptyProjectRegistry(), 'phone', async () => undefined, () => 'project-theme');
		store.createProject('Books/Theme Novel', 'Theme Novel');
		const custom = store.duplicateTheme('minimal');
		store.updateCustomTheme(custom.id, { design: { firstParagraphStyleId: 'drop-cap' } });
		store.applyTheme(custom.id);
		const snapshot = store.getProjectSnapshot('project-theme');
		if (!snapshot) throw new Error('Expected the themed project snapshot.');

		const parsed = parseProjectFileJson(serializeProjectFile(snapshot));
		expect(parsed.project.design.customThemeId).toBe(custom.id);
		expect(parsed.themes.map((theme) => theme.id)).toEqual([custom.id]);
		expect(parsed.themes[0]?.design.firstParagraphStyleId).toBe('drop-cap');
	});
});
