import {gsEscapingStr, gsEscapingText, gsEscapingValue, gsSpecialType} from "api/gs";

/**
 * Fluent API for building GS content.
 *
 * ML example:
 *	const s = new GsBuilderToString();
 *	s.node("html").list(s => {
 *		s.node('head').list().node("title").text("x").end().end();
 *		s.node('body').list(s=>{
 *			s.node("h1").text("Title").end();
 *			s.node("p").mixed(true, s=>{
 *				s.text("My para ");
 *				s.node("em").mixed(true).text("with span").end().end();
 *				s.text(".");
 *			}).end();
 *		}).end();
 *	}).end();
 *
 * ON example:
 * s.map(s => {
 *   s.prop('myProp').text("value");
 *   s.prop('bool').text("true", false);
 *   s.prop('number').text("12", false);
 *   s.prop('list').list().text("a").text("b").end();
 * })
 */
export interface IGsBuilder {

	/** Current state of this builder. */
	state: IGsBuilderState;

	/**
	 * Start a node with '<' (ie not a simple node).
	 *
	 * Possible states:
	 * - 'root' | 'inList' | 'inMixed' | 'inMap'  | 'inProp' : open node -> 'inHeadNode'
	 * - 'inHeadNode' | 'inTailNode' : close current node and open a sibling node -> 'inHeadNode'
	 * - 'inAtt' : leave current attribute without value, close close current node and open a sibling node -> 'inHeadNode'
	 */
	node(name?: string, esc?: gsEscapingStr | undefined): this


	/**
	 * Start a node with '<' and a specialType.
	 *
	 * Possible states:
	 * - 'root' | 'inList' | 'inMixed' | 'inMap'  | 'inProp' : open node -> 'inHeadNode'
	 * - 'inHeadNode' | 'inTailNode' : close current node and open a sibling node -> 'inHeadNode'
	 * - 'inAtt' : leave current attribute without value, close current node and open a sibling node -> 'inHeadNode'
	 */
	nodeSpecial(specialType: gsSpecialType | null, name?: string, esc?: gsEscapingStr | undefined): this

	/**
	 * Possible states:
	 * - 'inHeadNode' | 'inTailNode': add an attribute -> 'inAtt'
	 * - 'inAtt': leave current attribute without value and add new one -> 'inAtt'
	 * - 'inList' | 'inMixed' | 'inMap' : close body and add a tail attribute -> 'inAtt'
	 * - 'inProp' : add empty prop, close body and add a tail attribute -> 'inAtt'
	 */
	att(name: string, esc?: gsEscapingStr | undefined): this

	/**
	 * Possible states:
	 * - 'inHeadNode' | 'inTailNode': add an attribute -> 'inAtt'
	 * - 'inAtt': leave current attribute without value and assa new one -> 'inAtt'
	 * - 'inList' | 'inMixed' | 'inMap'  | 'inProp' : close body and add a tail attribute -> 'inAtt'
	 */
	attSpecial(specialType: gsSpecialType | null, name: string, esc?: gsEscapingStr | undefined): this

	/**
	 * Possible states:
	 * - 'inAtt': set attribute value -> 'inHeadNode' | 'inTailNode'
	 */
	val(value: string, esc?: gsEscapingValue | undefined, formattable?: boolean): this

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
	text(value: string, esc?: gsEscapingText | undefined, formattable?: boolean): this

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
	 * - 'inMixed': add a map node and add a property -> 'inProp'
	 */
	prop(name: string, esc?: gsEscapingStr | undefined): this

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