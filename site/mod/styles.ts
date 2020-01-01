export function registerStyle(key: string, body: string) {
	styles.set(key, body);
}

export function getStyle(key: string): HTMLStyleElement {
	const body = styles.get(key);
	if (!body) return undefined;
	const st = document.createElement("style");
	st.setAttribute("key", key);
	st.textContent = body;
	return st;
}

const styles = new Map<string, string>();