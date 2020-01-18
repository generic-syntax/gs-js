import {gsSpecialType, IGsEventAtt, IGsEventNode, IGsEventText, IGsLogicalHandler, IGsName, IGsSerializeOptions, IGsSyntaxHandler, IGsValue} from "../../api/gs.js";
import {IGsWriter} from "../../api/gsSerializer.js";
import {GsFormatLH, GsIndentLH, GsMinifiedLH, GsPrettyLH, GsUnformatSH} from "../core/gsSerializer.js";


/**
 * IGsWriter builing a flat html tags for viewing an inline colorized GS
 *
 * Class inline : mark, str, bound, esc, sp
 */
export class GsHtmlInlineWriter implements IGsWriter {

	parent: Node;

	protected needSep: boolean;

	constructor(parent: Node) {
		this.parent = parent;
	}

	mark(c: string): void {
		this.needSep = false;
		this.addInl(c, 'mark');
	}

	rawChars(c: string): void {
		if (this.needSep) this.addInl(' ', 'sp');
		this.addInl(c, 'str');
		this.needSep = true;
	}

	quotedChars(c: string, quote: "'" | '"') {
		this.needSep = false;
		this.addInl(quote, 'bound');
		const r = quote === '\'' ? /['\\]/ : /["\\]/;
		let i = c.search(r);
		while (i >= 0) {
			if (i > 0) this.addInl(c.substring(0, i), 'str');
			switch (c.charCodeAt(i)) {
			case 92:
				this.addInl("\\\\", 'esc');
				break;
			case 39:
				this.addInl("\\'", 'esc');
				break;
			case 34:
				this.addInl("\\\"", 'esc');
				break;
			}
			c = c.substring(i + 1);
			i = c.search(r);
		}
		if (c.length > 0) this.addInl(c, 'str');
		this.addInl(quote, 'bound');
	}

	boundedChars(c: string, bound: string): void {
		this.needSep = false;
		this.addInl(bound, 'bound');
		this.addInl(c, 'str');
		this.addInl(bound, 'bound');
	}

	mixedText(c: string): void {
		const r = /[`<\\]/;
		let i = c.search(r);
		while (i >= 0) {
			if (i > 0) this.addInl(c.substring(0, i), 'str');
			switch (c.charCodeAt(i)) {
			case 92:
				this.addInl("\\\\", 'esc');
				break;
			case 60:
				this.addInl("\\<", 'esc');
				break;
			case 96:
				this.addInl("\\`", 'esc');
				break;
			}
			c = c.substring(i + 1);
			i = c.search(r);
		}
		if (c.length > 0) this.addInl(c, 'str');
	}

	space(c: string): void {
		this.needSep = false;
		this.addInl(c, 'sp');
	}

	protected addInl(str: string, cls: string) {
		const t = document.createElement("span");
		t.className = cls;
		t.textContent = str;
		this.parent.appendChild(t);
	}
}

/** Base class for GsHtmlColorizedSH and GsHtmlColorizedLH. */
abstract class GsHtmlColorized extends GsHtmlInlineWriter {

	root: Node;

	constructor(root: Node) {
		super(root);
		this.root = root;
	}

	attribute(name: IGsName, value: IGsValue, specialType?: gsSpecialType | null, spBeforeEq?: string, spAfterEq?: string): void {
		this.parent = this.addSpan(!specialType ? "att" : specialType === "#" ? "att comment" : specialType === "&" ? "att metas" : specialType === "%" ? "att instruction" : "att syntax");
		if (specialType) this.mark(specialType);
		this.writeStr(name.name, name.nameEsc, "attName");
		if (value.value !== null) {
			if (spBeforeEq) this.space(spBeforeEq);
			this.mark("=");
			if (spAfterEq) this.space(spAfterEq);
			if (value.valueFormattable) this.mark("~");
			this.writeStr(value.value, value.valueEsc, value.valueFormattable ? "value formattable" : "value");
		}
		this.parent = this.parent.parentNode;
	}

	property(name: IGsName, isNull: boolean, spBeforeEq?: string): void {
		this.writeStr(name.name, name.nameEsc, "prop");
		if (!isNull) {
			if (spBeforeEq) this.space(spBeforeEq);
			this.mark("=");
		}
	}

	text(text: IGsEventText, inBodyMixed?: boolean): void {
		if (inBodyMixed) {
			this.mixedText(text.value);
		} else {
			const esc = text.valueEsc;
			if (esc === false) {
				this.rawChars(text.value);
			} else if (esc === true) {
				this.quotedChars(text.value, '"');
			} else {
				this.boundedChars(text.value, esc.length > 0 ? `!${esc}"` : '!"');
			}
		}
	}

	writeStr(c: string, esc: boolean | string, cls: string) {
		this.parent = this.addSpan(cls);
		if (esc === false) {
			this.rawChars(c);
		} else if (esc === true) {
			this.quotedChars(c, "'");
		} else {
			this.boundedChars(c, esc.length > 0 ? `|${esc}'` : "|'");
		}
		this.parent = this.parent.parentNode;
	}

	protected addSpan(cls: string): HTMLDivElement {
		const t = document.createElement("span") as HTMLDivElement;
		t.className = cls;
		this.parent.appendChild(t);
		return t;
	}
}


/**
 * IGsSyntaxHandler building a tree html tags for viewing a colorized GS.
 * The rendering respect whiteSpaces input events.
 * class span :
 * 		node, "node comment", "node metas", "node instruction", "node syntax"
 * 		name, attName, value, prop, text, mixed,
 * 		"value formattable", "text formattable", "mixed formattable"
 * Class inline : mark, str, bound, esc, sp
 *
 */
export class GsHtmlColorizedSH extends GsHtmlColorized implements IGsSyntaxHandler {

	headNode(name: IGsName, specialType?: gsSpecialType): void {
		this.parent = this.addSpan(!specialType ? "node" : specialType === "#" ? "node comment" : specialType === "&" ? "node metas" : specialType === "%" ? "node instruction" : "node syntax");
		if (specialType) {
			this.mark("<" + specialType);
		} else {
			this.mark("<");
		}
		if (name.name) this.writeStr(name.name, name.nameEsc, "name");
	}

	startBody(bodyType: "[" | "{" | "`" | "~`"): void {
		if (bodyType === "`") {
			this.parent = this.addSpan("mixed");
		} else if (bodyType === "~`") {
			this.parent = this.addSpan("mixed formattable");
		}
		this.mark(bodyType);
	}

	text(text: IGsEventText, inBodyMixed?: boolean): void {
		if (inBodyMixed) {
			super.text(text, true);
		} else {
			if (text.valueFormattable) this.mark("~");
			this.parent = this.addSpan(text.valueFormattable ? "text formattable" : "text");
			super.text(text, false);
			this.parent = this.parent.parentNode; //text ou "text formattable"
		}
	}

	endBody(bodyType: "[" | "{" | "`" | "~`"): void {
		switch (bodyType) {
		case "[":
			this.mark("]");
			break;
		case "{":
			this.mark("}");
			break;
		case "`":
		case "~`":
			this.mark("`");
			this.parent = this.parent.parentNode; //mixed ou "mixed formattable"
			break;
		}
	}

	tailNode(): void {
		this.mark('>');
		this.parent = this.parent.parentNode; //node
	}

	whiteSpaces(spaces: string): void {
		this.space(spaces);
	}

}


/**
 * IGsLogicalHandler building a tree html tags for viewing a colorized GS.
 * The rendering is similar to a pretty serialization, without indenting.
 * class span : name, att, value, prop, text, mixed, "value formattable", "text formattable", "mixed formattable"
 * Class inline : mark, str, bound, esc, sp
 *
 * XXX trash it ?
 */
export class GsHtmlColorizedLH extends GsHtmlColorized implements IGsLogicalHandler {

	startNode(node: IGsEventNode): void {
		if (node.nodeType !== '') {
			if (node.nodeType === null) {
				this.mark("<");
			} else {
				this.mark("<" + node.nodeType);
			}
		}
		if (node.name) this.writeStr(node.name, node.nameEsc, "name");
		if (node.firstAtt) this.writeAtts(node.firstAtt);
		if (node.nodeType !== '' && node.bodyType !== "") this.space(' ');
		switch (node.bodyType) {
		case "[":
		case "{":
			this.mark(node.bodyType);
			break;
		case '"':
			this.parent = this.addSpan("text");
			break;
		case "`":
		case "~`":
			this.parent = this.addSpan(node.bodyType === "~`" ? "mixed formattable" : "mixed");
			this.mark(node.bodyType);
			break;
		}
	}

	bodyMapProp(name: IGsName, isNull: boolean, holder: IGsEventNode): void {
		this.property(name, isNull);
		if (!isNull) this.space(' ');
	}

	bodyText(text: IGsEventText, holder: IGsEventNode): void {
		this.text(text, holder.parent?.isBodyMixed);
	}

	endNode(node: IGsEventNode): void {
		switch (node.bodyType) {
		case "[":
			this.mark("]");
			break;
		case "{":
			this.mark("}");
			break;
		case '"':
			this.parent = this.parent.parentNode; //text ou "text formattable"
			break;
		case "`":
		case "~`":
			this.mark("`");
			this.parent = this.parent.parentNode; //mixed ou "mixed formattable"
			break;
		}
		if (node.firstTailAtt) this.writeAtts(node.firstTailAtt);
		if (node.nodeType !== '') this.mark('>');
	}

	protected writeAtts(att: IGsEventAtt) {
		for (; att; att = att.next) {
			this.space(' ');
			this.attribute(att, att, att.attType);
		}
	}

}


/**
 * IGsLogicalHandler building a tree html tags for viewing a block colorized GS.
 * Block tags simulate indentations.
 * Class block : box, tail, ch
 * class span : head, name, att, value, prop, text, mixed, "value formattable", "text formattable", "mixed formattable"
 * Class inline : mark, str, bound, esc, sp
 *
 * XXX trash it ?
 */
export class GsHtmlBlockLH extends GsHtmlColorizedLH {

	startNode(node: IGsEventNode): void {
		if (!node.holderProp) {
			this.parent = this.addDiv("box");
			this.parent = this.addSpan("head");
		}
		super.startNode(node);
		switch (node.bodyType) {
		case "[":
		case "{":
			this.parent = this.parent.parentNode; //head
			this.parent = this.addDiv("ch");
			break;
		}
	}

	bodyMapProp(name: IGsName, isNull: boolean, holder: IGsEventNode): void {
		this.parent = this.addDiv("box");
		this.parent = this.addSpan("head");
		super.bodyMapProp(name, isNull, holder);
		if (isNull) this.parent = this.parent.parentNode.parentNode; //head box
	}

	endNode(node: IGsEventNode): void {
		switch (node.bodyType) {
		case "[":
			this.parent = this.parent.parentNode; //ch
			this.parent = this.addDiv("tail");
			break;
		case "{":
			this.parent = this.parent.parentNode; //ch
			this.parent = this.addDiv("tail");
			break;
		}
		super.endNode(node);
		this.parent = this.parent.parentNode.parentNode; //tail box
	}

	protected addDiv(cls: string): HTMLDivElement {
		const t = document.createElement("div") as HTMLDivElement;
		t.className = cls;
		this.parent.appendChild(t);
		this.needSep = false;
		return t;
	}
}


/**
 * Helper for building a HtmlViewer from a IGsSerializeOptions.
 */
export function buildHtmlViewer(root: Node, options?: IGsSerializeOptions): IGsLogicalHandler {
	const ser = new GsHtmlColorizedSH(root);
	switch (options?.method) {
	case "pretty":
		return new GsPrettyLH(options.unformat ? new GsUnformatSH(ser) : ser);
	case "minified":
		return new GsMinifiedLH(options.unformat ? new GsUnformatSH(ser) : ser);
	case "formatted":
		return new GsFormatLH(options, ser);
	default: //indented
		return new GsIndentLH(options, options?.unformat ? new GsUnformatSH(ser) : ser);
	}
}