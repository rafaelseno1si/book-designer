import { useEffect, useRef, type CSSProperties } from 'react';
import type { BookProjectStore } from '../plugin/project-store';
import { renderPreviewState } from '../plugin/project-store';
import { PREVIEW_DEVICE_IDS, PREVIEW_DEVICE_LABELS, isPreviewDeviceId } from '../plugin/settings';
import { useBookProject } from './useBookProject';

interface BookPreviewAppProps { projectStore: BookProjectStore; }

export function BookPreviewApp({ projectStore }: BookPreviewAppProps) {
	const snapshot = useBookProject(projectStore);
	const project = snapshot.activeProject;
	const preview = renderPreviewState(snapshot);
	const frameRef = useRef<HTMLIFrameElement>(null);
	const scrollTimer = useRef<number | null>(null);
	const deviceStyle = { '--book-preview-reader-scale': `${project?.preview.readerScale ?? 100}%` } as CSSProperties;

	useEffect(() => () => { if (scrollTimer.current !== null) window.clearTimeout(scrollTimer.current); }, []);
	const restorePosition = () => {
		const frameWindow = frameRef.current?.contentWindow;
		if (!frameWindow || !project) return;
		frameWindow.scrollTo({ top: project.preview.scrollTop });
		frameWindow.addEventListener('scroll', () => {
			if (scrollTimer.current !== null) return;
			scrollTimer.current = window.setTimeout(() => {
				scrollTimer.current = null;
				const doc = frameRef.current?.contentDocument;
				const currentWindow = frameRef.current?.contentWindow;
				if (!doc || !currentWindow) return;
				const sections = Array.from(doc.querySelectorAll<HTMLElement>('[data-section-id]'));
				const active = sections.find((section) => section.offsetTop + section.offsetHeight > currentWindow.scrollY)?.dataset.sectionId ?? null;
				projectStore.updatePreview({ scrollTop: currentWindow.scrollY, activeSectionId: active });
			}, 200);
		});
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
				: <iframe ref={frameRef} className="book-preview-frame" sandbox="allow-same-origin" title={`${preview.title} preview`} srcDoc={snapshot.runtime.renderedHtml} onLoad={restorePosition} />}
		</section></main>
	</section>;
}

function PreviewMessage({ title, message }: { title: string; message: string }) { return <div className="book-preview-paper"><p className="book-designer-empty-eyebrow">Preview</p><h2>{title}</h2><p>{message}</p></div>; }
