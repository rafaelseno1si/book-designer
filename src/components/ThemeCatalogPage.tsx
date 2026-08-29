import { useEffect, useMemo, useState } from 'react';
import type { Book } from '../core/model/book-model';
import type { BookProjectStore } from '../plugin/project-store';
import type { BookThemeOption } from '../plugin/theme-catalog';
import { ThemeCatalogControls, ThemePagination } from './ThemeCatalogControls';
import { ThemeActionBar, ThemePreviewCard, type ThemePreviewItem } from './ThemePreviewCard';

export function ThemeCatalogPage({
	themes,
	book,
	appliedThemeId,
	projectStore,
	onEditTheme,
}: {
	themes: BookThemeOption[];
	book: Book | null;
	appliedThemeId: string;
	projectStore: BookProjectStore;
	onEditTheme: (themeId: string) => void;
}) {
	const [search, setSearch] = useState('');
	const [perPage, setPerPage] = useState(4);
	const [page, setPage] = useState(1);
	const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
	const filtered = useMemo(() => {
		const query = search.trim().toLocaleLowerCase();
		return query ? themes.filter((theme) => theme.name.toLocaleLowerCase().includes(query)) : themes;
	}, [search, themes]);
	const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
	const visibleThemes = filtered.slice((page - 1) * perPage, page * perPage);
	const selectedTheme = themes.find((theme) => theme.id === selectedThemeId) ?? null;

	useEffect(() => { setPage(1); }, [search, perPage]);
	useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);
	useEffect(() => { projectStore.setDesignPreview(selectedTheme?.design ?? null); }, [projectStore, selectedTheme?.id]);

	const preview = (item: ThemePreviewItem) => projectStore.setDesignPreview(item.design);
	const restorePreview = () => projectStore.setDesignPreview(selectedTheme?.design ?? null);
	const select = (item: ThemePreviewItem) => {
		setSelectedThemeId(item.id);
		projectStore.setDesignPreview(item.design);
	};
	const cancel = () => {
		setSelectedThemeId(null);
		projectStore.setDesignPreview(null);
	};
	const apply = () => {
		if (!selectedThemeId) return;
		projectStore.applyTheme(selectedThemeId);
		setSelectedThemeId(null);
	};

	return (
		<section className="book-designer-themes-page" aria-labelledby="book-designer-themes-heading">
			<header className="book-designer-themes-header">
				<div>
					<p className="book-designer-section-label">Design library</p>
					<h1 id="book-designer-themes-heading">Themes</h1>
					<p>Preview a complete book style against the first chapter. Hover is temporary; Apply changes the project.</p>
				</div>
			</header>
			<ThemeCatalogControls search={search} onSearchChange={setSearch} perPage={perPage} onPerPageChange={setPerPage} />
			{visibleThemes.length > 0 ? (
				<div className="book-designer-theme-grid" aria-label="Available themes">
					{visibleThemes.map((theme) => (
						<ThemePreviewCard
							key={theme.id}
							item={{ ...theme, description: theme.builtIn ? 'Built-in theme' : 'Custom theme' }}
							book={book}
							selected={theme.id === selectedThemeId}
							applied={theme.id === appliedThemeId}
							onPreview={preview}
							onRestorePreview={restorePreview}
							onSelect={select}
							onEditDuplicate={(item) => {
								const duplicate = projectStore.duplicateTheme(item.id);
								cancel();
								onEditTheme(duplicate.id);
							}}
						/>
					))}
				</div>
			) : <div className="book-designer-theme-no-results"><h2>No matching themes</h2><p>Try a shorter search.</p></div>}
			<ThemePagination page={page} pageCount={pageCount} onPageChange={setPage} />
			{selectedTheme && <ThemeActionBar label={selectedTheme.name} applyLabel="Apply to book" onApply={apply} onCancel={cancel} />}
		</section>
	);
}
