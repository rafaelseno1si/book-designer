export interface BookMetadata {
	title: string;
	author: string;
	language: string;
	publisher: string;
	isbn: string;
}

export interface SourceReference {
	vaultPath: string;
}

export interface Book {
	id: string;
	metadata: BookMetadata;
	sections: BookSection[];
}

export interface BookSection {
	id: string;
	type: 'chapter';
	title: string;
	source: SourceReference;
	blocks: BookBlock[];
}

export type BookBlock =
	| ParagraphBlock
	| HeadingBlock
	| SceneBreakBlock
	| BlockquoteBlock
	| ListBlock;

export interface ParagraphBlock {
	type: 'paragraph';
	inlines: InlineNode[];
}

export interface HeadingBlock {
	type: 'heading';
	level: number;
	inlines: InlineNode[];
}

export interface SceneBreakBlock {
	type: 'scene-break';
}

export interface BlockquoteBlock {
	type: 'blockquote';
	blocks: BookBlock[];
}

export interface ListBlock {
	type: 'list';
	ordered: boolean;
	items: ListItem[];
}

export interface ListItem {
	blocks: BookBlock[];
}

export type InlineNode =
	| TextNode
	| EmphasisNode
	| StrongNode
	| InlineCodeNode
	| LinkNode
	| LineBreakNode;

export interface TextNode {
	type: 'text';
	text: string;
}

export interface EmphasisNode {
	type: 'emphasis';
	children: InlineNode[];
}

export interface StrongNode {
	type: 'strong';
	children: InlineNode[];
}

export interface InlineCodeNode {
	type: 'code';
	text: string;
}

export interface LinkNode {
	type: 'link';
	href: string;
	children: InlineNode[];
}

export interface LineBreakNode {
	type: 'line-break';
}
