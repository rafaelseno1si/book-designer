import { useState } from 'react';
import {
	inchesToUnit,
	roundPrintValue,
	unitToInches,
	type BookPrintSettings,
	type PrintUnit,
} from '../plugin/print-settings';

type GeometryTab = 'safe' | 'content' | 'header' | 'footer';

export function PrintGeometrySection({ settings, onChange }: { settings: BookPrintSettings; onChange: (settings: BookPrintSettings) => void }) {
	const [tab, setTab] = useState<GeometryTab>('safe');
	const update = (key: keyof BookPrintSettings, value: number) => onChange({ ...settings, [key]: value });

	return (
		<section className="book-designer-print-section" aria-labelledby="book-designer-print-geometry-heading">
			<div className="book-designer-print-section-heading"><div><span>02</span><h2 id="book-designer-print-geometry-heading">Page geometry</h2></div></div>
			<p>Define the printer-safe area, the text block, and the running header and footer zones.</p>
			<div className="book-designer-geometry-tabs" role="tablist" aria-label="Page geometry">
				{([['safe', 'Safe zone'], ['content', 'Content'], ['header', 'Header'], ['footer', 'Footer']] as const).map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'is-selected' : ''} onClick={() => setTab(id)}>{label}</button>)}
			</div>
			<div className="book-designer-geometry-fields" role="tabpanel">
				{tab === 'safe' && <>
					<p>Minimum distance between the trimmed edge and critical page content.</p>
					<MeasurementStepper label="Inside (gutter)" valueIn={settings.safeInsideIn} unit={settings.unit} onChange={(value) => update('safeInsideIn', value)} />
					<MeasurementStepper label="Outside (other edges)" valueIn={settings.safeOutsideIn} unit={settings.unit} onChange={(value) => update('safeOutsideIn', value)} />
				</>}
				{tab === 'content' && <>
					<p>Space inside the safe zone reserved around the main text block.</p>
					<MeasurementStepper label="Inside (gutter)" valueIn={settings.contentInsideIn} unit={settings.unit} onChange={(value) => update('contentInsideIn', value)} />
					<MeasurementStepper label="Outside (other edges)" valueIn={settings.contentOutsideIn} unit={settings.unit} onChange={(value) => update('contentOutsideIn', value)} />
				</>}
				{tab === 'header' && <>
					<p>Reserve a top zone for running heads and separation from the trim.</p>
					<MeasurementStepper label="Total space" valueIn={settings.headerTotalIn} unit={settings.unit} onChange={(value) => update('headerTotalIn', value)} />
					<MeasurementStepper label="Space above header" valueIn={settings.headerGapIn} unit={settings.unit} onChange={(value) => update('headerGapIn', value)} />
				</>}
				{tab === 'footer' && <>
					<p>Reserve a bottom zone for folios and separation from the trim.</p>
					<MeasurementStepper label="Total space" valueIn={settings.footerTotalIn} unit={settings.unit} onChange={(value) => update('footerTotalIn', value)} />
					<MeasurementStepper label="Space below footer" valueIn={settings.footerGapIn} unit={settings.unit} onChange={(value) => update('footerGapIn', value)} />
				</>}
			</div>
		</section>
	);
}

function MeasurementStepper({ label, valueIn, unit, onChange }: { label: string; valueIn: number; unit: PrintUnit; onChange: (value: number) => void }) {
	const value = roundPrintValue(inchesToUnit(valueIn, unit));
	const displayStep = unit === 'cm' ? 0.1 : 0.025;
	const nudge = (direction: number) => onChange(roundPrintValue(Math.max(0, unitToInches(value + displayStep * direction, unit))));
	return <div className="book-designer-measurement-row">
		<span>{label}</span>
		<div className="book-designer-measurement-stepper">
			<button type="button" onClick={() => nudge(-1)} aria-label={`Decrease ${label}`}>−</button>
			<label><span className="book-designer-visually-hidden">{label}</span><input type="number" min="0" step={displayStep} value={value} onChange={(event) => onChange(roundPrintValue(unitToInches(Number(event.currentTarget.value), unit)))} /></label>
			<small>{unit}</small>
			<button type="button" onClick={() => nudge(1)} aria-label={`Increase ${label}`}>+</button>
		</div>
	</div>;
}
