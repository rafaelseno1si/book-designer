import type { Book, BookBlock, InlineNode } from '../model/book-model';

export interface BookPreviewDesign {
	themeId: 'classic' | 'modern' | 'minimal';
	typographyScale: 'compact' | 'comfortable' | 'spacious';
	chapterStyleId: 'quiet' | 'numbered' | 'ornament';
	firstParagraphStyleId?: 'indented' | 'flush' | 'drop-cap';
	sceneBreakId: 'space' | 'asterisks' | 'ornament';
}

export function renderBookPreviewDocument(
	book: Book,
	design: BookPreviewDesign,
	readerScale: number,
): string {
	const title = escapeHtml(book.metadata.title || 'Untitled book');
	return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>${previewCss(design, readerScale)}</style><style id="book-designer-preview-layout"></style></head><body><article class="book">${book.sections
		.map((section, index) => `<template data-book-section-template data-section-id="${escapeAttribute(section.id)}">${renderSection(section, index, design)}</template>`)
		.join('')}</article></body></html>`;
}

export function renderBookThemeSampleDocument(book: Book, design: BookPreviewDesign): string {
	const section = book.sections[0];
	const title = escapeHtml(section?.title ?? (book.metadata.title || 'Theme preview'));
	const content = section
		? renderSection({ ...section, blocks: section.blocks.slice(0, 7) }, 0, design)
		: '<section class="chapter"><header><h1>No chapter available</h1></header></section>';
	return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>${previewCss(design, 100)}html,body{height:auto;overflow:hidden}.book{padding:1.5rem 1.7rem}.chapter{margin:0}.chapter header{margin-bottom:1.6rem}.chapter h1{font-size:1.7em}</style></head><body><article class="book">${content}</article></body></html>`;
}

function renderSection(section: Book['sections'][number], index: number, design: BookPreviewDesign): string {
	return `<section class="chapter chapter-${escapeAttribute(design.chapterStyleId)}" id="${escapeAttribute(section.id)}" data-section-id="${escapeAttribute(section.id)}"><header><p class="chapter-number">${chapterLabel(index + 1, design.chapterStyleId)}</p><h1>${escapeHtml(section.title)}</h1></header>${section.blocks.map(renderBlock).join('')}</section>`;
}

function renderBlock(block: BookBlock): string {
	switch (block.type) {
		case 'paragraph': return `<p>${renderInlines(block.inlines)}</p>`;
		case 'heading': return `<h${Math.min(Math.max(block.level, 2), 6)}>${renderInlines(block.inlines)}</h${Math.min(Math.max(block.level, 2), 6)}>`;
		case 'scene-break': return '<div class="scene-break" aria-label="Scene break">❦</div>';
		case 'blockquote': return `<blockquote>${block.blocks.map(renderBlock).join('')}</blockquote>`;
		case 'list': return `<${block.ordered ? 'ol' : 'ul'}>${block.items.map((item) => `<li>${item.blocks.map(renderBlock).join('')}</li>`).join('')}</${block.ordered ? 'ol' : 'ul'}>`;
	}
}

function renderInlines(nodes: InlineNode[]): string {
	return nodes.map((node) => {
		switch (node.type) {
			case 'text': return escapeHtml(node.text);
			case 'emphasis': return `<em>${renderInlines(node.children)}</em>`;
			case 'strong': return `<strong>${renderInlines(node.children)}</strong>`;
			case 'code': return `<code>${escapeHtml(node.text)}</code>`;
			case 'line-break': return '<br>';
			case 'link': {
				const content = renderInlines(node.children);
				const href = safeHref(node.href);
				return href ? `<a href="${escapeAttribute(href)}">${content}</a>` : content;
			}
		}
	}).join('');
}

function safeHref(href: string): string | null {
	try {
		const url = new URL(href, 'https://book-designer.invalid');
		return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? href : null;
	} catch { return null; }
}

function chapterLabel(index: number, style: BookPreviewDesign['chapterStyleId']): string {
	if (style === 'quiet') return '';
	if (style === 'ornament') return '❦';
	return `Chapter ${index}`;
}

function previewCss(design: BookPreviewDesign, readerScale: number): string {
	const theme = design.themeId === 'modern'
		? { font: 'system-ui, sans-serif', ink: '#20252d', accent: '#305f79' }
		: design.themeId === 'minimal'
			? { font: 'Georgia, serif', ink: '#222', accent: '#222' }
			: { font: 'Georgia, serif', ink: '#2a221b', accent: '#805c2a' };
	const size = design.typographyScale === 'compact' ? '0.94' : design.typographyScale === 'spacious' ? '1.1' : '1';
	const scene = design.sceneBreakId === 'space' ? ' ' : design.sceneBreakId === 'asterisks' ? '* * *' : '❦';
	const firstParagraph = design.firstParagraphStyleId ?? 'indented';
	const firstParagraphCss = firstParagraph === 'drop-cap'
		? '.chapter>p:first-of-type{text-indent:0}.chapter>p:first-of-type::first-letter{float:left;font-size:3.25em;line-height:.78;padding:.08em .12em 0 0;color:' + theme.accent + '}'
		: firstParagraph === 'flush'
			? '.chapter>p:first-of-type{text-indent:0}'
			: '.chapter>p:first-of-type{text-indent:1.5em}';
	return `:root{font-size:${Math.min(Math.max(readerScale,85),800)}%;}*{box-sizing:border-box;min-width:0}html,body{width:100%;max-width:100%;overflow-x:hidden}body{margin:0;background:#f7f2e9;color:${theme.ink};font-family:${theme.font};font-size:${size}rem;line-height:${design.typographyScale === 'spacious' ? 1.9 : 1.65}}.book{width:100%;max-width:42rem;margin:auto;padding:0 2.25rem;overflow-wrap:anywhere}.book-virtual-slot{display:flow-root;min-height:0}.book p,.book h1,.book h2,.book h3,.book h4,.book h5,.book h6,.book li,.book blockquote,.book a,.book code{max-width:100%;white-space:normal;overflow-wrap:anywhere;word-break:break-all}.book img,.book video,.book iframe,.book pre,.book table{display:block;max-width:100%;height:auto}.book pre{white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-all}.chapter{margin:0 0 4.5rem}.chapter:last-child{margin-bottom:0}.chapter header{text-align:center;margin:0 0 3rem}.chapter h1{font-size:2.1em;line-height:1.15;margin:.4rem 0}.chapter-number{min-height:1.3em;letter-spacing:.09em;text-transform:uppercase;color:${theme.accent}}p{margin:0 0 1.2em}h2,h3,h4,h5,h6{line-height:1.25;margin:2em 0 .65em}blockquote{margin:1.5em 1.25em;padding-left:1em;border-left:2px solid ${theme.accent}}li p{margin-bottom:.45em}.scene-break{text-align:center;letter-spacing:.25em;margin:2.2em 0;color:${theme.accent}}.scene-break::after{content:'${scene}'} .scene-break{font-size:0}.scene-break::after{font-size:1rem}a{color:${theme.accent}}code{font-family:ui-monospace,monospace;font-size:.9em}${firstParagraphCss}`;
}

function escapeHtml(value: string): string { return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character); }
function escapeAttribute(value: string): string { return escapeHtml(value); }
