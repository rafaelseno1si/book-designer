import { useEffect, useMemo, useRef, useState } from 'react';
import {
	PRINT_PROVIDER_META,
	assessPrintProvider,
	applyProviderRecommendations,
	samePrintSettings,
	validatePrintSettings,
	type BookPrintSettings,
	type PrintProvider,
} from '../plugin/print-settings';
import type { BookProjectSnapshot, BookProjectStore } from '../plugin/project-store';
import { ObsidianIcon } from './ObsidianIcon';
import { PrintFormatSection } from './PrintFormatSection';
import { PrintGeometrySection } from './PrintGeometrySection';

interface PrintSettingsPanelProps {
	snapshot: BookProjectSnapshot;
	projectStore: BookProjectStore;
	onDirtyChange: (dirty: boolean) => void;
}

export function PrintSettingsPanel({ snapshot, projectStore, onDirtyChange }: PrintSettingsPanelProps) {
	const project = snapshot.activeProject;
	if (!project) return <PrintSettingsEmptyState />;
	return <ActivePrintSettingsPanel key={project.id} snapshot={snapshot} projectStore={projectStore} onDirtyChange={onDirtyChange} />;
}

function ActivePrintSettingsPanel({ snapshot, projectStore, onDirtyChange }: PrintSettingsPanelProps) {
	const project = snapshot.activeProject;
	if (!project) return null;
	const [draft, setDraft] = useState<BookPrintSettings>(() => ({ ...project.print }));
	const previousPersisted = useRef(project.print);
	const dirty = !samePrintSettings(draft, project.print);
	const errors = useMemo(() => validatePrintSettings(draft), [draft]);
	const pageCount = project.preview.printPaginationMode === 'complete' ? snapshot.runtime.printPageCount : null;
	const assessment = useMemo(() => assessPrintProvider(draft, pageCount), [draft, pageCount]);
	const providerMeta = PRINT_PROVIDER_META[draft.provider];
	const hasRecommendation = assessment.recommendedInsideIn !== null || assessment.recommendedOutsideIn !== null;

	useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);
	useEffect(() => () => onDirtyChange(false), [onDirtyChange]);
	useEffect(() => {
		if (errors.length === 0) projectStore.setPrintSettingsPreview(draft);
	}, [draft, errors.length, projectStore]);
	useEffect(() => () => projectStore.setPrintSettingsPreview(null), [projectStore]);
	useEffect(() => {
		const draftWasClean = samePrintSettings(draft, previousPersisted.current);
		previousPersisted.current = project.print;
		if (draftWasClean && !samePrintSettings(draft, project.print)) setDraft({ ...project.print });
	}, [project.print]);

	const apply = () => {
		if (!dirty || errors.length > 0) return;
		projectStore.updatePrintSettings(draft);
		onDirtyChange(false);
	};

	return (
		<section className="book-designer-print-page" aria-labelledby="book-designer-print-heading">
			<header className="book-designer-print-header">
				<div>
					<p className="book-designer-section-label">Production</p>
					<h1 id="book-designer-print-heading">Print settings</h1>
					<p>Shape the physical page, manuscript flow, and printer-safe areas while Preview shows the live draft.</p>
				</div>
				<div className={`book-designer-print-draft-status${dirty ? ' is-dirty' : ''}`}><i />{dirty ? 'Unapplied changes' : 'Settings applied'}</div>
			</header>

			<div className="book-designer-print-workbench">
				<div className="book-designer-print-form">
					<PrintFormatSection settings={draft} onChange={setDraft} />
					<PrintGeometrySection settings={draft} onChange={setDraft} />
					<BookFlowSection settings={draft} onChange={setDraft} />
					<section className="book-designer-print-section" aria-labelledby="book-designer-print-production-heading">
						<div className="book-designer-print-section-heading"><div><span>04</span><h2 id="book-designer-print-production-heading">Production guide</h2></div></div>
						<p>Compare this layout with offline guidance from a production service. Guidance never blocks custom values.</p>
						<label className="book-designer-provider-select"><span>Printer profile</span><select value={draft.provider} onChange={(event) => setDraft({ ...draft, provider: event.currentTarget.value as PrintProvider })}>{Object.entries(PRINT_PROVIDER_META).map(([id, meta]) => <option key={id} value={id}>{meta.label}</option>)}</select></label>
						<div className="book-designer-provider-assessment">
							<div><span className={`is-${assessment.trimStatus}`}><ObsidianIcon name={assessment.trimStatus === 'supported' ? 'circle-check' : assessment.trimStatus === 'unsupported' ? 'triangle-alert' : 'circle-help'} />{assessment.trimStatus === 'supported' ? 'Trim supported' : assessment.trimStatus === 'unsupported' ? 'Trim not listed' : 'Trim not evaluated'}</span>{pageCount !== null && <span>{pageCount} pages</span>}</div>
							{assessment.recommendedInsideIn !== null && <p>Suggested safe zone: <strong>{assessment.recommendedInsideIn} in inside</strong>{assessment.recommendedOutsideIn !== null ? ` · ${assessment.recommendedOutsideIn} in outside` : ''}</p>}
							{assessment.notes.map((note) => <small key={note}>{note}</small>)}
							<div><button type="button" disabled={!hasRecommendation} onClick={() => setDraft(applyProviderRecommendations(draft, assessment))}>Apply recommendations</button>{providerMeta.sourceUrl && <a href={providerMeta.sourceUrl} target="_blank" rel="noreferrer">View source</a>}</div>
							<small>Guidance reviewed {providerMeta.reviewed}.</small>
						</div>
					</section>
				</div>
			</div>

			{errors.length > 0 && <div className="book-designer-print-errors" role="alert"><strong>Check these settings</strong><ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul></div>}
			<footer className="book-designer-print-actions">
				<span>{dirty ? 'Review the live Preview tab, then apply these settings.' : 'Preview is showing the applied print settings.'}</span>
				<div><button type="button" disabled={!dirty} onClick={() => setDraft({ ...project.print })}>Cancel</button><button type="button" className="mod-cta" disabled={!dirty || errors.length > 0} onClick={apply}>Apply</button></div>
			</footer>
		</section>
	);
}

function BookFlowSection({ settings, onChange }: { settings: BookPrintSettings; onChange: (settings: BookPrintSettings) => void }) {
	return <section className="book-designer-print-section" aria-labelledby="book-designer-print-flow-heading">
		<div className="book-designer-print-section-heading"><div><span>03</span><h2 id="book-designer-print-flow-heading">Book flow</h2></div></div>
		<p>Adjust print-only typography, chapter rectos, folio start, and image output.</p>
		<div className="book-designer-flow-sliders">
			<label><span>Font size</span><input type="range" min="7" max="24" step="0.5" value={settings.fontSizePt} onChange={(event) => onChange({ ...settings, fontSizePt: Number(event.currentTarget.value) })} /><output>{settings.fontSizePt} pt</output></label>
			<label><span>Line spacing</span><input type="range" min="1" max="2.5" step="0.05" value={settings.lineHeight} onChange={(event) => onChange({ ...settings, lineHeight: Number(event.currentTarget.value) })} /><output>{settings.lineHeight.toFixed(2)}</output></label>
		</div>
		<ChoiceGroup label="Chapter openings" value={settings.chapterStart} choices={[['first-recto', 'First chapter begins on a right page'], ['every-recto', 'Every chapter begins on a right page']]} onChange={(chapterStart) => onChange({ ...settings, chapterStart })} />
		<ChoiceGroup label="Page numbering" value={settings.pageNumberStart} choices={[['initial-page', 'Start at the initial page'], ['first-chapter', 'Start at the first chapter']]} onChange={(pageNumberStart) => onChange({ ...settings, pageNumberStart })} />
		<ChoiceGroup label="Images" value={settings.imageMode} choices={[['black-white', 'Black and white'], ['color', 'Color']]} onChange={(imageMode) => onChange({ ...settings, imageMode })} />
		<label className="book-designer-print-guide-toggle"><input type="checkbox" checked={settings.showMarginGuides} onChange={(event) => onChange({ ...settings, showMarginGuides: event.currentTarget.checked })} /><span><strong>Margin indicators</strong><small>Show safe, content, header, and footer guides in Print Preview.</small></span></label>
	</section>;
}

function ChoiceGroup<T extends string>({ label, value, choices, onChange }: { label: string; value: T; choices: ReadonlyArray<readonly [T, string]>; onChange: (value: T) => void }) {
	return <fieldset className="book-designer-print-choice-group"><legend>{label}</legend>{choices.map(([id, text]) => <label key={id}><input type="radio" name={label} value={id} checked={value === id} onChange={() => onChange(id)} /><span>{text}</span></label>)}</fieldset>;
}

function PrintSettingsEmptyState() {
	return <section className="book-designer-print-empty"><ObsidianIcon name="printer" /><h1>Print settings</h1><p>Create or open a project to configure its physical edition.</p></section>;
}
