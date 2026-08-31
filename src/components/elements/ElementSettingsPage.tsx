import { useEffect, useState } from 'react';
import { resolveElementSettings } from '../../core/elements/settings';
import type { ElementAssignment, ElementLibraryEntry } from '../../core/elements/types';
import type { BookProjectDesign } from '../../plugin/project-store';
import { elementContext } from '../../plugin/elements/context';
import { useBookProject } from '../useBookProject';
import { ElementEditorFrame } from './ElementEditorFrame';
import { BLOCKQUOTE_SAMPLE, CompiledThemePreview, useElementServices } from './ElementServices';

export function ElementSettingsPage({
	entry,
	design,
	assignment,
	onApply,
	onBack,
}: {
	entry: ElementLibraryEntry;
	design: BookProjectDesign;
	assignment: ElementAssignment;
	onApply?: (design: BookProjectDesign) => void;
	onBack: () => void;
}) {
	const service = useElementServices();
	const snapshot = useBookProject(service.store);
	const manifest = service.compiler.inspect(entry).manifest;
	const [draft, setDraft] = useState(assignment);
	const [error, setError] = useState<string | null>(null);
	const [editorError, setEditorError] = useState<string | null>(null);
	const previewDesign = { ...design, elements: { blockquote: draft } };
	let settings;
	try {
		settings = resolveElementSettings(manifest, draft);
	} catch (error) {
		return (
			<section className="book-designer-theme-settings-page">
				<button onClick={onBack}>Back</button>
				<p role="alert">{error instanceof Error ? error.message : 'Settings unavailable.'}</p>
			</section>
		);
	}
	return (
		<section className="book-designer-theme-settings-page">
			<header className="book-designer-themes-header">
				<button type="button" className="book-designer-theme-back" onClick={onBack}>
					← {onApply ? 'Blockquote' : 'Elements'}
				</button>
				<p className="book-designer-section-label">
					{onApply ? 'Theme element settings' : 'Library preview · changes are temporary'}
				</p>
				<h1>{entry.name}</h1>
			</header>
			<ElementDraftPreview design={previewDesign} enabled={Boolean(onApply)} />
			<div className="book-designer-theme-settings-layout">
				<div className="book-designer-theme-settings-form">
					<label>
						Preset
						<select
							value={draft.presetId}
							onChange={(event) =>
								setDraft({
									...draft,
									presetId: event.currentTarget.value,
									settingsOverrides: {},
								})
							}
						>
							{manifest.presets.map((preset) => (
								<option key={preset.id} value={preset.id}>
									{preset.name}
								</option>
							))}
						</select>
					</label>
					<ElementEditorFrame
						entry={entry}
						settings={settings}
						context={elementContext(
							snapshot.activeProject,
							design,
							snapshot.runtime.previewPrintSettings,
						)}
						onStatus={setEditorError}
						onChange={(settings) => {
							setError(null);
							setDraft({ ...draft, settingsOverrides: settings });
						}}
					/>
				</div>
				<div className="book-designer-theme-settings-preview">
					<CompiledThemePreview
						book={BLOCKQUOTE_SAMPLE}
						design={previewDesign}
						title="Quotation settings preview"
						sample
					/>
				</div>
			</div>
			{error && <p role="alert">{error}</p>}
			<div className="book-designer-theme-settings-actions">
				<button type="button" onClick={() => setDraft({ ...draft, settingsOverrides: {} })}>
					Reset
				</button>
				<button type="button" onClick={onBack}>
					{onApply ? 'Cancel' : 'Close'}
				</button>
				{onApply && (
					<button
						type="button"
						className="mod-cta"
						disabled={Boolean(editorError)}
						onClick={() => {
							try {
								resolveElementSettings(manifest, draft);
								onApply(previewDesign);
							} catch (error) {
								setError(error instanceof Error ? error.message : 'Invalid settings.');
							}
						}}
					>
						Apply
					</button>
				)}
			</div>
		</section>
	);
}
function ElementDraftPreview({ design, enabled }: { design: BookProjectDesign; enabled: boolean }) {
	const service = useElementServices();
	useEffect(() => {
		if (enabled) service.store.setDesignPreview(design);
		return () => {
			if (enabled) service.store.setDesignPreview(null);
		};
	}, [service, enabled, JSON.stringify(design)]);
	return null;
}
