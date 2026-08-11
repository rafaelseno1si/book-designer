import {
	useEffect,
	useRef,
	useState,
	type CSSProperties,
	type RefObject,
} from 'react';
import type { BookProjectStore } from '../plugin/project-store';
import { renderPreviewState } from '../plugin/project-store';
import { PREVIEW_DEVICE_IDS, PREVIEW_DEVICE_LABELS, isPreviewDeviceId } from '../plugin/settings';
import { useBookProject } from './useBookProject';

interface BookPreviewAppProps { projectStore: BookProjectStore; }

export function BookPreviewApp({ projectStore }: BookPreviewAppProps) {
	const snapshot = useBookProject(projectStore);
	const project = snapshot.activeProject;
	const preview = renderPreviewState(snapshot);
	const latestScrollTop = useRef(project?.preview.scrollTop ?? 0);
	const deviceStyle = { '--book-preview-reader-scale': `${project?.preview.readerScale ?? 100}%` } as CSSProperties;

	useEffect(() => { latestScrollTop.current = project?.preview.scrollTop ?? 0; }, [project?.id]);
	const updatePreviewLocation = (scrollTop: number, activeSectionId: string | null) => {
		latestScrollTop.current = scrollTop;
		projectStore.updatePreview({ scrollTop, activeSectionId });
	};

	return <section className="book-preview-shell" aria-label="Book Preview">
		<header className="book-preview-toolbar"><div><h1>Book Preview</h1><p>{project ? `${preview.themeLabel} theme` : 'No active project'}</p></div>
			{project && <div className="book-preview-controls" aria-label="Reader simulation controls">
				<label><span>Device</span><select value={project.preview.deviceId} onChange={(event) => { const deviceId = event.currentTarget.value; if (isPreviewDeviceId(deviceId)) projectStore.updatePreview({ deviceId }); }}>{PREVIEW_DEVICE_IDS.map((deviceId) => <option key={deviceId} value={deviceId}>{PREVIEW_DEVICE_LABELS[deviceId]}</option>)}</select></label>
				<label><span>Reader size</span><input type="range" min="85" max="130" step="5" value={project.preview.readerScale} onChange={(event) => projectStore.updatePreview({ readerScale: Number(event.currentTarget.value) })} aria-valuetext={`${project.preview.readerScale}%`} /></label>
			</div>}
		</header>
		<main className="book-preview-canvas"><section className="book-preview-device" data-device={project?.preview.deviceId ?? 'ereader-6'} style={deviceStyle} aria-label="Book preview viewport">
			{!project ? <PreviewMessage title="No active project" message="Create a Book Project from a vault folder in Book Designer." />
				: snapshot.runtime.status === 'loading' ? <PreviewMessage title="Loading manuscript" message="Reading Markdown notes from the active folder." />
				: snapshot.runtime.status === 'empty' ? <PreviewMessage title="No Markdown notes" message="This folder does not contain any Markdown files." />
				: snapshot.runtime.status === 'error' ? <PreviewMessage title="Unable to load manuscript" message={snapshot.runtime.error ?? 'Check that the source folder still exists.'} />
				: <BookPreviewFrame key={project.id} html={snapshot.runtime.renderedHtml} latestScrollTop={latestScrollTop} onLocationChange={updatePreviewLocation} />}
		</section></main>
	</section>;
}

function BookPreviewFrame({
	html,
	latestScrollTop,
	onLocationChange,
}: {
	html: string;
	latestScrollTop: RefObject<number>;
	onLocationChange: (scrollTop: number, activeSectionId: string | null) => void;
}) {
	const frameRef = useRef<HTMLIFrameElement>(null);
	const renderedHtml = useRef('');
	const loaded = useRef(false);
	const scrollTimer = useRef<number | null>(null);
	// srcDoc is intentionally fixed after mount. Subsequent updates patch the
	// same-origin document in place, which avoids a visible iframe navigation.
	const [initialDocument] = useState(html);

	useEffect(() => () => { if (scrollTimer.current !== null) window.clearTimeout(scrollTimer.current); }, []);
	useEffect(() => {
		if (!loaded.current || renderedHtml.current === html) return;
		const frameWindow = frameRef.current?.contentWindow;
		const frameDocument = frameRef.current?.contentDocument;
		if (!frameWindow || !frameDocument) return;
		patchPreviewDocument(frameDocument, html);
		renderedHtml.current = html;
		frameWindow.scrollTo({ top: latestScrollTop.current });
	}, [html, latestScrollTop]);

	const handleLoad = () => {
		const frameWindow = frameRef.current?.contentWindow;
		if (!frameWindow) return;
		loaded.current = true;
		renderedHtml.current = html;
		frameWindow.scrollTo({ top: latestScrollTop.current });
		frameWindow.addEventListener('scroll', () => {
			latestScrollTop.current = frameWindow.scrollY;
			if (scrollTimer.current !== null) return;
			scrollTimer.current = window.setTimeout(() => {
				scrollTimer.current = null;
				const document = frameRef.current?.contentDocument;
				const currentWindow = frameRef.current?.contentWindow;
				if (!document || !currentWindow) return;
				const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-section-id]'));
				const activeSectionId = sections.find((section) => section.offsetTop + section.offsetHeight > currentWindow.scrollY)?.dataset.sectionId ?? null;
				onLocationChange(currentWindow.scrollY, activeSectionId);
			}, 200);
		});
	};

	return <iframe ref={frameRef} className="book-preview-frame" sandbox="allow-same-origin" title="Book preview" srcDoc={initialDocument} onLoad={handleLoad} />;
}

function patchPreviewDocument(document: Document, html: string): void {
	const nextDocument = new DOMParser().parseFromString(html, 'text/html');
	document.title = nextDocument.title;
	const currentStyle = document.head.querySelector('style');
	const nextStyle = nextDocument.head.querySelector('style');
	if (currentStyle && nextStyle && currentStyle.textContent !== nextStyle.textContent) {
		currentStyle.textContent = nextStyle.textContent;
	}

	const currentBook = document.body.querySelector('.book');
	const nextBook = nextDocument.body.querySelector('.book');
	if (!currentBook || !nextBook) {
		document.body.replaceChildren(...Array.from(nextDocument.body.children, (element) => element.cloneNode(true)));
		return;
	}

	const currentSections = new Map(
		Array.from(currentBook.querySelectorAll<HTMLElement>(':scope > [data-section-id]'))
			.map((section) => [section.dataset.sectionId, section]),
	);
	for (const nextSection of Array.from(nextBook.querySelectorAll<HTMLElement>(':scope > [data-section-id]'))) {
		const sectionId = nextSection.dataset.sectionId;
		const currentSection = sectionId ? currentSections.get(sectionId) : undefined;
		if (!currentSection) {
			currentBook.append(nextSection.cloneNode(true));
			continue;
		}
		currentSections.delete(sectionId);
		if (currentSection.outerHTML !== nextSection.outerHTML) {
			currentSection.replaceWith(nextSection.cloneNode(true));
		}
	}
	for (const staleSection of currentSections.values()) staleSection.remove();
}

function PreviewMessage({ title, message }: { title: string; message: string }) { return <div className="book-preview-paper"><p className="book-designer-empty-eyebrow">Preview</p><h2>{title}</h2><p>{message}</p></div>; }
