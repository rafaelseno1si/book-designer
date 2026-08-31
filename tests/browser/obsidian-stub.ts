// Browser-test adapter only. This is not evidence of Obsidian host verification.
function create(parent: Node, tag: string, options: Record<string, string> = {}) {
	const element = document.createElement(tag);
	for (const [key, value] of Object.entries(options)) {
		if (key === 'cls') element.className = value;
		else if (key === 'text') element.textContent = value;
		else element.setAttribute(key, value);
	}
	parent.appendChild(element);
	return element;
}
// Obsidian's Node helpers append to their receiver; only the global helpers
// create detached elements. Keep Document behavior faithful as well.
Object.assign(Node.prototype, {
	createEl(tag: string, options?: Record<string, string>) {
		return create(this, tag, options);
	},
	createDiv(options?: Record<string, string>) {
		return create(this, 'div', options);
	},
	createSpan(options?: Record<string, string>) {
		return create(this, 'span', options);
	},
});
Object.assign(HTMLElement.prototype, {
	setText(text: string) {
		this.textContent = text;
	},
	setAttr(key: string, value: string) {
		this.setAttribute(key, value);
	},
	empty() {
		this.replaceChildren();
	},
	addClass(name: string) {
		this.classList.add(name);
	},
	removeClass(name: string) {
		this.classList.remove(name);
	},
});
export function setIcon(element: HTMLElement, name: string) {
	element.textContent = name === 'quote' ? '❝' : '◇';
}
export class Notice {
	constructor(message: string) {
		const el = create(document.body, 'p', { text: message, cls: 'test-notice' });
		el.setAttribute('role', 'alert');
	}
}
export class Modal {
	contentEl = document.createElement('div');
	titleEl = document.createElement('h2');
	modalEl = document.createElement('div');
	constructor(readonly app: unknown) {
		this.modalEl.className = 'test-modal';
		this.modalEl.setAttribute('role', 'dialog');
		this.modalEl.append(this.titleEl, this.contentEl);
	}
	open() {
		document.body.appendChild(this.modalEl);
		this.onOpen();
	}
	close() {
		this.onClose();
		this.modalEl.remove();
	}
	onOpen() {}
	onClose() {}
}
export class FuzzySuggestModal<T> extends Modal {
	setPlaceholder(_text: string) {}
	getItems(): T[] {
		return [];
	}
	getItemText(_item: T) {
		return '';
	}
	onChooseItem(_item: T) {}
	onOpen() {
		for (const item of this.getItems()) {
			const button = create(this.contentEl, 'button', { text: this.getItemText(item) });
			button.onclick = () => {
				this.onChooseItem(item);
				this.close();
			};
		}
	}
}
export class TFile {
	constructor(
		readonly path: string,
		readonly text: string,
	) {}
	get extension() {
		return this.path.split('.').at(-1) ?? '';
	}
	get stat() {
		return { size: new TextEncoder().encode(this.text).byteLength };
	}
}
export class TFolder {}
export class App {}
export function normalizePath(path: string) {
	return path;
}
