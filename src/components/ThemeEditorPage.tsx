import { useEffect, useMemo, useState } from 'react';
import type { Book } from '../core/model/book-model';
import { renderBookThemeSampleDocument } from '../core/renderer/book-preview-renderer';
import type { BookProjectDesign, BookProjectStore } from '../plugin/project-store';
import {
	THEME_ELEMENT_PRESETS,
	THEME_ELEMENT_SLOT_LABELS,
	slotValue,
	type CustomBookTheme,
	type ThemeElementSlotId,
} from '../plugin/theme-catalog';
import { ObsidianIcon } from './ObsidianIcon';
import { ThemeCatalogControls, ThemePagination } from './ThemeCatalogControls';
import { ThemeActionBar, ThemePreviewCard, type ThemePreviewItem } from './ThemePreviewCard';

export function ThemeEditorOverview({
	theme,
	book,
	projectStore,
	onBack,
	onOpenSlot,
}: {
	theme: CustomBookTheme;
	book: Book | null;
	projectStore: BookProjectStore;
	onBack: () => void;
	onOpenSlot: (slot: ThemeElementSlotId) => void;
}) {
	const [name, setName] = useState(theme.name);
	const [error, setError] = useState<string | null>(null);
	useEffect(() => { setName(theme.name); }, [theme.id, theme.name]);

	const saveName = () => {
		try {
			projectStore.updateCustomTheme(theme.id, { name });
			setError(null);
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : 'Unable to rename this theme.');
			setName(theme.name);
		}
	};

	return (
		<section className="book-designer-theme-editor-page">
			<header className="book-designer-theme-editor-header">
				<button type="button" className="book-designer-theme-back" onClick={onBack}><ObsidianIcon name="arrow-left" />Themes</button>
				<p className="book-designer-section-label">Custom theme</p>
				<div className="book-designer-theme-name-row">
					<label><span className="book-designer-visually-hidden">Theme name</span><input value={name} onChange={(event) => setName(event.currentTarget.value)} onBlur={saveName} /></label>
					<button type="button" className="mod-cta" onClick={() => projectStore.applyTheme(theme.id)}>Apply theme to book</button>
				</div>
				{error && <p className="book-designer-theme-inline-error" role="alert">{error}</p>}
				<p>Choose an element from the right rail to browse interchangeable presets.</p>
			</header>
			<div className="book-designer-theme-editor-preview">
				{book
					? <iframe title={`${theme.name} preview`} srcDoc={renderBookThemeSampleDocument(book, theme.design)} sandbox="" />
					: <div className="book-designer-theme-preview-placeholder"><ObsidianIcon name="book-open" /><span>Open a project to preview its first chapter</span></div>}
			</div>
			<div className="book-designer-theme-element-summary">
				{(Object.keys(THEME_ELEMENT_SLOT_LABELS) as ThemeElementSlotId[]).map((slot) => (
					<button key={slot} type="button" onClick={() => onOpenSlot(slot)}>
						<span>{THEME_ELEMENT_SLOT_LABELS[slot]}</span>
						<strong>{presetName(slot, slotValue(theme.design, slot))}</strong>
						<ObsidianIcon name="chevron-right" />
					</button>
				))}
			</div>
		</section>
	);
}

export function ThemeElementPresetsPage({
	theme,
	slot,
	book,
	projectStore,
	onBack,
	onEditPreset,
}: {
	theme: CustomBookTheme;
	slot: ThemeElementSlotId;
	book: Book | null;
	projectStore: BookProjectStore;
	onBack: () => void;
	onEditPreset: (presetId: string) => void;
}) {
	const [search, setSearch] = useState('');
	const [perPage, setPerPage] = useState(4);
	const [page, setPage] = useState(1);
	const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
	const presets = THEME_ELEMENT_PRESETS[slot];
	const filtered = useMemo(() => {
		const query = search.trim().toLocaleLowerCase();
		return query ? presets.filter((preset) => preset.name.toLocaleLowerCase().includes(query)) : presets;
	}, [presets, search]);
	const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
	const visible = filtered.slice((page - 1) * perPage, page * perPage);
	const selectedPreset = presets.find((preset) => preset.id === selectedPresetId) ?? null;
	const selectedDesign = selectedPreset ? { ...theme.design, ...selectedPreset.design } : null;

	useEffect(() => { setPage(1); }, [search, perPage, slot]);
	useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);
	useEffect(() => { projectStore.setDesignPreview(selectedDesign); }, [projectStore, selectedPreset?.id]);

	const items: ThemePreviewItem[] = visible.map((preset) => ({ id: preset.id, name: preset.name, description: preset.description, design: { ...theme.design, ...preset.design } }));
	const restore = () => projectStore.setDesignPreview(selectedDesign);
	const cancel = () => { setSelectedPresetId(null); projectStore.setDesignPreview(null); };
	const apply = () => {
		if (!selectedDesign) return;
		projectStore.updateCustomTheme(theme.id, { design: selectedDesign });
		cancel();
	};

	return (
		<section className="book-designer-themes-page">
			<header className="book-designer-themes-header">
				<button type="button" className="book-designer-theme-back" onClick={() => { cancel(); onBack(); }}><ObsidianIcon name="arrow-left" />Theme editor</button>
				<p className="book-designer-section-label">Theme element</p>
				<h1>{THEME_ELEMENT_SLOT_LABELS[slot]}</h1>
				<p>Choose a preset for this slot. Preset sources stay hidden so the decision is based on the result.</p>
			</header>
			<ThemeCatalogControls search={search} onSearchChange={setSearch} perPage={perPage} onPerPageChange={setPerPage} />
			<div className="book-designer-theme-grid">
				{items.map((item) => (
					<ThemePreviewCard
						key={item.id}
						item={item}
						book={book}
						selected={item.id === selectedPresetId}
						applied={item.id === slotValue(theme.design, slot)}
						onPreview={(candidate) => projectStore.setDesignPreview(candidate.design)}
						onRestorePreview={restore}
						onSelect={(candidate) => { setSelectedPresetId(candidate.id); projectStore.setDesignPreview(candidate.design); }}
						onEditDuplicate={(candidate) => { cancel(); onEditPreset(candidate.id); }}
					/>
				))}
			</div>
			<ThemePagination page={page} pageCount={pageCount} onPageChange={setPage} />
			{selectedPreset && <ThemeActionBar label={selectedPreset.name} applyLabel="Apply preset" onApply={apply} onCancel={cancel} />}
		</section>
	);
}

export function ThemeElementSettingsPage({
	theme,
	slot,
	presetId,
	book,
	projectStore,
	onBack,
}: {
	theme: CustomBookTheme;
	slot: ThemeElementSlotId;
	presetId: string;
	book: Book | null;
	projectStore: BookProjectStore;
	onBack: () => void;
}) {
	const presets = THEME_ELEMENT_PRESETS[slot];
	const initialPreset = presets.find((preset) => preset.id === presetId) ?? presets[0];
	const [activePresetId, setActivePresetId] = useState(initialPreset?.id ?? '');
	const activePreset = presets.find((preset) => preset.id === activePresetId) ?? null;
	const design: BookProjectDesign = activePreset ? { ...theme.design, ...activePreset.design } : theme.design;

	useEffect(() => {
		projectStore.setDesignPreview(design);
		return () => projectStore.setDesignPreview(null);
	}, [activePresetId, theme.id]);

	const apply = () => {
		projectStore.updateCustomTheme(theme.id, { design });
		projectStore.setDesignPreview(null);
		onBack();
	};

	return (
		<section className="book-designer-theme-settings-page">
			<header className="book-designer-themes-header">
				<button type="button" className="book-designer-theme-back" onClick={onBack}><ObsidianIcon name="arrow-left" />{THEME_ELEMENT_SLOT_LABELS[slot]}</button>
				<p className="book-designer-section-label">Element settings</p>
				<h1>Edit {THEME_ELEMENT_SLOT_LABELS[slot].toLocaleLowerCase()}</h1>
				<p>This first version exposes the complete supported setting for this element slot. More modular controls can be added here later.</p>
			</header>
			<div className="book-designer-theme-settings-layout">
				<div className="book-designer-theme-settings-form">
					<label>
						<span>Preset</span>
						<select value={activePresetId} onChange={(event) => setActivePresetId(event.currentTarget.value)}>
							{presets.map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}
						</select>
					</label>
					{activePreset && <p>{activePreset.description}</p>}
				</div>
				<div className="book-designer-theme-settings-preview">
					{book ? <iframe title="Element settings preview" srcDoc={renderBookThemeSampleDocument(book, design)} sandbox="" /> : <div className="book-designer-theme-preview-placeholder">No chapter available</div>}
				</div>
			</div>
			<div className="book-designer-theme-settings-actions">
				<button type="button" onClick={() => { projectStore.setDesignPreview(null); onBack(); }}>Cancel</button>
				<button type="button" className="mod-cta" onClick={apply}>Apply preset</button>
			</div>
		</section>
	);
}

function presetName(slot: ThemeElementSlotId, value: string): string {
	return THEME_ELEMENT_PRESETS[slot].find((preset) => preset.id === value)?.name ?? value;
}
