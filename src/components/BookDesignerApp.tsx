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
	isChapterStyleId,
	isSceneBreakId,
	isThemeId,
	isTypographyScale,
	renderPreviewState,
} from '../plugin/project-store';
import { useBookProject } from './useBookProject';

interface BookDesignerAppProps {
	projectStore: BookProjectStore;
}

export function BookDesignerApp({ projectStore }: BookDesignerAppProps) {
	const project = useBookProject(projectStore);
	const preview = renderPreviewState(project);

	return (
		<section
			className="book-designer-shell"
			aria-label="Book Designer configuration workspace"
		>
			<header className="book-designer-header">
				<div>
					<h1>Book Designer</h1>
					<p>Configure manuscript structure, metadata, and book design.</p>
				</div>
				<div className="book-designer-sync-status" aria-live="polite">
					<span>Shared project</span>
					<strong>Revision {project.revision}</strong>
				</div>
			</header>

			<aside className="book-designer-panel" aria-label="Manuscript structure">
				<div className="book-designer-panel-heading">
					<h2>Manuscript</h2>
					<span>Not loaded</span>
				</div>
				<div className="book-designer-empty-list">
					<p>No manuscript selected.</p>
					<p>Folder and chapter ordering will be added next.</p>
				</div>
			</aside>

			<main className="book-designer-config-main" aria-label="Book configuration">
				<section className="book-designer-config-section">
					<div>
						<h2>Metadata</h2>
						<p>Shared book identity used by Designer and Preview.</p>
					</div>
					<div className="book-designer-field-grid">
						<TextField
							label="Title"
							value={project.metadata.title}
							placeholder="Untitled book"
							onChange={(value) =>
								projectStore.updateMetadata({ title: value })
							}
						/>
						<TextField
							label="Author"
							value={project.metadata.author}
							placeholder="Unknown author"
							onChange={(value) =>
								projectStore.updateMetadata({ author: value })
							}
						/>
						<TextField
							label="Language"
							value={project.metadata.language}
							placeholder="en"
							onChange={(value) =>
								projectStore.updateMetadata({ language: value })
							}
						/>
					</div>
				</section>

				<section className="book-designer-config-section">
					<div>
						<h2>Book design</h2>
						<p>These choices update open Book Preview tabs immediately.</p>
					</div>
					<div className="book-designer-field-grid">
						<SelectField
							label="Theme"
							value={project.design.themeId}
							options={THEME_IDS.map((themeId) => ({
								value: themeId,
								label: THEME_LABELS[themeId],
							}))}
							onChange={(value) => {
								if (isThemeId(value)) {
									projectStore.updateDesign({ themeId: value });
								}
							}}
						/>
						<SelectField
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
						<SelectField
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
						<SelectField
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
					</div>
				</section>
			</main>

			<aside className="book-designer-panel" aria-label="Shared preview state">
				<div className="book-designer-panel-heading">
					<h2>Preview state</h2>
					<span>Live</span>
				</div>
				<div className="book-designer-control-stack">
					<ReadOnlySetting label="Title" value={preview.title} />
					<ReadOnlySetting label="Author" value={preview.author} />
					<ReadOnlySetting label="Theme" value={preview.themeLabel} />
					<ReadOnlySetting
						label="Typography"
						value={preview.typographyLabel}
					/>
					<ReadOnlySetting
						label="Chapter style"
						value={preview.chapterStyleLabel}
					/>
					<ReadOnlySetting
						label="Scene breaks"
						value={preview.sceneBreakLabel}
					/>
				</div>
			</aside>
		</section>
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

function ReadOnlySetting({
	label,
	value,
}: {
	label: string;
	value: string;
}) {
	return (
		<div className="book-designer-readonly-setting">
			<span>{label}</span>
			<strong>{value}</strong>
		</div>
	);
}
