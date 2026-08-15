import {
	useEffect,
	useRef,
	useState,
	type CSSProperties,
	type RefObject,
} from 'react';
import type { PreviewMode, BookProjectStore } from '../plugin/project-store';
import { PREVIEW_DEVICE_IDS, PREVIEW_DEVICE_LABELS, isPreviewDeviceId } from '../plugin/settings';
import { ContinuousBookVirtualizer } from './continuous-book-virtualizer';
import { useBookProject } from './useBookProject';

interface BookPreviewAppProps { projectStore: BookProjectStore; }

export function BookPreviewApp({ projectStore }: BookPreviewAppProps) {
	const snapshot = useBookProject(projectStore);
	const project = snapshot.activeProject;
	const latestScrollTop = useRef(project?.preview.scrollTop ?? 0);
	const [pageCount, setPageCount] = useState(1);
	const preview = project?.preview;
	const deviceStyle = { '--book-preview-reader-scale': `${preview?.readerScale ?? 100}%` } as CSSProperties;

	useEffect(() => { latestScrollTop.current = preview?.scrollTop ?? 0; }, [project?.id]);
	useEffect(() => { setPageCount(1); }, [project?.id, preview?.mode, preview?.orientation]);
	const updatePreviewLocation = (scrollTop: number, activeSectionId: string | null) => {
		latestScrollTop.current = scrollTop;
		projectStore.updatePreview({ scrollTop, activeSectionId });
	};

	return <section className="book-preview-shell" aria-label="Book Preview">
		<header className="book-preview-toolbar">
			<h1>Book Preview</h1>
			{project && preview && <div className="book-preview-controls" aria-label="Reader simulation controls">
				<label><span>Device</span><select value={preview.deviceId} onChange={(event) => { const deviceId = event.currentTarget.value; if (isPreviewDeviceId(deviceId)) projectStore.updatePreview({ deviceId }); }}>{PREVIEW_DEVICE_IDS.map((deviceId) => <option key={deviceId} value={deviceId}>{PREVIEW_DEVICE_LABELS[deviceId]}</option>)}</select></label>
				<label><span>Mode</span><select value={preview.mode} onChange={(event) => projectStore.updatePreview({ mode: event.currentTarget.value as PreviewMode, pageIndex: 0 })}><option value="continuous">Continuous</option><option value="paged">Paged</option></select></label>
				<button type="button" className="book-preview-orientation-button" onClick={() => projectStore.updatePreview({ orientation: preview.orientation === 'portrait' ? 'landscape' : 'portrait', pageIndex: 0 })} title={`Switch to ${preview.orientation === 'portrait' ? 'landscape' : 'portrait'} orientation`} aria-label={`Switch to ${preview.orientation === 'portrait' ? 'landscape' : 'portrait'} orientation`}>↻</button>
				<label><span>Reader size</span><input type="range" min="85" max="130" step="5" value={preview.readerScale} onChange={(event) => projectStore.updatePreview({ readerScale: Number(event.currentTarget.value), pageIndex: 0 })} aria-valuetext={`${preview.readerScale}%`} /></label>
			</div>}
		</header>
		<main className={`book-preview-canvas ${preview?.mode === 'paged' ? 'is-paged' : ''}`}><section className={`book-preview-device ${preview?.orientation === 'landscape' ? 'is-landscape' : ''}`} data-device={preview?.deviceId ?? 'ereader-6'} style={deviceStyle} aria-label="Book preview viewport">
			{!project ? <PreviewMessage title="No active project" message="Create a Book Project from a vault folder in Book Designer." />
				: snapshot.runtime.status === 'loading' ? <PreviewMessage title="Loading manuscript" message="Reading Markdown notes from the active folder." />
				: snapshot.runtime.status === 'empty' ? <PreviewMessage title="No Markdown notes" message="This folder does not contain any Markdown files." />
				: snapshot.runtime.status === 'error' ? <PreviewMessage title="Unable to load manuscript" message={snapshot.runtime.error ?? 'Check that the source folder still exists.'} />
				: <BookPreviewFrame key={project.id} html={snapshot.runtime.renderedHtml} mode={preview!.mode} pageIndex={preview!.pageIndex} latestScrollTop={latestScrollTop} onLocationChange={updatePreviewLocation} onPageCountChange={setPageCount} onPageIndexChange={(pageIndex) => projectStore.updatePreview({ pageIndex })} />}
			{preview?.mode === 'paged' && <>
				<button type="button" className="book-preview-page-turn is-previous" onClick={() => projectStore.updatePreview({ pageIndex: Math.max(0, preview.pageIndex - 1) })} disabled={preview.pageIndex === 0} aria-label="Previous page">‹</button>
				<span className="book-preview-page-indicator" aria-live="polite">{Math.min(preview.pageIndex + 1, pageCount)} / {pageCount}</span>
				<button type="button" className="book-preview-page-turn is-next" onClick={() => projectStore.updatePreview({ pageIndex: Math.min(pageCount - 1, preview.pageIndex + 1) })} disabled={preview.pageIndex >= pageCount - 1} aria-label="Next page">›</button>
			</>}
		</section></main>
	</section>;
}

function BookPreviewFrame({
	html,
	mode,
	pageIndex,
	latestScrollTop,
	onLocationChange,
	onPageCountChange,
	onPageIndexChange,
}: {
	html: string;
	mode: PreviewMode;
	pageIndex: number;
	latestScrollTop: RefObject<number>;
	onLocationChange: (scrollTop: number, activeSectionId: string | null) => void;
	onPageCountChange: (pageCount: number) => void;
	onPageIndexChange: (pageIndex: number) => void;
}) {
	const frameRef = useRef<HTMLIFrameElement>(null);
	const renderedHtml = useRef('');
	const loaded = useRef(false);
	const scrollTimer = useRef<number | null>(null);
	const resizeObserver = useRef<ResizeObserver | null>(null);
	const frameCleanup = useRef<(() => void) | null>(null);
	const pageLayoutFrame = useRef<number | null>(null);
	const virtualizer = useRef<ContinuousBookVirtualizer | null>(null);
	const modeRef = useRef(mode);
	const pageIndexRef = useRef(pageIndex);
	const materializedMode = useRef<PreviewMode | null>(null);
	const pagedViewportHeight = useRef(0);
	const [initialDocument] = useState(html);

	useEffect(() => () => {
		if (scrollTimer.current !== null) window.clearTimeout(scrollTimer.current);
		if (pageLayoutFrame.current !== null) window.cancelAnimationFrame(pageLayoutFrame.current);
		resizeObserver.current?.disconnect();
		frameCleanup.current?.();
		virtualizer.current?.dispose();
	}, []);
	useEffect(() => { modeRef.current = mode; }, [mode]);
	useEffect(() => { pageIndexRef.current = pageIndex; }, [pageIndex]);
	useEffect(() => {
		if (!loaded.current || renderedHtml.current === html) return;
		const document = frameRef.current?.contentDocument;
		if (!document) return;
		virtualizer.current?.dispose();
		virtualizer.current = null;
		materializedMode.current = null;
		patchPreviewDocument(document, html);
		renderedHtml.current = html;
		applyLayout();
	}, [html]);
	useEffect(() => { if (loaded.current) applyLayout(); }, [mode, pageIndex]);

	const applyLayout = (measureAfterPaint = false) => {
		const frame = frameRef.current;
		const document = frame?.contentDocument;
		if (!frame || !document) return;
		const activeMode = modeRef.current;
		const activePageIndex = pageIndexRef.current;
		const mustRematerialize = materializedMode.current !== activeMode
			|| activeMode === 'paged' && Math.abs(pagedViewportHeight.current - frame.clientHeight) > 1;
		if (mustRematerialize) {
			virtualizer.current?.dispose();
			virtualizer.current = null;
			restoreBookSource(document, renderedHtml.current);
			materializedMode.current = activeMode;
			if (activeMode === 'paged') pagedViewportHeight.current = frame.clientHeight;
		}
		applyPreviewLayout(document, activeMode);
		if (activeMode === 'continuous') {
			if (!virtualizer.current) virtualizer.current = ContinuousBookVirtualizer.create(document, Math.max(360, frame.clientHeight));
			virtualizer.current?.update(latestScrollTop.current, frame.clientHeight);
			document.defaultView?.scrollTo({ top: latestScrollTop.current });
			onPageCountChange(1);
			return;
		}
		if (!measureAfterPaint) {
			if (pageLayoutFrame.current !== null) window.cancelAnimationFrame(pageLayoutFrame.current);
			pageLayoutFrame.current = window.requestAnimationFrame(() => {
				pageLayoutFrame.current = null;
				if (loaded.current && modeRef.current === 'paged') applyLayout(true);
			});
			return;
		}
		if (!virtualizer.current) {
			restoreBookSections(document);
			createPagedPages(document);
			const viewportHeight = document.defaultView?.innerHeight ?? frame.clientHeight;
			virtualizer.current = ContinuousBookVirtualizer.create(document, viewportHeight, ':scope > .book-page', viewportHeight);
		}
		const count = virtualizer.current?.count ?? 1;
		onPageCountChange(count);
		const clampedPageIndex = Math.min(activePageIndex, count - 1);
		if (activePageIndex !== clampedPageIndex) onPageIndexChange(clampedPageIndex);
		virtualizer.current?.scrollToIndex(clampedPageIndex);
		virtualizer.current?.update(document.defaultView?.scrollY ?? 0, frame.clientHeight);
	};

	const handleLoad = () => {
		const frame = frameRef.current;
		const frameWindow = frame?.contentWindow;
		if (!frame || !frameWindow) return;
		frameCleanup.current?.();
		loaded.current = true;
		renderedHtml.current = html;
		applyLayout();
		resizeObserver.current?.disconnect();
		const invalidateForResize = () => {
			if (modeRef.current === 'paged') {
				materializedMode.current = null;
				pagedViewportHeight.current = 0;
			}
			applyLayout();
		};
		resizeObserver.current = new ResizeObserver(invalidateForResize);
		resizeObserver.current.observe(frame);
		const handleScroll = () => {
			latestScrollTop.current = frameWindow.scrollY;
			virtualizer.current?.update(frameWindow.scrollY, frame.clientHeight);
			if (scrollTimer.current !== null) return;
			scrollTimer.current = window.setTimeout(() => {
				scrollTimer.current = null;
				const document = frameRef.current?.contentDocument;
				const currentWindow = frameRef.current?.contentWindow;
				if (!document || !currentWindow) return;
				let scrollTop = currentWindow.scrollY;
				if (modeRef.current === 'paged') {
					const pageIndex = virtualizer.current?.nearestIndex(scrollTop) ?? 0;
					virtualizer.current?.scrollToIndex(pageIndex);
					scrollTop = currentWindow.scrollY;
					onPageIndexChange(pageIndex);
				}
				const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-section-id]'));
				const activeSectionId = sections.find((section) => section.offsetTop + section.offsetHeight > scrollTop)?.dataset.sectionId ?? null;
				onLocationChange(scrollTop, activeSectionId);
			}, 200);
		};
		frameWindow.addEventListener('scroll', handleScroll);
		frameWindow.addEventListener('resize', invalidateForResize);
		frameCleanup.current = () => {
			frameWindow.removeEventListener('scroll', handleScroll);
			frameWindow.removeEventListener('resize', invalidateForResize);
		};
	};

	return <iframe ref={frameRef} className="book-preview-frame" sandbox="allow-same-origin" title="Book preview" srcDoc={initialDocument} onLoad={handleLoad} />;
}

function applyPreviewLayout(document: Document, mode: PreviewMode): void {
	const style = document.getElementById('book-designer-preview-layout');
	if (!(style instanceof HTMLStyleElement)) return;
	style.textContent = mode === 'paged'
		? 'html{width:100%;height:100%;margin:0!important;padding:0!important;min-width:0;overflow-x:clip;overflow-y:scroll;scroll-behavior:auto;scroll-snap-type:y mandatory;scrollbar-width:none}html::-webkit-scrollbar{display:none}body{width:100%;min-height:100%;margin:0!important;padding:0!important;overflow:visible}.book{width:100%;min-width:0;max-width:none;margin:0!important;padding:0!important;overflow-wrap:anywhere}.book-virtual-slot{height:100vh;min-height:100vh;max-height:100vh;margin:0!important;padding:0!important;scroll-snap-align:start;scroll-snap-stop:always}.book-page{box-sizing:border-box;display:flow-root;width:100%;height:100vh;min-height:100vh;max-height:100vh;margin:0!important;padding:3.5rem 2.25rem;overflow:hidden}.book-page .chapter{margin:0}.book p,.book h1,.book h2,.book h3,.book h4,.book h5,.book h6,.book li,.book blockquote,.book a,.book code{min-width:0;max-width:100%;white-space:normal;overflow-wrap:anywhere;word-break:break-word}.book img,.book video,.book iframe,.book pre,.book table{display:block;max-width:100%;height:auto}.book pre{white-space:pre-wrap;overflow-wrap:anywhere}.chapter header{break-after:avoid;break-inside:avoid}'
		: 'html,body{overflow:auto}.book{transform:none!important}';
}

function createPagedPages(document: Document): void {
	const book = document.querySelector<HTMLElement>('.book');
	if (!book) return;
	const chapters = Array.from(book.querySelectorAll<HTMLElement>(':scope > [data-section-id]'));
	book.replaceChildren();
	let page = appendPage(document, book, 0);
	for (const [chapterIndex, chapter] of chapters.entries()) {
		// A manuscript file is a chapter in the Book Model. Its opening should
		// always begin on a fresh reader page, even when the prior chapter is
		// short; this gives page navigation stable, meaningful targets.
		if (chapterIndex > 0 && page.children.length > 0) page = appendPage(document, book, book.children.length);
		let fragment = appendChapterFragment(document, page, chapter, true);
		for (const child of Array.from(chapter.children)) {
			fragment.append(child);
			if (page.scrollHeight <= page.clientHeight || fragment.children.length === 1) continue;
			fragment.removeChild(child);
			page = appendPage(document, book, book.children.length);
			fragment = appendChapterFragment(document, page, chapter, false);
			fragment.append(child);
		}
	}
}

function appendPage(document: Document, book: HTMLElement, index: number): HTMLElement {
	const page = document.createElement('div');
	page.className = 'book-page';
	page.dataset.pageIndex = String(index);
	book.append(page);
	return page;
}

function appendChapterFragment(document: Document, page: HTMLElement, chapter: HTMLElement, includeIdentity: boolean): HTMLElement {
	const fragment = document.createElement('section');
	fragment.className = chapter.className;
	if (includeIdentity) {
		if (chapter.id) fragment.id = chapter.id;
		if (chapter.dataset.sectionId) fragment.dataset.sectionId = chapter.dataset.sectionId;
	}
	page.append(fragment);
	return fragment;
}

function restoreBookSource(document: Document, html: string): void {
	const nextDocument = new DOMParser().parseFromString(html, 'text/html');
	const book = document.querySelector<HTMLElement>('.book');
	const sourceBook = nextDocument.querySelector<HTMLElement>('.book');
	if (!book || !sourceBook) return;
	book.replaceChildren(...Array.from(sourceBook.children, (element) => element.cloneNode(true)));
}

function restoreBookSections(document: Document): void {
	const book = document.querySelector<HTMLElement>('.book');
	if (!book) return;
	const templates = Array.from(book.querySelectorAll<HTMLTemplateElement>(':scope > template[data-book-section-template]'));
	if (templates.length === 0) return;
	book.replaceChildren(...templates.map((template) => template.content.cloneNode(true)));
}

function patchPreviewDocument(document: Document, html: string): void {
	const nextDocument = new DOMParser().parseFromString(html, 'text/html');
	document.title = nextDocument.title;
	const currentStyle = document.head.querySelector('style');
	const nextStyle = nextDocument.head.querySelector('style');
	if (currentStyle && nextStyle && currentStyle.textContent !== nextStyle.textContent) currentStyle.textContent = nextStyle.textContent;
	const currentBook = document.body.querySelector('.book');
	const nextBook = nextDocument.body.querySelector('.book');
	if (!currentBook || !nextBook) { document.body.replaceChildren(...Array.from(nextDocument.body.children, (element) => element.cloneNode(true))); return; }
	if (nextBook.querySelector('template[data-book-section-template]')) {
		currentBook.replaceChildren(...Array.from(nextBook.children, (element) => element.cloneNode(true)));
		return;
	}
	const currentSections = new Map(Array.from(currentBook.querySelectorAll<HTMLElement>(':scope > [data-section-id]')).map((section) => [section.dataset.sectionId, section]));
	for (const nextSection of Array.from(nextBook.querySelectorAll<HTMLElement>(':scope > [data-section-id]'))) {
		const sectionId = nextSection.dataset.sectionId;
		const currentSection = sectionId ? currentSections.get(sectionId) : undefined;
		if (!currentSection) { currentBook.append(nextSection.cloneNode(true)); continue; }
		currentSections.delete(sectionId);
		if (currentSection.outerHTML !== nextSection.outerHTML) currentSection.replaceWith(nextSection.cloneNode(true));
	}
	for (const staleSection of currentSections.values()) staleSection.remove();
}

function PreviewMessage({ title, message }: { title: string; message: string }) { return <div className="book-preview-paper"><p className="book-designer-empty-eyebrow">Preview</p><h2>{title}</h2><p>{message}</p></div>; }
