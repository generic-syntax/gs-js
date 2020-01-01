const XHTML_NS = 'http://www.w3.org/1999/xhtml';
const SVG_NS = 'http://www.w3.org/2000/svg';

declare global {
	namespace JSX {
		interface ElementAttributesProperty {
			_JsxProps: any
		}

		interface IntrinsicElements {
			[key: string]: any
		}
	}
}

export const JSX = {
	xmlDoc: null as XMLDocument,
	ns: XHTML_NS,

	/** API React. */
	createElement(tag: string | typeof HTMLElement, attributes: any, ...children: any[]): any {
		if (JSX.xmlDoc) {
			let elt = JSX.xmlDoc.createElement(tag as string);
			for (let name in attributes) {
				const v = attributes[name];
				if (v != null) elt.setAttribute(name, v);
			}
			for (let child of children) JSX.appendChildren(elt, child);
			return elt;
		} else {
			let elt: HTMLElement;
			if (typeof tag === 'string') elt = document.createElementNS(JSX.ns, tag) as HTMLElement;
			else elt = new (tag as typeof HTMLElement)();

			for (let name in attributes) {
				let attr = attributes[name];
				if (name === 'î') (elt as any).initialize(attr);
				else if (typeof attr === 'function') (elt as any)[name] = attr;
				else if (attr != null) elt.setAttribute(name, attr);
			}
			if (tag === 'template') for (let child of children) JSX.appendChildren((elt as HTMLTemplateElement).content, child);
			else for (let child of children) if (child) JSX.appendChildren(elt, child);
			return elt;
		}
	},

	/** API React. */
	appendChildren(elt: Element | DocumentFragment, children: any) {
		if (Array.isArray(children)) children.forEach(ch => JSX.appendChildren(elt, ch));
		else if (children instanceof Node) elt.appendChild(children);
		else if (children != null) {
			elt.appendChild((JSX.xmlDoc || document).createTextNode(children));
		}
	},

	asXml<T extends Element | void>(jsx: () => T): T {
		if (0 === asXmlRecurse++) JSX.xmlDoc = xmlDoc;
		try {
			return jsx();
		} finally {
			if (--asXmlRecurse === 0) JSX.xmlDoc = null;
		}
	},

	asSvg(jsx: () => Element): Element {
		if (0 === asXmlRecurse++) JSX.ns = SVG_NS;
		try {
			return jsx();
		} finally {
			if (--asXmlRecurse === 0) JSX.ns = XHTML_NS;
		}
	}
};
(window as any).JSX = JSX; //For use outside modules.

let asXmlRecurse = 0;
const xmlDoc = document.implementation.createDocument(null, null, null);