import {JSX} from "./jsx.js";
import {getStyle, registerStyle} from "./styles.js";

export interface IMinifiedCompareInit {
	first?: string
	second?: string
}

export class MinifiedCompare extends HTMLElement {

	initialize(init: IMinifiedCompareInit) {
		let sr = this.shadowRoot;
		if (!sr) {
			sr = this.attachShadow({mode: 'open'});
			sr.appendChild(getStyle(this.localName));
		} else {
			while (sr.lastChild?.nodeName !== "STYLE") sr.lastChild.remove();
		}

		if (init.first && init.second) {
			let unit = "bytes";
			const v1 = init.first.length;
			const v2 = init.second.length;
			//todo units ? if (init.firstSize > 9999) {}
			const p1 = Math.round((v1 - v2) / v2 * 100);
			const p2 = Math.round((v2 - v1) / v1 * 100);
			sr.append(
				<div id="bar">
					<div class="side" title="Character length comparison of the two unindented forms">{v1} {unit} <span class={v1 > v2 ? 'bigger' : 'smaller'}>( {p1 > 0 ? '+' : ''}{p1 || '0'}%)</span></div>
					<button id="detailsBtn" title="Show unindented contents" onclick={() => this.toggleShowDetails()}><span id="detailsLabel"/></button>
					<div class="side" title="Character length comparison of the two unindented forms">{v2} {unit} <span class={v2 > v1 ? 'bigger' : 'smaller'}>( {p2 > 0 ? '+' : ''}{p2 || '0'}%)</span></div>
				</div>,
				<div id="details">
					<pre>{init.first}</pre>
					<pre>{init.second}</pre>
				</div>
			);
		}
	}

	connectedCallback() {
		if (!this.shadowRoot && this.hasAttribute("first")) {
			this.initialize({
				first: this.getAttribute("first"),
				second: this.getAttribute("second"),
			});
		}
	}

	toggleShowDetails() {
		this.classList.toggle("showDetails");
	}
}

registerStyle('minified-compare', /* language=CSS */ `
	:host {
		display: flex;
		min-height: 0;
		min-width: 0;
		flex-direction: column;
	}

	#bar {
		display: flex;
		min-height: 0;
		min-width: 0;
		border-top: 1px solid var(--border-color);
	}

	#detailsLabel::before {
		content: "▼";
	}

	:host(.showDetails) #detailsLabel::before {
		content: "▲";
	}

	#details {
		display: none;
		overflow: auto;
	}

	pre:first-child {
		border-bottom: 1px solid var(--border-color);
	}

	pre {
		padding: .3em 0;
		margin: 0;
	}

	:host(.showDetails) #details {
		display: block;
		border-top: 1px solid var(--border-color);
	}

	.side {
		flex: 1 1 0;
		max-width: 50%;
		text-align: center;
	}

	.bigger {
		color: darkred;
		font-weight: bold;
	}

	.smaller {
		color: darkgreen;
		font-weight: bold;
	}
`);


customElements.define('minified-compare', MinifiedCompare);