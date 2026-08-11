import { useState } from 'react';
import {
	BookDesignerSettings,
	PREVIEW_DEVICE_LABELS,
} from '../plugin/settings';

type MobilePanel = 'chapters' | 'preview' | 'design';

interface BookDesignerAppProps {
	settings: BookDesignerSettings;
}

const mobilePanels: Array<{ id: MobilePanel; label: string }> = [
	{ id: 'chapters', label: 'Chapters' },
	{ id: 'preview', label: 'Preview' },
	{ id: 'design', label: 'Design' },
];

export function BookDesignerApp({ settings }: BookDesignerAppProps) {
	const [activePanel, setActivePanel] = useState<MobilePanel>('preview');

	return (
		<section
			className="book-designer-shell"
			aria-label="Book Designer workspace"
		>
			<header className="book-designer-header">
				<div>
					<h1>Book Designer</h1>
					<p>Design and preview manuscripts from your vault.</p>
				</div>
				<nav
					className="book-designer-mobile-tabs"
					aria-label="Workspace panels"
				>
					{mobilePanels.map((panel) => (
						<button
							type="button"
							key={panel.id}
							className={
								activePanel === panel.id ? 'is-active' : undefined
							}
							aria-pressed={activePanel === panel.id}
							onClick={() => setActivePanel(panel.id)}
						>
							{panel.label}
						</button>
					))}
				</nav>
			</header>

			<aside
				className={panelClassName('chapters', activePanel)}
				aria-label="Manuscript navigation"
			>
				<div className="book-designer-panel-heading">
					<h2>Manuscript</h2>
					<span>Not loaded</span>
				</div>
				<div className="book-designer-empty-list">
					<p>No manuscript selected.</p>
					<p>Folder and chapter selection will be added next.</p>
				</div>
			</aside>

			<main
				className={previewClassName(activePanel)}
				aria-label="Book preview workspace"
			>
				<div className="book-designer-toolbar" aria-label="Preview toolbar">
					<div>
						<span className="book-designer-toolbar-label">Device</span>
						<strong>
							{PREVIEW_DEVICE_LABELS[settings.defaultPreviewDevice]}
						</strong>
					</div>
					<div className="book-designer-toolbar-actions">
						<button
							type="button"
							title="Device controls will be added next"
							disabled
						>
							Device
						</button>
						<button
							type="button"
							title="Refresh will be available after manuscript loading"
							disabled
						>
							Refresh
						</button>
					</div>
				</div>

				<section
					className="book-designer-preview-canvas"
					aria-label="Preview canvas"
				>
					<div className="book-designer-paper">
						<p className="book-designer-empty-eyebrow">Preview</p>
						<h2>No manuscript selected</h2>
						<p>
							Manuscript selection will be added next. This space will
							host the isolated book preview.
						</p>
					</div>
				</section>
			</main>

			<aside
				className={panelClassName('design', activePanel)}
				aria-label="Design controls"
			>
				<div className="book-designer-panel-heading">
					<h2>Design</h2>
					<span>Defaults</span>
				</div>
				<div className="book-designer-control-stack">
					<ReadOnlySetting
						label="Preview device"
						value={PREVIEW_DEVICE_LABELS[settings.defaultPreviewDevice]}
					/>
					<ReadOnlySetting
						label="Auto refresh"
						value={settings.autoRefreshPreview ? 'On' : 'Off'}
					/>
					<ReadOnlySetting
						label="Debug logging"
						value={settings.debugLogging ? 'On' : 'Off'}
					/>
				</div>
			</aside>
		</section>
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

function panelClassName(panel: Exclude<MobilePanel, 'preview'>, activePanel: MobilePanel) {
	return [
		'book-designer-panel',
		`book-designer-panel--${panel}`,
		activePanel === panel ? 'is-active' : '',
	]
		.filter(Boolean)
		.join(' ');
}

function previewClassName(activePanel: MobilePanel) {
	return [
		'book-designer-preview-workspace',
		activePanel === 'preview' ? 'is-active' : '',
	]
		.filter(Boolean)
		.join(' ');
}
