import { ObsidianIcon } from './ObsidianIcon';

export function ThemeCatalogControls({
	search,
	onSearchChange,
	perPage,
	onPerPageChange,
}: {
	search: string;
	onSearchChange: (value: string) => void;
	perPage: number;
	onPerPageChange: (value: number) => void;
}) {
	return (
		<div className="book-designer-theme-controls">
			<label className="book-designer-theme-search">
				<ObsidianIcon name="search" />
				<span className="book-designer-visually-hidden">Search themes</span>
				<input type="search" value={search} onChange={(event) => onSearchChange(event.currentTarget.value)} placeholder="Search" />
			</label>
			<label className="book-designer-theme-per-page">
				<span>Per page</span>
				<select value={perPage} onChange={(event) => onPerPageChange(Number(event.currentTarget.value))}>
					<option value={4}>4</option>
					<option value={8}>8</option>
					<option value={12}>12</option>
				</select>
			</label>
		</div>
	);
}

export function ThemePagination({ page, pageCount, onPageChange }: { page: number; pageCount: number; onPageChange: (page: number) => void }) {
	return (
		<nav className="book-designer-theme-pagination" aria-label="Theme pages">
			<button type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 1} aria-label="Previous page"><ObsidianIcon name="chevron-left" /></button>
			<span>Page {page} of {pageCount}</span>
			<button type="button" onClick={() => onPageChange(page + 1)} disabled={page >= pageCount} aria-label="Next page"><ObsidianIcon name="chevron-right" /></button>
		</nav>
	);
}
