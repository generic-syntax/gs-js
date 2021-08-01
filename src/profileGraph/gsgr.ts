import {IGsEventNode, IGsLogicalHandler, IGsSerializeOptions, IGsText, IGsValue} from "../../api/gs.js";
import {GsParser} from "../core/gsParser.js";
import {GsStringWriter} from "../core/gsSerializer.js";


export const GSGR = {
	parse(gsom: string, config?: GsgrConfig, identifiedObjects?: Map<string, any>): Promise<IGsgrResult> {
		return new GsParser(new GsgrLH(config || new GsgrConfig(), identifiedObjects)).parse(gsom).handler.getResult();
	},

	stringify(object: any, options?: IGsSerializeOptions): string {
		const writer = new GsStringWriter();
		//new GsgrXxxx(buildSerializer(writer, options?.serialize)).build(object);
		return writer.toString();
	}
};

/**
 *
 */
export class GsgrConfig {

	/**
	 *
	 */
	addClass(cls: new () => any, name?: string, allowMethods?: Set<string> | string[], forbidFields?: Set<string> | string[]): this {
		if (allowMethods && Array.isArray(allowMethods)) allowMethods = new Set(allowMethods);
		if (forbidFields && Array.isArray(forbidFields)) forbidFields = new Set(forbidFields);
		if (name == null) name = cls.name;
		this.typesByName.set(name, new GsgrClassType(cls, name, allowMethods as Set<string>, forbidFields as Set<string>));
		return this;
	}

	addClasses(...classes: (new () => any)[]): this {
		for (let cls of classes) this.addClass(cls);
		return this;
	}

	addByName(name: string, gsgrType: IGsgrType<any>): this {
		this.typesByName.set(name, gsgrType);
		return this;
	}

	/**
	 *
	 */
	typesByName: Map<string, IGsgrType<any>> = new Map();

	/**
	 *
	 */
	typesByMatcher: IGsgrMatcher[] = null;

	/**
	 * Type used for simple node, ie without nodes '<' and '>' markers.
	 * The default implementation instantiate generic object {} for map body type
	 * and array [] for list (or mixin) body type.
	 */
	simpleType: IGsgrType<any> = simpleType;

	/**
	 * Transform text body node as object.
	 * Also used by default anonymousType for attribute values mapping to object.
	 *
	 * The default implementation transform with the same rules as Json/Gson
	 * primitives (string, boolean, null, numbers) plus for raw values (without delimiters):
	 * - 'undefined' js value
	 * - BiInt with 'n' suffix
	 * - 'T' 'F' 'N' 'U' shortcuts for true, false, null and undefined.
	 */
	stringToValue: (v: IGsValue) => any = stringToValue;

}


export interface IGsgrType<T> {
	/**
	 * Build a new object with the name and the head attributes.
	 */
	create(node: IGsEventNode, context: IGsgrContext): T | IGsgrPromise<T>

	/**
	 * Set a child object.
	 *
	 * @param key undefined if this value is declared in a list, ie instance is an array like.
	 */
	set(instance: T, key: string | undefined, value: any | IGsgrPromise<any>, context: IGsgrContext): void | IGsgrPromise<void>

	/**
	 * call a method on this instance.
	 */
	call<R>(instance: T, key: string, args: Array<any | IGsgrPromise<any>>, context: IGsgrContext): R | IGsgrPromise<R>
}

export interface IGsgrMatcher {
	match(node: IGsEventNode, context: IGsgrContext): IGsgrType<any>
}

export interface IGsgrContext {
	config: GsgrConfig
	rootObjects: Array<any | IGsgrPromise<any>>
	identifiedObjects: Map<string, any | IGsgrPromise<any>>

	//callOnFulfilled(node: IGsEventNode, cb: () => void): void
}

export interface IGsgrResult {
	rootObjects: Array<any>
	identifiedObjects: Map<string, any>
}

/**
 *
 */
export class GsgrLH implements IGsLogicalHandler, IGsgrContext, IGsgrResult {

	config: GsgrConfig;

	rootObjects: Array<any | IGsgrPromise<any>> = [];
	identifiedObjects: Map<string, any | IGsgrPromise<any>>;

	currentType: IGsgrType<any> = null;
	currentInst: any | IGsgrPromise<any> = null;

	protected stackType: IGsgrType<any>[] = [];
	protected stackInst: (any | IGsgrPromise<any>)[] = [];

	protected result: Promise<IGsgrResult>;

	protected stackNodeWaiters: NodeTasks[] = [];

	constructor(config: GsgrConfig, identifiedObjects?: Map<string, any>) {
		this.config = config;
		this.identifiedObjects = identifiedObjects || new Map();
	}

	getResult(): Promise<IGsgrResult> {
		if (!this.result) {
			this.result = (async () => {
				const nodeTasks = this.getNodeTasks();
				if (nodeTasks) await Promise.all(nodeTasks.tasks);
				return this;
			})();
		}
		return this.result;
	}

	startNode(node: IGsEventNode, bodyText?: IGsText): void {
		let v: any;
		let t: IGsgrType<any>;
		let attach: boolean;
		if (node.nodeType === null) {
			// standard node <...>
			t = this.config.typesByName.get(node.name);
			if (t == null) {
				if (this.config.typesByMatcher) for (let m of this.config.typesByMatcher) {
					t = m.match(node, this);
					if (t != null) break;
				}
			}
			if (t == null) throw Error("Gsgr type not found for: " + node.toPath());
			v = t.create(node, this);
			attach = true;
			if (isGsgrPromise(v)) this.addTask(v);
		} else if (node.nodeType === "") {
			// simple node
			if (node.bodyType === '"') {
				//string value => primitive datas
				this.attach(this.config.stringToValue(bodyText), node);
				return;
			} else if (node.bodyType === '') {
				//null value
				this.attach(null, node);
				return;
			}
			//simple object or array
			t = this.config.simpleType;
			v = t.create(node, this);
			attach = true;
			//if(isGsgrPromise(v)) this.addWaiter(v); should never happen
		} else if (node.nodeType === "%") {
			//processing nodes
			if (node.name === "ref") {
				v = this.getOrCreateRef(bodyText.value);
				attach = true;
			} else if (node.name === "call") {
				t = ArgType.SINGLETON;
				v = []; //arguments
				attach = false;
			} else if (node.name === "with") {
				console.trace(":::TODO %with");
				// NEED to retrieve the type t => tuple (v,t) in this.identifiedObjects ?
				// v = this.getOrCreateRef(node.getAttr("ref"));
				// attach = false;
			} else if (node.name === "wait") {
				console.trace(":::TODO %wait");
			}
		}
		//attach it
		if (attach) this.attach(v, node);
		this.stackInst.push(v);
		this.stackType.push(t);
		this.currentInst = v;
		this.currentType = t;
	}

	endNode(node: IGsEventNode): void {
		if (node.nodeType === "" && node.bodyType === '"') return; //simple string node
		const last = --this.stackInst.length - 1;
		this.stackType.length--;
		if (last >= 0) {
			if (node.nodeType === "%" && node.name === "call") {
				this.addTask(this.stackType[last].call(this.stackInst[last], node.holderProp.name, this.currentInst as any[], this));
			}
			this.currentInst = this.stackInst[last];
			this.currentType = this.stackType[last];
		}
	}

	protected attach(v: any, holder: IGsEventNode) {
		const gsgrId = holder.getAttr("id", "%");
		if (gsgrId != null) {
			const old = this.identifiedObjects.get(gsgrId);
			this.identifiedObjects.set(gsgrId, v);
			if (old !== undefined) {
				if (isRefPromise(old)) {
					old.gsRefResolved(v);
				} else {
					throw Error("Gs-graph Id declared twice: " + gsgrId);
				}
			} else if (isGsgrPromise(v)) {
				this.addTask(v.then((r) => {this.identifiedObjects.set(gsgrId, r)}), v);
			}
		}
		if (this.stackInst.length === 0) {
			//we are at root
			if (isGsgrPromise(v)) {
				const idx = this.rootObjects.length;
				this.rootObjects.push(v);
				this.addTask(v.then((r) => {this.rootObjects[idx] = r}), v);
			} else {
				this.rootObjects.push(v);
			}
			return;
		}
		if (this.currentInst) {
			const key = holder.holderProp?.name;
			if (isGsgrPromise(this.currentInst)) {
				const type = this.currentType;
				this.addTask(this.currentInst.then((r) => {type.set(r, key, v, this)}), this.currentInst);
			} else {
				this.currentType.set(this.currentInst, key, v, this);
			}
		}
	}

	getOrCreateRef(id: string): any | IGsgrPromise<any> {
		let v = this.identifiedObjects.get(id);
		if (v === undefined) {
			//ref not already parsed.
			v = newRefPromise();
			this.identifiedObjects.set(id, v);
		}
		return v;
	}

	//callOnFulfilled(node: IGsEventNode, cb: () => void): void {}

	protected addTask(pr: Promise<any>, ancestor?: Promise<any>): void {
		const nodeTasks = this.getNodeTasks() || this.pushNodeTasks(new NodeTasks());
		if (ancestor) nodeTasks.tasks.delete(ancestor);
		nodeTasks.tasks.add(pr);
	}

	protected getNodeTasks(): NodeTasks {
		return this.stackNodeWaiters[this.stackNodeWaiters.length - 1];
	}

	protected pushNodeTasks(nodeWaiters: NodeTasks): NodeTasks {
		this.stackNodeWaiters.push(nodeWaiters);
		return nodeWaiters;
	}
}


export abstract class GsgrTypeBase<T> implements IGsgrType<T> {

	abstract create(node: IGsEventNode, context: IGsgrContext): T;

	set(instance: T, key: string | undefined, value: any | IGsgrPromise<any>, context: IGsgrContext): void | IGsgrPromise<void> {
		throw Error(`Set '${key}' field is not allowed on instance ${instance}.`);
	}

	call<R>(instance: any, key: string, args: Array<any | IGsgrPromise<any>>, context: IGsgrContext): IGsgrPromise<R> | R {
		throw Error(`Call '${key}' method is not allowed on instance ${instance}.`);
	}
}

export class GsgrSimpleType extends GsgrTypeBase<any> {
	create(node: IGsEventNode, context: IGsgrContext): any {
		let v: any;
		switch (node.bodyType) {
		case "{":
			v = {};
			for (let att = node.firstAtt; att; att = att.next) {
				if (!att.attType) v[att.name] = context.config.stringToValue(att);
			}
			break;
		case "[":
		case "`":
		case "~`":
			v = [];
			break;
		default:
			throw Error("Wrong bodyType " + node.bodyType);
		}
		return v;
	}

	set(instance: any, key: string | undefined, value: any | IGsgrPromise<any>, context: IGsgrContext): void | IGsgrPromise<void> {
		if (key === undefined) {
			if (Array.isArray(instance)) {
				if (isGsgrPromise(value)) {
					const idx = instance.push(undefined) - 1;
					markGsgrPromise(value.then((newVal) => {instance[idx] = newVal}));
				} else {
					instance.push(value);
				}
			}
		} else {
			if (isGsgrPromise(value)) {
				return markGsgrPromise(value.then((newVal) => {instance[key] = newVal}));
			} else {
				instance[key] = value;
			}
		}
	}
}

const simpleType = new GsgrSimpleType();

export class GsgrClassType extends GsgrSimpleType {
	constructor(public cls: new () => any, public name: string, public allowMethods?: Set<string>, public forbidFields?: Set<string>) {super();}

	create(node: IGsEventNode, context: IGsgrContext): any {
		const o = new this.cls();
		for (let att = node.firstAtt; att; att = att.next) {
			if (!att.attType) {
				this.checkField(o, att.name);
				o[att.name] = context.config.stringToValue(att);
			}
		}
		return o;
	}

	set(instance: any, key: string | undefined, value: any | IGsgrPromise<any>, context: IGsgrContext): void | IGsgrPromise<void> {
		this.checkField(instance, key);
		return super.set(instance, key, value, context);
	}

	checkField(instance: any, key: string) {
		if (this.forbidFields && this.forbidFields.has(key)) throw Error(`Call '${key}' field not allowed on instance ${instance}.`);
	}

	call<R>(instance: any, key: string, args: Array<any | IGsgrPromise<any>>, context: IGsgrContext): IGsgrPromise<R> | R {
		if (this.allowMethods && this.allowMethods.has(key)) {
			if (args.find(isGsgrPromise)) {
				return markGsgrPromise(Promise.all(args).then((newArgs) => {
					return instance[key](...newArgs);
				}));
			}
			return instance[key](...args);
		}
		return super.call(instance, key, args, context);
	}
}


/** Type for call method arguments <%call[...]>. */
class ArgType extends GsgrTypeBase<any> {
	static SINGLETON = new ArgType();

	create(node: IGsEventNode, context: IGsgrContext): IGsgrPromise<any> | any {return []}

	set(instance: any[], key: string | undefined, value: any | IGsgrPromise<any>, context: IGsgrContext): void | IGsgrPromise<void> {instance.push(value)}
}

/**
 * Json primitives (string, boolean, null, numbers) plus:
 * - 'undefined' js value
 * - BiInt with 'n' suffix
 * - 'T' 'F' 'N' 'U' shortcuts for true, false, null and undefined.
 */
function stringToValue(v: IGsValue): any {
	if (v.valueEsc !== null) return v.value;
	switch (v.value) {
	case 'null':
	case 'N':
		return null;
	case 'true':
	case 'T':
		return true;
	case 'false':
	case 'F':
		return false;
	case 'undefined':
	case 'U':
		return undefined;
	default:
		if (v.value.endsWith("n")) {
			return BigInt(v.value.substring(0, v.value.length - 1));
		} else {
			return parseFloat(v.value);
		}
	}
}

const gsgrPromise = Symbol("gsOmPromiseMarker");

export interface IGsgrPromise<T> extends Promise<T> {
	[gsgrPromise]: 1
}

export function markGsgrPromise<T>(p: Promise<T>): IGsgrPromise<T> {
	(p as IGsgrPromise<T>)[gsgrPromise] = 1;
	return p as IGsgrPromise<T>;
}

export function isGsgrPromise<T>(p: any): p is IGsgrPromise<T> {return p != null && (p as IGsgrPromise<T>)[gsgrPromise] === 1}


class NodeTasks {
	//node?: IGsEventNode;
	tasks: Set<Promise<any>> = new Set();
	//onFulfilled?: () => void[]
}

interface IPromiseRef extends Promise<any>, IGsgrPromise<any> {
	gsRefResolved: (v: any) => void
}

export function isRefPromise<T>(p: any): p is IPromiseRef {return p != null && (p as IGsgrPromise<T>)[gsgrPromise] > 0 && typeof p.gsRefResolved === "function"}


function newRefPromise(): IPromiseRef {
	let r: (v: any) => void;
	const p = markGsgrPromise(new Promise<any>((resolve) => {
		r = resolve;
	})) as IPromiseRef;
	p.gsRefResolved = r;
	return p;
}