import { describe, expect, it } from 'vitest';
import { manuscriptSourceToBook } from './markdown-to-book';
import { renderBookPreviewDocument } from '../renderer/book-preview-renderer';

describe('manuscriptSourceToBook', () => {
	it('turns real Markdown into a semantic chapter and safe preview document', () => {
		const book = manuscriptSourceToBook({ id: 'folder:Novel', type: 'folder', files: [{ id: 'Novel/01 Arrival.md', vaultPath: 'Novel/01 Arrival.md', content: '---\ntags: [draft]\n---\n# The Arrival\n\nA *quiet* **beginning** with [a link](https://example.com).\n\n***\n\n> A quotation\n\n- First\n- Second' }] }, 'book-1', { title: 'Novel', author: 'Author', language: 'english', publisher: '', isbn: '' });
		expect(book.sections[0]).toMatchObject({ title: 'The Arrival', source: { vaultPath: 'Novel/01 Arrival.md' }, blocks: [{ type: 'paragraph' }, { type: 'scene-break' }, { type: 'blockquote' }, { type: 'list', ordered: false }] });
		const html = renderBookPreviewDocument(book, { themeId: 'classic', typographyScale: 'comfortable', chapterStyleId: 'numbered', sceneBreakId: 'asterisks' }, 100);
		expect(html).toContain('<em>quiet</em>');
		expect(html).toContain('<strong>beginning</strong>');
		expect(html).toContain('https://example.com');
		expect(html).toContain('data-book-section-template');
		expect(html).not.toContain('tags: [draft]');
	});

	it('renders the selected first-paragraph preset', () => {
		const book = manuscriptSourceToBook({ id: 'folder:Novel', type: 'folder', files: [{ id: 'Novel/01.md', vaultPath: 'Novel/01.md', content: '# Opening\n\nOnce upon a time.' }] }, 'book-1', { title: 'Novel', author: '', language: 'english', publisher: '', isbn: '' });
		const html = renderBookPreviewDocument(book, { themeId: 'classic', typographyScale: 'comfortable', chapterStyleId: 'quiet', firstParagraphStyleId: 'drop-cap', sceneBreakId: 'space' }, 100);
		expect(html).toContain('::first-letter');
	});
});
