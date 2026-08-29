import type {
	BookProjectDesign,
	ChapterStyleId,
	FirstParagraphStyleId,
	SceneBreakId,
	ThemeId,
	TypographyScale,
} from './project-store';

export const THEME_ELEMENT_SLOT_IDS = [
	'chapter-opening',
	'first-paragraph',
	'typography',
	'ornamental-break',
] as const;

export type ThemeElementSlotId = (typeof THEME_ELEMENT_SLOT_IDS)[number];

export interface CustomBookTheme {
	id: string;
	name: string;
	baseThemeId: ThemeId;
	design: BookProjectDesign;
}

export interface BookThemeOption {
	id: string;
	name: string;
	builtIn: boolean;
	design: BookProjectDesign;
}

export interface ThemeElementPreset {
	id: string;
	name: string;
	description: string;
	design: Partial<BookProjectDesign>;
}

export const THEME_ELEMENT_SLOT_LABELS: Record<ThemeElementSlotId, string> = {
	'chapter-opening': 'Chapter opening',
	'first-paragraph': 'First paragraph',
	typography: 'Typography',
	'ornamental-break': 'Ornamental break',
};

export const BUILT_IN_THEME_OPTIONS: BookThemeOption[] = [
	{
		id: 'classic',
		name: 'Classic',
		builtIn: true,
		design: { themeId: 'classic', customThemeId: null, typographyScale: 'comfortable', chapterStyleId: 'quiet', firstParagraphStyleId: 'indented', sceneBreakId: 'space' },
	},
	{
		id: 'modern',
		name: 'Modern',
		builtIn: true,
		design: { themeId: 'modern', customThemeId: null, typographyScale: 'compact', chapterStyleId: 'numbered', firstParagraphStyleId: 'flush', sceneBreakId: 'asterisks' },
	},
	{
		id: 'minimal',
		name: 'Minimal',
		builtIn: true,
		design: { themeId: 'minimal', customThemeId: null, typographyScale: 'spacious', chapterStyleId: 'quiet', firstParagraphStyleId: 'drop-cap', sceneBreakId: 'ornament' },
	},
];

export const THEME_ELEMENT_PRESETS: Record<ThemeElementSlotId, ThemeElementPreset[]> = {
	'chapter-opening': [
		preset<ChapterStyleId>('quiet', 'Quiet title', 'A restrained title with no chapter label.', 'chapterStyleId'),
		preset<ChapterStyleId>('numbered', 'Numbered chapter', 'An editorial chapter label above the title.', 'chapterStyleId'),
		preset<ChapterStyleId>('ornament', 'Ornamental opening', 'A centered ornament introduces the chapter.', 'chapterStyleId'),
	],
	'first-paragraph': [
		preset<FirstParagraphStyleId>('indented', 'Classic indent', 'Indent the opening paragraph like traditional prose.', 'firstParagraphStyleId'),
		preset<FirstParagraphStyleId>('flush', 'Flush opening', 'Start the opening paragraph without an indent.', 'firstParagraphStyleId'),
		preset<FirstParagraphStyleId>('drop-cap', 'Drop cap', 'Use an enlarged first letter for the opening paragraph.', 'firstParagraphStyleId'),
	],
	typography: [
		preset<TypographyScale>('compact', 'Compact', 'Tighter rhythm for information-dense pages.', 'typographyScale'),
		preset<TypographyScale>('comfortable', 'Comfortable', 'Balanced type size and reading rhythm.', 'typographyScale'),
		preset<TypographyScale>('spacious', 'Spacious', 'Airier leading and a more leisurely page.', 'typographyScale'),
	],
	'ornamental-break': [
		preset<SceneBreakId>('space', 'Open space', 'Separate scenes with a quiet blank interval.', 'sceneBreakId'),
		preset<SceneBreakId>('asterisks', 'Three asterisks', 'Use a familiar typographic scene marker.', 'sceneBreakId'),
		preset<SceneBreakId>('ornament', 'Fleuron', 'Use a centered ornamental mark.', 'sceneBreakId'),
	],
};

export function themeOptions(customThemes: CustomBookTheme[]): BookThemeOption[] {
	return [
		...BUILT_IN_THEME_OPTIONS.map(cloneThemeOption),
		...customThemes.map((theme) => ({ id: theme.id, name: theme.name, builtIn: false, design: { ...theme.design } })),
	];
}

export function findThemeOption(themeId: string, customThemes: CustomBookTheme[]): BookThemeOption | null {
	return themeOptions(customThemes).find((theme) => theme.id === themeId) ?? null;
}

export function selectedThemeOptionId(design: BookProjectDesign): string {
	return design.customThemeId ?? design.themeId;
}

export function slotValue(design: BookProjectDesign, slot: ThemeElementSlotId): string {
	switch (slot) {
		case 'chapter-opening': return design.chapterStyleId;
		case 'first-paragraph': return design.firstParagraphStyleId;
		case 'typography': return design.typographyScale;
		case 'ornamental-break': return design.sceneBreakId;
	}
}

function preset<T extends string>(id: T, name: string, description: string, key: keyof BookProjectDesign): ThemeElementPreset {
	return { id, name, description, design: { [key]: id } };
}

function cloneThemeOption(theme: BookThemeOption): BookThemeOption {
	return { ...theme, design: { ...theme.design } };
}
