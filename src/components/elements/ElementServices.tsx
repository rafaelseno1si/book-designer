import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import type { Book } from '../../core/model/book-model';
import { renderBookThemeSampleDocument } from '../../core/renderer/book-preview-renderer';
import type { ElementArtifact } from '../../core/elements/types';
import type { BookProjectDesign } from '../../plugin/project-store';
import type { ElementManagementService } from '../../plugin/elements/management';
import { elementContext } from '../../plugin/elements/context';
import { useBookProject } from '../useBookProject';

export const ElementServices = createContext<ElementManagementService | null>(null);
export function useElementServices(): ElementManagementService {
	const service = useContext(ElementServices);
	if (!service) throw new Error('Element services are unavailable.');
	useSyncExternalStore(service.subscribe, service.getRevision);
	return service;
}
export function useElementCompilation(design: BookProjectDesign): {
	artifact: ElementArtifact | null;
	error: string | null;
	pending: boolean;
} {
	const service = useElementServices();
	const snapshot = useBookProject(service.store);
	const assignment = design.elements?.blockquote;
	const entry = assignment ? service.entries().find((entry) => entry.id === assignment.elementId) : null;
	const context = elementContext(snapshot.activeProject, design, snapshot.runtime.previewPrintSettings);
	const key = JSON.stringify([
		snapshot.activeProject?.id,
		assignment,
		entry?.package,
		entry?.enabled,
		context,
		service.getRevision(),
	]);
	const owner = `${snapshot.activeProject?.id ?? 'library'}:${service.compiler.getGeneration()}`;
	const [state, setState] = useState<{
		artifact: ElementArtifact | null;
		error: string | null;
		pending: boolean;
		owner: string;
	}>({ artifact: null, error: null, pending: false, owner });
	useEffect(() => {
		if (!assignment) {
			setState({ artifact: null, error: null, pending: false, owner });
			return;
		}
		if (!entry) {
			setState({
				artifact: null,
				error: 'Element unavailable. Using a standard blockquote.',
				pending: false,
				owner,
			});
			return;
		}
		setState((previous) => ({
			artifact: previous.owner === owner ? previous.artifact : null,
			pending: true,
			error: null,
			owner,
		}));
		return service.compiler.schedule(
			entry,
			assignment,
			context,
			(artifact) => setState({ artifact, error: null, pending: false, owner }),
			(error: unknown) =>
				setState({
					artifact: null,
					error: error instanceof Error ? error.message : 'Element failed.',
					pending: false,
					owner,
				}),
		);
	}, [service, key]);
	return state.owner === owner ? state : { artifact: null, error: null, pending: Boolean(assignment) };
}
export function CompiledThemePreview({
	book,
	design,
	title,
	sample = false,
}: {
	book: Book;
	design: BookProjectDesign;
	title: string;
	sample?: boolean;
}) {
	const { artifact, error, pending } = useElementCompilation(design);
	return (
		<>
			<iframe
				title={title}
				srcDoc={renderBookThemeSampleDocument(book, design, artifact)}
				sandbox=""
				tabIndex={-1}
			/>
			{sample && <small className="book-designer-element-sample-label">Sample quotation</small>}
			{error && (
				<span className="book-designer-element-preview-status" title={error}>
					Standard blockquote · {error}
				</span>
			)}
			{pending && <span className="book-designer-element-preview-status">Updating preview…</span>}
		</>
	);
}

export const BLOCKQUOTE_SAMPLE: Book = {
	id: 'blockquote-sample',
	metadata: { title: 'Quotation sample', author: '', language: 'english', publisher: '', isbn: '' },
	sections: [
		{
			id: 'quotation-sample',
			type: 'chapter',
			title: 'A passage worth keeping',
			source: { vaultPath: '' },
			blocks: [
				{
					type: 'blockquote',
					blocks: [
						{
							type: 'paragraph',
							inlines: [
								{ type: 'text', text: 'The real voyage of discovery begins with ' },
								{
									type: 'emphasis',
									children: [{ type: 'text', text: 'a willingness to look again' }],
								},
								{ type: 'text', text: '.' },
							],
						},
						{
							type: 'paragraph',
							inlines: [
								{
									type: 'text',
									text: 'A quiet thought can change the shape of an ordinary day.',
								},
							],
						},
					],
				},
			],
		},
	],
};
