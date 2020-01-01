import {gsEscaping, gsSpecialNodeType} from "api/gs";

/**
 * Fluent API for building GS content.
 * Example:
		const s = new GsSerializer();
		s.node("html").list(s => {
			s.node('head').list().node("title").text("x").end().end();
			s.node('body').list(s=>{
				s.node("h1").text("Title").end();
				s.node("p").mixed(true, s=>{
					s.text("My para ");
					s.node("em").mixed(true).text("with span").end().end();
					s.text(".");
				}).end();
			}).end();
		}).end();
 */
export interface IGsBuilder {

	/** Current state of this builder. */
	state: IGsBuilderState;

	/**
	 * Possible states:
	 * - 'root' | 'inList' | 'inMixed' | 'inMap'  | 'inProp' : open node -> 'inHeadNode'
	 * - 'inHeadNode' | 'inTailNode' : close current node and open a sibling node -> 'inHeadNode'
	 * - 'inAtt' : leave current attribute without value, close close current node and open a sibling node -> 'inHeadNode'
	 */
	node(name?: string, esc?: gsEscaping): this

	nodeSpecial(specialType: gsSpecialNodeType, name?: string, esc?: gsEscaping): this

	/**
	 * Possible states:
	 * - 'inHeadNode' | 'inTailNode': add an attribute -> 'inAtt'
	 * - 'inAtt': leave current attribute without value and assa new one -> 'inAtt'
	 */
	att(name: string, esc?: gsEscaping): this

	/**
	 * Possible states:
	 * - 'inAtt': set attribute value -> 'inHeadNode' | 'inTailNode'
	 */
	val(value: string, esc?: gsEscaping, formattable?: boolean): this

	/**
	 * Possible states:
	 * - 'inHeadNode': set text body to current node (if esc === false, forced as true) -> 'inTailNode'
	 * - 'inAtt': leave current attribute without value and set text body to current node -> 'inTailNode'
	 * - 'root': add a simple text node -> 'root'
	 * - 'inList': add a simple text node -> 'inList'
	 * - 'inMixed': add a simple text node (esc and formattable not used) -> 'inMixed'
	 * - 'inProp': add a simple text node -> 'inMap'
	 * - 'inTailNode' : close current node and add a simple sibling text node -> 'root' | 'inList' | 'inMap'
	 */
	text(value: string, esc?: gsEscaping, formattable?: boolean): this

	/**
	 * Possible states:
	 * - 'inHeadNode': set bodyList to current node -> 'inList'
	 * - 'inAtt': leave current attribute without value and set bodyList to current node -> 'inList'
	 * - 'root' | 'inList' | 'inProp': add a simple list node -> 'inList'
	 * - 'inMixed': add a node with a bodyList -> 'inList'
	 */
	list(children?: (s: IGsBuilder) => void): this

	/**
	 * Possible states:
	 * - 'inHeadNode': set bodyMixed to current node -> 'inMixed'
	 * - 'inAtt': leave current attribute without value and set bodyMixed to current node -> 'inMixed'
	 * - 'root' | 'inList' | 'inProp': add a simple mixed node -> 'inMixed'
	 * - 'inMixed': add a node with a bodyMixed -> 'inMixed'
	 */
	mixed(formattable?: boolean, children?: (s: IGsBuilder) => void): this

	/**
	 * Possible states:
	 * - 'inHeadNode': set bodyMap to current node -> 'inMap'
	 * - 'inAtt': leave current attribute without value and set bodyMap to current node -> 'inMap'
	 * - 'root' | 'inList' | 'inProp': add a simple map node -> 'inMap'
	 * - 'inMixed': add a node with a bodyMap -> 'inMap'
	 */
	map(children?: (s: IGsBuilder) => void): this

	/**
	 * Possible states:
	 * - 'inMap': add a property -> 'inProp'
	 * - 'inHeadNode': set bodyMap to current node and add a property -> 'inProp'
	 * - 'inAtt': leave current attribute without value, set bodyMap to current node and add a property -> 'inProp'
	 * - 'root' | 'inList' | 'inProp': add a simple map node and add a property -> 'inProp'
	 * - 'inMixed': add a node with a bodyMap and add a property -> 'inProp'
	 */
	prop(name: string, esc?: gsEscaping): this

	/**
	 * Possible states:
	 * - 'inHeadNode' : close node with emptyBody -> 'root' | 'inList' | 'inMap' | 'inMixed'
	 * - 'inAtt': leave current attribute without value and close node with emptyBody -> 'root' | 'inList' | 'inMap' | 'inMixed'
	 * - 'inTailNode' : close node -> 'root' | 'inList' | 'inMap' | 'inMixed'
	 * - 'inList' | 'inMap' | 'inProp' | 'inMixed': close body and current node -> 'root' | 'inList' | 'inMap' | 'inMixed'
	 */
	end(): this
}

/** States for IGsBuilder. */
export const enum IGsBuilderState {
	root,
	inHeadNode,
	inAtt,
	inList,
	inMixed,
	inMap,
	inProp,
	inTailNode,
}