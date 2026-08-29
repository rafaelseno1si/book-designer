import {
	PRINT_TRIM_PRESETS,
	inchesToUnit,
	roundPrintValue,
	unitToInches,
	type BookPrintSettings,
	type PrintTrimPreset,
	type PrintUnit,
} from '../plugin/print-settings';

const GROUP_LABELS: Record<PrintTrimPreset['group'], string> = {
	popular: 'Popular trim sizes',
	additional: 'Additional sizes',
	international: 'International sizes',
	'mass-market': 'Mass-market paperbacks',
	'large-print': 'Large-print options',
};

export function PrintFormatSection({ settings, onChange }: { settings: BookPrintSettings; onChange: (settings: BookPrintSettings) => void }) {
	const choosePreset = (preset: PrintTrimPreset) => onChange({ ...settings, trimPresetId: preset.id, trimWidthIn: preset.widthIn, trimHeightIn: preset.heightIn });
	const setDimension = (key: 'trimWidthIn' | 'trimHeightIn', value: number) => onChange({ ...settings, trimPresetId: 'custom', [key]: value });

	return (
		<section className="book-designer-print-section" aria-labelledby="book-designer-print-format-heading">
			<div className="book-designer-print-section-heading">
				<div><span>01</span><h2 id="book-designer-print-format-heading">Format</h2></div>
				<UnitToggle value={settings.unit} onChange={(unit) => onChange({ ...settings, unit })} />
			</div>
			<p>Choose a production size or enter a custom trim. Measurements are stored precisely in inches.</p>
			<fieldset className="book-designer-trim-preset-fieldset">
				<legend>{GROUP_LABELS.popular}</legend>
				<div className="book-designer-trim-preset-grid">
					{PRINT_TRIM_PRESETS.filter((preset) => preset.group === 'popular').map((preset) => <TrimPresetButton key={preset.id} preset={preset} selected={settings.trimPresetId === preset.id} onClick={() => choosePreset(preset)} />)}
				</div>
			</fieldset>
			<details className="book-designer-trim-more">
				<summary>Browse more trim sizes</summary>
				{(['additional', 'international', 'mass-market', 'large-print'] as const).map((group) => <fieldset key={group}>
					<legend>{GROUP_LABELS[group]}</legend>
					<div className="book-designer-trim-chip-grid">
						{PRINT_TRIM_PRESETS.filter((preset) => preset.group === group).map((preset) => <button key={preset.id} type="button" className={settings.trimPresetId === preset.id ? 'is-selected' : ''} onClick={() => choosePreset(preset)}>{preset.label}</button>)}
					</div>
				</fieldset>)}
			</details>
			<div className={`book-designer-custom-trim${settings.trimPresetId === 'custom' ? ' is-active' : ''}`}>
				<div><strong>Custom trim</strong><small>3–12 inches per side</small></div>
				<div>
					<DimensionInput label="Width" valueIn={settings.trimWidthIn} unit={settings.unit} onChange={(value) => setDimension('trimWidthIn', value)} />
					<span aria-hidden="true">×</span>
					<DimensionInput label="Height" valueIn={settings.trimHeightIn} unit={settings.unit} onChange={(value) => setDimension('trimHeightIn', value)} />
				</div>
			</div>
		</section>
	);
}

function UnitToggle({ value, onChange }: { value: PrintUnit; onChange: (unit: PrintUnit) => void }) {
	return <div className="book-designer-print-unit-toggle" aria-label="Measurement unit">{(['in', 'cm'] as const).map((unit) => <button key={unit} type="button" className={value === unit ? 'is-selected' : ''} aria-pressed={value === unit} onClick={() => onChange(unit)}>{unit}</button>)}</div>;
}

function TrimPresetButton({ preset, selected, onClick }: { preset: PrintTrimPreset; selected: boolean; onClick: () => void }) {
	return <button type="button" className={`book-designer-trim-preset${selected ? ' is-selected' : ''}`} aria-pressed={selected} onClick={onClick}>
		<span className="book-designer-trim-silhouette" style={{ aspectRatio: `${preset.widthIn} / ${preset.heightIn}` }} />
		<strong>{preset.label}</strong>
	</button>;
}

function DimensionInput({ label, valueIn, unit, onChange }: { label: string; valueIn: number; unit: PrintUnit; onChange: (inches: number) => void }) {
	const value = roundPrintValue(inchesToUnit(valueIn, unit));
	return <label><span>{label}</span><span className="book-designer-print-number-input"><input type="number" min={unit === 'cm' ? 7.62 : 3} max={unit === 'cm' ? 30.48 : 12} step={unit === 'cm' ? 0.1 : 0.01} value={value} onChange={(event) => onChange(roundPrintValue(unitToInches(Number(event.currentTarget.value), unit)))} /><small>{unit}</small></span></label>;
}
