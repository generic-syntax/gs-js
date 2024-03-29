import {gsEscapingStr, gsEscapingText, gsEscapingValue, IGsEventNode, IGsLogicalHandler, IGsSerializeOptions, IGsText, rawChars, whiteSpaces} from "../../api/gs.js";
import {IGsWriter} from "../../api/gsSerializer.js";
import {GsEventAtt, GsEventNode, GsLogicalEventProducer} from "../core/gsLogicalHandler.js";
import {GsParser} from "../core/gsParser.js";
import {buildSerializer, GsStringWriter} from "../core/gsSerializer.js";


export const GSML = {
	parse(domImpl: 'xml' | 'xmlNs' | 'html', gsml: string, doc?: XMLDocument): DocumentFragment {
		if (!doc) {
			if (domImpl === "html") {
				doc = document instanceof HTMLDocument ? document : document.implementation.createHTMLDocument();
			} else {
				doc = document.implementation.createDocument(null, null, null);
			}
		}
		const frag = doc.createDocumentFragment();
		GSML.parseAppend(domImpl, gsml, doc);
		return frag;
	},

	parseAppend(domImpl: 'xml' | 'xmlNs' | 'html', gsML: string, parent: Node & ParentNode): void {
		new GsParser(domImpl === "xml" ? new GsToDomXmlLH(parent) : domImpl === "xmlNs" ? new GsToDomXmlNsLH(parent) : new GsToDomHtmlLH(parent)).parse(gsML);
	},

	stringify(domImpl: 'xml' | 'xmlNs' | 'html', node: Node, options?: IGsmlStringifyOptions): string {
		const fromDom: GsFromDomXml<IGsLogicalHandler> = domImpl === "xml" ? new GsFromDomXml() : domImpl === "xmlNs" ? new GsFromDomXmlNs() : new GsFromDomHtml();
		if (options) {
			if (options.textBody) fromDom.setMixedBody(options.textBody);
			if (options.mixedBody) fromDom.setMixedBody(options.mixedBody);
			if (options.formattabeBody) fromDom.setFormattableBody(options.formattabeBody);
			if (options.formattabeValue) fromDom.setFormattableValue(options.formattabeValue);
			if (options.skipWhiteSpace) fromDom.setSkipWhiteSpace(options.skipWhiteSpace);
			if (options.escapingBody) fromDom.setEscapingBody(options.escapingBody);
			if (options.escapingValue) fromDom.setEscapingValue(options.escapingValue);
			if (options.escapingAttName) fromDom.setEscapingAttName(options.escapingAttName);
		}
		const writer = options?.writer || new GsStringWriter();
		fromDom.setHandler(buildSerializer(writer, options?.serialize)).build(node);
		return writer.toString();
	}
};


export interface IGsmlStringifyOptions {
	textBody?: string[] | ((node: Node) => boolean)
	mixedBody?: string[] | ((node: Node) => boolean)
	formattabeBody?: string[] | ((node: Node) => boolean)
	formattabeValue?: string[] | ((node: Node, att: Attr) => boolean)
	skipWhiteSpace?: boolean | ((node: Text, gsParent: IGsEventNode) => boolean)
	escapingBody?: (node: Node) => gsEscapingText
	escapingValue?: (node: Node, att: Attr) => gsEscapingValue
	escapingName?: (node: Node) => gsEscapingStr
	escapingAttName?: (node: Node, att: Attr) => gsEscapingStr
	serialize?: IGsSerializeOptions
	writer?: IGsWriter
}


/**
 *
 */
export class GsFromDomXml<H extends IGsLogicalHandler> extends GsLogicalEventProducer<H> {

	/**
	 * Called only if the element contains only one or more text nodes.
	 * @return return true by default.
	 */
	textBody(elt: Element): boolean {return true}

	setTextBody(v: string[] | ((node: Element) => boolean)): this {
		if (Array.isArray(v)) this.textBody = (node: Element) => v.indexOf(node.nodeName) >= 0;
		else this.textBody = v || isNull;
		return this;
	}

	mixedBody(node: Element): boolean {return false}

	setMixedBody(v: string[] | ((node: Element) => boolean)): this {
		if (Array.isArray(v)) this.mixedBody = (node: Element) => v.indexOf(node.nodeName) >= 0;
		else this.mixedBody = v || isNull;
		return this;
	}

	formattableBody(node: Node): boolean {return false}

	setFormattableBody(v: string[] | ((node: Node) => boolean)): this {
		if (Array.isArray(v)) this.formattableBody = (node: Node) => v.indexOf(node.nodeName) >= 0;
		else this.formattableBody = v || isNull;
		return this;
	}

	formattableValue(node: Node, att: Attr): boolean {return false}

	setFormattableValue(v: string[] | ((node: Node, att: Attr) => boolean)): this {
		if (Array.isArray(v)) this.formattableValue = (node: Node, att: Attr) => v.indexOf(att.name) >= 0;
		else this.formattableValue = v || isNull;
		return this;
	}

	skipWhiteSpace(node: Text, gsParent: IGsEventNode): boolean {return !gsParent?.isBodyMixed}

	setSkipWhiteSpace(v: boolean | ((node: Node, gsParent: IGsEventNode) => boolean)): this {
		this.skipWhiteSpace = v === true ? isTrue : v === false ? isNull : v || isNull;
		return this;
	}

	escapingBody(node: Node, text: string): gsEscapingText {return '"'}

	setEscapingBody(v: (node: Node, text: string) => gsEscapingText): this {
		this.escapingBody = v || isTextQuote;
		return this;
	}

	escapingName(node: Node): gsEscapingStr {return !rawChars.test(node.nodeName) ? "'" : null}

	setEscapingName(v: (node: Node) => gsEscapingStr): this {
		this.escapingName = v || isQuote;
		return this;
	}

	escapingValue(node: Node, att: Attr): gsEscapingValue {return !rawChars.test(att.value) ? "'" : null}

	setEscapingValue(v: (node: Node, att: Attr) => gsEscapingValue): this {
		this.escapingValue = v || isQuote;
		return this;
	}

	escapingAttName(node: Node, att: Attr): gsEscapingStr {return !rawChars.test(att.name) ? "'" : null}

	setEscapingAttName(v: (node: Node, att: Attr) => gsEscapingStr): this {
		this.escapingAttName = v || isQuote;
		return this;
	}

	build(node: Node): this {
		if (node != null) this.push(node);
		return this;
	}

	push(node: Node) {
		let n: GsEventNode;
		switch (node.nodeType) {
		case Node.ELEMENT_NODE:
			n = this.pushNode(null, undefined);
			this.setEltName(n, node as Element);
			n.nameEsc = this.escapingName(node);
			for (const att of (node as Element).attributes) {
				let a = n.pushAtt(null, false);
				this.setAttName(n, a, att);
				a.nameEsc = this.escapingAttName(node, att);
				a.value = att.value;
				a.valueEsc = this.escapingValue(node, att);
				a.valueFormattable = this.formattableValue(node, att);
			}
			if (node.hasChildNodes()) {
				if (isChildrenTextOnly(node as Element) && this.textBody(node as Element)) {
					n.bodyType = '"';
					this.txt.value = node.textContent; //merge text nodes.
					this.txt.valueEsc = this.escapingBody(node, this.txt.value);
					this.txt.valueFormattable = this.formattableBody(node);
					this.handler.startNode(n, this.txt);
				} else {
					n.bodyType = this.mixedBody(node as Element) ? this.formattableBody(node) ? "~`" : "`" : "[";
					this.handler.startNode(n);
					for (let ch = node.firstChild; ch; ch = ch.nextSibling) {
						this.push(ch);
					}
				}
			} else {
				n.bodyType = "";
				this.handler.startNode(n);
			}
			this.popNode(n);
			break;
		case Node.TEXT_NODE:
		case Node.CDATA_SECTION_NODE:
			if (whiteSpaces.test(node.nodeValue) && this.skipWhiteSpace(node as Text, this.peekNode())) break;
			n = this.pushNode('', undefined);
			n.name = null;
			n.bodyType = '"';
			this.txt.value = node.nodeValue;
			this.txt.valueEsc = this.escapingBody(node, this.txt.value);
			this.txt.valueFormattable = this.formattableBody(node);
			this.handler.startNode(n, this.txt);
			this.popNode(n);
			break;
		case Node.COMMENT_NODE:
			n = this.pushNode("#", undefined);
			n.name = null;
			n.bodyType = '"';
			this.txt.value = node.nodeValue;
			this.txt.valueEsc = this.escapingBody(node, this.txt.value);
			this.txt.valueFormattable = this.formattableBody(node);
			this.handler.startNode(n, this.txt);
			this.popNode(n);
			break;
		case Node.PROCESSING_INSTRUCTION_NODE:
			n = this.pushNode("%", undefined);
			n.name = node.nodeName;
			n.nameEsc = this.escapingName(node);
			n.bodyType = '"';
			this.txt.value = node.nodeValue;
			this.txt.valueEsc = this.escapingBody(node, this.txt.value);
			this.txt.valueFormattable = this.formattableBody(node);
			this.handler.startNode(n, this.txt);
			this.popNode(n);
			break;
		case Node.DOCUMENT_NODE:
		case Node.DOCUMENT_FRAGMENT_NODE:
			for (let ch = node.firstChild; ch; ch = ch.nextSibling) {
				this.push(ch);
			}
			break;
		}
	}

	protected setEltName(n: GsEventNode, elt: Element) {
		n.name = elt.nodeName;
	}

	protected setAttName(n: GsEventNode, a: GsEventAtt, att: Attr) {
		a.name = att.nodeName;
	}

}


export class GsFromDomHtml<H extends IGsLogicalHandler> extends GsFromDomXml<H> {

	static TEXT_TAGS = new Set(["SCRIPT", "STYLE", "TEXTAREA", "TITLE"]);
	static MIXED_TAGS = new Set(["P", "LI", "SPAN", "EM", "STRONG", "CODE", "SAMP", "VAR", "A", "B"]);

	/**
	 * By default, set text body for script, style, textarea, and title tag.
	 * For other elements containing a text node, the more generic mixed bodyType is prefered.
	 */
	textBody(elt: Element): boolean {
		return GsFromDomHtml.TEXT_TAGS.has(elt.nodeName);
	}

	/** By default, use mixed instead of list body if known para / inline tag or if children contains at least one no whitespace TextNode. */
	mixedBody(node: Element) {
		if (GsFromDomHtml.MIXED_TAGS.has(node.nodeName)) return true;
		if (node.nodeName.charAt(0) === "H") {
			//heading h1 -> h6
			const n = node.nodeName.charCodeAt(1);
			if (n >= 49 && n <= 54) return true;
		}
		for (let ch = node.firstChild; ch; ch = ch.nextSibling) if (ch.nodeType === Node.TEXT_NODE && !whiteSpaces.test(ch.nodeValue)) return true;
		return false;
	}

	/** By default, bounded escaping for script and style tags or if the text contains a '"'. */
	escapingBody(node: Node, text: string): gsEscapingText {
		if (node.nodeName === "SCRIPT" || node.nodeName === "STYLE" || text.indexOf('"') >= 0) {
			let bound: `!${string}"` = '!"';
			while (text.indexOf(bound) >= 0) {
				if (bound.length > 2) {
					//boundary too long, use a counter.
					let i = 0;
					do {
						bound = `!${i++}"`;
						if (text.indexOf(bound) < 0) return bound;
					} while (true);
				}
				bound = "!" + bound as `!${string}"`;
			}
			return bound;
		}
		return '"';
	}

	protected setEltName(n: GsEventNode, elt: Element) {
		n.name = elt.localName;
	}

	protected setAttName(n: GsEventNode, a: GsEventAtt, att: Attr) {
		a.name = att.localName;
	}
}


export class GsFromDomXmlNs<H extends IGsLogicalHandler> extends GsFromDomXml<H> {

	protected setEltName(n: GsEventNode & IGsEventNs, elt: Element) {
		//TODO check ns, add xmlns atts
		n.name = elt.nodeName;
	}

	protected setAttName(n: GsEventNode & IGsEventNs, a: GsEventAtt, att: Attr) {
		//TODO check ns, add xmlns atts
		a.name = att.nodeName;
	}
}

interface IGsEventNs {
	/** prefix/ns table declared on a GsEventNode. */
	ns?: Map<string, string>
}


/**
 *
 */
export class GsToDomXmlLH implements IGsLogicalHandler {

	parent: Node & ParentNode;

	get firstNode(): Node | null {return this.parent.firstChild}

	protected doc: Document;

	constructor(parent?: Node & ParentNode) {
		if (parent) {
			this.parent = parent;
			this.doc = parent.ownerDocument;
		} else {
			this.doc = document.implementation.createDocument(null, null, null);
			this.parent = this.doc.createDocumentFragment();
		}
	}

	setParent(parent: Node & ParentNode): this {
		this.parent = parent;
		this.doc = parent.ownerDocument;
		return this;
	}

	reset(): this {
		this.parent = this.doc.createDocumentFragment();
		return this;
	}


	startNode(node: IGsEventNode, bodyText?: IGsText): void {
		if (node.nodeType === null) {
			//standard nodeType
			switch (node.bodyType) {
			case '"':
				if (!node.name) break;//pure textNode
				//!break;
			case "[":
			case "`":
			case "~`":
			case "":
				const elt = this.parent.appendChild(this.doc.createElement(node.name));
				for (let a = node.firstAtt; a; a = a.next) {
					elt.setAttribute(a.name, a.value);
				}
				this.parent = elt;
				break;
			}
		}
		if (bodyText) {
			switch (node.nodeType) {
			case "":
			case null:
				this.parent.appendChild(this.doc.createTextNode(bodyText.value));
				break;
			case "#":
				this.parent.appendChild(this.doc.createComment(bodyText.value));
				break;
			case "&":
			case "%":
				this.parent.appendChild(this.doc.createProcessingInstruction(node.name, bodyText.value));
				break;
			}
		}
	}

	endNode(node: IGsEventNode): void {
		if (node.nodeType !== null || (node.bodyType === '"' && !node.name)) return; //comment, pi, or pure textNode or GS node xml incompatible
		if (this.parent instanceof Element) {
			for (let a = node.firstTailAtt; a; a = a.next) {
				this.parent.setAttribute(a.name, a.value);
			}
		}
		this.parent = this.parent.parentNode;
	}

}


export class GsToDomHtmlLH extends GsToDomXmlLH {

	constructor(parent?: Node & ParentNode) {
		if (!parent) parent = document.implementation.createHTMLDocument().createDocumentFragment();
		super(parent);
	}
}


export class GsToDomXmlNsLH extends GsToDomXmlLH {

}

function isNull(): null {return null}

function isQuote(): "'" {return "'"}

function isTextQuote(): '"' {return '"'}

function isTrue() {return true}


function isChildrenTextOnly(n: Element) {
	for (let ch = n.firstChild; ch; ch = ch.nextSibling) {
		if (ch.nodeType !== Node.TEXT_NODE) return false;
	}
	return true;
}