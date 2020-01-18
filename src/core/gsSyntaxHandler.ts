import {gsSpecialType, IGsEventNode, IGsEventText, IGsLogicalHandler, IGsName, IGsSyntaxHandler, IGsValue} from "../../api/gs.js";

/** Base class for transform IGsLogicalHandler events to IGsSyntaxHandler. */
export abstract class GsLH2SH<SH extends IGsSyntaxHandler> implements IGsLogicalHandler {

	constructor(public handler: SH) {}

	startNode(node: IGsEventNode): void {
		if (node.nodeType !== '') {
			this.handler.headNode(node, node.nodeType);
			if (!node.name && node.firstAtt) this.handler.whiteSpaces(' ');
			for (let att = node.firstAtt; att; att = att.next) this.handler.attribute(att, att, att.attType);
		}
		switch (node.bodyType) {
		case "[":
		case "{":
		case "`":
		case "~`":
			this.handler.startBody(node.bodyType);
			break;
		}
	}

	bodyMapProp(name: IGsName, isNull: boolean, holder: IGsEventNode): void {
		this.handler.property(name, isNull);
	}

	bodyText(text: IGsEventText, holder: IGsEventNode): void {
		this.handler.text(text, holder.nodeType === '' && holder.parent?.isBodyMixed);
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
			for (let att = node.firstTailAtt; att; att = att.next) this.handler.attribute(att, att, att.attType);
			this.handler.tailNode();
		}
	}
}

/** Base class for chaining IGsSyntaxHandler. */
export abstract class GsChainedSH<SH extends IGsSyntaxHandler> implements IGsSyntaxHandler {

	constructor(public handler: SH) {}

	headNode(name: IGsName, specialType?: gsSpecialType): void {
		this.handler.headNode(name, specialType);
	}

	attribute(name: IGsName, value: IGsValue, specialType?: gsSpecialType | null, spBeforeEq?: string, spAfterEq?: string): void {
		this.handler.attribute(name, value, specialType, spBeforeEq, spAfterEq);
	}

	text(text: IGsEventText, inBodyMixed?: boolean): void {
		this.handler.text(text, inBodyMixed);
	}

	startBody(bodyType: "[" | "{" | "`" | "~`"): void {
		this.handler.startBody(bodyType);
	}

	property(name: IGsName, isNull: boolean, spBeforeEq?: string): void {
		this.handler.property(name, isNull, spBeforeEq);
	}

	endBody(bodyType: "[" | "{" | "`" | "~`"): void {
		this.handler.endBody(bodyType);
	}

	tailNode(): void {
		this.handler.tailNode();
	}

	whiteSpaces(spaces: string): void {
		this.handler.whiteSpaces(spaces);
	}
}