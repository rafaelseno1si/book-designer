import { marked, type Token } from 'marked';
import type {
	Book,
	BookBlock,
	BookMetadata,
	BookSection,
	InlineNode,
	ListItem,
} from '../model/book-model';
import type { ManuscriptSource, SourceDocument } from '../sources/manuscript-source';

export function manuscriptSourceToBook(
	source: ManuscriptSource,
	bookId: string,
	metadata: BookMetadata,
): Book {
	return {
		id: bookId,
		metadata,
		sections: source.files.map((file, index) => sourceDocumentToSection(file, index)),
	};
}

export function sourceDocumentToSection(
	file: SourceDocument,
	index: number,
): BookSection {
	const tokens = marked.lexer(stripFrontmatter(file.content), { gfm: true });
	const firstHeading = tokens.find(isLevelOneHeading);
	const title = firstHeading ? stringTokenValue(firstHeading, 'text') : fileTitleFromPath(file.vaultPath);
	let omittedFirstTitle = false;
	const blocks = tokens.flatMap((token) => {
		if (
			!omittedFirstTitle &&
			token.type === 'heading' &&
			isLevelOneHeading(token) &&
			token === firstHeading
		) {
			omittedFirstTitle = true;
			return [];
		}
		return tokenToBlocks(token);
	});

	return {
		id: `chapter-${index + 1}-${stablePathSlug(file.vaultPath)}`,
		type: 'chapter',
		title,
		source: { vaultPath: file.vaultPath },
		blocks,
	};
}

function tokenToBlocks(token: Token): BookBlock[] {
	switch (token.type) {
		case 'paragraph':
			return [{ type: 'paragraph', inlines: inlineTokensToNodes(tokenChildren(token)) }];
		case 'heading':
			return [{ type: 'heading', level: numberTokenValue(token, 'depth', 2), inlines: inlineTokensToNodes(tokenChildren(token)) }];
		case 'hr':
			return [{ type: 'scene-break' }];
		case 'blockquote':
			return [{ type: 'blockquote', blocks: tokenChildren(token).flatMap(tokenToBlocks) }];
		case 'list':
			return [{
				type: 'list',
				ordered: booleanTokenValue(token, 'ordered'),
				items: listItems(token).map(listItemFromToken),
			}];
		case 'space':
			return [];
		default:
			// Preserve unsupported Markdown visibly instead of silently dropping it.
			return [{ type: 'paragraph', inlines: [{ type: 'text', text: stringTokenValue(token, 'raw').trim() }] }];
	}
}

function isLevelOneHeading(token: Token): boolean {
	return token.type === 'heading' && numberTokenValue(token, 'depth', 0) === 1;
}

function listItemFromToken(item: Token): ListItem {
	const blocks = tokenChildren(item).flatMap(tokenToBlocks);
	return { blocks: blocks.length > 0 ? blocks : [{ type: 'paragraph', inlines: [] }] };
}

function inlineTokensToNodes(tokens: Token[]): InlineNode[] {
	return tokens.flatMap((token): InlineNode[] => {
		switch (token.type) {
			case 'text':
				return [{ type: 'text', text: stringTokenValue(token, 'text') }];
			case 'em':
				return [{ type: 'emphasis', children: inlineTokensToNodes(tokenChildren(token)) }];
			case 'strong':
				return [{ type: 'strong', children: inlineTokensToNodes(tokenChildren(token)) }];
			case 'codespan':
				return [{ type: 'code', text: stringTokenValue(token, 'text') }];
			case 'link':
				return [{ type: 'link', href: stringTokenValue(token, 'href'), children: inlineTokensToNodes(tokenChildren(token)) }];
			case 'br':
				return [{ type: 'line-break' }];
			default:
				return [{ type: 'text', text: stringTokenValue(token, 'raw') }];
		}
	});
}

function tokenChildren(token: Token): Token[] {
	const value = recordValue(token, 'tokens');
	return Array.isArray(value) ? value.filter(isToken) : [];
}

function listItems(token: Token): Token[] {
	const value = recordValue(token, 'items');
	return Array.isArray(value) ? value.filter(isToken) : [];
}

function isToken(value: unknown): value is Token {
	return typeof value === 'object' && value !== null && 'type' in value && typeof (value as { type?: unknown }).type === 'string';
}

function recordValue(token: Token, key: string): unknown {
	return (token as unknown as Record<string, unknown>)[key];
}

function stringTokenValue(token: Token, key: string): string {
	const value = recordValue(token, key);
	return typeof value === 'string' ? value : '';
}

function numberTokenValue(token: Token, key: string, fallback: number): number {
	const value = recordValue(token, key);
	return typeof value === 'number' ? value : fallback;
}

function booleanTokenValue(token: Token, key: string): boolean {
	return recordValue(token, key) === true;
}

function stripFrontmatter(markdown: string): string {
	return markdown.replace(/^---\s*\r?\n[\s\S]*?\r?\n---\s*(?:\r?\n|$)/, '');
}

function fileTitleFromPath(path: string): string {
	const fileName = path.split('/').at(-1) ?? path;
	return fileName.replace(/\.md$/i, '');
}

function stablePathSlug(path: string): string {
	return path.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
