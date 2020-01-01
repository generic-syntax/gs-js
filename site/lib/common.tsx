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
		<a class="licence" href="http://creativecommons.org/licenses/by/4.0/" target="_blank">
			<img src="res/cc.png"/><img src="res/by.png"/>
			Content licensed under<br/>
			Creative Commons Attribution 4.0 International license</a>
	</footer>);
});
const mods = import("../mod/index.js");
