import type { ChangeEvent } from 'react';
import {
	CHAPTER_STYLE_IDS,
	CHAPTER_STYLE_LABELS,
	SCENE_BREAK_IDS,
	SCENE_BREAK_LABELS,
	THEME_IDS,
	THEME_LABELS,
	TYPOGRAPHY_SCALES,
	TYPOGRAPHY_SCALE_LABELS,
	type BookProjectStore,
	type ThemeId,
	isChapterStyleId,
	isSceneBreakId,
	isTypographyScale,
} from '../plugin/project-store';
import { useBookProject } from './useBookProject';

interface BookDesignerAppProps {
	projectStore: BookProjectStore;
	onOpenPreview: () => void;
}

const bookOutline = [
	{ label: 'Title page', level: 0 },
	{ label: 'Copyright', level: 0 },
	{ label: 'Dedication', level: 0 },
	{ label: 'Part I', level: 0 },
	{ label: 'Chapter 1', level: 1 },
	{ label: 'Chapter 2', level: 1 },
	{ label: 'Chapter 3', level: 1 },
	{ label: 'Back matter', level: 0 },
	{ label: 'About author', level: 1 },
] as const;

const languageOptions = [
	{ value: 'english', label: 'English' },
	{ value: 'spanish', label: 'Spanish' },
	{ value: 'french', label: 'French' },
] as const;

export function BookDesignerApp({
	projectStore,
	onOpenPreview,
}: BookDesignerAppProps) {
	const project = useBookProject(projectStore);

	return (
		<section className="book-designer-shell" aria-label="Book Designer">
			<header className="book-designer-header">
				<h1>Book Designer</h1>
				<div className="book-designer-header-actions">
					<label className="book-designer-format-select">
						<span>Format</span>
						<select defaultValue="ebook">
							<option value="ebook">Ebook</option>
						</select>
					</label>
					<button
						type="button"
						className="book-designer-preview-button"
						title="Open Book Preview"
						onClick={onOpenPreview}
					>
						Open preview
					</button>
				</div>
			</header>

			<aside className="book-designer-book-panel" aria-label="Book structure">
				<h2>Book</h2>
				<nav aria-label="Book sections">
					{bookOutline.map((item) => (
						<button
							type="button"
							key={item.label}
							className={item.level === 1 ? 'is-child' : undefined}
							title={`${item.label} configuration`}
						>
							{item.label}
						</button>
					))}
				</nav>
			</aside>

			<main className="book-designer-design-panel" aria-label="Design">
				<section className="book-designer-theme-section">
					<h2>Design</h2>
					<h3>Theme</h3>
					<div className="book-designer-theme-grid" role="group" aria-label="Theme">
						{THEME_IDS.map((themeId) => (
							<ThemeButton
								key={themeId}
								themeId={themeId}
								selectedThemeId={project.design.themeId}
								onSelect={(value) =>
									projectStore.updateDesign({ themeId: value })
								}
							/>
						))}
					</div>
				</section>

				<section className="book-designer-section-list" aria-label="Design sections">
					<SelectRow
						label="Typography"
						value={project.design.typographyScale}
						options={TYPOGRAPHY_SCALES.map((scale) => ({
							value: scale,
							label: TYPOGRAPHY_SCALE_LABELS[scale],
						}))}
						onChange={(value) => {
							if (isTypographyScale(value)) {
								projectStore.updateDesign({
									typographyScale: value,
								});
							}
						}}
					/>
					<SelectRow
						label="Chapter openings"
						value={project.design.chapterStyleId}
						options={CHAPTER_STYLE_IDS.map((styleId) => ({
							value: styleId,
							label: CHAPTER_STYLE_LABELS[styleId],
						}))}
						onChange={(value) => {
							if (isChapterStyleId(value)) {
								projectStore.updateDesign({
									chapterStyleId: value,
								});
							}
						}}
					/>
					<StaticRow label="Paragraphs" />
					<SelectRow
						label="Scene breaks"
						value={project.design.sceneBreakId}
						options={SCENE_BREAK_IDS.map((sceneBreakId) => ({
							value: sceneBreakId,
							label: SCENE_BREAK_LABELS[sceneBreakId],
						}))}
						onChange={(value) => {
							if (isSceneBreakId(value)) {
								projectStore.updateDesign({
									sceneBreakId: value,
								});
							}
						}}
					/>
					<StaticRow label="Images" />
				</section>

				<details className="book-designer-details-section">
					<summary>Book details</summary>
					<div className="book-designer-details-grid">
						<TextField
							label="Title"
							value={project.metadata.title}
							placeholder="The Secret Garden"
							onChange={(value) =>
								projectStore.updateMetadata({ title: value })
							}
						/>
						<TextField
							label="Author"
							value={project.metadata.author}
							placeholder="Frances Hodgson Burnett"
							onChange={(value) =>
								projectStore.updateMetadata({ author: value })
							}
						/>
						<SelectField
							label="Language"
							value={project.metadata.language}
							options={[...languageOptions]}
							onChange={(value) =>
								projectStore.updateMetadata({ language: value })
							}
						/>
						<TextField
							label="Publisher"
							value={project.metadata.publisher}
							placeholder=""
							onChange={(value) =>
								projectStore.updateMetadata({ publisher: value })
							}
						/>
						<TextField
							label="ISBN"
							value={project.metadata.isbn}
							placeholder=""
							onChange={(value) =>
								projectStore.updateMetadata({ isbn: value })
							}
						/>
					</div>
				</details>
			</main>
		</section>
	);
}

function ThemeButton({
	themeId,
	selectedThemeId,
	onSelect,
}: {
	themeId: ThemeId;
	selectedThemeId: ThemeId;
	onSelect: (themeId: ThemeId) => void;
}) {
	const isSelected = themeId === selectedThemeId;

	return (
		<button
			type="button"
			className={isSelected ? 'is-selected' : undefined}
			aria-pressed={isSelected}
			onClick={() => onSelect(themeId)}
		>
			<span>{THEME_LABELS[themeId]}</span>
		</button>
	);
}

function SelectRow({
	label,
	value,
	options,
	onChange,
}: {
	label: string;
	value: string;
	options: Array<{ value: string; label: string }>;
	onChange: (value: string) => void;
}) {
	return (
		<label className="book-designer-design-row">
			<span>{label}</span>
			<select
				value={value}
				onChange={(event: ChangeEvent<HTMLSelectElement>) =>
					onChange(event.currentTarget.value)
				}
			>
				{options.map((option) => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</select>
		</label>
	);
}

function StaticRow({ label }: { label: string }) {
	return (
		<div className="book-designer-design-row" aria-disabled="true">
			<span>{label}</span>
			<strong>Coming next</strong>
		</div>
	);
}

function TextField({
	label,
	value,
	placeholder,
	onChange,
}: {
	label: string;
	value: string;
	placeholder: string;
	onChange: (value: string) => void;
}) {
	return (
		<label className="book-designer-field">
			<span>{label}</span>
			<input
				type="text"
				value={value}
				placeholder={placeholder}
				onChange={(event) => onChange(event.currentTarget.value)}
			/>
		</label>
	);
}

function SelectField({
	label,
	value,
	options,
	onChange,
}: {
	label: string;
	value: string;
	options: Array<{ value: string; label: string }>;
	onChange: (value: string) => void;
}) {
	return (
		<label className="book-designer-field">
			<span>{label}</span>
			<select
				value={value}
				onChange={(event: ChangeEvent<HTMLSelectElement>) =>
					onChange(event.currentTarget.value)
				}
			>
				{options.map((option) => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</select>
		</label>
	);
}
