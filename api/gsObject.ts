import {gsNodeType, IGsName, IGsValue} from "api/gs";

export interface IGsNode extends IGsName {
	nodeType: gsNodeType;
	attributes: ReadonlyArray<IGsAttribute>;
	body: IGsList | IGsMap | IGsText | IGsMixed;

	getAttribute(key: string | number): IGsAttribute;

	removeAttribute(key: string | number): IGsAttribute;

	setAttribute(attr: IGsAttribute): IGsAttribute;

	insertAttribute(attr: IGsAttribute, before?: IGsAttribute | number): IGsAttribute;

	getAttr(key: string | number): string;

	setAttr(key: string | number, value?: string): string;
}

export interface IGsAttribute extends IGsName, IGsValue {
	readonly inTail: boolean
}

export interface IGsList extends Array<IGsNode> {
}

export interface IGsMixed extends Array<IGsNode> {
	formattable: boolean;
}

export interface IGsMap extends Map<IGsName, IGsNode> {
	getChild(key: string | null | number, after?: number): IGsNode;

	getEntryName(offset: number): IGsName;

	getEntryOffset(name: string | null, after?: number): number;

	setChild(key: string | null | number, child: IGsNode): IGsNode;

	removeChild(key: string | null | number): IGsNode;

	insertChild(name: string | null | IGsName, child: IGsNode, index?: number): void;
}

export interface IGsText extends IGsValue {
}

export interface IGsIterator {
	root: IGsNode | IGsList;
	current: IGsNode;
	commonFilter: IGsFilter;

	parent(filter?: IGsFilter): IGsNode;

	firstChild(filter?: IGsFilter): IGsNode;

	nextSibling(filter?: IGsFilter): IGsNode;

	next(filter?: IGsFilter): IGsNode;
}

export interface IGsFilter {
	(data: IGsNode): 'accept' | 'skip' | 'reject';
}
