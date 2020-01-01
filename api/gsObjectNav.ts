import {IGsName} from "api/gs";
import {IGsAttribute, IGsFilter, IGsIterator, IGsList, IGsNode} from "api/gsObject";

export interface IGsNav {
	parent: IGsNodeNav;
	previousSibling: IGsNav;
	nextSibling: IGsNav;
	firstChild?: IGsNav;
	lastChild?: IGsNav;
	contextOffset?: number; //if parent exist and is a IGsList, IGsMap or IGsMixed or if this is an attribute, parent is its IGsNode holder.
	contextName?: IGsName; //if parent exist and is a IGsMap
}

export interface IGsNodeNav extends IGsNode, IGsNav {
	firstHeadAttribute: IGsAttributeNav;
	lastHeadAttribute: IGsAttributeNav;
	firstTailAttribute: IGsAttributeNav;
	lastTailAttribute: IGsAttributeNav;
	previousSibling: IGsNodeNav;
	nextSibling: IGsNodeNav;
	firstChild?: IGsNodeNav;
	lastChild?: IGsNodeNav;
}

export interface IGsAttributeNav extends IGsAttribute, IGsNav {
	previousSibling: IGsAttributeNav;
	nextSibling: IGsAttributeNav;
}


export interface GsIteratorNav extends IGsIterator {

	root: IGsNodeNav | IGsList;
	current: IGsNodeNav;
	commonFilter: IGsFilter;

	parent(filter?: IGsFilter): IGsNodeNav;

	firstChild(filter?: IGsFilter): IGsNodeNav;

	lastChild(filter?: IGsFilter): IGsNodeNav;

	nextSibling(filter?: IGsFilter): IGsNodeNav;

	previousSibling(filter?: IGsFilter): IGsNodeNav;

	next(filter?: IGsFilter): IGsNodeNav;

	previous(filter?: IGsFilter): IGsNodeNav;
}