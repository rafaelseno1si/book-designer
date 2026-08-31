import { useEffect, useState } from 'react';
import type { ElementAssignment } from '../../core/elements/types';
import type { CustomBookTheme } from '../../plugin/theme-catalog';
import { ThemeCatalogControls, ThemePagination } from '../ThemeCatalogControls';
import { ThemeActionBar } from '../ThemePreviewCard';
import { BLOCKQUOTE_SAMPLE, CompiledThemePreview, useElementServices } from './ElementServices';
import { ElementSettingsPage } from './ElementSettingsPage';

export function ElementPresetCatalog({
	theme,
	onBack,
	onManage,
}: {
	theme: CustomBookTheme;
	onBack: () => void;
	onManage: () => void;
}) {
	const service = useElementServices();
	const [search, setSearch] = useState('');
	const [perPage, setPerPage] = useState(4);
	const [page, setPage] = useState(1);
	const [selected, setSelected] = useState<ElementAssignment | null>(null);
	const [editing, setEditing] = useState<{ assignment: ElementAssignment; generation: number } | null>(
		null,
	);
	const [notice, setNotice] = useState<string | null>(null);
	const entries = service.entries();
	const presets = entries.flatMap((entry) =>
		service.compiler
			.inspect(entry)
			.manifest.presets.map((preset) => ({
				entry,
				preset,
				id: `${entry.id}/${preset.id}`,
				assignment: { elementId: entry.id, presetId: preset.id, settingsOverrides: {} },
			})),
	);
	const filtered = presets.filter((item) =>
		`${item.preset.name} ${item.entry.name} ${item.preset.description ?? ''}`
			.toLocaleLowerCase()
			.includes(search.toLocaleLowerCase()),
	);
	const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
	const applied = theme.design.elements?.blockquote;
	const design = (assignment: ElementAssignment) => ({
		...theme.design,
		elements: { blockquote: assignment },
	});
	const cancel = () => {
		setSelected(null);
		service.store.setDesignPreview(null);
	};
	useEffect(() => {
		setPage(1);
	}, [search, perPage]);
	useEffect(() => () => service.store.setDesignPreview(null), [service]);
	const generation = service.compiler.getGeneration();
	useEffect(() => {
		if (editing && editing.generation !== generation) {
			setEditing(null);
			cancel();
			setNotice('The element library changed. The settings draft was discarded.');
		}
	}, [generation]);
	const editingEntry = entries.find((entry) => entry.id === editing?.assignment.elementId);
	if (editing && editingEntry && editing.generation === generation)
		return (
			<ElementSettingsPage
				key={`${editingEntry.id}:${editingEntry.package.files['index.html']}`}
				entry={editingEntry}
				design={theme.design}
				assignment={editing.assignment}
				onBack={() => {
					setEditing(null);
					cancel();
				}}
				onApply={(design) => {
					service.store.updateCustomTheme(theme.id, { design });
					setEditing(null);
					cancel();
				}}
			/>
		);
	return (
		<section className="book-designer-themes-page">
			<header className="book-designer-themes-header">
				<button
					className="book-designer-theme-back"
					onClick={() => {
						cancel();
						onBack();
					}}
				>
					← Theme editor
				</button>
				<p className="book-designer-section-label">Theme element</p>
				<h1>Blockquote</h1>
				<p>Style every Markdown quotation in the book. Thumbnails show sample content.</p>
				<button
					onClick={() => {
						cancel();
						onManage();
					}}
				>
					Manage elements
				</button>
			</header>
			{notice && <p role="status">{notice}</p>}
			<ThemeCatalogControls
				searchLabel="Search blockquote presets"
				search={search}
				onSearchChange={setSearch}
				perPage={perPage}
				onPerPageChange={setPerPage}
			/>
			<div className="book-designer-theme-grid">
				{filtered
					.slice((Math.min(page, pageCount) - 1) * perPage, Math.min(page, pageCount) * perPage)
					.map(({ entry, preset, assignment, id }) => (
						<article
							key={id}
							className={`book-designer-theme-card${selected?.elementId === entry.id && selected.presetId === preset.id ? ' is-selected' : ''}`}
						>
							<button
								type="button"
								className="book-designer-theme-preview-button"
								disabled={!entry.enabled}
								onPointerEnter={() => service.store.setDesignPreview(design(assignment))}
								onPointerLeave={() =>
									service.store.setDesignPreview(selected ? design(selected) : null)
								}
								onFocus={() => service.store.setDesignPreview(design(assignment))}
								onBlur={() =>
									service.store.setDesignPreview(selected ? design(selected) : null)
								}
								onClick={() => {
									setSelected(assignment);
									service.store.setDesignPreview(design(assignment));
								}}
							>
								<div className="book-designer-theme-preview-frame">
									<CompiledThemePreview
										book={BLOCKQUOTE_SAMPLE}
										design={design(assignment)}
										title={`${preset.name} sample`}
									/>
								</div>
								<span className="book-designer-theme-card-copy">
									<span className="book-designer-theme-card-title">
										<strong>{preset.name}</strong>
										{applied?.elementId === entry.id &&
											applied.presetId === preset.id && <span>Applied</span>}
									</span>
									<small>{preset.description}</small>
									<small>
										{entry.name} · Sample quotation{!entry.enabled ? ' · Disabled' : ''}
									</small>
								</span>
							</button>
							<button
								className="book-designer-theme-duplicate-button"
								disabled={!entry.enabled}
								onClick={() => {
									cancel();
									setNotice(null);
									setEditing({
										assignment:
											applied?.elementId === entry.id && applied.presetId === preset.id
												? applied
												: assignment,
										generation,
									});
								}}
							>
								Edit settings
							</button>
						</article>
					))}
			</div>
			{!filtered.length && <p>No matching presets. Import an HTML element from Elements.</p>}
			<ThemePagination page={Math.min(page, pageCount)} pageCount={pageCount} onPageChange={setPage} />
			{selected && (
				<ThemeActionBar
					label={
						presets.find((item) => item.id === `${selected.elementId}/${selected.presetId}`)
							?.preset.name ?? 'Blockquote'
					}
					applyLabel="Apply preset"
					onCancel={cancel}
					onApply={() => {
						service.store.updateCustomTheme(theme.id, { design: design(selected) });
						cancel();
					}}
				/>
			)}
		</section>
	);
}
