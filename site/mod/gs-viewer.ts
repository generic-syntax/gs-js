import {IGsSerializeOptions} from "../../api/gs.js";
import {GsParser} from "../../src/core/gsParser.js";
import {GsFromDomHtml, GsFromDomXml, GsFromDomXmlNs} from "../../src/profileMl/gsml.js";
import {GsFromJson} from "../../src/profileOn/gson.js";
import {buildHtmlViewer} from "../../src/viewer/gsHtmlViewer.js";
import {getStyle, registerStyle} from "./styles.js";

export interface IGsViewerInit {
	gs?: string
	jso?: any
	domHtml?: Node
	domXml?: Node
	domXmlNs?: Node
	serialize?: IGsSerializeOptions
}

export class GsViewer extends HTMLElement {

	async initialize(init: IGsViewerInit) {
		if (!this.shadowRoot) {
			const sr = this.attachShadow({mode: 'open'});
			sr.appendChild(getStyle(this.localName));
			const lh = buildHtmlViewer(sr, init.serialize);
			if (init.gs) {
				new GsParser(lh).parse(init.gs);
			} else if (init.jso) {
				new GsFromJson(lh).build(init.jso);
			} else if (init.domHtml) {
				new GsFromDomHtml(lh).build(init.domHtml);
			} else if (init.domXml) {
				new GsFromDomXml(lh).build(init.domXml);
			} else if (init.domXmlNs) {
				new GsFromDomXmlNs(lh).build(init.domXmlNs);
			}
		}
	}

	async connectedCallback() {
		if (!this.shadowRoot) {
			const serialize: IGsSerializeOptions = {
				method: "indented",
				indent: "  "
			};
			switch (this.getAttribute("format") || "gs") {
			case "gs":
				this.initialize({gs: this.firstElementChild.textContent, serialize});
				break;
			case "json":
				this.initialize({jso: JSON.parse(this.firstElementChild.textContent), serialize});
				break;
			case "html":
				this.initialize({domHtml: this.firstElementChild, serialize});
				break;
			case "xml":
				this.initialize({domXml: new DOMParser().parseFromString(this.firstElementChild.textContent, "text/xml"), serialize});
				break;
			}
		}
	}
}

registerStyle('gs-viewer', /* language=CSS */ `
	:host {
		display: block;
		font-family: monospace;
		white-space: pre;
		padding: 4px;
		overflow: auto;
	}

	.name > .str {
		color: #5e0074;
	}

	.attName > .str {
		color: #790032;
	}

	.value > .str {
		color: #025300;
	}

	.prop > .str {
		color: #954100;
	}

	.text > .str,
	.mixed > .str {
		color: #00384e;
	}

	.mark {
		color: #27003e;
	}

	.bound,
	.mixed > .mark {
		color: #9eaf99;;
	}

	.str {
		color: #006f27;
	}

	.esc {
		color: #3a7484;
		font-weight: bold;
	}

	.formattable {
		white-space: normal;
	}

	.comment {
		background-color: #e2ffef;
	}

	.metas {
		background-color: #dcf0fd;
	}

	.syntax {
		background-color: #dee3f7;
	}

	.instruction > .name > .str,
	.instruction > .mark:first-child,
	.instruction > .mark:last-child {
		color: #7b004d;
		font-weight: bold;
		/*background-color: #fde7f2;*/
	}

	/*.att.instruction {*/
	/*	background-color: #f2e5ff;*/
	/*}*/


	/* For GsHtmlBlockSH */

	.mixed > .box {
		display: inline;
	}

	.ch {
		margin-inline-start: 1ch;
		padding-inline-start: 1ch;
	}
`);

customElements.define('gs-viewer', GsViewer);