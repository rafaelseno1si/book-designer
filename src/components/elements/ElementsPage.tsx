import { useEffect, useState } from 'react';
import { BUILTIN_BLOCKQUOTE_ID, type ElementLibraryEntry } from '../../core/elements/types';
import { DEFAULT_PROJECT_DESIGN } from '../../plugin/project-store';
import { elementUses } from '../../plugin/elements/library';
import { ThemeCatalogControls, ThemePagination } from '../ThemeCatalogControls';
import { useBookProject } from '../useBookProject';
import { useElementServices } from './ElementServices';
import { ElementSettingsPage } from './ElementSettingsPage';

export function ElementsPage() {
	const service = useElementServices();
	const snapshot = useBookProject(service.store);
	const [search, setSearch] = useState('');
	const [perPage, setPerPage] = useState(8);
	const [page, setPage] = useState(1);
	const [previewId, setPreviewId] = useState<string | null>(null);
	const entries = service.entries();
	const preview = entries.find((entry) => entry.id === previewId);
	useEffect(() => {
		setPage(1);
	}, [search, perPage]);
	if (preview)
		return (
			<ElementSettingsPage
				key={`${preview.id}:${preview.package.files['index.html']}`}
				entry={preview}
				design={snapshot.activeProject?.design ?? DEFAULT_PROJECT_DESIGN}
				assignment={{
					elementId: preview.id,
					presetId: service.compiler.inspect(preview).manifest.presets[0]?.id ?? '',
					settingsOverrides: {},
				}}
				onBack={() => setPreviewId(null)}
			/>
		);
	const filtered = entries.filter((entry) =>
		`${entry.name} ${entry.description} blockquote`
			.toLocaleLowerCase()
			.includes(search.toLocaleLowerCase()),
	);
	const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
	return (
		<section className="book-designer-elements-page">
			<header className="book-designer-themes-header">
				<p className="book-designer-section-label">Vault library</p>
				<h1>Elements</h1>
				<p>
					Reusable design elements. Develop HTML files outside Book Designer, then import them here.
				</p>
				<button
					className="mod-cta"
					onClick={() => {
						void service.importElement();
					}}
				>
					Create/import element
				</button>
			</header>
			<ThemeCatalogControls
				searchLabel="Search elements"
				search={search}
				onSearchChange={setSearch}
				perPage={perPage}
				onPerPageChange={setPerPage}
			/>
			<div className="book-designer-element-library">
				{filtered
					.slice((Math.min(page, pageCount) - 1) * perPage, Math.min(page, pageCount) * perPage)
					.map((entry) => (
						<ElementLibraryRow
							key={entry.id}
							entry={entry}
							onPreview={() => setPreviewId(entry.id)}
						/>
					))}
			</div>
			{!filtered.length && <p>No matching elements.</p>}
			<ThemePagination
				label="Element pages"
				page={Math.min(page, pageCount)}
				pageCount={pageCount}
				onPageChange={setPage}
			/>
			<p className="book-designer-element-help">
				V1 supports single HTML files and the Blockquote category. ZIP packages and assets are not
				supported yet.
			</p>
		</section>
	);
}
function ElementLibraryRow({ entry, onPreview }: { entry: ElementLibraryEntry; onPreview: () => void }) {
	const service = useElementServices();
	const snapshot = useBookProject(service.store);
	const builtIn = entry.id === BUILTIN_BLOCKQUOTE_ID;
	const [approved, setApproved] = useState(builtIn);
	const manifest = service.compiler.inspect(entry).manifest;
	const uses = elementUses(snapshot.registry, entry.id);
	useEffect(() => {
		let canceled = false;
		void service.compiler
			.digest(entry)
			.then((digest) => {
				if (!canceled) setApproved(builtIn || service.compiler.approvals.has(digest));
			})
			.catch(() => {
				if (!canceled) setApproved(false);
			});
		return () => {
			canceled = true;
		};
	}, [entry.package.files['index.html'], service.getRevision()]);
	return (
		<article className="book-designer-element-library-row">
			<div>
				<h2>{entry.name}</h2>
				<p>{entry.description}</p>
				<small>
					Blockquote · {manifest.packageVersion} ·{' '}
					{builtIn ? 'Built-in' : entry.enabled ? 'Enabled' : 'Disabled'} ·{' '}
					{approved ? 'Approved' : 'Approval required'}
				</small>
				<details>
					<summary>
						Used by {uses.length} {uses.length === 1 ? 'project/theme' : 'projects/themes'}
					</summary>
					{uses.length ? (
						<ul>
							{uses.map((use) => (
								<li key={`${use.kind}:${use.id}`}>
									{use.kind}: {use.name}
								</li>
							))}
						</ul>
					) : (
						<p>No saved references.</p>
					)}
					<small>
						Library ID: {entry.id}
						<br />
						Package: {manifest.id}
					</small>
				</details>
			</div>
			<div className="book-designer-element-library-actions">
				<button disabled={!entry.enabled} onClick={onPreview}>
					Preview
				</button>
				{!builtIn && !approved && (
					<button
						onClick={() => {
							void service.approve(entry);
						}}
					>
						Approve
					</button>
				)}
				<button
					onClick={() => {
						void service.duplicate(entry);
					}}
				>
					Duplicate
				</button>
				{!builtIn && (
					<>
						<button
							onClick={() => {
								void service.editDetails(entry);
							}}
						>
							Edit details
						</button>
						<button
							onClick={() => {
								void service.replace(entry);
							}}
						>
							Replace element file
						</button>
						<button
							onClick={() => {
								void service.toggle(entry);
							}}
						>
							{entry.enabled ? 'Disable' : 'Enable'}
						</button>
						<button
							disabled={uses.length > 0}
							title={
								uses.length ? 'Remove all references before deleting' : 'Delete library entry'
							}
							onClick={() => {
								void service.remove(entry);
							}}
						>
							Delete
						</button>
						{entry.previousPackage && (
							<>
								<button
									onClick={() => {
										void service.replace(entry, true);
									}}
								>
									Restore previous file
								</button>
								<button
									onClick={() => {
										void service.duplicate(entry, true);
									}}
								>
									Duplicate backup
								</button>
							</>
						)}
					</>
				)}
			</div>
		</article>
	);
}
