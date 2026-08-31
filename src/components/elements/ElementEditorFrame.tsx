import { useEffect, useRef, useState } from 'react';
import { validateSettings } from '../../core/elements/settings';
import type { ElementContext, ElementLibraryEntry, ElementSettings } from '../../core/elements/types';
import type { ElementSandbox } from '../../plugin/elements/sandbox-host';
import { useElementServices } from './ElementServices';

export function ElementEditorFrame({
	entry,
	settings,
	context,
	onChange,
	onStatus,
}: {
	entry: ElementLibraryEntry;
	settings: ElementSettings;
	context: ElementContext;
	onChange: (settings: ElementSettings) => void;
	onStatus: (error: string | null) => void;
}) {
	const service = useElementServices();
	const host = useRef<HTMLDivElement>(null);
	const sandbox = useRef<ElementSandbox | null>(null);
	const revision = useRef(0);
	const onChangeRef = useRef(onChange);
	onChangeRef.current = onChange;
	const latest = useRef({ settings, context });
	latest.current = { settings, context };
	const [error, setError] = useState<string | null>('Opening element controls…');
	const [height, setHeight] = useState(360);
	useEffect(() => onStatus(error), [error, onStatus]);
	const initialize = async (runner: ElementSandbox) => {
		const rev = ++revision.current;
		const style = host.current ? getComputedStyle(host.current) : null;
		const uiTokens = Object.fromEntries(
			Object.entries({
				text: '--text-normal',
				background: '--background-primary',
				surface: '--background-secondary',
				muted: '--text-muted',
				border: '--background-modifier-border',
				accent: '--interactive-accent',
			}).map(([key, token]) => [`--bd-ui-${key}`, style?.getPropertyValue(token).trim() ?? '']),
		);
		const result = await runner.request('init', { ...latest.current, uiTokens }, rev);
		if (runner !== sandbox.current || rev !== revision.current) return;
		validateSettings(result, service.compiler.inspect(entry).manifest.settingsSchema);
		setError(null);
	};
	useEffect(() => {
		let canceled = false;
		let opened: ElementSandbox | null = null;
		setError('Opening element controls…');
		const container = host.current;
		if (!container) return;
		void service.compiler
			.editor(container, entry)
			.then(async (runner) => {
				opened = runner;
				if (canceled) {
					service.compiler.releaseEditor(runner);
					return;
				}
				sandbox.current = runner;
				runner.onEvent = (message) => {
					if (canceled || message.revision !== revision.current) return;
					if (
						message.type === 'height' &&
						typeof message.payload === 'number' &&
						Number.isFinite(message.payload)
					)
						setHeight(Math.min(800, Math.max(160, message.payload)));
					if (message.type === 'changed') {
						try {
							onChangeRef.current(
								validateSettings(
									message.payload,
									service.compiler.inspect(entry).manifest.settingsSchema,
								),
							);
							setError(null);
						} catch (error) {
							setError(error instanceof Error ? error.message : 'Invalid settings.');
						}
					}
				};
				await initialize(runner);
			})
			.catch((error: unknown) => {
				if (!canceled) setError(error instanceof Error ? error.message : 'Editor failed.');
			});
		return () => {
			canceled = true;
			sandbox.current = null;
			if (opened) service.compiler.releaseEditor(opened);
		};
	}, [
		service,
		entry.id,
		entry.package.files['index.html'],
		entry.enabled,
		service.compiler.getGeneration(),
	]);
	useEffect(() => {
		let canceled = false;
		const runner = sandbox.current;
		if (runner)
			void initialize(runner).catch((error: unknown) => {
				if (!canceled && runner === sandbox.current)
					setError(error instanceof Error ? error.message : 'Settings failed.');
			});
		return () => {
			canceled = true;
		};
	}, [JSON.stringify(settings), JSON.stringify(context)]);
	return (
		<>
			<div className="book-designer-element-editor" ref={host} style={{ height }} />
			{error && (
				<p role="alert" className="book-designer-theme-inline-error">
					{error}
				</p>
			)}
		</>
	);
}
