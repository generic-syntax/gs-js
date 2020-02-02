import cm from "codemirror";
import {getStyle, registerStyle} from "./styles.js";


export interface ICodeMirrorInit extends cm.EditorConfiguration {
}

declare var CodeMirror: (node: Node, options: cm.EditorConfiguration) => any;


export class CodeMirrorElt extends HTMLElement {

	init: ICodeMirrorInit;

	inited: Promise<void>;

	editor: cm.Editor;

	initialize(init: ICodeMirrorInit) {
		if (!this.inited) this.inited = this.initCm();
		this.init = init;
		if (this.isConnected) this.refresh();
	}

	protected async initCm() {
		if (!this.shadowRoot) {
			const sr = this.attachShadow({mode: 'open'});
			await importCmLib();
			sr.append(
				(await importCmStyle()).cloneNode(true),
				getStyle(this.localName)
			);
		}
	}

	async connectedCallback() {
		if (!this.inited) {
			if (this.hasAttribute("mode")) this.initialize({
				value: this.firstElementChild?.textContent,
				mode: this.getAttribute("mode"),
				readOnly: 'nocursor',
				tabSize: 2
			});
		} else {
			this.refresh();
		}
	}

	protected async refresh() {
		await this.inited;
		await importCmMode(this.init.mode);
		while (this.shadowRoot.lastElementChild.localName !== "style") this.shadowRoot.lastElementChild.remove();
		this.editor = CodeMirror(this.shadowRoot, this.init);
		this.dispatchEvent(new CustomEvent("CmEditorInited"));
	}
}


let cmLib: Promise<void> = null;

function importCmLib(): Promise<void> {
	if (!cmLib) {
		let done: () => void;
		cmLib = new Promise<void>((resolve) => {done = resolve});
		const script = document.createElement("script");
		script.onload = done;
		script.src = "lib/cm/codemirror.min.js";
		document.head.append(script);
	}
	return cmLib;
}

let cmStyle: Promise<HTMLStyleElement> = null;

async function importCmStyle(): Promise<HTMLStyleElement> {
	if (!cmStyle) {
		const r = await fetch("lib/cm/codemirror.min.css");
		const st = document.createElement("style");
		st.textContent = await r.text();
		cmStyle = Promise.resolve(st);
	}
	return cmStyle;
}


const cmModes = new Map<string, Promise<any>>();

function importCmMode(mode: string): Promise<any> {
	let modeLib = cmModes.get(mode);
	if (!modeLib) {
		let done: () => void;
		modeLib = new Promise<void>((resolve) => {done = resolve});
		if (mode === "htmlmixed") {
			//xml mode also needed
			modeLib = Promise.all([modeLib, importCmMode("xml")]);
		}
		cmModes.set(mode, modeLib);
		const script = document.createElement("script");
		script.onload = done;
		script.src = `lib/cm/${mode}.min.js`;
		document.head.append(script);
	}
	return modeLib;
}

registerStyle('code-mirror', /* language=CSS */ `
	:host {
		display: block;
	}

	.CodeMirror {
		flex: 1;
		height: auto;
		background-color: inherit !important;
	}
`);

customElements.define('code-mirror', CodeMirrorElt);