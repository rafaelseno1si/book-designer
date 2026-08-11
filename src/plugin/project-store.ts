export const THEME_IDS = ['classic', 'modern', 'draft'] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export const THEME_LABELS: Record<ThemeId, string> = {
	classic: 'Classic',
	modern: 'Modern',
	draft: 'Draft',
};

export function isThemeId(value: string): value is ThemeId {
	return THEME_IDS.some((themeId) => themeId === value);
}

export const TYPOGRAPHY_SCALES = ['compact', 'comfortable', 'spacious'] as const;
export type TypographyScale = (typeof TYPOGRAPHY_SCALES)[number];

export const TYPOGRAPHY_SCALE_LABELS: Record<TypographyScale, string> = {
	compact: 'Compact',
	comfortable: 'Comfortable',
	spacious: 'Spacious',
};

export function isTypographyScale(value: string): value is TypographyScale {
	return TYPOGRAPHY_SCALES.some((scale) => scale === value);
}

export const CHAPTER_STYLE_IDS = ['quiet', 'numbered', 'ornament'] as const;
export type ChapterStyleId = (typeof CHAPTER_STYLE_IDS)[number];

export const CHAPTER_STYLE_LABELS: Record<ChapterStyleId, string> = {
	quiet: 'Quiet',
	numbered: 'Numbered',
	ornament: 'Ornament',
};

export function isChapterStyleId(value: string): value is ChapterStyleId {
	return CHAPTER_STYLE_IDS.some((styleId) => styleId === value);
}

export const SCENE_BREAK_IDS = ['space', 'asterisks', 'ornament'] as const;
export type SceneBreakId = (typeof SCENE_BREAK_IDS)[number];

export const SCENE_BREAK_LABELS: Record<SceneBreakId, string> = {
	space: 'Space',
	asterisks: 'Asterisks',
	ornament: 'Ornament',
};

export function isSceneBreakId(value: string): value is SceneBreakId {
	return SCENE_BREAK_IDS.some((sceneBreakId) => sceneBreakId === value);
}

export interface BookProjectState {
	metadata: {
		title: string;
		author: string;
		language: string;
	};
	design: {
		themeId: ThemeId;
		typographyScale: TypographyScale;
		chapterStyleId: ChapterStyleId;
		sceneBreakId: SceneBreakId;
	};
	manuscript: {
		status: 'not-selected';
	};
	revision: number;
}

export interface PreviewRenderState {
	title: string;
	author: string;
	themeLabel: string;
	typographyLabel: string;
	chapterStyleLabel: string;
	sceneBreakLabel: string;
	hasManuscript: boolean;
	revision: number;
}

export type BookProjectListener = () => void;

export const DEFAULT_PROJECT_STATE: BookProjectState = {
	metadata: {
		title: '',
		author: '',
		language: 'en',
	},
	design: {
		themeId: 'classic',
		typographyScale: 'comfortable',
		chapterStyleId: 'quiet',
		sceneBreakId: 'space',
	},
	manuscript: {
		status: 'not-selected',
	},
	revision: 0,
};

export class BookProjectStore {
	private state: BookProjectState = cloneProjectState(DEFAULT_PROJECT_STATE);
	private readonly listeners = new Set<BookProjectListener>();

	getSnapshot() {
		return this.state;
	}

	subscribe(listener: BookProjectListener) {
		this.listeners.add(listener);

		return () => {
			this.listeners.delete(listener);
		};
	}

	updateMetadata(metadata: Partial<BookProjectState['metadata']>) {
		this.setState({
			...this.state,
			metadata: {
				...this.state.metadata,
				...metadata,
			},
		});
	}

	updateDesign(design: Partial<BookProjectState['design']>) {
		this.setState({
			...this.state,
			design: {
				...this.state.design,
				...design,
			},
		});
	}

	private setState(nextState: Omit<BookProjectState, 'revision'>) {
		this.state = {
			...nextState,
			revision: this.state.revision + 1,
		};

		for (const listener of this.listeners) {
			listener();
		}
	}
}

export function renderPreviewState(state: BookProjectState): PreviewRenderState {
	return {
		title: state.metadata.title.trim() || 'Untitled book',
		author: state.metadata.author.trim() || 'Unknown author',
		themeLabel: THEME_LABELS[state.design.themeId],
		typographyLabel: TYPOGRAPHY_SCALE_LABELS[state.design.typographyScale],
		chapterStyleLabel: CHAPTER_STYLE_LABELS[state.design.chapterStyleId],
		sceneBreakLabel: SCENE_BREAK_LABELS[state.design.sceneBreakId],
		hasManuscript: state.manuscript.status !== 'not-selected',
		revision: state.revision,
	};
}

function cloneProjectState(state: BookProjectState): BookProjectState {
	return {
		metadata: { ...state.metadata },
		design: { ...state.design },
		manuscript: { ...state.manuscript },
		revision: state.revision,
	};
}
