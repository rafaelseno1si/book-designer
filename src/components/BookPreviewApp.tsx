import { useState, type CSSProperties } from 'react';
import type { BookProjectStore } from '../plugin/project-store';
import { renderPreviewState } from '../plugin/project-store';
import {
	PREVIEW_DEVICE_IDS,
	PREVIEW_DEVICE_LABELS,
	type BookDesignerSettings,
	type PreviewDeviceId,
	isPreviewDeviceId,
} from '../plugin/settings';
import { useBookProject } from './useBookProject';

interface BookPreviewAppProps {
	projectStore: BookProjectStore;
	settings: BookDesignerSettings;
}

export function BookPreviewApp({
	projectStore,
	settings,
}: BookPreviewAppProps) {
	const project = useBookProject(projectStore);
	const preview = renderPreviewState(project);
	const [deviceId, setDeviceId] = useState<PreviewDeviceId>(
		settings.defaultPreviewDevice,
	);
	const [readerScale, setReaderScale] = useState(100);
	const deviceStyle = {
		'--book-preview-reader-scale': `${readerScale}%`,
	} as CSSProperties;

	return (
		<section className="book-preview-shell" aria-label="Book Preview">
			<header className="book-preview-toolbar">
				<div>
					<h1>Book Preview</h1>
					<p>{preview.themeLabel} theme</p>
				</div>
				<div
					className="book-preview-controls"
					aria-label="Reader simulation controls"
				>
					<label>
						<span>Device</span>
						<select
							value={deviceId}
							onChange={(event) => {
								const nextDeviceId = event.currentTarget.value;
								if (isPreviewDeviceId(nextDeviceId)) {
									setDeviceId(nextDeviceId);
								}
							}}
						>
							{PREVIEW_DEVICE_IDS.map((previewDeviceId) => (
								<option
									key={previewDeviceId}
									value={previewDeviceId}
								>
									{PREVIEW_DEVICE_LABELS[previewDeviceId]}
								</option>
							))}
						</select>
					</label>
					<label>
						<span>Reader size</span>
						<input
							type="range"
							min="85"
							max="130"
							step="5"
							value={readerScale}
							onChange={(event) =>
								setReaderScale(Number(event.currentTarget.value))
							}
							aria-valuetext={`${readerScale}%`}
						/>
					</label>
				</div>
			</header>

			<main className="book-preview-canvas">
				<section
					className="book-preview-device"
					data-device={deviceId}
					style={deviceStyle}
					aria-label={`${PREVIEW_DEVICE_LABELS[deviceId]} preview viewport`}
				>
					<div className="book-preview-paper">
						<p className="book-designer-empty-eyebrow">
							Shared project revision {preview.revision}
						</p>
						<h2>{preview.title}</h2>
						<p>{preview.author}</p>
						<div className="book-preview-state-list">
							<span>{preview.typographyLabel} typography</span>
							<span>{preview.chapterStyleLabel} chapter openings</span>
							<span>{preview.sceneBreakLabel} scene breaks</span>
						</div>
						{preview.hasManuscript ? null : (
							<p className="book-preview-empty-note">
								No manuscript selected. The real renderer will appear
								here when manuscript loading is added.
							</p>
						)}
					</div>
				</section>
			</main>
		</section>
	);
}
