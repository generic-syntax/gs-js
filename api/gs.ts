/**
 * Logical event-driven API.
 */
export interface IGsLogicalHandler {

	/**
	 * Notify the start of a node.
	 *
	 * @param node Node with its head attributes, his holder property (if it is declared in a map) and its ancestors.
	 *   For empty keys in a map <pre>{key}</pre>, the node type is simple ('') and the body type is empty (''),
	 *   ie a node that has no serialized representation, but a node.holderProp specified.
	 * @param bodyText Must be specified only if node.bodyType==='"', ie a text body node ('"').
	 */
	startNode(node: IGsEventNode, bodyText?: IGsEventText): void

	/**
	 * Notify the end of a node.
	 * Each startNode() call has it corresponding endNode() call, even for an empty node or an empty key in a map.
	 *
	 * @param node Node with its head and tail attributes and its ancestors
	 */
	endNode(node: IGsEventNode): void
}

/**
 * Low level flat stream event-driven API for whitespaces handling.
 */
export interface IGsSyntaxHandler {
	headNode(name: IGsName, specialType?: gsSpecialType | null): void

	attribute(name: IGsName, value: IGsValue, specialType?: gsSpecialType | null, spBeforeEq?: string, spAfterEq?: string): void

	text(text: IGsEventText, inBodyMixed?: boolean): void

	startBody(bodyType: '[' | '{' | '`' | '~`'): void

	property(name: IGsName, isNull: boolean, spBeforeEq?: string): void

	endBody(bodyType: '[' | '{' | '`' | '~`'): void

	tailNode(): void

	whiteSpaces(spaces: string): void
}

/** Serialization strategies and options. */
export type IGsSerializeOptions = {
	method: 'minified'
	unformat?: boolean
} | {
	method: 'pretty'
	unformat?: boolean
} | {
	method: 'indented'
	unformat?: boolean
	indent?: gsIndent
} | {
	method: 'formatted'
	indent?: gsIndent
	lineWidth?: number
};

export type gsIndent = "" | "\t" | " " | "  " | "   " | "    " | "     "

/** Name for a node or an attribute with its escaping rule. */
export interface IGsName {
	name: string;
	nameEsc: gsEscaping;
}

/** Attribute value with its escaping rule and its formattable flag. */
export interface IGsValue {
	value: null | string
	valueEsc: gsEscaping
	valueFormattable: boolean
}

/**
 * Text body used in IGsLogicalHandler and IGsSyntaxHandler
 */
export interface IGsEventText extends Readonly<IGsValue> {
}

/**
 * Partial node definition used in IGsLogicalHandler
 */
export interface IGsEventNode extends IGsName {
	/** Parent node. */
	readonly parent: IGsEventNode | null

	/** Holder property when the node is declared in a map. */
	readonly holderProp: IGsName | undefined

	/** Depth of this node, ie count of non null parents. */
	readonly depth: number

	/** Node type : standard (null), simple('') or special type('#', '&', '?' or '%').*/
	readonly nodeType: gsNodeType

	/** Name of the node. */
	readonly name: string

	/** Escaping rule for the node. */
	readonly nameEsc: gsEscaping

	/** First tail attribute. */
	readonly firstAtt: IGsEventAtt | null

	/** Body type of the node: list ('['), map ('{'), text ('"'), empty (''), mixed ('`') or mixed formattable ('~`'). */
	readonly bodyType: gsEventBodyType

	/** Helper to know if the body type node is mixed or mixed formattable ('`' or '~`'). */
	readonly isBodyMixed: boolean;

	/** Attributes in tail node: only available in IGsLogicalHandler.endNode() and not in IGsLogicalHandler.startNode() */
	readonly firstTailAtt: IGsEventAtt | null

	/**
	 * Get the first attribute with this name and type.
	 * @return the attribute or null if not found.
	 */
	getAttribute(name: string, specialType?: gsSpecialType | null, after?: IGsEventAtt): IGsEventAtt | null

	/**
	 * Get the value of the first attribute with this name and type.
	 * @return null if the attribute exist with no value, undefined if the attribute does not exist.
	 */
	getAttr(name: string, specialType?: gsSpecialType | null): string | null | undefined

	/**
	 * Build a path from the root for retrieving this node. Useful for test and debug.
	 * Path format:
	 * - each anonymous node: {offset} //TODO add offset in IGsEventNode
	 * - each named node: {offset} '~' {name}
	 * - each prop: {name} '='
	 * - node separator: '>'
	 *
	 * Names use the same escaping rules as in GS (raw, quoted or bounded).
	 */
	toPath(): string;
}

/**
 * Attribute definition used in IGsLogicalHandler
 */
export interface IGsEventAtt extends IGsName, IGsValue {
	readonly attType: gsSpecialType | null
	readonly name: string
	readonly nameEsc: gsEscaping
	readonly value: string | null
	readonly valueEsc: gsEscaping
	readonly valueFormattable: boolean
	readonly offset: number
	readonly inTail: boolean
	readonly next: IGsEventAtt | null

	/**
	 * Build a path from the root for retrieving this attribute. Useful for test and debug.
	 * Attribute format after the owner path: '@' {offset} '~' {name}
	 */
	toPath(owner: IGsEventNode): string;
}

export type gsEscaping = /*raw*/ false |  /*quoted*/ true |  /*bounded*/ string

export type gsSpecialType = /*Comment*/ '#' | /*Meta*/ '&' | /*Instruction*/ '%' |  /*Syntax*/ '?'

export type gsNodeType = gsSpecialType | /*standard node*/ null | /*simple node*/ ''

export type gsBodyType = /*empty*/ '' |  /*list*/'[' | /*map*/ '{' | /*text*/ '"' | /*mixed*/ '`'

export type gsEventBodyType = gsBodyType | /*mixed formattable*/ '~`'

/**
 * Regex for avaluate if a string can be serialized as a rawChars (without escaping)
 * rawchars : minusucle || majuscule || -./0-9: || _
 * cardinality '+' in the regExp because an empty string must be quoted: '' or "".
 */
export const rawChars = /^[a-zA-Z\--:_]+$/;

export const whiteSpaces = /^[ \t\r\n]*$/;