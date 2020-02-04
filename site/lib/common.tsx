window.addEventListener("load", async () => {
	await mods;
	const JSX = (window as any).JSX;

	const h1 = document.querySelector("h1");
	h1.insertAdjacentElement("beforebegin", <a id="logoLnk" href="index.html" title="Generic-Syntax"><img id="logo" src="res/gs.svg"/></a>);

	//Header
	const fileName = location.pathname.substr(location.pathname.lastIndexOf('/') + 1);
	const header = <header>
		<nav>
			{fileName !== "index.html" ? <a href="index.html">Home</a> : undefined}
			<a href="gs-on.html">GS for JSON</a>
			<a href="gs-ml.html">GS for XML and HTML</a>
			<a href="gs-gr.html">GS for graph</a>
			<a href="gsDefinition.html">Definition</a>
			<a href="gsTry.html">Try-it</a>
			<a href="gsApi.html">API</a>
		</nav>
	</header> as HTMLElement;

	for (let a of header.querySelectorAll("a")) {
		if (a.getAttribute("href") === fileName) {
			a.classList.add("current");
			a.removeAttribute("href");
		}
	}

	h1.insertAdjacentElement('afterend', header);

	//Footer
	document.body.appendChild(<footer>
		<div id="legal">
			<div>©2020 generic-syntax.org and contributors</div>
			<div><a href="mailto:contact@generic-syntax.org">contact@generic-syntax.org</a></div>
		</div>
		<a id="license" href="http://creativecommons.org/licenses/by/4.0/" target="_blank" title="Content licensed under Creative Commons Attribution 4.0 International license">
			<img src="res/cc.png"/><img src="res/by.png"/>
			<span id="licenseText">
			Content licensed under<br/>
			Creative Commons Attribution 4.0 International license
			</span>
		</a>
		<a id="github" href="https://github.com/generic-syntax/gs-js" target="_blank" title="Source code at https://github.com/generic-syntax/gs-js">
			<img src="res/github.png"/>
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
