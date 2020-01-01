/**
 * Output source abstraction for serialization
 */
export interface IGsWriter {
	/** Write a GS mark. */
	mark(c: string): void

	/** Write a raw string (without any escaping). */
	rawChars(c: string): void

	/** Write a quoted string with escaping and framed by a simple quote (name, value) or a double quote (text body node). */
	quotedChars(c: string, quote: "'" | '"'): void

	/** Write a string without any escaping but framed by a unique boundary |x' (name, value) or |x" (text body node). */
	boundedChars(c: string, bound: string): void

	/** Write a quoted string with escaping in a mixed body node context. */
	mixedText(c: string): void

	/** Write non signifiant spaces. */
	space(c: string): void
}