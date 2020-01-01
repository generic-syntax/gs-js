window.addEventListener("load", async () => {
	await mods;
	const JSX = (window as any).JSX;
	const main = document.body.querySelector("main");

	//Header
	const fileName = location.pathname.substr(location.pathname.lastIndexOf('/') + 1);
	const header = <header>
		<nav>
			{fileName !== "index.html" ? <a href="index.html">Home</a> : undefined}
			<a href="gs-on.html">GS for JSON</a>
			<a href="gs-ml.html">GS for XML and HTML</a>
			<a href="gs-om.html">GS for Object Mapping</a>
			<a href="gsDefinition.html">GS definition</a>
			<a href="gsApi.html">GS API</a>
		</nav>
	</header> as HTMLElement;

	for (let a of header.querySelectorAll("a")) {
		if (a.getAttribute("href") === fileName) {
			a.classList.add("current");
			a.removeAttribute("href");
		}
	}

	main.insertAdjacentElement('beforebegin', header);

	//Footer
	main.insertAdjacentElement('afterend', <footer>
		<div id="legal">
			<div>© generic-syntax.org and contributors</div>
			<div><a href="contact@generic-syntax.org">contact@generic-syntax.org</a></div>
		</div>
		<a id="license" href="http://creativecommons.org/licenses/by/4.0/" target="_blank">
			<img src="res/cc.png"/><img src="res/by.png"/>
			Content licensed under<br/>
			Creative Commons Attribution 4.0 International license
		</a>
	</footer>);
});
const mods = import("../mod/index.js");
(() => {
	const m = document.createElement("meta");
	m.setAttribute("name", "viewport");
	m.setAttribute("content", "width=device-width, initial-scale=1");
	document.head.appendChild(m);
})();
