import {
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
	type CSSProperties,
	type RefObject,
} from 'react';
import type { PreviewMode, BookProjectStore } from '../plugin/project-store';
import { previewMockup } from '../core/mockups/preview-mockup';
import { importHtmlMockup, type ImportedHtmlMockup, type MockupColorConfig } from '../core/mockups/html-mockup-import';
import { MOTOROLA_RAZR_ID, MOTOROLA_RAZR_MOCKUP } from '../core/mockups/motorola-razr-mockup';
import { PREVIEW_DEVICE_DIMENSIONS, PREVIEW_DEVICE_IDS, PREVIEW_DEVICE_LABELS, isPreviewDeviceId } from '../plugin/settings';
import { ContinuousBookVirtualizer } from './continuous-book-virtualizer';
import { PagedBookVirtualizer } from './paged-book-virtualizer';
import { useBookProject } from './useBookProject';

interface BookPreviewAppProps { projectStore: BookProjectStore; }
interface MockupViewportBounds { mockupId: string; left: number; top: number; width: number; height: number; explicit: boolean; }

export function BookPreviewApp({ projectStore }: BookPreviewAppProps) {
	const snapshot = useBookProject(projectStore);
	const project = snapshot.activeProject;
	const latestScrollTop = useRef(project?.preview.scrollTop ?? 0);
	const [pageCount, setPageCount] = useState(1);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [toolbarCollapsed, setToolbarCollapsed] = useState(false);
	const [marginGuide, setMarginGuide] = useState<'side' | 'vertical' | null>(null);
	const [mockupDialog, setMockupDialog] = useState<{ editingId: string | null; name: string; error: string | null } | null>(null);
	const [importedViewportBounds, setImportedViewportBounds] = useState<MockupViewportBounds | null>(null);
	const preview = project?.preview;
	const mockup = previewMockup(preview?.deviceId === 'kindle-paperwhite' ? 'kindle-paperwhite' : preview?.mockupId ?? 'plain');
	const canvasRef = useRef<HTMLElement>(null);
	const deviceRef = useRef<HTMLElement>(null);
	const mockupDialogFileRef = useRef<HTMLInputElement>(null);
	const settingsRef = useRef<HTMLDivElement>(null);
	const selectedImportedMockup = preview?.deviceId === 'imported'
		? snapshot.registry.mockups.find((candidate) => candidate.id === preview.importedMockupId) ?? null
		: null;
	const builtInHtmlMockup = preview?.deviceId === MOTOROLA_RAZR_ID ? MOTOROLA_RAZR_MOCKUP : null;
	const selectedHtmlMockup = selectedImportedMockup ?? builtInHtmlMockup;
	const htmlMockupKey = selectedImportedMockup ? `imported:${selectedImportedMockup.id}` : builtInHtmlMockup ? `builtin:${builtInHtmlMockup.id}` : null;
	const mockupPostures = selectedHtmlMockup?.postures ?? [];
	const activeMockupPosture = htmlMockupKey
		? mockupPostures.find((posture) => posture.id === preview?.mockupPostures[htmlMockupKey])?.id ?? mockupPostures[0]?.id ?? 'unfold'
		: null;
	const activePostureDefinition = mockupPostures.find((posture) => posture.id === activeMockupPosture) ?? null;
	const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
	const nativeDeviceDimensions = preview?.deviceId === 'custom'
		? { width: preview.customDeviceWidth, height: preview.customDeviceHeight }
		: selectedHtmlMockup
			? { width: selectedHtmlMockup.width, height: selectedHtmlMockup.height }
			: PREVIEW_DEVICE_DIMENSIONS[preview?.deviceId ?? 'ereader-6'];
	// Foldable mockups declare their final visual frame for every posture. This
	// allows posture switches to go straight to the finished geometry without
	// measuring a transitioning iframe or guessing a device's footprint.
	const declaredViewport = htmlMockupKey && activePostureDefinition?.frame
		? { mockupId: htmlMockupKey, ...activePostureDefinition.frame, explicit: true }
		: null;
	const importedViewport = declaredViewport ?? (htmlMockupKey && importedViewportBounds?.mockupId === htmlMockupKey
		? importedViewportBounds
		: null);
	const supportsFrameColor = !selectedHtmlMockup || selectedHtmlMockup.color.mode === 'tonal-ramp';
	const deviceDimensions = importedViewport
		? { width: importedViewport.width, height: importedViewport.height }
		: nativeDeviceDimensions;
	const isLandscape = preview?.orientation === 'landscape';
	// The device keeps its authored/native geometry. In landscape we rotate that
	// complete frame, while the stage reserves the swapped visual footprint.
	const nativeDeviceSize = deviceDimensions;
	const displayedDeviceSize = isLandscape
		? { width: nativeDeviceSize.height, height: nativeDeviceSize.width }
		: nativeDeviceSize;
	const autoDeviceScale = preview?.autoDeviceScale && canvasSize.width > 0 && canvasSize.height > 0
		? Math.min(100, (canvasSize.width / displayedDeviceSize.width) * 100, (canvasSize.height / displayedDeviceSize.height) * 100)
		: null;
	const effectiveDeviceScale = autoDeviceScale ?? preview?.deviceScale ?? 100;
	const deviceStyle = {
		'--book-preview-reader-scale': `${preview?.readerScale ?? 100}%`,
		'--book-preview-frame-color': preview?.frameColor ?? '#2a2a2a',
		'--book-preview-screen-top': `${mockup.screen.top}%`,
		'--book-preview-screen-left': `${mockup.screen.left}%`,
		'--book-preview-screen-width': `${mockup.screen.width}%`,
		'--book-preview-screen-height': `${mockup.screen.height}%`,
		'--book-preview-screen-radius': `${mockup.screen.borderRadius}%`,
		width: `${nativeDeviceSize.width}px`,
		height: `${nativeDeviceSize.height}px`,
		transform: `translate(-50%, -50%)${isLandscape ? ' rotate(90deg)' : ''} scale(${effectiveDeviceScale / 100})`,
	} as CSSProperties;
	const deviceStageStyle = {
		width: `${displayedDeviceSize.width * (effectiveDeviceScale / 100)}px`,
		height: `${displayedDeviceSize.height * (effectiveDeviceScale / 100)}px`,
	} as CSSProperties;

	useEffect(() => { latestScrollTop.current = preview?.scrollTop ?? 0; }, [project?.id]);
	useEffect(() => { setImportedViewportBounds(null); }, [htmlMockupKey]);
	useEffect(() => {
		if (!settingsOpen) return;
		const closeWhenOutside = (event: PointerEvent) => {
			if (event.target instanceof Node && !settingsRef.current?.contains(event.target)) {
				setSettingsOpen(false);
				setMarginGuide(null);
			}
		};
		document.addEventListener('pointerdown', closeWhenOutside);
		return () => document.removeEventListener('pointerdown', closeWhenOutside);
	}, [settingsOpen]);
	useEffect(() => { setPageCount(1); }, [project?.id, preview?.mode, preview?.orientation]);
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const updateSize = () => {
			const style = window.getComputedStyle(canvas);
			const horizontalPadding = Number.parseFloat(style.paddingLeft) + Number.parseFloat(style.paddingRight);
			const verticalPadding = Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom);
			setCanvasSize({ width: Math.max(0, canvas.clientWidth - horizontalPadding), height: Math.max(0, canvas.clientHeight - verticalPadding) });
		};
		updateSize();
		const observer = new ResizeObserver(updateSize);
		observer.observe(canvas);
		return () => observer.disconnect();
	}, []);
	useEffect(() => {
		if (preview?.deviceId !== 'custom') return;
		const device = deviceRef.current;
		if (!device) return;
		const observer = new ResizeObserver(() => {
			const width = Math.round(device.offsetWidth);
			const height = Math.round(device.offsetHeight);
			if (width !== preview.customDeviceWidth || height !== preview.customDeviceHeight) {
				projectStore.updatePreview({ customDeviceWidth: width, customDeviceHeight: height });
			}
		});
		observer.observe(device);
		return () => observer.disconnect();
	}, [preview?.customDeviceHeight, preview?.customDeviceWidth, preview?.deviceId, projectStore]);
	const updatePreviewLocation = (scrollTop: number, activeSectionId: string | null) => {
		latestScrollTop.current = scrollTop;
		projectStore.updatePreview({ scrollTop, activeSectionId });
	};
	const openMockupDialog = (editing: ImportedHtmlMockup | null = null) => {
		setSettingsOpen(false);
		setMockupDialog({ editingId: editing?.id ?? null, name: editing?.name ?? '', error: null });
	};
	const importMockupFile = async (file: File) => {
		if (!mockupDialog) return;
		const result = importHtmlMockup(await file.text(), mockupDialog.name.trim() || file.name);
		if (!result.ok) {
			setMockupDialog({ ...mockupDialog, error: result.error });
			return;
		}
		if (mockupDialog.editingId) projectStore.replaceImportedMockup(mockupDialog.editingId, result.mockup);
		else projectStore.addImportedMockup(result.mockup);
		const mockupId = mockupDialog.editingId ?? result.mockup.id;
		projectStore.updatePreview({ deviceId: 'imported', mockupId: 'plain', importedMockupId: mockupId, pageIndex: 0 });
		setMockupDialog(null);
	};
	const copyMockupInstructions = async () => {
		const instructions = MOCKUP_IMPORT_INSTRUCTIONS;
		try {
			await navigator.clipboard.writeText(instructions);
			setMockupDialog((dialog) => dialog ? { ...dialog, error: 'Instructions copied to the clipboard.' } : dialog);
		} catch {
			setMockupDialog((dialog) => dialog ? { ...dialog, error: 'Unable to copy automatically. Select the guide text below instead.' } : dialog);
		}
	};
	const cycleMockupPosture = () => {
		if (!htmlMockupKey || !activeMockupPosture || mockupPostures.length < 2 || !preview) return;
		const currentIndex = mockupPostures.findIndex((posture) => posture.id === activeMockupPosture);
		const next = mockupPostures[(currentIndex + 1) % mockupPostures.length];
		if (!next) return;
		projectStore.updatePreview({ mockupPostures: { ...preview.mockupPostures, [htmlMockupKey]: next.id }, pageIndex: 0 });
	};
	const updateImportedViewportBounds = (bounds: Omit<MockupViewportBounds, 'mockupId'>) => {
		if (!htmlMockupKey) return;
		setImportedViewportBounds((current) => {
			const next = { mockupId: htmlMockupKey, ...bounds };
			return current && current.mockupId === next.mockupId
				&& Math.abs(current.left - next.left) < 1 && Math.abs(current.top - next.top) < 1
				&& Math.abs(current.width - next.width) < 1 && Math.abs(current.height - next.height) < 1 && current.explicit === next.explicit
				? current
				: next;
		});
	};

	return <section className="book-preview-shell" aria-label="Book Preview">
		<header className={`book-preview-toolbar ${toolbarCollapsed ? 'is-collapsed' : ''}`}>
			{project && preview && !toolbarCollapsed && <div className="book-preview-controls" aria-label="Reader simulation controls">
				<label className="book-preview-device-control"><span>Device</span><select value={selectedImportedMockup ? `imported:${selectedImportedMockup.id}` : preview.deviceId} onChange={(event) => {
					const value = event.currentTarget.value;
					if (value === '__import_mockup__') { openMockupDialog(); return; }
					if (value.startsWith('imported:')) {
						projectStore.updatePreview({ deviceId: 'imported', mockupId: 'plain', importedMockupId: value.slice('imported:'.length), pageIndex: 0 });
						return;
					}
					if (isPreviewDeviceId(value) && value !== 'imported') projectStore.updatePreview({ deviceId: value, mockupId: value === 'kindle-paperwhite' ? 'kindle-paperwhite' : 'plain', importedMockupId: null, pageIndex: 0 });
				}}>{PREVIEW_DEVICE_IDS.filter((deviceId) => deviceId !== 'imported').map((deviceId) => <option key={deviceId} value={deviceId}>{PREVIEW_DEVICE_LABELS[deviceId]}</option>)}
					<option value="__import_mockup__">Import HTML/CSS mockup…</option>
					{snapshot.registry.mockups.length > 0 && <optgroup label="Imported mockups">{snapshot.registry.mockups.map((candidate) => <option key={candidate.id} value={`imported:${candidate.id}`}>{candidate.name}</option>)}</optgroup>}
				</select></label>
				<label className="book-preview-mode-control"><span>Mode</span><select value={preview.mode} onChange={(event) => projectStore.updatePreview({ mode: event.currentTarget.value as PreviewMode, pageIndex: 0 })}><option value="continuous">Scroll</option><option value="paged">Paged</option></select></label>
				<button type="button" className="book-preview-orientation-button" onClick={() => projectStore.updatePreview({ orientation: preview.orientation === 'portrait' ? 'landscape' : 'portrait', pageIndex: 0 })} title={`Switch to ${preview.orientation === 'portrait' ? 'landscape' : 'portrait'} orientation`} aria-label={`Switch to ${preview.orientation === 'portrait' ? 'landscape' : 'portrait'} orientation`}>↻</button>
				{mockupPostures.length > 1 && <button type="button" className="book-preview-posture-button" onClick={cycleMockupPosture} title={`Switch posture: ${mockupPostures.find((posture) => posture.id === activeMockupPosture)?.label ?? activeMockupPosture}`} aria-label={`Switch posture: ${mockupPostures.find((posture) => posture.id === activeMockupPosture)?.label ?? activeMockupPosture}`}>⤢</button>}
				<div ref={settingsRef} className="book-preview-settings">
					<button type="button" className="book-preview-settings-button" onClick={() => setSettingsOpen((open) => { if (open) setMarginGuide(null); return !open; })} title="Preview settings" aria-label="Preview settings" aria-expanded={settingsOpen}>⚙</button>
					{settingsOpen && <div className="book-preview-settings-popover" role="dialog" aria-label="Preview settings">
						<label className="book-preview-settings-range"><span>Font size</span><input type="range" min="85" max="800" step="5" value={preview.readerScale} onChange={(event) => projectStore.updatePreview({ readerScale: Number(event.currentTarget.value), pageIndex: 0 })} aria-valuetext={`${preview.readerScale}%`} /><output>{preview.readerScale}%</output></label>
						<label className="book-preview-settings-range"><span>Side margins</span><input type="range" min="0" max="100" step="1" value={preview.contentWidth} onPointerDown={() => setMarginGuide('side')} onPointerUp={() => setMarginGuide(null)} onPointerCancel={() => setMarginGuide(null)} onFocus={() => setMarginGuide('side')} onBlur={() => setMarginGuide(null)} onChange={(event) => projectStore.updatePreview({ contentWidth: Number(event.currentTarget.value), pageIndex: 0 })} aria-valuetext={`${preview.contentWidth}% content width`} /><output>{preview.contentWidth}%</output></label>
						<label className="book-preview-settings-range"><span>Top &amp; bottom margins</span><input type="range" min="0" max="100" step="1" value={preview.contentHeight} onPointerDown={() => setMarginGuide('vertical')} onPointerUp={() => setMarginGuide(null)} onPointerCancel={() => setMarginGuide(null)} onFocus={() => setMarginGuide('vertical')} onBlur={() => setMarginGuide(null)} onChange={(event) => projectStore.updatePreview({ contentHeight: Number(event.currentTarget.value), pageIndex: 0 })} aria-valuetext={`${preview.contentHeight}% content height`} /><output>{preview.contentHeight}%</output></label>
						{supportsFrameColor && <label className="book-preview-settings-range book-preview-frame-color"><span>Frame color</span><input type="color" value={preview.frameColor} onChange={(event) => projectStore.updatePreview({ frameColor: event.currentTarget.value })} aria-label="Frame color" /><output>{preview.frameColor}</output></label>}
						<label className="book-preview-settings-range"><span>Device scale</span><input type="range" min="25" max="100" step="5" value={preview.deviceScale} onChange={(event) => projectStore.updatePreview({ deviceScale: Number(event.currentTarget.value), autoDeviceScale: false })} disabled={preview.autoDeviceScale} aria-valuetext={`${Math.round(effectiveDeviceScale)}%`} /><output>{Math.round(effectiveDeviceScale)}%</output></label>
						<label className="book-preview-settings-checkbox"><input type="checkbox" checked={preview.autoDeviceScale} onChange={(event) => projectStore.updatePreview({ autoDeviceScale: event.currentTarget.checked })} /><span>Auto</span></label>
						{selectedImportedMockup && <div className="book-preview-mockup-actions">
							<button type="button" onClick={() => openMockupDialog(selectedImportedMockup)}>Edit mockup</button>
							<button type="button" className="is-danger" onClick={() => projectStore.deleteImportedMockup(selectedImportedMockup.id)}>Delete mockup</button>
						</div>}
						{preview.deviceId === 'custom' && <p className="book-preview-custom-size-hint">Drag the lower-right corner to resize<br />{preview.customDeviceWidth} × {preview.customDeviceHeight}</p>}
					</div>}
				</div>
			</div>}
		</header>
		<main ref={canvasRef} className={`book-preview-canvas ${preview?.mode === 'paged' ? 'is-paged' : ''}`}><div className="book-preview-device-stage" style={deviceStageStyle}><section ref={deviceRef} className={`book-preview-device ${preview?.orientation === 'landscape' ? 'is-landscape' : ''}${selectedHtmlMockup ? ' is-html-mockup' : ''}${importedViewport?.explicit ? ' is-explicit-frame' : ''}`} data-device={preview?.deviceId ?? 'ereader-6'} data-mockup={mockup.id} style={deviceStyle} aria-label="Book preview viewport">
			<div className="book-preview-screen">
			{!project ? <PreviewMessage title="No active project" message="Create a Book Project from a vault folder in Book Designer." />
				: snapshot.runtime.status === 'loading' ? <PreviewMessage title="Loading manuscript" message="Reading Markdown notes from the active folder." />
				: snapshot.runtime.status === 'empty' ? <PreviewMessage title="No Markdown notes" message="This folder does not contain any Markdown files." />
				: snapshot.runtime.status === 'error' ? <PreviewMessage title="Unable to load manuscript" message={snapshot.runtime.error ?? 'Check that the source folder still exists.'} />
				: <BookPreviewFrame key={`${project.id}:${htmlMockupKey ?? 'builtin'}`} html={snapshot.runtime.renderedHtml} mockupHtml={selectedHtmlMockup?.html ?? null} mockupPosture={activeMockupPosture} mockupColor={selectedHtmlMockup?.color ?? null} hasDeclaredPostureFrame={Boolean(activePostureDefinition?.frame)} mockupNativeSize={selectedHtmlMockup ? nativeDeviceDimensions : null} mockupViewportBounds={importedViewport} orientation={preview!.orientation} frameColor={preview!.frameColor} contentWidth={preview!.contentWidth} contentHeight={preview!.contentHeight} marginGuide={marginGuide} mode={preview!.mode} pageIndex={preview!.pageIndex} latestScrollTop={latestScrollTop} onMockupViewportBoundsChange={updateImportedViewportBounds} onLocationChange={updatePreviewLocation} onPageCountChange={setPageCount} onPageIndexChange={(pageIndex) => projectStore.updatePreview({ pageIndex })} />}
			</div>
			{mockup.id === 'kindle-paperwhite' && <span className="book-preview-mockup-logo" aria-hidden="true">kindle</span>}
		</section>
			{preview?.mode === 'paged' && <>
				<button type="button" className="book-preview-page-turn is-previous" onClick={() => projectStore.updatePreview({ pageIndex: Math.max(0, preview.pageIndex - 1) })} disabled={preview.pageIndex === 0} aria-label="Previous page">‹</button>
				<span className="book-preview-page-indicator" aria-live="polite">{Math.min(preview.pageIndex + 1, pageCount)} / {pageCount}</span>
				<button type="button" className="book-preview-page-turn is-next" onClick={() => projectStore.updatePreview({ pageIndex: Math.min(pageCount - 1, preview.pageIndex + 1) })} disabled={preview.pageIndex >= pageCount - 1} aria-label="Next page">›</button>
			</>}
		</div><button type="button" className="book-preview-toolbar-toggle" onClick={() => { setToolbarCollapsed(!toolbarCollapsed); if (!toolbarCollapsed) setSettingsOpen(false); }} title={toolbarCollapsed ? 'Show toolbar' : 'Hide toolbar'} aria-label={toolbarCollapsed ? 'Show toolbar' : 'Hide toolbar'}>{toolbarCollapsed ? '⌄' : '⌃'}</button></main>
		{mockupDialog && <MockupImportDialog dialog={mockupDialog} fileInputRef={mockupDialogFileRef} onClose={() => setMockupDialog(null)} onCopyInstructions={() => { void copyMockupInstructions(); }} onNameChange={(name) => setMockupDialog({ ...mockupDialog, name, error: null })} onChooseFile={() => mockupDialogFileRef.current?.click()} onFile={(file) => { if (file) void importMockupFile(file); }} />}
	</section>;
}

const MOCKUP_IMPORT_INSTRUCTIONS = `Book Designer HTML/CSS mockup contract

1. Use a self-contained fixed-size document. Book Designer only scales it; it never makes the mockup responsive:
   <html data-book-designer-width="390" data-book-designer-height="844">

2. Include exactly one empty book viewport:
   <div data-book-designer-screen></div>
   Keep the mockup, body, and screen in native CSS pixels. Include any shadow space inside the declared document dimensions: anything outside is clipped.

3. For an offset device, internal shadow, or any foldable, wrap the visual device and screen in one declared final visual frame:
   <div class="frame-bounds" data-book-designer-frame>
     <div class="device"><div data-book-designer-screen></div>…</div>
   </div>

4. Foldable contract (required for two or more postures). Declare every final posture in order: unfold, fold1, fold2, fold3… Each posture must include its final frame bounds in native CSS pixels, measured from the document's top-left. Book Designer sets data-book-designer-posture on <html>, disables transitions, and switches directly between these finished states.
   <meta name="book-designer-postures" content='[
     {"id":"unfold","label":"Unfolded","frame":{"left":50,"top":128,"width":1060,"height":1168}},
     {"id":"fold1","label":"Folded","frame":{"left":334,"top":414,"width":492,"height":982}}
   ]'>
   html[data-book-designer-posture="fold1"] .frame-bounds { left:334px; top:414px; width:492px; height:982px; }
   html[data-book-designer-posture="fold1"] .device { /* final folded geometry */ }
   html[data-book-designer-posture="fold1"] [data-book-designer-screen] { /* final screen geometry */ }

5. Color contract. This is the only supported way to enable the Frame color picker:
   <meta name="book-designer-color" content='{"mode":"tonal-ramp","hardware":"fixed"}'>
   tonal-ramp exposes the picker and supplies --book-designer-frame-color. Derive the complete casing tonal ramp from it (do not hard-code some edges black):
   :root { --frame-base:var(--book-designer-frame-color,#686d73); --frame-dark:color-mix(in oklch,var(--frame-base) 55%,black); --frame-light:color-mix(in oklch,var(--frame-base) 84%,white); }
   .device { background:linear-gradient(105deg,var(--frame-light),var(--frame-dark),var(--frame-light)); }

6. Hardware color is explicit. Use "hardware":"fixed" when cameras, buttons, ports, and similar hardware retain their authored colors (for example .power { background:#54585c; }). Use "hardware":"dynamic" only when those pieces intentionally use the same --book-designer-frame-color tonal ramp. For devices without user-selectable color, declare:
   <meta name="book-designer-color" content='{"mode":"none","hardware":"fixed"}'>
   The Frame color picker is hidden for this mockup. If the color meta tag is absent, color support is also treated as none.

For safety, scripts, event attributes, external URLs, CSS imports, and nested frames are removed during import.`;

function MockupImportDialog({ dialog, fileInputRef, onClose, onCopyInstructions, onNameChange, onChooseFile, onFile }: {
	dialog: { editingId: string | null; name: string; error: string | null };
	fileInputRef: RefObject<HTMLInputElement | null>;
	onClose: () => void;
	onCopyInstructions: () => void;
	onNameChange: (name: string) => void;
	onChooseFile: () => void;
	onFile: (file: File | null) => void;
}) {
	return <div className="book-preview-mockup-dialog-backdrop" role="presentation" onMouseDown={onClose}>
		<section className="book-preview-mockup-dialog" role="dialog" aria-modal="true" aria-labelledby="book-preview-mockup-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
			<h2 id="book-preview-mockup-dialog-title">{dialog.editingId ? 'Edit mockup' : 'Import mockup'}</h2>
			<p>Import a self-contained HTML/CSS device frame. The book preview is mounted into its screen slot.</p>
			<label><span>Mockup name</span><input value={dialog.name} onChange={(event) => onNameChange(event.currentTarget.value)} placeholder="Use the file name" autoFocus /></label>
			<div className="book-preview-mockup-dialog-actions"><button type="button" onClick={onChooseFile}>{dialog.editingId ? 'Replace HTML/CSS file' : 'Choose HTML/CSS file'}</button><button type="button" onClick={onCopyInstructions}>Copy instructions</button><button type="button" onClick={onClose}>Cancel</button></div>
			<input ref={fileInputRef} className="book-preview-import-input" type="file" accept=".html,.htm,.xhtml,text/html" onChange={(event) => { const file = event.currentTarget.files?.[0] ?? null; event.currentTarget.value = ''; onFile(file); }} />
			<pre className="book-preview-mockup-dialog-guide">{MOCKUP_IMPORT_INSTRUCTIONS}</pre>
			{dialog.error && <p className="book-preview-mockup-dialog-message">{dialog.error}</p>}
		</section>
	</div>;
}

function BookPreviewFrame({
	html,
	mockupHtml,
	mockupPosture,
	mockupColor,
	hasDeclaredPostureFrame,
	mockupNativeSize,
	mockupViewportBounds,
	orientation,
	frameColor,
	contentWidth,
	contentHeight,
	marginGuide,
	mode,
	pageIndex,
	latestScrollTop,
	onLocationChange,
	onMockupViewportBoundsChange,
	onPageCountChange,
	onPageIndexChange,
}: {
	html: string;
	mockupHtml: string | null;
	mockupPosture: string | null;
	mockupColor: MockupColorConfig | null;
	hasDeclaredPostureFrame: boolean;
	mockupNativeSize: { width: number; height: number } | null;
	mockupViewportBounds: MockupViewportBounds | null;
	orientation: 'portrait' | 'landscape';
	frameColor: string;
	contentWidth: number;
	contentHeight: number;
	marginGuide: 'side' | 'vertical' | null;
	mode: PreviewMode;
	pageIndex: number;
	latestScrollTop: RefObject<number>;
	onLocationChange: (scrollTop: number, activeSectionId: string | null) => void;
	onMockupViewportBoundsChange: (bounds: Omit<MockupViewportBounds, 'mockupId'>) => void;
	onPageCountChange: (pageCount: number) => void;
	onPageIndexChange: (pageIndex: number) => void;
}) {
	const frameRef = useRef<HTMLIFrameElement>(null);
	const shellRef = useRef<HTMLIFrameElement>(null);
	const renderedHtml = useRef('');
	const loaded = useRef(false);
	const scrollTimer = useRef<number | null>(null);
	const resizeObserver = useRef<ResizeObserver | null>(null);
	const frameCleanup = useRef<(() => void) | null>(null);
	const mockupMountTimer = useRef<number | null>(null);
	const previewFrameReadyTimer = useRef<number | null>(null);
	const previewFrameReadyAttempts = useRef(0);
	const mockupMountAttempts = useRef(0);
	const postureTransitionTimer = useRef<number | null>(null);
	const initializedFrame = useRef<HTMLIFrameElement | null>(null);
	const pageLayoutFrame = useRef<number | null>(null);
	const virtualizer = useRef<ContinuousBookVirtualizer | null>(null);
	const pagedVirtualizer = useRef<PagedBookVirtualizer | null>(null);
	const modeRef = useRef(mode);
	const pageIndexRef = useRef(pageIndex);
	const materializedMode = useRef<PreviewMode | null>(null);
	const pagedViewportHeight = useRef(0);
	const pagedPagesCreated = useRef(false);
	const [initialDocument] = useState(html);
	const onMockupViewportBoundsChangeRef = useRef(onMockupViewportBoundsChange);

	useEffect(() => () => {
		if (scrollTimer.current !== null) window.clearTimeout(scrollTimer.current);
		if (pageLayoutFrame.current !== null) window.cancelAnimationFrame(pageLayoutFrame.current);
		resizeObserver.current?.disconnect();
		frameCleanup.current?.();
		virtualizer.current?.dispose();
		pagedVirtualizer.current?.dispose();
		if (mockupMountTimer.current !== null) window.clearTimeout(mockupMountTimer.current);
		if (previewFrameReadyTimer.current !== null) window.clearTimeout(previewFrameReadyTimer.current);
		if (postureTransitionTimer.current !== null) window.clearTimeout(postureTransitionTimer.current);
	}, []);
	useEffect(() => { modeRef.current = mode; }, [mode]);
	useEffect(() => { pageIndexRef.current = pageIndex; }, [pageIndex]);
	useEffect(() => { onMockupViewportBoundsChangeRef.current = onMockupViewportBoundsChange; }, [onMockupViewportBoundsChange]);
	useEffect(() => {
		if (!loaded.current || renderedHtml.current === html) return;
		const document = frameRef.current?.contentDocument;
		if (!document) return;
		virtualizer.current?.dispose();
		virtualizer.current = null;
		pagedVirtualizer.current?.dispose();
		pagedVirtualizer.current = null;
		materializedMode.current = null;
		patchPreviewDocument(document, html);
		renderedHtml.current = html;
		applyLayout();
	}, [html]);
	useEffect(() => { if (loaded.current) applyLayout(); }, [mode, pageIndex, marginGuide]);
	useEffect(() => {
		if (!loaded.current) return;
		if (modeRef.current === 'paged') {
			materializedMode.current = null;
			pagedPagesCreated.current = false;
		}
		applyLayout();
	}, [contentWidth, contentHeight]);
	useEffect(() => {
		if (!loaded.current || !frameRef.current) return;
		configureBookFrameOrientation(frameRef.current, orientation);
		materializedMode.current = null;
		pagedViewportHeight.current = 0;
		applyLayout();
	}, [orientation]);
	useEffect(() => { applyImportedFrameColor(shellRef.current?.contentDocument ?? null, frameColor, mockupColor); }, [frameColor, mockupColor]);
	useLayoutEffect(() => {
		const shellDocument = shellRef.current?.contentDocument;
		if (!shellDocument || !mockupPosture) return;
		applyImportedMockupPosture(shellDocument, mockupPosture);
		// Foldable mockups with declared final frame bounds switch immediately.
		// This is the shared built-in/imported contract: no runtime geometry
		// guessing and no authored transition can leave an intermediate frame.
		const finalizePosture = () => {
			if (!loaded.current) return;
			const slot = shellDocument.querySelector<HTMLElement>('[data-book-designer-screen]');
			if (slot && !hasDeclaredPostureFrame) reportImportedViewportBounds(shellDocument, slot, onMockupViewportBoundsChangeRef.current);
			materializedMode.current = null;
			pagedViewportHeight.current = 0;
			if (frameRef.current) configureBookFrameOrientation(frameRef.current, orientation);
			applyLayout();
		};
		if (hasDeclaredPostureFrame) {
			finalizePosture();
			return;
		}
		if (postureTransitionTimer.current !== null) window.clearTimeout(postureTransitionTimer.current);
		postureTransitionTimer.current = window.setTimeout(finalizePosture, 220);
	}, [mockupPosture, orientation, hasDeclaredPostureFrame]);

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
			pagedVirtualizer.current?.dispose();
			pagedVirtualizer.current = null;
			restoreBookSource(document, renderedHtml.current);
			materializedMode.current = activeMode;
			pagedPagesCreated.current = false;
			if (activeMode === 'paged') pagedViewportHeight.current = frame.clientHeight;
		}
		applyPreviewLayout(document, activeMode, contentWidth, contentHeight, marginGuide);
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
		if (!pagedPagesCreated.current) {
			restoreBookSections(document);
			createPagedPages(document);
			pagedPagesCreated.current = true;
			pagedVirtualizer.current = PagedBookVirtualizer.create(document);
		}
		const count = Math.max(1, pagedVirtualizer.current?.count ?? 0);
		onPageCountChange(count);
		const clampedPageIndex = Math.min(activePageIndex, count - 1);
		if (activePageIndex !== clampedPageIndex) onPageIndexChange(clampedPageIndex);
		pagedVirtualizer.current?.scrollToIndex(clampedPageIndex);
		pagedVirtualizer.current?.update(document.defaultView?.scrollY ?? 0);
	};

	const handleLoad = () => {
		const frame = frameRef.current;
		const frameWindow = frame?.contentWindow;
		if (!frame || !frameWindow) return;
		if (initializedFrame.current === frame) return;
		// An iframe's initial about:blank document can report as loaded before
		// srcdoc has been parsed. Do not initialize that empty document.
		if (!frame.contentDocument?.querySelector('.book')) {
			// Electron can expose the nested iframe's initial about:blank document
			// before its srcdoc has been parsed. Retrying avoids a permanently blank
			// preview after a device swap.
			if (previewFrameReadyAttempts.current < 16) {
				previewFrameReadyAttempts.current += 1;
				if (previewFrameReadyTimer.current !== null) window.clearTimeout(previewFrameReadyTimer.current);
				previewFrameReadyTimer.current = window.setTimeout(handleLoad, 30);
			}
			return;
		}
		previewFrameReadyAttempts.current = 0;
		initializedFrame.current = frame;
		configureBookFrameOrientation(frame, orientation);
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
			if (modeRef.current === 'continuous') virtualizer.current?.update(frameWindow.scrollY, frame.clientHeight);
			if (modeRef.current === 'paged') pagedVirtualizer.current?.update(frameWindow.scrollY);
			if (scrollTimer.current !== null) return;
			scrollTimer.current = window.setTimeout(() => {
				scrollTimer.current = null;
				const document = frameRef.current?.contentDocument;
				const currentWindow = frameRef.current?.contentWindow;
				if (!document || !currentWindow) return;
				let scrollTop = currentWindow.scrollY;
				if (modeRef.current === 'paged') {
					const pageIndex = pagedVirtualizer.current?.nearestIndex(scrollTop) ?? 0;
					pagedVirtualizer.current?.scrollToIndex(pageIndex);
					scrollTop = currentWindow.scrollY;
					onPageIndexChange(pageIndex);
				}
				const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-section-id]'));
				const activeSectionId = sections.find((section) => section.offsetTop + section.offsetHeight > scrollTop)?.dataset.sectionId ?? null;
				onLocationChange(scrollTop, activeSectionId);
			}, 200);
		};
		const preventPagedPointerScroll = (event: WheelEvent | TouchEvent) => {
			if (modeRef.current === 'paged') event.preventDefault();
		};
		const preventPagedKeyboardScroll = (event: KeyboardEvent) => {
			if (modeRef.current !== 'paged') return;
			if ([' ', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(event.key)) event.preventDefault();
		};
		frameWindow.addEventListener('scroll', handleScroll);
		frameWindow.addEventListener('resize', invalidateForResize);
		frameWindow.addEventListener('wheel', preventPagedPointerScroll, { passive: false });
		frameWindow.addEventListener('touchmove', preventPagedPointerScroll, { passive: false });
		frameWindow.addEventListener('keydown', preventPagedKeyboardScroll);
		frameCleanup.current = () => {
			frameWindow.removeEventListener('scroll', handleScroll);
			frameWindow.removeEventListener('resize', invalidateForResize);
			frameWindow.removeEventListener('wheel', preventPagedPointerScroll);
			frameWindow.removeEventListener('touchmove', preventPagedPointerScroll);
			frameWindow.removeEventListener('keydown', preventPagedKeyboardScroll);
		};
	};

	const handleMockupLoad = () => {
		const shellDocument = shellRef.current?.contentDocument;
		const slot = shellDocument?.querySelector<HTMLElement>('[data-book-designer-screen]');
		if (!shellDocument || !slot) {
			// Chromium can first report iframe onLoad for its initial empty document.
			// Wait for the srcdoc document rather than silently leaving the frame blank.
			if (mockupMountAttempts.current < 8) {
				mockupMountAttempts.current += 1;
				mockupMountTimer.current = window.setTimeout(handleMockupLoad, 20);
			}
			return;
		}
		// Also constrain already-imported mockups created before the importer
		// started adding its viewport rule.
		shellDocument.documentElement.style.setProperty('overflow', 'hidden', 'important');
		shellDocument.body.style.setProperty('overflow', 'hidden', 'important');
		applyImportedFrameColor(shellDocument, frameColor, mockupColor);
		if (mockupPosture) applyImportedMockupPosture(shellDocument, mockupPosture);
		if (hasDeclaredPostureFrame) applyStaticPostureStyles(shellDocument);
		else reportImportedViewportBounds(shellDocument, slot, onMockupViewportBoundsChangeRef.current);
		mockupMountAttempts.current = 0;
		if (slot.querySelector('iframe[data-book-designer-preview]')) return;
		const previewFrame = shellDocument.createElement('iframe');
		previewFrame.dataset.bookDesignerPreview = '';
		previewFrame.setAttribute('sandbox', 'allow-same-origin');
		previewFrame.setAttribute('title', 'Book preview');
		// This element belongs to the imported iframe's document, not Obsidian's
		// document. Use browser-native styles rather than Obsidian's setCssProps
		// helper, which is not present across iframe realms.
		Object.assign(previewFrame.style, {
			width: '100%',
			height: '100%',
			display: 'block',
			border: '0',
		});
		const initializeWhenReady = () => {
			if (frameRef.current !== previewFrame) return;
			handleLoad();
		};
		previewFrame.addEventListener('load', initializeWhenReady, { once: true });
		slot.replaceChildren(previewFrame);
		frameRef.current = previewFrame;
		previewFrameReadyAttempts.current = 0;
		configureBookFrameOrientation(previewFrame, orientation);
		// Start navigation only after the listener and reference are ready.
		previewFrame.srcdoc = initialDocument;
		// Nested sandboxed iframes occasionally omit the load event in Electron.
		// The document check inside handleLoad makes these fallback attempts safe.
		previewFrameReadyTimer.current = window.setTimeout(initializeWhenReady, 80);
	};

	const importedShellStyle = mockupViewportBounds && mockupNativeSize
		? { position: 'absolute' as const, left: `${-mockupViewportBounds.left}px`, top: `${-mockupViewportBounds.top}px`, width: `${mockupNativeSize.width}px`, height: `${mockupNativeSize.height}px` }
		: undefined;
	return mockupHtml
		? <iframe ref={shellRef} className="book-preview-frame book-preview-imported-mockup" style={importedShellStyle} sandbox="allow-same-origin" title="Imported mockup" srcDoc={mockupHtml} onLoad={handleMockupLoad} />
		: <iframe ref={frameRef} className="book-preview-frame" sandbox="allow-same-origin" title="Book preview" srcDoc={initialDocument} onLoad={handleLoad} />;
}

function configureBookFrameOrientation(frame: HTMLIFrameElement, orientation: 'portrait' | 'landscape'): void {
	const container = frame.parentElement;
	if (!container) return;
	if (orientation === 'portrait') {
		Object.assign(frame.style, {
			position: 'static',
			left: '',
			top: '',
			width: '100%',
			height: '100%',
			transform: '',
			transformOrigin: '',
		});
		return;
	}
	// The frame and its mockup rotate as one physical device. Counter-rotating
	// only the book viewport keeps its text upright and gives it a true
	// landscape layout viewport, including inside arbitrary imported mockups.
	Object.assign(frame.style, {
		position: 'absolute',
		left: '50%',
		top: '50%',
		width: `${container.clientHeight}px`,
		height: `${container.clientWidth}px`,
		transform: 'translate(-50%, -50%) rotate(-90deg)',
		transformOrigin: 'center',
	});
}

function applyImportedFrameColor(document: Document | null, frameColor: string, color: MockupColorConfig | null): void {
	if (!document) return;
	if (color?.mode === 'none') {
		document.documentElement.style.removeProperty('--book-designer-frame-color');
		return;
	}
	document.documentElement.style.setProperty('--book-designer-frame-color', frameColor);
	if (document.documentElement.dataset.bookDesignerBuiltin !== 'motorola-razr') return;
	// The source mockup used hard-coded black through most of its casing. Use a
	// Kindle-like tonal ramp derived entirely from the selected hue instead,
	// while retaining native-metal hardware controls.
	const styleId = 'book-designer-razr-material';
	const style = document.getElementById(styleId) ?? document.head.appendChild(document.createElement('style'));
	style.id = styleId;
	style.textContent = '.device{background:linear-gradient(105deg,color-mix(in oklch,var(--frame-base) 88%,white) 0%,color-mix(in oklch,var(--frame-base) 76%,white) 1.4%,color-mix(in oklch,var(--frame-base) 78%,black) 3.2%,color-mix(in oklch,var(--frame-base) 67%,black) 7%,color-mix(in oklch,var(--frame-base) 57%,black) 10.2%,color-mix(in oklch,var(--frame-base) 52%,black) 89.8%,color-mix(in oklch,var(--frame-base) 67%,black) 93%,color-mix(in oklch,var(--frame-base) 78%,black) 97.2%,color-mix(in oklch,var(--frame-base) 76%,white) 98.6%,color-mix(in oklch,var(--frame-base) 88%,white) 100%)!important}.power,.volume-up,.volume-down{background:linear-gradient(90deg,color-mix(in oklch,#686d73 46%,black),color-mix(in oklch,#686d73 84%,white) 56%,color-mix(in oklch,#686d73 53%,black))!important}';
}

function applyStaticPostureStyles(document: Document): void {
	const styleId = 'book-designer-static-postures';
	const style = document.getElementById(styleId) ?? document.head.appendChild(document.createElement('style'));
	style.id = styleId;
	// The declared frame bounds are final states, so visual transitions serve no
	// purpose and otherwise expose a transient, incorrectly-sized device.
	style.textContent = '*,*::before,*::after{transition:none!important;animation:none!important}';
}

function applyImportedMockupPosture(document: Document, posture: string): void {
	document.documentElement.dataset.bookDesignerPosture = posture;
}

function reportImportedViewportBounds(
	document: Document,
	slot: HTMLElement,
	report: (bounds: Omit<MockupViewportBounds, 'mockupId'>) => void,
): void {
	// An explicit frame marker is available for elaborate skins. For existing
	// mockups the screen's direct parent is the conventional physical device.
	const explicitFrame = document.querySelector<HTMLElement>('[data-book-designer-frame]');
	const frame = explicitFrame ?? slot.parentElement;
	const viewport = document.documentElement.getBoundingClientRect();
	const bounds = frame?.getBoundingClientRect();
	if (!bounds || bounds.width < 1 || bounds.height < 1 || viewport.width < 1 || viewport.height < 1) return;
	// Explicit frame bounds already include the author's intended whitespace.
	// Older mockups have no such contract, so retain a small inferred gutter for
	// their rounded corners, controls, and authored shadows.
	const gutter = explicitFrame ? 0 : Math.min(72, Math.max(12, Math.min(bounds.width, bounds.height) * 0.06));
	const left = Math.max(0, bounds.left - viewport.left - gutter);
	const top = Math.max(0, bounds.top - viewport.top - gutter);
	const right = Math.min(viewport.width, bounds.right - viewport.left + gutter);
	const bottom = Math.min(viewport.height, bounds.bottom - viewport.top + gutter);
	if (right - left < 1 || bottom - top < 1) return;
	report({ left, top, width: right - left, height: bottom - top, explicit: Boolean(explicitFrame) });
}

function applyPreviewLayout(
	document: Document,
	mode: PreviewMode,
	contentWidth: number,
	contentHeight: number,
	marginGuide: 'side' | 'vertical' | null,
): void {
	const style = document.getElementById('book-designer-preview-layout');
	// The style element belongs to the preview iframe's Window. A host-window
	// instanceof HTMLStyleElement check is false across that realm, which used
	// to skip the entire paged stylesheet and leave the document scrollable.
	if (!style || style.tagName !== 'STYLE') return;
	const sideInset = (100 - contentWidth) / 2;
	const blockInset = (100 - contentHeight) / 2;
	style.textContent = mode === 'paged'
		? `html{width:100%;height:100%;margin:0!important;padding:0!important;min-width:0;overflow:hidden!important;scroll-behavior:auto;scroll-snap-type:y mandatory;scrollbar-width:none}html::-webkit-scrollbar{display:none}body{width:100%;min-height:100%;margin:0!important;padding:0!important;overflow:hidden!important}.book{width:100%;min-width:0;max-width:none;margin:0!important;padding:0!important;overflow:hidden!important;overflow-wrap:anywhere}.book-page-slot,.book-page{box-sizing:border-box;display:flow-root;width:100%;height:100vh;min-height:100vh;max-height:100vh;margin:0!important;overflow:clip!important;scroll-snap-align:start;scroll-snap-stop:always}.book-page-slot>.book-page{scroll-snap-align:none;scroll-snap-stop:normal}.book-page{padding:${blockInset}vh ${sideInset}%;contain:layout paint}.book-page .chapter{margin:0}.book p,.book h1,.book h2,.book h3,.book h4,.book h5,.book h6,.book li,.book blockquote,.book a,.book code{min-width:0;max-width:100%;white-space:normal;overflow-wrap:anywhere;word-break:break-word}.book img,.book video,.book iframe,.book pre,.book table{display:block;max-width:100%;height:auto}.book pre{white-space:pre-wrap;overflow-wrap:anywhere}.chapter header{break-after:avoid;break-inside:avoid}`
		: `html,body{overflow:auto;scrollbar-width:none}html::-webkit-scrollbar,body::-webkit-scrollbar{display:none}.book{transform:none!important;padding:${blockInset}vh ${sideInset}%}`;
	syncMarginGuide(document, marginGuide, sideInset, blockInset);
}

function syncMarginGuide(document: Document, type: 'side' | 'vertical' | null, sideInset: number, blockInset: number): void {
	const existing = document.getElementById('book-designer-margin-guide');
	if (!type) {
		existing?.remove();
		return;
	}
	const guide = existing ?? document.createElement('div');
	guide.id = 'book-designer-margin-guide';
	Object.assign(guide.style, { position: 'fixed', inset: '0', zIndex: '2147483647', pointerEvents: 'none' });
	guide.replaceChildren();
	for (const position of type === 'side' ? [`left:${sideInset}%`, `right:${sideInset}%`] : [`top:${blockInset}%`, `bottom:${blockInset}%`]) {
		const line = document.createElement('i');
		Object.assign(line.style, type === 'side'
			? { position: 'absolute', top: '0', bottom: '0', borderLeft: '1px dashed rgb(105 173 255 / 0.9)' }
			: { position: 'absolute', left: '0', right: '0', borderTop: '1px dashed rgb(105 173 255 / 0.9)' });
		const [property, value] = position.split(':');
		line.style.setProperty(property ?? '', value ?? '');
		guide.append(line);
	}
	if (!existing) document.body.append(guide);
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
		const remaining = Array.from(chapter.children) as HTMLElement[];
		while (remaining.length > 0) {
			const child = remaining.shift();
			if (!child) continue;
			fragment.append(child);
			if (pageFits(page)) continue;

			// A normal block belongs wholly on the next page when it did not fit
			// after other content. A block which is too tall even on a fresh page
			// is split using its actual laid-out text position below.
			if (fragment.children.length > 1) {
				child.remove();
				page = appendPage(document, book, book.children.length);
				fragment = appendChapterFragment(document, page, chapter, false);
				remaining.unshift(child);
				continue;
			}

			const remainder = splitBlockAtPageBoundary(document, page, child);
			if (remainder) {
				page = appendPage(document, book, book.children.length);
				fragment = appendChapterFragment(document, page, chapter, false);
				remaining.unshift(remainder);
				continue;
			}

			// Non-text blocks such as a giant image cannot be meaningfully split.
			// Keep them clipped rather than making a nested scrolling region.
			child.style.maxHeight = '100%';
			child.style.overflow = 'clip';
		}
	}
}

function pageFits(page: HTMLElement): boolean {
	const document = page.ownerDocument;
	const pageStyle = document.defaultView?.getComputedStyle(page);
	const paddingBottom = Number.parseFloat(pageStyle?.paddingBottom ?? '0');
	const contentBottom = page.getBoundingClientRect().bottom - paddingBottom;
	let furthestBottom = page.getBoundingClientRect().top;
	for (const element of Array.from(page.querySelectorAll<HTMLElement>('*'))) {
		const rect = element.getBoundingClientRect();
		if (rect.width === 0 && rect.height === 0) continue;
		const marginBottom = Number.parseFloat(document.defaultView?.getComputedStyle(element).marginBottom ?? '0');
		furthestBottom = Math.max(furthestBottom, rect.bottom + marginBottom);
	}
	return furthestBottom <= contentBottom + 1;
}

/**
 * Splits one text-bearing block according to the browser's real layout. The
 * binary search indexes DOM text positions only to find the measured visual
 * boundary; it never assumes a fixed number of characters, words, or lines
 * can fit a page.
 */
function splitBlockAtPageBoundary(document: Document, page: HTMLElement, block: HTMLElement): HTMLElement | null {
	if (!isTextSplittable(block)) return null;
	const textNodes = textNodesIn(document, block);
	const totalLength = textNodes.reduce((total, node) => total + (node.data.length), 0);
	if (totalLength < 2) return null;
	const contentBottom = pageContentBottom(document, page, block);
	let low = 1;
	let high = totalLength - 1;
	let best = 0;
	while (low <= high) {
		const middle = Math.floor((low + high) / 2);
		const position = textPositionAt(textNodes, middle);
		if (!position) break;
		const range = document.createRange();
		range.selectNodeContents(block);
		range.setEnd(position.node, position.offset);
		if (range.getBoundingClientRect().bottom <= contentBottom) {
			best = middle;
			low = middle + 1;
		} else high = middle - 1;
	}
	if (best === 0) return null;

	const whitespaceBreak = lastWhitespaceBefore(textNodes, best, Math.max(0, best - 120));
	const position = textPositionAt(textNodes, whitespaceBreak || best);
	if (!position) return null;
	const leadingRange = document.createRange();
	leadingRange.selectNodeContents(block);
	leadingRange.setEnd(position.node, position.offset);
	const trailingRange = document.createRange();
	trailingRange.setStart(position.node, position.offset);
	trailingRange.setEnd(block, block.childNodes.length);
	const remainder = block.cloneNode(false) as HTMLElement;
	remainder.append(trailingRange.cloneContents());
	block.replaceChildren(leadingRange.cloneContents());
	return block.textContent?.trim() && remainder.textContent?.trim() ? remainder : null;
}

function isTextSplittable(block: HTMLElement): boolean {
	return ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HEADER', 'BLOCKQUOTE', 'LI'].includes(block.tagName);
}

function textNodesIn(document: Document, root: HTMLElement): Text[] {
	const walker = document.createTreeWalker(root, document.defaultView?.NodeFilter.SHOW_TEXT ?? 4);
	const nodes: Text[] = [];
	for (let node = walker.nextNode(); node; node = walker.nextNode()) {
		if (node.nodeType === 3 && node.textContent && node.textContent.length > 0) nodes.push(node as Text);
	}
	return nodes;
}

function textPositionAt(nodes: Text[], characterOffset: number): { node: Text; offset: number } | null {
	let remaining = characterOffset;
	for (const node of nodes) {
		if (remaining <= node.data.length) return { node, offset: remaining };
		remaining -= node.data.length;
	}
	return null;
}

function lastWhitespaceBefore(nodes: Text[], offset: number, minimum: number): number {
	for (let index = offset - 1; index >= minimum; index -= 1) {
		const position = textPositionAt(nodes, index);
		if (position && /\s/.test(position.node.data.charAt(position.offset))) return index + 1;
	}
	return 0;
}

function pageContentBottom(document: Document, page: HTMLElement, block: HTMLElement): number {
	const pageStyle = document.defaultView?.getComputedStyle(page);
	const blockStyle = document.defaultView?.getComputedStyle(block);
	const paddingBottom = Number.parseFloat(pageStyle?.paddingBottom ?? '0');
	const marginBottom = Number.parseFloat(blockStyle?.marginBottom ?? '0');
	return page.getBoundingClientRect().bottom - paddingBottom - marginBottom - 1;
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
