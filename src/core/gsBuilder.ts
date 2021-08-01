import {gsEscapingStr, gsEscapingText, gsEscapingValue, gsSpecialType, IGsLogicalHandler, IGsName, IGsSerializeOptions, IGsText, IGsValue, rawChars} from "../../api/gs.js";
import {IGsBuilder, IGsBuilderState} from "../../api/gsBuilder.js";
import {GsLogicalEventProducer} from "./gsLogicalHandler.js";
import {buildSerializer, GsStringWriter} from "./gsSerializer.js";

/**
 * IGsBuilder that produce events to a IGsLogicalHandler.
 *
 * @see GsBuilderToString
 */
export class GsBuilderToLH<SH extends IGsLogicalHandler> extends GsLogicalEventProducer<SH> implements IGsBuilder {

	state: IGsBuilderState = IGsBuilderState.root;

	protected stack: IGsBuilderState[] = [];

	node(name?: string, esc?: gsEscapingStr | undefined): this {
		return this.nodeSpecial(null, name, esc);
	}

	nodeSpecial(specialType: gsSpecialType | null, name?: string, esc?: gsEscapingStr | undefined): this {
		if (this.state === IGsBuilderState.inAtt) this.emptyAtt();
		switch (this.state) {
		case IGsBuilderState.inHeadNode:
		case IGsBuilderState.inTailNode:
			this.endNode();
			//!break;
		case IGsBuilderState.root:
		case IGsBuilderState.inList:
		case IGsBuilderState.inMixed:
		case IGsBuilderState.inMap: {
			this.pushState();
			const n = this.pushNode(specialType, undefined);
			setName(n, name, esc);
			this.state = IGsBuilderState.inHeadNode;
			break;
		}
		case IGsBuilderState.inProp: {
			this.pushState();
			const n = this.pushNode(specialType, this.getProp());
			setName(n, name, esc);
			this.state = IGsBuilderState.inHeadNode;
			break;
		}
		default:
			this.error(`Start node not allowed in '${STATES[this.state]}' state`);
		}
		return this;
	}

	att(name: string, esc?: gsEscapingStr | undefined): this {
		return this.attSpecial(null, name, esc);
	}

	attSpecial(specialType: gsSpecialType | null, name: string, esc?: gsEscapingStr | undefined): this {
		if (this.state === IGsBuilderState.inAtt) this.emptyAtt();
		switch (this.state) {
		case IGsBuilderState.inHeadNode: {
			this.pushState();
			const a = this.peekNode().pushAtt(specialType, false);
			setName(a, name, esc);
			this.state = IGsBuilderState.inAtt;
			break;
		}
		case IGsBuilderState.inProp:
			this.emptyProp();
			//!break;
		case IGsBuilderState.inList:
		case IGsBuilderState.inMixed:
		case IGsBuilderState.inMap: {
			this.popState();
			if (this.state as any !== IGsBuilderState.inHeadNode) this.error(`Tail attribute not allowed in a simple node`);
			this.state = IGsBuilderState.inTailNode;
			//!break;
		}
		case IGsBuilderState.inTailNode: {
			this.pushState();
			const a = this.peekNode().pushAtt(specialType, true);
			setName(a, name, esc);
			this.state = IGsBuilderState.inAtt;
			break;
		}
		default:
			this.error(`Attribute not allowed in '${STATES[this.state]}' state`);
		}
		return this;
	}

	val(value: string, esc?: gsEscapingValue | undefined, formattable?: boolean): this {
		switch (this.state) {
		case IGsBuilderState.inAtt:
			setVal(this.peekNode().lastAtt, value, esc, formattable);
			this.popState();
			break;
		default:
			this.error(`Attribute value not allowed in '${STATES[this.state]}' state`);
		}
		return this;
	}

	text(value: string, esc?: gsEscapingText | undefined, formattable?: boolean): this {
		if (this.state === IGsBuilderState.inAtt) this.emptyAtt();
		if (this.state === IGsBuilderState.inTailNode) this.endNode();
		switch (this.state) {
		case IGsBuilderState.inHeadNode: {
			const n = this.peekNode();
			n.bodyType = '"';
			setText(this.txt, value, !esc ? '"' : esc, formattable);
			this.handler.startNode(n, this.txt);
			this.state = IGsBuilderState.inTailNode;
			break;
		}
		case IGsBuilderState.inProp: {
			const n = this.pushNode('', this.getProp());
			n.bodyType = '"';
			setText(this.txt, value, esc, formattable);
			this.handler.startNode(n, this.txt);
			this.popNode(n);
			this.state = IGsBuilderState.inMap;
			break;
		}
		case IGsBuilderState.root:
		case IGsBuilderState.inList: {
			const n = this.pushNodeAnonymous('', undefined);
			n.bodyType = '"';
			setText(this.txt, value, esc, formattable);
			this.handler.startNode(n, this.txt);
			this.popNode(n);
			break;
		}
		case IGsBuilderState.inMixed: {
			const mixed = this.peekNode();
			const n = this.pushNodeAnonymous('', undefined);
			n.bodyType = '"';
			this.txt.value = value;
			this.txt.valueEsc = null;
			this.txt.valueFormattable = mixed.bodyType === "~`";
			this.handler.startNode(n, this.txt);
			this.popNode(n);
			break;
		}
		default:
			this.error(`Text node not allowed in '${STATES[this.state]}' state`);
		}
		return this;
	}

	list(children?: ($: IGsBuilder) => void): this {
		if (this.state === IGsBuilderState.inAtt) this.emptyAtt();
		switch (this.state) {
		case IGsBuilderState.inMixed:
		case IGsBuilderState.root:
		case IGsBuilderState.inList:
		case IGsBuilderState.inProp: {
			this.pushState();
			this.pushNodeAnonymous(this.state === IGsBuilderState.inMixed ? null : '', this.state === IGsBuilderState.inProp ? this.getProp() : undefined);
			this.state = IGsBuilderState.inHeadNode;
			//!break;
		}
		case IGsBuilderState.inHeadNode: {
			this.pushState();
			const n = this.peekNode();
			n.bodyType = "[";
			this.handler.startNode(n);
			this.state = IGsBuilderState.inList;
			break;
		}
		default:
			this.error(`List content not allowed in '${STATES[this.state]}' state`);
		}
		if (children) this.writeChildren(children);
		return this;
	}

	mixed(formattable?: boolean, children?: ($: IGsBuilder) => void): this {
		if (this.state === IGsBuilderState.inAtt) this.emptyAtt();
		switch (this.state) {
		case IGsBuilderState.inMixed:
		case IGsBuilderState.root:
		case IGsBuilderState.inList:
		case IGsBuilderState.inProp: {
			this.pushState();
			const n = this.pushNodeAnonymous(this.state === IGsBuilderState.inMixed ? null : '', this.state === IGsBuilderState.inProp ? this.getProp() : undefined);
			this.state = IGsBuilderState.inHeadNode;
			//!break;
		}
		case IGsBuilderState.inHeadNode:
			this.pushState();
			const n = this.peekNode();
			n.bodyType = formattable ? "~`" : "`";
			this.handler.startNode(n);
			this.state = IGsBuilderState.inMixed;
			break;
		default:
			this.error(`Mixed content not allowed in '${STATES[this.state]}' state`);
		}
		if (children) this.writeChildren(children);
		return this;
	}

	map(children?: ($: IGsBuilder) => void): this {
		if (this.state === IGsBuilderState.inAtt) this.emptyAtt();
		switch (this.state) {
		case IGsBuilderState.inMixed:
		case IGsBuilderState.root:
		case IGsBuilderState.inList:
		case IGsBuilderState.inProp: {
			this.pushState();
			const n = this.pushNodeAnonymous(this.state === IGsBuilderState.inMixed ? null : '', this.state === IGsBuilderState.inProp ? this.getProp() : undefined);
			this.state = IGsBuilderState.inHeadNode;
			//!break;
		}
		case IGsBuilderState.inHeadNode:
			this.pushState();
			const n = this.peekNode();
			n.bodyType = "{";
			this.handler.startNode(n);
			this.state = IGsBuilderState.inMap;
			break;
		default:
			this.error(`Map content not allowed in '${STATES[this.state]}' state`);
		}
		if (children) this.writeChildren(children);
		return this;
	}

	prop(name: string, esc?: gsEscapingStr | undefined): this {
		if (this.state === IGsBuilderState.inAtt) this.emptyAtt();
		switch (this.state) {
		case IGsBuilderState.inMixed:
		case IGsBuilderState.root:
		case IGsBuilderState.inList:
		case IGsBuilderState.inProp: {
			this.pushState();
			const n = this.pushNodeAnonymous(this.state === IGsBuilderState.inMixed ? null : '', this.state === IGsBuilderState.inProp ? this.getProp() : undefined);
			this.state = IGsBuilderState.inHeadNode;
			//!break;
		}
		case IGsBuilderState.inHeadNode: {
			this.pushState();
			const n = this.peekNode();
			n.bodyType = "{";
			this.handler.startNode(n);
			this.state = IGsBuilderState.inMap;
			//!break;
		}
		case IGsBuilderState.inMap :
			setName(this.getProp(), name, esc);
			this.state = IGsBuilderState.inProp;
			break;
		default:
			this.error(`Prop not allowed in '${STATES[this.state]}' state`);
		}
		return this;
	}

	end(): this {
		if (this.state === IGsBuilderState.inAtt) this.emptyAtt();
		switch (this.state) {
		case IGsBuilderState.inProp:
			this.emptyProp();
			//!break;
		case IGsBuilderState.inList:
		case IGsBuilderState.inMap:
		case IGsBuilderState.inMixed:
			this.popState();
			if (this.state as any === IGsBuilderState.inHeadNode) this.state = IGsBuilderState.inTailNode; //body node ended
			else if (this.state as any !== IGsBuilderState.inTailNode) break; //was a simple node
			//!break;
		case IGsBuilderState.inHeadNode:
		case IGsBuilderState.inTailNode:
			this.endNode();
			break;
		default:
			this.error(`End node not allowed in '${STATES[this.state]}' state`);
		}
		return this;
	}

	error(msg: string) {
		throw Error(msg);
	}

	/** Possible input states : inAtt */
	protected emptyAtt() {
		this.popState();
		const a = this.peekNode().lastAtt;
		a.value = null;
		a.valueEsc = null;
		a.valueFormattable = false;
	}

	/** Possible input states : inProp */
	protected emptyProp() {
		this.popState();
		const node = this.pushNode("", this.getProp());
		node.bodyType = "";
		this.handler.startNode(node);
		this.state = IGsBuilderState.inMap;
	}

	/** Possible input states : inHeadNode, inTailNode, inList, inMap, inMixed */
	protected endNode() {
		const n = this.peekNode();
		if (this.state === IGsBuilderState.inHeadNode) this.handler.startNode(n);
		this.popNode(n);
		this.popState();
		if (this.state === IGsBuilderState.inProp) this.state = IGsBuilderState.inMap;
	}

	protected pushState() {
		this.stack.push(this.state);
	}

	protected popState() {
		const l = this.stack.length - 1;
		this.state = this.stack[l];
		this.stack.length = l;
	}

	protected peekState(): IGsBuilderState {
		return this.stack[this.stack.length - 1];
	}

	protected writeChildren(children: ($: IGsBuilder) => void) {
		const s = this.stack.length;
		children(this);
		if (s !== this.stack.length) {
			if (s < this.stack.length) {
				this.error(`Not enough of end() calls in children: ${children}`);
			} else {
				this.error(`Too many end() calls in children: ${children}`);
			}
		}
	}

}

function setName(n: IGsName, name: string, esc?: gsEscapingStr | undefined) {
	n.name = name;
	n.nameEsc = esc === undefined ? !rawChars.test(name) ? "'" : null : esc;
}

function setVal(v: IGsValue, value: string, esc?: gsEscapingValue | undefined, formattable?: boolean) {
	v.value = value;
	if (esc === undefined) esc = !rawChars.test(value) ? "'" : null;
	v.valueEsc = formattable && esc === null ? "'" : esc;
	v.valueFormattable = formattable || false;
}

function setText(v: IGsText, value: string, esc?: gsEscapingText | undefined, formattable?: boolean) {
	v.value = value;
	if (esc === undefined) esc = !rawChars.test(value) ? '"' : null;
	v.valueEsc = formattable && esc === null ? '"' : esc;
	v.valueFormattable = formattable || false;
}

/**
 * Helper class for serializing a GS programmatically built content.
 */
export class GsBuilderToString extends GsBuilderToLH<IGsLogicalHandler> {

	protected writer = new GsStringWriter();

	constructor(options?: IGsSerializeOptions) {
		super();
		this.setHandler(buildSerializer(this.writer, options));
	}

	toString() {return this.writer.toString()}
}

/** IGsBuilderState labels. */
const STATES = ["root", "inHeadNode", "inAtt", "inList", "inMixed", "inMap", "inProp", "inTailNode"];