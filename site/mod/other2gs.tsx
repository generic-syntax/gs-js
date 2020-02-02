import {GSML} from "../../src/profileMl/gsml.js";
import {GSON} from "../../src/profileOn/gson.js";
import "./cm.js";
import {CodeMirrorElt} from "./cm.js";
import {GsViewer} from "./gs-viewer.js";
import {JSX} from "./jsx.js";
import "./minified-compare.js";
import {MinifiedCompare} from "./minified-compare.js";
import {cleanupDom} from "./ml-gsml-compare.js";
import {getStyle, registerStyle} from "./styles.js";


export type EOther2GsFormat = "json" | "html" | "xhtml" | "xml";

export interface IOther2GsInit {
	format?: EOther2GsFormat
	source?: string
}


export class Other2gs extends HTMLElement {

	format: string;

	form: HTMLFormElement;

	codemirror: CodeMirrorElt;

	gsviewer: GsViewer;

	minifiedCompare: MinifiedCompare;

	errorMsg: HTMLElement;

	initialize(init: IOther2GsInit) {
		if (!this.shadowRoot) {
			const sr = this.attachShadow({mode: 'open'});
			sr.appendChild(getStyle(this.localName));

			this.form = <form class="left" onchange={(ev: InputEvent) => {this.onFormatChange((ev.target as HTMLInputElement).value as any, this.codemirror.editor.getValue())}}>
				<div>Edit or paste your:</div>
				<label><input type="radio" name="format" value="json"/>JSON</label>
				<label><input type="radio" name="format" value="html"/>HTML</label>
				<label><input type="radio" name="format" value="xhtml"/>XHTML</label>
				<label><input type="radio" name="format" value="xml"/>XML</label>
			</form>;

			this.codemirror = <code-mirror class="left"/>;

			this.gsviewer = <gs-viewer class="right"/>;

			this.minifiedCompare = <minified-compare/>

			this.errorMsg = <div id="error" hidden></div>;

			sr.append(
				<div class="block title">
					{this.form}
					<div class="right">GS view</div>
				</div>,
				<div id="main" class="block">
					{this.codemirror}
					{this.gsviewer}
				</div>,
				this.errorMsg,
				this.minifiedCompare,
				// <button onclick={() => {this.buildGs()}}>Refresh</button>
			);
		}
		this.onFormatChange(init.format, init.source);
	}

	connectedCallback() {
		if (!this.shadowRoot && this.hasAttribute("format")) {
			this.initialize({source: this.firstElementChild?.textContent, format: this.parseFormat(this.getAttribute("format"))});
		}
	}

	protected parseFormat(f: string): EOther2GsFormat {
		switch (f) {
		case "json":
		case "html":
		case "xhtml":
		case "xml":
			return f;
		}
		return "json";
	}

	protected getMode(f: EOther2GsFormat): string {
		switch (f) {
		case "json":
			return "javascript";
		case "html":
			return "htmlmixed";
		case "xhtml":
		case "xml":
			return "xml";
		}
		return null;
	}

	protected onFormatChange(format: EOther2GsFormat, source?: string) {
		if (this.format !== format) {
			this.format = format;
			(this.form.elements.namedItem("format") as RadioNodeList).value = format;
			this.codemirror.initialize({
				mode: this.getMode(format),
				value: source || "",
				tabSize: 2,
			});
			this.codemirror.addEventListener("CmEditorInited", () => {
				this.codemirror.editor.on("changes", () => {this.onEdit()});
				this.buildGs();
			});
		} else if (source != null) {
			this.codemirror.editor.setValue(source);
		}
	}

	protected redrawPending: number;

	protected onEdit() {
		if (!this.redrawPending)
			this.redrawPending = setTimeout(() => {
				this.redrawPending = 0;
				this.buildGs();
			}, 200) as any;
	}

	buildGs() {
		switch (this.format) {
		case "json": {
			let json: any;
			try {
				json = JSON.parse(this.codemirror.editor.getValue());
			} catch (e) {
				this.onMalformed("Your json is malformed.");
				return;
			}
			this.errorMsg.hidden = true;
			this.gsviewer.initialize({jso: json});
			this.minifiedCompare.initialize({first: JSON.stringify(json), second: GSON.stringify(json)});
			break;
		}
		case "html": {
			const v = this.codemirror.editor.getValue();
			let frag: Node;
			if (/^\s*<html/m.test(v)) { //try to snif if it's an html doc or a fragment.
				frag = new DOMParser().parseFromString(v, "text/html").documentElement;
			} else {
				frag = document.createRange().createContextualFragment(this.codemirror.editor.getValue());
				if (frag.childNodes.length === 1 && frag.firstChild.nodeType === Node.TEXT_NODE) {
					this.onMalformed("Your html seems malformed.");
					return;
				}
			}
			this.gsviewer.initialize({domHtml: frag});
			this.errorMsg.hidden = true;
			cleanupDom(frag, true, false, false);
			const minGs = GSML.stringify("html", frag);
			let minHTml: string;
			if (frag instanceof HTMLElement) {
				minHTml = (frag as HTMLElement).outerHTML;
			} else {
				const elt = document.createElement("div");
				elt.appendChild(frag);
				minHTml = elt.innerHTML;
			}
			this.minifiedCompare.initialize({first: minHTml, second: minGs});
			break;
		}
		case "xhtml":
		case "xml": {
			const doc = new DOMParser().parseFromString(this.codemirror.editor.getValue(), "text/xml");
			if (doc.querySelector("parsererror")) {
				this.onMalformed(`Your ${this.format} is malformed.`);
			} else {
				this.errorMsg.hidden = true;
				this.gsviewer.initialize({domXml: doc});
				const minified = new XMLSerializer().serializeToString(cleanupDom(doc, true, false, false));
				this.minifiedCompare.initialize({first: minified, second: GSML.stringify("xml", doc)});
			}
			break;
		}
		}
	}

	onMalformed(msg: string) {
		//alert(msg);
		this.errorMsg.innerText = msg;
		this.errorMsg.hidden = false;
		this.gsviewer.initialize({});
		this.minifiedCompare.initialize({});
	}
}

registerStyle('other-2-gs', /* language=CSS */ `
	:host {
		display: flex;
		flex-direction: column;
		min-width: 0;
		min-height: 0;
		border: 1px solid var(--border-color);
	}

	.block {
		display: flex;
		min-width: 0;
		min-height: 0;
	}

	.block > * {
		flex: 1 1 0;
		max-width: 50%;
	}

	/*#main {*/
	/*	max-height: 80vh;*/
	/*	overflow: auto;*/
	/*}*/

	.right {
		border-left: 1px solid var(--border-color);
	}

	.block > code-mirror {
		height: auto;
		box-sizing: border-box;
	}

	.block > gs-viewer {
		overflow: auto;
		box-sizing: border-box;
	}

	.title {
		border-bottom: 1px solid var(--border-color);
		text-align: center;
	}

	.title > .right {
		display: flex;
		justify-content: center;
		align-items: center;
	}

	#error {
		border-top: 1px solid var(--border-color);
		padding: .3em;
		text-align: center;
		color: darkred;
		font-weight: bold;
		background-color: #ffccd8;
	}

	label {
		white-space: nowrap;
		margin: 0 .5em;
	}

	code-mirror {
		background-color: white;
	}

	gs-viewer {
		background-color: #f9faf4;
	}
`);


customElements.define('other-2-gs', Other2gs);