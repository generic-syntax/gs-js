import {gsEscaping, gsEventBodyType, gsNodeType, gsSpecialType, IGsEventAtt, IGsEventNode, IGsLogicalHandler, IGsName, IGsValue} from "../../api/gs.js";

/**
 * Base class for events generator pushed to a IGsLogicalHandler
 */
export abstract class GsLogicalEventProducer<SH extends IGsLogicalHandler> {

	/** Events target */
	handler: SH;

	/** Stack of nodes used as argument in the IGsLogicalHandler calls. */
	protected nodes: GsEventNode[] = [new GsEventNode(null)];
	protected depth: number = -1;

	/** Singleton for IGsLogicalHandler.bodyText() */
	protected txt: IGsValue = {
		value: "",
		valueEsc: false,
		valueFormattable: false
	};

	/** Shared IGsName instances for IGsEventNode.holderProp, one per depth */
	protected props: IGsName[] = [];


	constructor(handler?: SH) {
		if (handler) this.setHandler(handler);
	}

	setHandler(handler: SH | null): this {
		this.handler = handler;
		return this;
	}

	protected pushNode(nodeType: gsNodeType, prop: IGsName | undefined): GsEventNode {
		let n = this.nodes[++this.depth];
		if (!n) n = this.nodes[this.depth] = new GsEventNode(this.nodes[this.depth - 1]);
		n.reset(nodeType, prop);
		return n;
	}

	protected pushNodeAnonymous(nodeType: gsNodeType, prop: IGsName | undefined): GsEventNode {
		const n = this.pushNode(nodeType, prop);
		n.name = null;
		n.nameEsc = false;
		return n;
	}

	protected pushNodeFrom(node: IGsEventNode): GsEventNode {
		const n = this.pushNode(node.nodeType, node.holderProp);
		n.name = node.name;
		n.nameEsc = node.nameEsc;
		n.bodyType = node.bodyType;
		return n;
	}

	protected popNode(n: GsEventNode) {
		this.handler.endNode(n);
		this.depth--;
	}

	protected peekNode(): GsEventNode {return this.nodes[this.depth]}

	protected getProp() {
		let p = this.props[this.depth];
		if (p) return p;
		return this.props[this.depth] = {
			name: "",
			nameEsc: false
		} as IGsName
	}
}

/**
 * Partial node definition used in IGsLogicalHandler
 */
export class GsEventNode implements IGsEventNode {
	readonly parent: IGsEventNode | null;
	readonly depth: number;
	holderProp: IGsName | undefined = undefined;

	nodeType: gsNodeType = '';
	name: string = '';
	nameEsc: gsEscaping = false;

	_firstAtt: GsEventAtt | null = null;
	get firstAtt(): null | GsEventAtt {return this._firstAtt && this._firstAtt.name !== null ? this._firstAtt : null};

	bodyType: gsEventBodyType = '';

	get isBodyMixed() {return this.bodyType === '`' || this.bodyType === '~`'}

	firstTailAtt: GsEventAtt | null = null;

	lastAtt: GsEventAtt | null = null;

	constructor(parent: IGsEventNode) {
		this.parent = parent;
		this.depth = parent ? parent.depth + 1 : 0;
	}

	getAttribute(key: string | number, after?: IGsEventAtt): IGsEventAtt | null {
		let a = after ? after.next : this.firstAtt;
		if (typeof key === 'number') {
			while (a) {
				if (a.offset === key) return a;
				a = a.next;
			}
		} else while (a) {
			if (a.name === key) return a;
			a = a.next;
		}
		return null;
	}

	getAttr(key: string | number): string | null {
		const a = this.getAttribute(key);
		return a ? a.value : null;
	}

	reset(nodeType: gsNodeType, prop: IGsName | undefined) {
		this.nodeType = nodeType;
		this.holderProp = prop;
		if (this.firstAtt) this.firstAtt.name = null;
		if (this.firstTailAtt) this.firstTailAtt = null;
		this.lastAtt = null;
	}

	pushAtt(type: gsSpecialType | null, inTail: boolean): GsEventAtt {
		let next = this.lastAtt ? this.lastAtt._next : this._firstAtt;
		if (next) {
			if (next.next) next.next.name = null; //invalid next att
		} else {
			next = this.lastAtt ? new GsEventAtt(this.lastAtt) : (this._firstAtt = new GsEventAtt(null));
		}
		next.attType = type;
		next.inTail = inTail;
		if (inTail && !this.firstTailAtt) this.firstTailAtt = next;
		this.lastAtt = next;
		return next;
	}

	pushAttFrom(att: IGsEventAtt): GsEventAtt {
		const a = this.pushAtt(att.attType, att.inTail);
		a.name = att.name;
		a.nameEsc = att.nameEsc;
		a.value = att.value;
		a.valueEsc = att.valueEsc;
		a.valueFormattable = att.valueFormattable;
		return a;
	}
}


/**
 * Attribute definition used in IGsLogicalHandler
 */
export class GsEventAtt implements IGsEventAtt {
	attType: gsSpecialType | null;
	name: string | null;
	nameEsc: gsEscaping = false;
	value: string | null = null;
	valueEsc: gsEscaping = false;
	valueFormattable: boolean = false;

	inTail: boolean = false;

	readonly offset: number;
	_next: GsEventAtt | null;

	/** return next att if it is valid. */
	get next(): null | GsEventAtt {return this._next && this._next.name !== null ? this._next : null};

	constructor(previous: GsEventAtt | null) {
		if (previous) {
			this.offset = previous.offset + 1;
			previous._next = this;
		} else {
			this.offset = 0;
			this._next = null;
		}
	}
}