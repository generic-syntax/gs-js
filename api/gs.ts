/**
 * Logical event-driven API.
 */

export interface IGsLogicalHandler {
	startNode(node: IGsEventNode): void

	bodyMapProp(name: IGsName, isNull: boolean, holder: IGsEventNode): void

	bodyText(text: IGsEventText, holder: IGsEventNode): void

	endNode(node: IGsEventNode): void
}

/**
 * Low level flat stream event-driven API for whitespaces handling.
 */
export interface IGsSyntaxHandler {
	headNode(name: IGsName, specialType?: gsSpecialType): void

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
	readonly parent: IGsEventNode | null
	readonly holderProp: IGsName | undefined
	readonly depth: number

	readonly nodeType: gsNodeType
	readonly name: string
	readonly nameEsc: gsEscaping
	readonly firstAtt: IGsEventAtt | null

	readonly bodyType: gsEventBodyType
	readonly isBodyMixed: boolean;

	/** Attributes in tail node: only available in IGsLogicalHandler.endNode() and not in IGsLogicalHandler.startNode() */
	readonly firstTailAtt: IGsEventAtt | null

	getAttribute(name: string, specialType?: gsSpecialType | null, after?: IGsEventAtt): IGsEventAtt | null

	/**
	 * Return the value of the first attribute with this name and type.
	 * @return null if attribute exist with no value, undefined if attribute does not exist.
	 */
	getAttr(name: string, specialType?: gsSpecialType | null): string | null | undefined

	/**
	 * Build a path from the root for retrieving this node. Useful for test and debug.
	 * Format:
	 * - each anonymous node: {offset} //TODO add offset in IGsEventNode
	 * - each named node: {offset} '~' {name}
	 * - each prop: {name} '='
	 * - node separator: '>'
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