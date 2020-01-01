import {whiteSpaces} from "../../api/gs.js";
import {GsMultiLH} from "../../src/core/gsHelpers.js";
import {GsParser} from "../../src/core/gsParser.js";
import {GsSerializer} from "../../src/core/gsSerializer.js";
import {GSML, GsToDomHtmlLH, GsToDomXmlLH} from "../../src/profileMl/gsml.js";
import {ICodeMirrorInit} from "./cm.js";
import {IGsViewerInit} from "./gs-viewer.js";
import {JSX} from "./jsx.js";
import "./minified-compare.js";
import {IMinifiedCompareInit} from "./minified-compare.js";
import {getStyle, registerStyle} from "./styles.js";


export interface IMlGsmlCompareInit {
	input: string
	inputFormat: 'xml' | 'html' | 'htmlDoc' | 'gsml'
	/** if inputFormat=='gsml' */
	output?: 'xml' | 'html'
}

export class MlGsmlCompare extends HTMLElement {

	initialize(init: IMlGsmlCompareInit) {
		if (!this.shadowRoot) {
			let mlBlock, gsmlBlock, mlInline, gsmlInline: string;
			let dom: Node;
			const output: 'xml' | 'html' = init.output || (init.inputFormat === 'xml' ? 'xml' : 'html');
			if (init.inputFormat === "gsml") {
				gsmlBlock = init.input;
				const toDom = output === "xml" ? new GsToDomXmlLH() : new GsToDomHtmlLH();
				const toGsonInline = new GsSerializer();
				new GsParser(new GsMultiLH(toDom, toGsonInline)).parse(gsmlBlock);
				dom = toDom.parent.firstChild;
				mlInline = serXml(output, dom);
				indentDom(dom);
				mlBlock = serXml(output, dom);
				gsmlInline = toGsonInline.out.toString();
			} else {
				mlBlock = init.input;
				dom = cleanupDom(parse(init.inputFormat, init.input), true, false, true);
				mlInline = serXml(output, dom);
				gsmlInline = GSML.stringify(output, dom);
			}
			const sr = this.attachShadow({mode: 'open'});
			sr.append(
				getStyle(this.localName),
				<div class="block title">
					<div class="left">{output === "html" ? "HTML" : "XML"}</div>
					<div class="right">GS</div>
				</div>,
				<div class="block">
					<code-mirror class="left" î={{
						mode: output === "html" ? 'htmlmixed' : 'xml',
						value: mlBlock,
						readOnly: 'nocursor',
						tabSize: 2,
						scrollbarStyle: null
					} as ICodeMirrorInit}/>
					<gs-viewer class="right" î={(init.inputFormat === "gsml" ? {gs: gsmlBlock} : init.inputFormat === "xml" ? {domXml: dom} : {domHtml: dom}) as IGsViewerInit}/>
				</div>,
				<minified-compare î={{first: mlInline, second: gsmlInline} as IMinifiedCompareInit}>
					<code-mirror î={{
						mode: output === "html" ? 'htmlmixed' : 'xml',
						value: mlInline,
						readOnly: 'nocursor',
						scrollbarStyle: "native"
					} as ICodeMirrorInit}/>
					<gs-viewer î={{gs: gsmlInline, inline: true} as IGsViewerInit}/>
				</minified-compare>
			);
		}
	}

	connectedCallback() {
		if (!this.shadowRoot) {
			this.initialize({input: this.firstElementChild.textContent, inputFormat: this.getAttribute("format") as any, output: this.getAttribute("output") as any});
		}
	}
}

registerStyle('ml-gsml-compare', /* language=CSS */ `
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


function serXml(output: 'xml' | 'html', node: Node): string {
	if (output === "xml") return new XMLSerializer().serializeToString(node);
	if (node instanceof HTMLElement) return node.outerHTML;
	if (node instanceof Document) return node.documentElement.outerHTML;
}

const INDENT_WS: string[] = [];

function indentDom(root: Node): Node {
	if (INDENT_WS.length === 0) {
		for (let i = 0; i <= 25; i++) INDENT_WS[i] = "\n\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t".substring(0, i + 1);
	}
	root.normalize();
	let eltRoot = root;
	let deep = 0;
	switch (root.nodeType) {
	case 9 : //Document
		eltRoot = (root as Document).documentElement;
		if (!eltRoot) return root;
		break;
	case 11 : //Fragment
		deep = -1;
	}
	let currNode = eltRoot;

	function isText(node: Node) {
		let type = node.nodeType;
		if (isNodetext(node) && !whiteSpaces.test(node.data)) return true;
		if (type == 4) return true;
		if (type == 8) {
			//Commentaire : on n'indente pas si un noeud frère est un texte.
			let n = node.previousSibling;
			while (n) {
				let t = n.nodeType;
				if (isNodetext(n) && !whiteSpaces.test(n.data)) return true;
				if (t == 4) return true;
				if (t != 8) break; // pas de texte dans les previous, on va checker les noeuds suivants
				n = n.previousSibling;
			}
			n = node.nextSibling;
			while (n) {
				let t = n.nodeType;
				if (isNodetext(n) && !whiteSpaces.test(n.data)) return true;
				if (t == 4) return true;
				if (t != 8) return false;
				n = n.nextSibling;
			}
		}
		return false;
	}

	function indent() {
		if (currNode.nodeType == 3) {
			//On est sur un noeud text de white-spaces
			currNode.nodeValue = INDENT_WS[Math.min(deep, 25)];
			if (currNode.nextSibling) currNode = currNode.nextSibling;
		} else {
			//On insère un texte
			currNode.parentNode.insertBefore(currNode.ownerDocument.createTextNode(INDENT_WS[Math.min(deep, 25)]), currNode);
		}
	}

	let prevIsText = false;
	let preserveSpace = [false];
	while (currNode) {
		//On traite le fils
		while (currNode.hasChildNodes()) {
			deep++;
			preserveSpace[deep] = (deep > 1 && preserveSpace[deep - 1]) ? !((currNode as Element).getAttribute("xml:space") === "default") : currNode.nodeType === 1 && (currNode as Element).getAttribute("xml:space") === "preserve";
			//log.debug("vPreserveSpace:::::"+vPreserveSpace);
			currNode = currNode.firstChild;
			prevIsText = isText(currNode);
			if (!prevIsText && !preserveSpace[deep]) {
				//Ce n'est pas du texte, on indent
				indent();
			}
		}
		//On prépare le suivant
		while (currNode.nextSibling == null) {
			deep--;
			//On ajoute le texte pour la fin de balise
			if (deep >= 0 && !prevIsText && !isText(currNode) && !preserveSpace[deep + 1]) {
				if (currNode.nodeType == 3) {
					currNode.nodeValue = INDENT_WS[Math.min(deep, 25)];
				} else {
					currNode.parentNode.insertBefore(currNode.ownerDocument.createTextNode(INDENT_WS[Math.min(deep, 25)]), null);
				}
			}
			if (currNode == eltRoot || currNode.parentNode == eltRoot) return root;
			currNode = currNode.parentNode;
			prevIsText = currNode.previousSibling != null && isText(currNode.previousSibling);
		}
		currNode = currNode.nextSibling;
		if (!isText(currNode)) {
			//Ce n'est pas du texte, on indent
			if (!prevIsText) {
				if (!preserveSpace[deep]) indent();
			} else {
				prevIsText = false;
			}
		} else {
			prevIsText = true;
		}
	}
	return root;
}

function isNodetext(n: Node): n is Text {return n.nodeType === Node.TEXT_NODE}

function parse(format: 'xml' | 'html' | 'htmlDoc', val: string): Node {
	if (format === "xml") {
		return new DOMParser().parseFromString(val, "text/xml").documentElement;
	} else if (format === "html") {
		return new DOMParser().parseFromString(val, "text/html").body.firstChild;
	} else if (format === "htmlDoc") {
		return new DOMParser().parseFromString(val, "text/html");
	} else {
		throw Error("Format unknown: " + format);
	}
}

function cleanupDom<T extends Node>(node: T, cleanupWhitespaces: boolean, cleanupComments: boolean, cleanupPI: boolean): T {
	return node;
	let filter = (cleanupWhitespaces ? NodeFilter.SHOW_TEXT : 0) | (cleanupComments ? NodeFilter.SHOW_COMMENT : 0) | (cleanupPI ? NodeFilter.SHOW_PROCESSING_INSTRUCTION : 0);
	let tw = (node.ownerDocument || node as any).createNodeIterator(node, filter);
	let previous = tw.nextNode();
	let next;
	while (previous) {
		next = tw.nextNode();
		if (previous.nodeType !== Node.TEXT_NODE) {
			previous.parentNode.removeChild(previous);
		} else if (whiteSpaces.test(previous.nodeValue)) {
			let p = previous.parentElement;
			let space;
			while (p) {
				if ((space = p.getAttribute("xml:space"))) break;
				p = p.parentElement;
			}
			if (space !== "preserve") previous.parentNode.removeChild(previous);
		}
		previous = next;
	}
	return node;
}

customElements.define('ml-gsml-compare', MlGsmlCompare);