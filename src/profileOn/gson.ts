import {IGsEventNode, IGsEventText, IGsLogicalHandler, IGsName, IGsSerializeOptions, IGsValue, rawChars} from "../../api/gs.js";
import {IGsWriter} from "../../api/gsSerializer.js";
import {GsEventNode, GsLogicalEventProducer} from "../core/gsLogicalHandler.js";
import {GsParser} from "../core/gsParser.js";
import {buildSerializer, GsStringWriter} from "../core/gsSerializer.js";


export const GSON = {
	parse(gson: string): json {
		return new GsParser(new GsToJsonLH()).parse(gson).handler.result;
	},

	stringify(object: any, options?: IGsonStringifyOptions): string {
		const writer = options?.writer || new GsStringWriter();
		new GsFromJson(buildSerializer(writer, options?.serialize)).build(object);
		return writer.toString();
	},
};

export interface IGsonStringifyOptions {
	serialize: IGsSerializeOptions
	writer?: IGsWriter
}


export class GsFromJson<H extends IGsLogicalHandler> extends GsLogicalEventProducer<H> {

	build(json: any): this {
		this.push(this.objToJson(json));
		return this;
	}

	/**
	 * Rules for non primitives objects and edge cases unknown by Json
	 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify
	 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt#Use_within_JSON
	 */
	objToJson(obj: any, asProp?: boolean): json {
		switch (typeof obj) {
		case "object":
			if (obj === null) return null;
			if (typeof obj.toJSON === "function") return obj.toJSON(obj);
			if (obj instanceof Boolean || obj instanceof Number || obj instanceof String) return obj.valueOf();
			if (obj instanceof Date) return obj.toISOString();
			return obj;
		case "number":
			if (isNaN(obj) || obj === Infinity || obj === -Infinity) return null;
			return obj;
		case "function":
		case "undefined":
		case "symbol":
			return asProp ? undefined : null;
		case "bigint":
			if (typeof (obj as any).toJSON === "function") return (obj as any).toJSON(obj);
			throw TypeError("bigint not allowed in json");
		}
		return obj;
	}

	protected push(json: json, prop?: IGsName) {
		let node: GsEventNode;
		switch (typeof json) {
		case "object":
			if (json === null) {
				node = this.pushNode('', prop);
				node.bodyType = '"';
				this.handler.startNode(node);
				this.txt.value = "null";
				this.txt.valueEsc = false;
				this.handler.bodyText(this.txt, node);
				this.popNode(node);
			} else if (Array.isArray(json)) {
				node = this.pushNode('', prop);
				node.bodyType = '[';
				this.handler.startNode(node);
				for (let i = 0; i < json.length; i++) this.push(this.objToJson(json[i]));
				this.popNode(node);
			} else {
				node = this.pushNode('', prop);
				node.bodyType = '{';
				this.handler.startNode(node);
				const p = this.getProp();
				for (let key in json) {
					const v = this.objToJson(json[key], true);
					if (v === undefined) continue;
					p.name = key;
					p.nameEsc = !rawChars.test(key);
					if (v === null) {
						this.handler.bodyMapProp(p, true, node);
					} else {
						this.handler.bodyMapProp(p, false, node);
						this.push(v, p);
					}
				}
				this.popNode(node);
			}
			break;
		case "string":
			node = this.pushNode('', prop);
			node.bodyType = '"';
			this.handler.startNode(node);
			this.txt.value = json as string;
			this.txt.valueEsc = true;
			this.handler.bodyText(this.txt, node);
			this.popNode(node);
			break;
		case "number":
		case "bigint":
		case "boolean":
			node = this.pushNode('', prop);
			node.bodyType = '"';
			this.handler.startNode(node);
			this.txt.value = json.toString();
			this.txt.valueEsc = false;
			this.handler.bodyText(this.txt, node);
			this.popNode(node);
			break;
		}
	}
}

export type json = string | number | boolean | null | { [p: string]: json } | json[];


export class GsToJsonLH implements IGsLogicalHandler {

	/** Json result. */
	result: json = undefined;

	protected ancestors: json[] = [];

	reset(): this {
		this.result = undefined;
		this.ancestors.length = 0;
		return this;
	}

	startNode(node: IGsEventNode): void {
		let v: json;
		if (!node.nodeType) {
			//build the json
			switch (node.bodyType) {
			case "{":
				v = {};
				for (let att = node.firstAtt; att; att = att.next) {
					if (!att.attType) v[att.name] = this.toJsonVal(att);
				}
				break;
			case "[":
			case "`":
			case "~`":
				v = [];
				break;
			default: //text or empty body node
				return;
			}
		}
		//attach it
		if (v !== undefined) this.attach(v, node);
		this.ancestors.push(v);
		this.result = v;
	}

	bodyMapProp(name: IGsName, isNull: boolean, holder: IGsEventNode): void {
		if (!this.result) return; //node in specialType context
		if (isNull) (this.result as any)[name.name] = null;
	}

	bodyText(text: IGsEventText, holder: IGsEventNode): void {
		this.attach(this.toJsonVal(text), holder);
	}

	endNode(node: IGsEventNode): void {
		if (!node.nodeType && (node.bodyType === '"' || node.bodyType === "")) return; //text or empty body node
		const last = --this.ancestors.length - 1;
		if (last >= 0) this.result = this.ancestors[last];
	}

	protected attach(v: json, holder: IGsEventNode) {
		if (this.ancestors.length === 0) {
			//we are at root
			if (this.result === undefined) {
				this.result = v;
			} else {
				//it's a second objet at root, auto-wrap in an array
				this.result = [this.result, v];
				this.ancestors.push(this.result);
			}
			return;
		}
		if (this.result) {
			if (holder.holderProp) {
				(this.result as any)[holder.holderProp.name] = v;
			} else {
				(this.result as json[]).push(v);
			}
		}
	}

	protected toJsonVal(v: IGsValue): string | boolean | number | null {
		if (v.valueEsc !== false) return v.value;
		switch (v.value) {
		case 'null':
			return null;
		case 'true':
			return true;
		case 'false':
			return false;
		default:
			return parseFloat(v.value);
		}
	}
}