import {IGsEventNode, IGsEventText, IGsLogicalHandler, IGsName} from "../../api/gs.js";
import {IGsWriter} from "../../api/gsSerializer.js";

/**
 * IGsLogicalHandler for dispatching events in many IGsLogicalHandler
 */
export class GsMultiLH implements IGsLogicalHandler {

	targets: IGsLogicalHandler[];

	constructor(...targets: IGsLogicalHandler[]) {
		this.targets = targets;
	}

	startNode(node: IGsEventNode): void {
		for (let t of this.targets) t.startNode(node);
	}

	bodyMapProp(name: IGsName, isNull: boolean, holder: IGsEventNode): void {
		for (let t of this.targets) t.bodyMapProp(name, isNull, holder);
	}

	bodyText(text: IGsEventText, holder: IGsEventNode): void {
		for (let t of this.targets) t.bodyText(text, holder);
	}

	endNode(node: IGsEventNode): void {
		for (let t of this.targets) t.endNode(node);
	}

}

/**
 * IGsWriter for dispatching write commands in many IGsWriter
 */
export class GSMultiWriter implements IGsWriter {

	targets: IGsWriter[];

	constructor(...targets: IGsWriter[]) {
		this.targets = targets;
	}

	mark(c: string): void {
		for (let t of this.targets) t.mark(c);
	}

	rawChars(c: string): void {
		for (let t of this.targets) t.rawChars(c);
	}

	quotedChars(c: string, quote: "'" | '"'): void {
		for (let t of this.targets) t.quotedChars(c, quote);
	}

	boundedChars(c: string, bound: string): void {
		for (let t of this.targets) t.boundedChars(c, bound);
	}

	mixedText(c: string): void {
		for (let t of this.targets) t.mixedText(c);
	}

	space(c: string): void {
		for (let t of this.targets) t.space(c);
	}
}

