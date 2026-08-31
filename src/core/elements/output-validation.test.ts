// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { assembleElement, validateElementOutput } from './output-validation';
import { manuscriptSourceToBook } from '../parser/markdown-to-book';
import { renderBookThemeSampleDocument, renderPublicationFragment } from '../renderer/book-preview-renderer';

const valid = {
	xhtml: '<blockquote><div class="content" data-book-designer-content-slot=""></div></blockquote>',
	css: ':scope{font-style:italic}',
};
describe('static output boundary', () => {
	it('returns a reusable, immutable wrapper with no unresolved marker', () => {
		const artifact = validateElementOutput(valid, 'test');
		expect(assembleElement(artifact, '<p>Trusted text</p>')).toBe(
			'<blockquote class="bd-element-test"><div class="bd-element-test-content"><p>Trusted text</p></div></blockquote>',
		);
		expect(Object.isFrozen(artifact)).toBe(true);
	});
	it.each([
		'<blockquote></blockquote>',
		'<blockquote><div data-book-designer-content-slot=""></div><div data-book-designer-content-slot=""></div></blockquote>',
		'<blockquote><div data-book-designer-content-slot="">text</div></blockquote>',
		'<blockquote><script>alert(1)</script><div data-book-designer-content-slot=""></div></blockquote>',
		'<blockquote onclick="alert(1)"><div data-book-designer-content-slot=""></div></blockquote>',
		'<blockquote><a href="javascript:alert(1)">x</a><div data-book-designer-content-slot=""></div></blockquote>',
		'<blockquote><div data-book-designer-content-slot=""></blockquote>',
		'<!DOCTYPE x><blockquote><div data-book-designer-content-slot=""></div></blockquote>',
		'<blockquote><p><div data-book-designer-content-slot=""></div></p></blockquote>',
	])('rejects malformed or active XHTML: %s', (xhtml) =>
		expect(() => validateElementOutput({ ...valid, xhtml }, 'test')).toThrow(),
	);
	it('preserves nested Markdown quotation semantics, inline formatting and lists', () => {
		const book = manuscriptSourceToBook(
			{
				id: 'source',
				type: 'folder',
				files: [
					{
						id: 'q',
						vaultPath: 'q.md',
						content:
							'# Quote\n\n> A *gentle* [link](https://example.com)\n>\n> > Inner **thought**\n>\n> - One\n> - Two',
					},
				],
			},
			'book',
			{ title: 'Book', author: '', language: 'en', publisher: '', isbn: '' },
		);
		const artifact = validateElementOutput(valid, 'test');
		const design = {
			themeId: 'classic',
			typographyScale: 'comfortable',
			chapterStyleId: 'quiet',
			sceneBreakId: 'space',
		} as const;
		const html = renderBookThemeSampleDocument(book, design, artifact);
		expect(html.match(/<blockquote/g)).toHaveLength(2);
		expect(html).toContain('<em>gentle</em>');
		expect(html).toContain('<strong>thought</strong>');
		expect(html).toContain('<ul>');
		expect(html).not.toMatch(
			/<script|<input|<iframe|data-book-designer-content-slot|BookDesignerElement/,
		);
		expect(renderBookThemeSampleDocument(book, design, artifact)).toBe(html);
		const publication = renderPublicationFragment(book, design, artifact);
		expect(
			new DOMParser()
				.parseFromString(publication.xhtml, 'application/xml')
				.querySelector('parsererror'),
		).toBeNull();
		expect(publication.xhtml).not.toMatch(/<template|<script|data-book-designer-content-slot/);
		expect(publication.css).not.toMatch(/book-virtual-slot|:root/);
		expect(renderPublicationFragment(book, design, artifact)).toEqual(publication);
	});
	it('does not classify ordinary quotation marks as blockquotes, but handles quotations inside lists', () => {
		const book = manuscriptSourceToBook(
			{
				id: 's',
				type: 'folder',
				files: [
					{
						id: 'q',
						vaultPath: 'q.md',
						content: '# Chapter\n\n"Not a blockquote"\n\n- Item\n\n  > Quotation inside a list',
					},
				],
			},
			'b',
			{ title: 'Book', author: '', language: 'en', publisher: '', isbn: '' },
		);
		const result = renderPublicationFragment(
			book,
			{
				themeId: 'classic',
				typographyScale: 'comfortable',
				chapterStyleId: 'quiet',
				sceneBreakId: 'space',
			},
			validateElementOutput(valid, 'test'),
		);
		expect(result.xhtml.match(/<blockquote/g)).toHaveLength(1);
		expect(result.xhtml).toMatch(/<li>.*<blockquote/);
	});
});
