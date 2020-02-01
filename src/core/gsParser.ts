import {gsNodeType, gsSpecialType, IGsLogicalHandler, IGsName} from "../../api/gs.js";
import {IGsParser, IGsReader} from "../../api/gsParser.js";
import {GsEventNode, GsLogicalEventProducer} from "./gsLogicalHandler.js";

export class GsParser<H extends IGsLogicalHandler> extends GsLogicalEventProducer<H> implements IGsParser<H> {

	protected in?: IGsReader;

	parse(gs: string): this {
		this.in = typeof gs === 'string' ? new GsStringReader(gs) : gs;
		try {
			for (let c = this.in.readCodeNoSpace(); !Number.isNaN(c); c = this.in.readCodeNoSpace()) this.parseNodeLike(c);
		} finally {
			this.in = undefined;
		}
		return this;
	}

	appendHandler(handler: IGsLogicalHandler, startWithCurrentNode?: boolean): void {
		throw Error("TODO");
	}

	/**
	 * in context : <⋏>   {⋏}   [⋏]   "⋏"   |⋏""   ~⋏""   `⋏`   a⋏b   a⋏[
	 * out context : <>⋏   {}⋏   []⋏   ""⋏   |""⋏   ~""⋏   ``⋏   ab⋏   a⋏[
	 */
	protected parseNodeLike(c: number, prop?: IGsName) {
		let n: GsEventNode;
		switch (c) {
		case NODE_START:
			this.parseNode(prop);
			return;
		case BODYLIST_START:
			n = this.pushNode('', prop);
			n.bodyType = "[";
			n.name = null;
			this.handler.startNode(n);
			this.parseList();
			this.popNode(n);
			return;
		case BODYMAP_START:
			n = this.pushNode('', prop);
			n.bodyType = "{";
			n.name = null;
			this.handler.startNode(n);
			this.parseMap();
			this.popNode(n);
			return;
		}
		if (isRawChar(c)) {
			//rawChars as text node
			n = this.pushNode('', prop);
			n.bodyType = '"';
			n.name = null;
			this.txt.value = this.in.readRawChars();
			this.txt.valueEsc = false;
			this.txt.valueFormattable = false;
			this.handler.startNode(n, this.txt);
			this.popNode(n);
			return;
		}
		let formattable: boolean;
		if (c === FORMATTABLE) {
			formattable = true;
			c = this.in.readCode();
		}
		switch (c) {
		case BODYMIXED:
			n = this.pushNode('', prop);
			n.bodyType = formattable ? "~`" : "`";
			n.name = null;
			this.handler.startNode(n);
			this.parseMixed();
			this.popNode(n);
			return;
		case BODYTEXT:
			n = this.pushNode('', prop);
			n.bodyType = '"';
			n.name = null;
			this.txt.value = this.in.readQuotedChars('"');
			this.txt.valueEsc = true;
			this.txt.valueFormattable = formattable;
			this.handler.startNode(n, this.txt);
			this.popNode(n);
			return;
		case BOUND_BODYTEXT:
			n = this.pushNode('', prop);
			n.bodyType = '"';
			n.name = null;
			const str = this.in.readBoundedChars('"');
			this.txt.value = str.str;
			this.txt.valueEsc = str.esc;
			this.txt.valueFormattable = formattable;
			this.handler.startNode(n, this.txt);
			this.popNode(n);
			return;
		default:
			this.in.error("Invalid char found: " + String.fromCharCode(c));
		}
	}

	/**
	 * in context : <⋏tag>
	 * out context : <tag>⋏
	 */
	protected parseNode(prop?: IGsName) {
		let c = this.in.readCode();
		let nodeType: gsNodeType;
		switch (c) {
		case SPECIALTYPE_COMMENT:
			c = this.in.readCode();
			nodeType = "#";
			break;
		case SPECIALTYPE_INSTR:
			c = this.in.readCode();
			nodeType = "%";
			break;
		case SPECIALTYPE_META:
			c = this.in.readCode();
			nodeType = "&";
			break;
		case SPECIALTYPE_SYNTAX:
			c = this.in.readCode();
			nodeType = "?";
			break;
		default:
			nodeType = null;
		}
		const n = this.pushNode(nodeType, prop);
		if (this.fillName(c, n)) c = this.in.readCodeNoSpace();
		else if (isSpace(c)) c = this.in.readCodeNoSpace();
		c = this.fillAtts(c, n, false);
		switch (c) {
		case NODE_END:
			n.bodyType = "";
			this.handler.startNode(n);
			this.popNode(n);
			return;
		case BODYLIST_START:
			n.bodyType = "[";
			this.handler.startNode(n);
			this.parseList();
			if (this.fillAtts(this.in.readCodeNoSpace(), n, true) === NODE_END) this.popNode(n);
			else this.in.error(this.in.ended ? "Node not ended" : "Invalid character in tail node");
			return;
		case BODYMAP_START:
			n.bodyType = "{";
			this.handler.startNode(n);
			this.parseMap();
			if (this.fillAtts(this.in.readCodeNoSpace(), n, true) === NODE_END) this.popNode(n);
			else this.in.error(this.in.ended ? "Node not ended" : "Invalid character in tail node");
			return;
		}
		let formattable: boolean;
		if (c === FORMATTABLE) {
			formattable = true;
			c = this.in.readCode();
		}
		switch (c) {
		case BODYMIXED:
			n.bodyType = formattable ? "~`" : "`";
			this.handler.startNode(n);
			this.parseMixed();
			if (this.fillAtts(this.in.readCodeNoSpace(), n, true) === NODE_END) this.popNode(n);
			else this.in.error(this.in.ended ? "Node not ended" : "Invalid character in tail node");
			return;
		case BODYTEXT:
			n.bodyType = '"';
			this.txt.value = this.in.readQuotedChars('"');
			this.txt.valueEsc = true;
			this.txt.valueFormattable = formattable;
			this.handler.startNode(n, this.txt);
			if (this.fillAtts(this.in.readCodeNoSpace(), n, true) === NODE_END) this.popNode(n);
			else this.in.error(this.in.ended ? "Node not ended" : "Invalid character in tail node");
			return;
		case BOUND_BODYTEXT:
			n.bodyType = '"';
			const str = this.in.readBoundedChars('"');
			this.txt.value = str.str;
			this.txt.valueEsc = str.esc;
			this.txt.valueFormattable = formattable;
			this.handler.startNode(n, this.txt);
			if (this.fillAtts(this.in.readCodeNoSpace(), n, true) === NODE_END) this.popNode(n);
			else this.in.error(this.in.ended ? "Node not ended" : "Invalid character in tail node");
			return;
		}
	}

	protected parseList() {
		for (let c = this.in.readCodeNoSpace(); c !== BODYLIST_END; c = this.in.readCodeNoSpace()) {
			this.parseNodeLike(c);
		}
	}

	/**
	 * in context : `⋏`   ~`⋏`   `⋏a<x>`
	 * out context : ``⋏   ~``⋏   `a<x>`⋏
	 */
	protected parseMap() {
		let c = this.in.readCodeNoSpace();
		while (c !== BODYMAP_END) {
			if (isNaN(c)) {
				this.in.error("Map body not ended");
				return;
			}
			if (c === NODE_START) {
				this.parseNode();
			} else {
				const prop = this.getProp();
				if (this.fillName(c, prop)) {
					c = this.in.readCodeNoSpace();
					if (c === PROP_EQ) {
						this.parseNodeLike(this.in.readCodeNoSpace(), prop);
					} else {
						//prop without value => push a simple empty node.
						const n = this.pushNode('', prop);
						n.bodyType = '';
						n.name = null;
						this.handler.startNode(n);
						this.popNode(n);
						continue;
					}
				} else {
					this.in.error("Invalid character in body map");
				}
			}
			c = this.in.readCodeNoSpace();
		}
	}

	protected parseMixed() {
		const txtFormattable = this.peekNode().bodyType === "~`";
		const txt = this.txt;
		for (let c = this.in.readCode(); c !== BODYMIXED; c = this.in.readCode()) {
			if (isNaN(c)) {
				this.in.error("Mixed body not ended");
				return;
			}
			if (c === NODE_START) {
				this.parseNode();
			} else {
				let n = this.pushNode('', undefined);
				n.bodyType = '"';
				n.name = null;
				txt.value = this.in.readMixedText();
				txt.valueEsc = true;
				txt.valueFormattable = txtFormattable;
				this.handler.startNode(n, txt);
				this.popNode(n);
			}
		}
	}

	/**
	 * in context : a⋏b   '⋏ab'   |⋏'ab|'    >⋏
	 * out context : ab⋏   'ab'⋏   |'ab|'⋏    >⋏
	 */
	protected fillName(c: number, name: IGsName): boolean {
		if (c === QUOTE) {
			name.nameEsc = true;
			name.name = this.in.readQuotedChars("'");
			return true;
		} else if (c === BOUND_QUOTE) {
			const r = this.in.readBoundedChars("'");
			name.nameEsc = r.esc;
			name.name = r.str;
			return true;
		} else if (isRawChar(c)) {
			name.nameEsc = false;
			name.name = this.in.readRawChars();
			return true;
		} else {
			//pas de name
			name.nameEsc = false;
			name.name = "";
			return false;
		}
	}


	/**
	 * in context : a⋏=b c>   ⋏a=b~"   >⋏    "⋏
	 * out context : a=b c>⋏   a=b~⋏"   >⋏    "⋏
	 */
	protected fillAtts(c: number, n: GsEventNode, inTail: boolean): number {
		while (c !== NODE_END && c !== BODYLIST_START && c !== BODYMAP_START && c !== BODYTEXT && c !== BOUND_BODYTEXT && c !== BODYMIXED && c !== FORMATTABLE) {
			if (isNaN(c)) {
				this.in.error("node not ended");
				break;
			}
			//On est sur un att
			let type: gsSpecialType = null;
			switch (c) {
			case SPECIALTYPE_COMMENT:
				c = this.in.readCode();
				type = "#";
				break;
			case SPECIALTYPE_INSTR:
				c = this.in.readCode();
				type = "%";
				break;
			case SPECIALTYPE_META:
				c = this.in.readCode();
				type = "&";
				break;
			case SPECIALTYPE_SYNTAX:
				c = this.in.readCode();
				type = "?";
				break;
			}
			const a = n.pushAtt(type, inTail);
			if (!this.fillName(c, a)) this.in.error("not an attribute");
			c = this.in.readCodeNoSpace();
			if (c === ATT_EQ) {
				//att avec value
				c = this.in.readCodeNoSpace();
				if (c === FORMATTABLE) {
					a.valueFormattable = true;
					c = this.in.readCode();
				} else {
					a.valueFormattable = false;
				}
				if (c === QUOTE) {
					a.valueEsc = true;
					a.value = this.in.readQuotedChars("'");
				} else if (c === BOUND_QUOTE) {
					const r = this.in.readBoundedChars("'");
					a.valueEsc = r.esc;
					a.value = r.str;
				} else if (isRawChar(c)) {
					a.valueEsc = false;
					a.value = this.in.readRawChars();
				} else {
					this.in.error("no attribute value found");
				}
				c = this.in.readCodeNoSpace();
			} else {
				//att sans value
				a.value = null;
				a.valueEsc = false;
				a.valueFormattable = false;
			}
		}
		return c;
	}
}

/**
 * IGsReader for a string
 */
export class GsStringReader implements IGsReader {

	offset: number = 0;

	get ended(): boolean {return this.str.length <= this.offset};

	constructor(readonly str: string) {}

	readCode(): number {return this.str.charCodeAt(this.offset++)}

	readCodeNoSpace(): number {
		let c = this.str.charCodeAt(this.offset++);
		while (isSpace(c)) c = this.str.charCodeAt(this.offset++);
		return c;
	}

	readRawChars(): string {
		const start = this.offset - 1; //on va reprendre le car précédent
		while (isRawChar(this.str.charCodeAt(this.offset))) this.offset++;
		return this.str.substring(start, this.offset);
	}

	readQuotedChars(quote: "'" | '"'): string {
		const END = quote.charCodeAt(0);
		let start = this.offset; //on saute le quote
		let c = this.str.charCodeAt(this.offset++);
		let stack: string[];
		while (c !== END) {
			if (isNaN(c)) {
				this.error("Quoted name or value not ended");
				return;
			}
			if (c === ESCAPE) {
				if (!stack) stack = [];
				if (this.offset - 1 > start) stack.push(this.str.substring(start, this.offset - 1));
				stack.push(this.readEscaped());
				start = this.offset;
			}
			c = this.str.charCodeAt(this.offset++);
		}
		if (stack) {
			if (this.offset - 1 > start) stack.push(this.str.substring(start, this.offset - 1));
			return stack.join('');
		}
		return this.offset - 1 > start ? this.str.substring(start, this.offset - 1) : "";
	}

	readBoundedChars(quote: "'" | '"'): { str: string, esc: string } {
		const startBound = this.offset - 1;
		const endBound = this.str.indexOf(quote, this.offset);
		if (endBound < 0) {
			this.error("String bound end not ended");
			return;
		}
		const bound = this.str.substring(startBound, endBound + 1);
		boundedResult.esc = this.str.substring(startBound + 1, endBound);
		const startCloseBound = this.str.indexOf(bound, endBound + 1);
		if (startCloseBound < 0) {
			this.error("Bounded string not ended");
			return;
		}
		boundedResult.str = this.str.substring(startBound + bound.length, startCloseBound);
		this.offset = startCloseBound + bound.length;
		return boundedResult;
	}

	readMixedText(): string {
		let start = --this.offset; //on reprend le char courant
		let c = this.str.charCodeAt(this.offset++);
		let stack: string[];
		while (c !== NODE_START && c !== BODYMIXED) {
			if (isNaN(c)) {
				this.error("Mixed text not ended");
				return;
			}
			if (c === ESCAPE) {
				if (!stack) stack = [];
				if (this.offset - 1 > start) stack.push(this.str.substring(start, this.offset - 1));
				stack.push(this.readEscaped());
				start = this.offset;
			}
			c = this.str.charCodeAt(this.offset++);
		}
		this.offset--; //on se replace avant le car qui n'est pas un text (`ou <)
		if (stack) {
			if (this.offset > start) stack.push(this.str.substring(start, this.offset));
			return stack.join('');
		}
		return this.offset > start ? this.str.substring(start, this.offset) : "";
	}

	/**
	 * contexte char entrant : ESCAPE &
	 * contexte char sortant : char suivant l'échappement
	 */
	protected readEscaped(): string {
		//\'"`<bfnrt u
		let c = this.str.charCodeAt(this.offset++);
		if (isNaN(c)) this.error("invalid escape sequence");
		switch (c) {
		case 92:
			return '\\';
		case 39:
			return '\'';
		case 34:
			return '"';
		case 96:
			return '`';
		case 60:
			return '<';
		case 116:
			return '\t';
		case 110:
			return '\n';
		case 114:
			return '\r';
		case 98:
			return '\b';
		case 102:
			return '\f';
		case 117: // \uFFFFFF
			const v = this.str.substr(this.offset, 6);
			this.offset += v.length;
			try {
				return String.fromCodePoint(Number.parseInt(v, 16));
			} catch (e) {
				this.error(e.toString());
			}
		}
		this.error("Unknown escaped character: " + c);
	}

	error(msg: string) {
		throw Error(`${msg} [${this.offset}]`)
	}
}

const boundedResult = {
	str: "",
	esc: ""
};

/** minusucle || majuscule || -./0-9: || _ */
function isRawChar(c: number) {
	return c >= 97 && c <= 122 || c >= 65 && c <= 90 || c >= 45 && c <= 58 || c === 95;
}

/** espace ' ', tab \t, \n, \r */
function isSpace(c: number) {
	return c === 32 || c === 9 || c === 10 || c === 13;
}

const NODE_START = '<'.charCodeAt(0);
const SPECIALTYPE_SYNTAX = '?'.charCodeAt(0);
const SPECIALTYPE_COMMENT = '#'.charCodeAt(0);
const SPECIALTYPE_META = '&'.charCodeAt(0);
const SPECIALTYPE_INSTR = '%'.charCodeAt(0);

const NODE_END = '>'.charCodeAt(0);

const QUOTE = '\''.charCodeAt(0);
const BOUND_QUOTE = '|'.charCodeAt(0);

const ESCAPE = '\\'.charCodeAt(0);
const FORMATTABLE = '~'.charCodeAt(0);

const BODYTEXT = '"'.charCodeAt(0);
const BOUND_BODYTEXT = '!'.charCodeAt(0);

const BODYLIST_START = '['.charCodeAt(0);
const BODYLIST_END = ']'.charCodeAt(0);

const BODYMAP_START = '{'.charCodeAt(0);
const BODYMAP_END = '}'.charCodeAt(0);
const PROP_EQ = '='.charCodeAt(0);

const BODYMIXED = '`'.charCodeAt(0);

const ATT_EQ = '='.charCodeAt(0);