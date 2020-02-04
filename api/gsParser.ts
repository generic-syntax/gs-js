import {IGsLogicalHandler} from "./gs.js";

/**
 * Parse an input source and produce events to a IGsLogicalHandler.
 */
export interface IGsParser<LH extends IGsLogicalHandler> {

	readonly handler: LH | null

	parse(gs: string | IGsReader): this

	setHandler(handler: IGsLogicalHandler | null): this

	appendHandler(handler: IGsLogicalHandler, startWithCurrentNode?: boolean): void
}

/**
 * Input source abstraction for IGsParser
 */
export interface IGsReader {

	/** Current offset */
	readonly offset: number

	/** True if stream is consumed */
	readonly ended: boolean

	/**
	 * Read one char and advance in the stream
	 * in context  : ⋏A
	 * out context : A⋏
	 * @return the char code or Nan if streeam is ended
	 */
	readCode(): number

	/**
	 * Skip spaces and return the first no space char or NaN
	 * in context  : ⋏A   ⋏...A
	 * out context : A⋏   ...A⋏
	 * @return the char code or Nan if streeam is ended
	 */
	readCodeNoSpace(): number

	/**
	 * Read a raw string and advance the offset at the end
	 * in context  : b⋏asicChar
	 * out context : basicChar⋏
	 * @return the raw string
	 */
	readRawChars(): string

	/**
	 * Read a quoted string and advance the offset at the end
	 * in context  : '⋏quoted'
	 * out context : 'quoted'⋏
	 * @return the quoted string
	 */
	readQuotedChars(quote: "'" | '"'): string

	/**
	 * Read a bounded string and advance the offset at the end
	 * in context  : |⋏'boundedStr|'
	 * out context : |'boundedStr|'⋏
	 * @return the bounded string
	 */
	readBoundedChars(quote: "'" | '"'): { str: string, esc: string }

	/**
	 * Read a string in a mixed body and advance the offset at the end
	 * in context  : `m⋏ixedText`    `m⋏ixed<text>`    `<text>m⋏ixed`
	 * out context : `mixedText⋏`    `mixed⋏<text>`    `<text>mixed⋏`
	 * @return the mixed string
	 */
	readMixedText(): string

	/** Parsing error management */
	error(msg: string): void
}

