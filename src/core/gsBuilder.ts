import {gsEscaping, gsSpecialNodeType} from "../../api/gs.js";
import {IGsBuilder, IGsBuilderState} from "../../api/gsBuilder.js";
import {IGsWriter} from "../../api/gsSerializer.js";
import {GsStringWriter, writeNameValue, writeText} from "./gsSerializer.js";


/**
 * IGsBuilder serializer
 * TODO to replace by new GsBuilder(new GsSerializer(out)) when GsBuilder will be implemented
 */
export class GsSerializerBd<OUT extends IGsWriter> implements IGsBuilder {

	state: IGsBuilderState = IGsBuilderState.root;

	protected stack: IGsBuilderState[] = [];

	constructor(readonly out?: OUT) {
		this.out = out || new GsStringWriter() as any;
	}

	node(name?: string, esc?: gsEscaping): this {
		if (this.state === IGsBuilderState.inAtt) this.popState();
		switch (this.state) {
		case IGsBuilderState.inHeadNode:
		case IGsBuilderState.inTailNode:
			this.endNode();
			//!break;
		case IGsBuilderState.root:
		case IGsBuilderState.inList:
		case IGsBuilderState.inMixed:
		case IGsBuilderState.inMap:
		case IGsBuilderState.inProp:
			this.pushState(this.state);
			this.out.mark("<");
			if (name) writeNameValue(this.out, name, esc);
			this.state = IGsBuilderState.inHeadNode;
			break;
		default:
			this.error(`Start node not allowed in '${STATES[this.state]}' state`);
		}
		return this;
	}

	nodeSpecial(specialType: gsSpecialNodeType, name?: string, esc?: gsEscaping): this {
		if (this.state === IGsBuilderState.inAtt) this.popState();
		switch (this.state) {
		case IGsBuilderState.inHeadNode:
		case IGsBuilderState.inTailNode:
			this.endNode();
			//!break;
		case IGsBuilderState.root:
		case IGsBuilderState.inList:
		case IGsBuilderState.inMixed:
		case IGsBuilderState.inMap:
		case IGsBuilderState.inProp:
			this.pushState(this.state);
			this.out.mark("<");
			this.out.mark(specialType);
			if (name) writeNameValue(this.out, name, esc);
			this.state = IGsBuilderState.inHeadNode;
			break;
		default:
			this.error(`Start node not allowed in '${STATES[this.state]}' state`);
		}
		return this;
	}

	att(name: string, esc?: gsEscaping): this {
		switch (this.state) {
		case IGsBuilderState.inHeadNode:
		case IGsBuilderState.inTailNode:
			this.pushState(this.state);
			this.state = IGsBuilderState.inAtt;
			//!break;
		case IGsBuilderState.inAtt:
			writeNameValue(this.out, name, esc);
			break;
		default:
			this.error(`Attribute not allowed in '${STATES[this.state]}' state`);
		}
		return this;
	}

	val(value: string, esc?: gsEscaping, formattable?: boolean): this {
		switch (this.state) {
		case IGsBuilderState.inAtt:
			if (formattable) this.out.mark('=~');
			else this.out.mark('=');
			writeNameValue(this.out, value, formattable && (esc === false || esc == null) ? true : esc);
			this.popState();
			break;
		default:
			this.error(`Attribute value not allowed in '${STATES[this.state]}' state`);
		}
		return this;
	}

	text(value: string, esc?: gsEscaping, formattable?: boolean): this {
		if (this.state === IGsBuilderState.inAtt) this.popState();
		if (this.state === IGsBuilderState.inTailNode) this.endNode();
		switch (this.state) {
		case IGsBuilderState.inHeadNode:
			writeText(this.out, value, esc === false ? true : esc, formattable);
			this.state = IGsBuilderState.inTailNode;
			break;
		case IGsBuilderState.root:
		case IGsBuilderState.inList:
			writeText(this.out, value, esc, formattable);
			break;
		case IGsBuilderState.inProp:
			writeText(this.out, value, esc, formattable);
			this.state = IGsBuilderState.inMap;
			break;
		case IGsBuilderState.inMixed:
			this.out.mixedText(value);
			break;
		default:
			this.error(`Text node not allowed in '${STATES[this.state]}' state`);
		}
		return this;
	}

	list(children?: ($: IGsBuilder) => void): this {
		if (this.state === IGsBuilderState.inAtt) this.popState();
		switch (this.state) {
		case IGsBuilderState.inMixed:
			this.pushState(this.state);
			this.out.mark('<');
			this.state = IGsBuilderState.inHeadNode;
			//!break;
		case IGsBuilderState.root:
		case IGsBuilderState.inList:
		case IGsBuilderState.inProp:
		case IGsBuilderState.inHeadNode:
			this.pushState(this.state);
			this.out.mark('[');
			this.state = IGsBuilderState.inList;
			break;
		default:
			this.error(`List content not allowed in '${STATES[this.state]}' state`);
		}
		if (children) this.writeChildren(children);
		return this;
	}

	mixed(formattable?: boolean, children?: ($: IGsBuilder) => void): this {
		if (this.state === IGsBuilderState.inAtt) this.popState();
		switch (this.state) {
		case IGsBuilderState.inMixed:
			this.pushState(this.state);
			this.out.mark('<');
			this.state = IGsBuilderState.inHeadNode;
			//!break;
		case IGsBuilderState.root:
		case IGsBuilderState.inList:
		case IGsBuilderState.inProp:
		case IGsBuilderState.inHeadNode:
			this.pushState(this.state);
			this.out.mark('`');
			this.state = IGsBuilderState.inMixed;
			break;
		default:
			this.error(`Mixed content not allowed in '${STATES[this.state]}' state`);
		}
		if (children) this.writeChildren(children);
		return this;
	}

	map(children?: ($: IGsBuilder) => void): this {
		if (this.state === IGsBuilderState.inAtt) this.popState();
		switch (this.state) {
		case IGsBuilderState.inMixed:
			this.pushState(this.state);
			this.out.mark('<');
			this.state = IGsBuilderState.inHeadNode;
			//!break;
		case IGsBuilderState.root:
		case IGsBuilderState.inList:
		case IGsBuilderState.inProp:
		case IGsBuilderState.inHeadNode:
			this.pushState(this.state);
			this.out.mark('{');
			this.state = IGsBuilderState.inMap;
			break;
		default:
			this.error(`Map content not allowed in '${STATES[this.state]}' state`);
		}
		if (children) this.writeChildren(children);
		return this;
	}

	prop(name: string, esc?: gsEscaping): this {
		if (this.state === IGsBuilderState.inAtt) this.popState();
		switch (this.state) {
		case IGsBuilderState.inMixed:
			this.pushState(this.state);
			this.out.mark('<');
			this.state = IGsBuilderState.inHeadNode;
		case IGsBuilderState.root:
		case IGsBuilderState.inList:
		case IGsBuilderState.inProp:
			this.pushState(this.state);
			//!break;
		case IGsBuilderState.inHeadNode:
			this.out.mark('{');
			//!break;
		case IGsBuilderState.inMap :
			writeNameValue(this.out, name, esc);
			this.out.mark('=');
			this.state = IGsBuilderState.inProp;
			break;
		default:
			this.error(`Prop not allowed in '${STATES[this.state]}' state`);
		}
		return this;
	}

	end(): this {
		if (this.state === IGsBuilderState.inAtt) this.popState();
		switch (this.state) {
		case IGsBuilderState.inList:
			this.out.mark(']');
			this.popState();
			this.endNode();
			break;
		case IGsBuilderState.inMap:
		case IGsBuilderState.inProp:
			this.out.mark('}');
			this.popState();
			this.endNode();
			break;
		case IGsBuilderState.inMixed:
			this.out.mark('`');
			this.popState();
			this.endNode();
			break;
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

	protected endNode() {
		if (this.state === IGsBuilderState.inTailNode || this.state === IGsBuilderState.inHeadNode) {
			this.out.mark(">");
			this.popState();
		}
		if (this.state === IGsBuilderState.inProp) this.state = IGsBuilderState.inMap;
	}

	protected pushState(st: IGsBuilderState) {
		this.stack.push(st);
	}

	protected popState() {
		const l = this.stack.length - 1;
		this.state = this.stack[l];
		this.stack.length = l;
	}

	protected writeChildren(children?: ($: IGsBuilder) => void) {
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

const STATES = ["root", "inHeadNode", "inAtt", "inList", "inMixed", "inMap", "inProp", "inTailNode"];