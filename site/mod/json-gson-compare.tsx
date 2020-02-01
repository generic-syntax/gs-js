import {GsMultiLH} from "../../src/core/gsHelpers.js";
import {GsParser} from "../../src/core/gsParser.js";
import {GsSerializer} from "../../src/core/gsSerializer.js";
import {GSON, GsToJsonLH} from "../../src/profileOn/gson.js";
import {ICodeMirrorInit} from "./cm.js";
import {IGsViewerInit} from "./gs-viewer.js";
import {JSX} from "./jsx.js";
import "./minified-compare.js";
import {IMinifiedCompareInit} from "./minified-compare.js";
import {getStyle, registerStyle} from "./styles.js";


export interface IJsonGsonCompareInit {
	json?: string
	gson?: string
}

export class JsonGsonCompare extends HTMLElement {

	initialize(init: IJsonGsonCompareInit) {
		if (!this.shadowRoot) {
			let jsonBlock, gsonBlock, jsonInline, gsonInline: string;
			let j: any;
			if (init.json) {
				jsonBlock = init.json;
				j = JSON.parse(init.json);
				jsonInline = JSON.stringify(j);
				gsonInline = GSON.stringify(j);
			} else {
				gsonBlock = init.gson;
				const toJso = new GsToJsonLH();
				const toGsonInline = new GsSerializer();
				new GsParser(new GsMultiLH(toJso, toGsonInline)).parse(gsonBlock);
				j = toJso.result;
				jsonInline = JSON.stringify(j);
				jsonBlock = JSON.stringify(j, null, "  ");
				gsonInline = toGsonInline.out.toString();
			}
			const sr = this.attachShadow({mode: 'open'});
			sr.append(
				getStyle(this.localName),
				<div class="block title">
					<div class="left">JSON</div>
					<div class="right">GS</div>
				</div>,
				<div class="block">
					<code-mirror class="left" î={{
						mode: 'javascript',
						value: jsonBlock,
						readOnly: 'nocursor',
						tabSize: 2,
						scrollbarStyle: null
					} as ICodeMirrorInit}/>
					<gs-viewer class="right" î={(init.json ? {jso: j} : {gs: gsonBlock}) as IGsViewerInit}/>
				</div>,
				<minified-compare î={{first: jsonInline, second: gsonInline} as IMinifiedCompareInit}>
					<code-mirror î={{
						mode: 'javascript',
						value: jsonInline,
						readOnly: 'nocursor',
						scrollbarStyle: "native"
					} as ICodeMirrorInit}/>
					<gs-viewer î={{jso: j, inline: true} as IGsViewerInit}/>
				</minified-compare>
			);
		}
	}

	connectedCallback() {
		if (!this.shadowRoot) {
			if (this.getAttribute("format") == "json") {
				this.initialize({json: this.firstElementChild.textContent});
			} else {
				this.initialize({gson: this.firstElementChild.textContent});
			}
		}
	}
}

registerStyle('json-gson-compare', /* language=CSS */ `
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
	  text-align: center;
	  border-bottom: 1px solid var(--border-color);
  }
`);


customElements.define('json-gson-compare', JsonGsonCompare);