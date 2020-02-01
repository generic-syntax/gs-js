import {gsEscaping, gsIndent, gsSpecialType, IGsEventNode, IGsEventText, IGsLogicalHandler, IGsName, IGsSerializeOptions, IGsSyntaxHandler, IGsValue, rawChars} from "../../api/gs.js";
import {IGsWriter} from "../../api/gsSerializer.js";
import {GsLogicalEventProducer} from "./gsLogicalHandler.js";
import {GsChainedSH, GsLH2SH} from "./gsSyntaxHandler.js";


/**
 * IGsLogicalHandler for minified serialized output.
 */
export class GsMinifiedLH<SH extends IGsSyntaxHandler> extends GsLH2SH<SH> {
}

/**
 * IGsLogicalHandler for pretty serialized output.
 * For human pretty reading, white-spaces are inserted between attributes and before value properties in body map.
 */
export class GsPrettyLH<SH extends IGsSyntaxHandler> extends GsLH2SH<SH> {
	startNode(node: IGsEventNode, bodyText?: IGsEventText): void {
		if (node.holderProp) {
			const isNull = node.nodeType === '' && node.bodyType === '';
			this.handler.property(node.holderProp, isNull);
			if (isNull) return;
			this.handler.whiteSpaces(' ');
		}
		if (node.nodeType !== '') {
			this.handler.headNode(node, node.nodeType);
			for (let att = node.firstAtt; att; att = att.next) {
				this.handler.whiteSpaces(' ');
				this.handler.attribute(att, att, att.attType);
			}
			if (node.bodyType !== "") this.handler.whiteSpaces(' ');
		}
		switch (node.bodyType) {
		case "[":
		case "{":
		case "`":
		case "~`":
			this.handler.startBody(node.bodyType);
			break;
		case '"':
			this.handler.text(bodyText, node.nodeType === '' && node.parent?.isBodyMixed);
			break;
		}
	}

	endNode(node: IGsEventNode): void {
		switch (node.bodyType) {
		case "[":
		case "{":
		case "`":
		case "~`":
			this.handler.endBody(node.bodyType);
			break;
		}
		if (node.nodeType !== '') {
			for (let att = node.firstTailAtt; att; att = att.next) {
				this.handler.whiteSpaces(' ');
				this.handler.attribute(att, att, att.attType);
			}
			this.handler.tailNode();
		}
	}
}


export interface IGsIndent {
	indent?: gsIndent
}

/**
 * IGsLogicalHandler for (re)indenting serialized output.
 * Input whitespaces events are discarded and new whitespaces events
 * are dispatched to the sub-handlers.
 * Formattables attributes values and text body are not touched by this handler.
 *
 * @see GsUnformatLH
 * @see GsFormatLH
 */
export class GsIndentLH<SH extends IGsSyntaxHandler> extends GsPrettyLH<SH> {

	readonly indent: string;
	protected spaces: string[];

	constructor(options?: IGsIndent, handler?: SH) {
		super(handler);
		this.indent = options?.indent ?? "  ";
		this.spaces = [];
	}

	startNode(node: IGsEventNode, bodyText?: IGsEventText): void {
		if (!node.holderProp) {
			const p = node.parent;
			if (!p || !p.isBodyMixed) this.addIndent(p);
		} else {
			this.addIndent(node.parent);
		}
		super.startNode(node, bodyText);
		switch (node.bodyType) {
		case "[":
		case "{":
			this.addLineFeed();
		}
	}

	endNode(node: IGsEventNode): void {
		if (node.bodyType === "[" || node.bodyType === "{") {
			this.addIndent(node.parent);
		}
		super.endNode(node);
		const p = node.parent;
		if (!p || !p.isBodyMixed) this.addLineFeed();
	}

	whiteSpaces(spaces: string): void {
		//kill white spaces
	}

	protected addLineFeed() {
		this.handler.whiteSpaces('\n');
	}

	protected addIndent(parent: IGsEventNode) {
		if (parent) this.handler.whiteSpaces(this.getWhiteSpaces(parent.depth + 1));
	}

	protected getWhiteSpaces(depth: number): string {
		let s = this.spaces[depth];
		if (!s) s = this.spaces[depth] = depth === 1 ? this.indent : this.getWhiteSpaces(depth - 1) + this.indent;
		return s;
	}
}


export interface IGsFormat extends IGsIndent {
	lineWidth?: number
}

/**
 * Reformat formattable attributes values and text body with max line width.
 */
export class GsFormatLH<SH extends IGsSyntaxHandler> extends GsIndentLH<SH> {
	readonly lineWidth: number;

	constructor(options: IGsFormat, handler?: SH) {
		super(options, handler);
		this.lineWidth = options.lineWidth ?? 256;
	}

	//TODO

}


/**
 * Normalize formattables value attributes and text body.
 * Spaces (' ', \t, \n, \r) sequences are reduced to a single space ' '.
 */
export class GsUnformatLH<LH extends IGsLogicalHandler> extends GsLogicalEventProducer<LH> implements IGsLogicalHandler {

	constructor(handler?: LH) {
		super(handler);
		this.txt.valueFormattable = true;
	}

	startNode(node: IGsEventNode, bodyText?: IGsEventText): void {
		const n = this.pushNodeFrom(node);
		for (let att = node.firstAtt; att; att = att.next) {
			const a = n.pushAttFrom(att);
			if (a.valueFormattable && a.value) a.value = this.unindent(a.value);
		}
		let t: IGsEventText;
		if (bodyText) {
			if (bodyText.valueFormattable && bodyText.value) {
				this.txt.value = this.unindent(bodyText.value);
				this.txt.valueEsc = bodyText.valueEsc;
				t = this.txt;
			} else {
				t = bodyText;
			}
		}
		this.handler.startNode(n, t);
	}

	endNode(node: IGsEventNode): void {
		const n = this.peekNode();
		for (let att = node.firstTailAtt; att; att = att.next) {
			const a = n.pushAttFrom(att);
			if (a.valueFormattable && a.value) a.value = this.unindent(a.value);
		}
		this.popNode(n);
	}

	protected unindent(v: string): string {
		return v.replace(/([ ][ \t\n\r]+|[ \t\n\r]+)/g, ' ');
	}
}

export class GsUnformatSH<SH extends IGsSyntaxHandler> extends GsChainedSH<SH> implements IGsSyntaxHandler {

	protected txt: IGsValue = {
		value: "",
		valueEsc: false,
		valueFormattable: true
	};

	attribute(name: IGsName, value: IGsValue, specialType?: gsSpecialType | null, spBeforeEq?: string, spAfterEq?: string): void {
		if (value.valueFormattable && value.value) {
			this.txt.value = this.unindent(value.value);
			this.txt.valueEsc = value.valueEsc;
			this.handler.attribute(name, this.txt, specialType, spBeforeEq, spAfterEq);
		} else
			this.handler.attribute(name, value, specialType, spBeforeEq, spAfterEq);
	}

	text(text: IGsEventText, inBodyMixed?: boolean): void {
		if (text.valueFormattable && text.value) {
			this.txt.value = this.unindent(text.value);
			this.txt.valueEsc = text.valueEsc;
			this.handler.text(this.txt, inBodyMixed);
		} else this.handler.text(text, inBodyMixed);
	}

	protected unindent(v: string): string {
		return v.replace(/([ ][ \t\n\r]+|[ \t\n\r]+)/g, ' ');
	}
}

/**
 * Final serializer to a IGsWriter.
 */
export class GsSerializer<OUT extends IGsWriter> extends GsLH2SH<GsSerializer<OUT>> implements IGsSyntaxHandler {

	constructor(readonly out?: OUT) {
		super(null);
		this.handler = this;
		this.out = out || new GsStringWriter() as any;
	}

	headNode(name: IGsName, specialType?: gsSpecialType): void {
		this.out.mark('<');
		if (specialType) this.out.mark(specialType);
		if (name.name) writeNameValue(this.out, name.name, name.nameEsc);
	}

	attribute(name: IGsName, value: IGsValue, specialType?: gsSpecialType | null, spBeforeEq?: string, spAfterEq?: string): void {
		const out = this.out;
		if (specialType) out.mark(specialType);
		writeNameValue(out, name.name, name.nameEsc);
		if (value.value != null) {
			if (spBeforeEq) out.space(spBeforeEq);
			out.mark('=');
			if (spAfterEq) out.space(spAfterEq);
			if (value.valueFormattable) out.mark('~');
			writeNameValue(out, value.value, value.valueEsc);
		}
	}

	text(text: IGsEventText, inBodyMixed: boolean): void {
		if (inBodyMixed) {
			this.out.mixedText(text.value);
		} else {
			if (text.valueFormattable) this.out.mark('~');
			writeText(this.out, text.value, text.valueEsc);
		}
	}

	startBody(bodyType: "[" | "{" | "`" | "~`"): void {
		this.out.mark(bodyType);
	}

	property(name: IGsName, isNull: boolean, spBeforeEq?: string): void {
		const out = this.out;
		writeNameValue(out, name.name, name.nameEsc);
		if (!isNull) {
			if (spBeforeEq) out.space(spBeforeEq);
			out.mark('=');
		}
	}

	endBody(bodyType: "[" | "{" | "`" | "~`"): void {
		switch (bodyType) {
		case "[":
			this.out.mark("]");
			break;
		case "{":
			this.out.mark("}");
			break;
		case "`":
		case "~`":
			this.out.mark("`");
			break;
		}
	}

	tailNode(): void {
		this.out.mark('>');
	}

	whiteSpaces(spaces: string): void {
		this.out.space(spaces);
	}
}


export function writeNameValue(out: IGsWriter, name: string, esc: gsEscaping | undefined) {
	if (esc == null) esc = !rawChars.test(name);
	if (esc === false) out.rawChars(name);
	else if (esc === true) out.quotedChars(name, "'");
	else out.boundedChars(name, esc.length > 0 ? `|${esc}'` : "|'");
}

export function writeText(out: IGsWriter, value: string, esc?: gsEscaping, formattable?: boolean) {
	if (formattable) out.mark('~');
	if (typeof esc === 'string') out.boundedChars(value, esc.length > 0 ? `!${esc}"` : '!"');
	else if (esc !== false) out.quotedChars(value, '"');
	else out.rawChars(value);
}


/**
 * IGsWriter building a string.
 */
export class GsStringWriter implements IGsWriter {

	protected datas: string[] = [];

	protected needSep: boolean;

	mark(c: string): void {
		this.needSep = false;
		this.datas.push(c);
	}

	rawChars(c: string): void {
		if (this.needSep) this.datas.push(' ');
		this.datas.push(c);
		this.needSep = true;
	}

	quotedChars(c: string, quote: '\'' | '"'): void {
		this.needSep = false;
		this.datas.push(quote);
		const r = quote === '\'' ? /['\\]/ : /["\\]/;
		let i = c.search(r);
		while (i >= 0) {
			if (i > 0) this.datas.push(c.substring(0, i));
			switch (c.charCodeAt(i)) {
			case 92:
				this.datas.push("\\\\");
				break;
			case 39:
				this.datas.push("\\'");
				break;
			case 34:
				this.datas.push("\\\"");
				break;
			}
			c = c.substring(i + 1);
			i = c.search(r);
		}
		if (c.length > 0) this.datas.push(c);
		this.datas.push(quote);
	}

	boundedChars(c: string, bound: string): void {
		this.needSep = false;
		this.datas.push(bound);
		this.datas.push(c);
		this.datas.push(bound);
	}

	mixedText(c: string): void {
		const r = /[`<\\]/;
		let i = c.search(r);
		while (i >= 0) {
			if (i > 0) this.datas.push(c.substring(0, i));
			switch (c.charCodeAt(i)) {
			case 92:
				this.datas.push("\\\\");
				break;
			case 60:
				this.datas.push("\\<");
				break;
			case 96:
				this.datas.push("\\`");
				break;
			}
			c = c.substring(i + 1);
			i = c.search(r);
		}
		if (c.length > 0) this.datas.push(c);
	}

	space(c: string): void {
		this.needSep = false;
		this.datas.push(c);
	}

	reset() {
		this.datas.length = 0;
	}

	toString(): string {return this.datas.join('')}

}

/**
 * Helper for building a serializer handler to IGsWriter from a IGsSerializeOptions.
 */
export function buildSerializer(writer: IGsWriter, options?: IGsSerializeOptions): IGsLogicalHandler {
	const ser = new GsSerializer(writer);
	switch (options?.method) {
	case "pretty":
		return new GsPrettyLH(options.unformat ? new GsUnformatSH(ser) : ser);
	case "indented":
		return new GsIndentLH(options, options.unformat ? new GsUnformatSH(ser) : ser);
	case "formatted":
		return new GsFormatLH(options, ser);
	default: //minified
		return options?.unformat ? new GsUnformatLH(ser) : ser;
	}
}