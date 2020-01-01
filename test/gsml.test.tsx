import {JSX} from "../site/mod/jsx.js";
import {GsMultiLH} from "../src/core/gsHelpers.js";
import {GsParser} from "../src/core/gsParser.js";
import {GsSerializer, GsStringWriter} from "../src/core/gsSerializer.js";
import {GsFromDomHtml, GsFromDomXml, GsToDomHtmlLH, GsToDomXmlLH} from "../src/profileMl/gsml.js";

describe("gsml", function () {

	it("xml", function () {
		JSX.asXml(() => {
				xmlToGs(<x/>, '<x>');
				xmlToGs(<x att="1"/>, '<x att=1>');
				xmlToGs(<x>test</x>, '<x["test"]>');
				xmlToGs(parseXml('<x><!--comment--></x>'), '<x[<#"comment">]>');
			}
		)
	});

	it("html", function () {
		htmlToGs(<div/>, '<div>');
		htmlToGs(<div class="1"/>, '<div class=1>');
		htmlToGs(<div>test</div>, '<div`test`>');
		htmlToGs(<div><p class="cl1 cl2">test</p></div>, `<div[<p class='cl1 cl2'\`test\`>]>`);
		htmlToGs(parseHtmlNode('<div><!--comment--></div>'), '<div[<#"comment">]>');
		htmlToGs(<html>
		<head></head>
		<body>
		<div/>
		</body>
		</html>, '<html[<head><body[<div>]>]>');
	});

	it("html-rules", function () {
		htmlToGs(<html>
		<body><p>a<span>b</span>c</p></body>
		</html>, '<html[<body[<p`a<span`b`>c`>]>]>');
		htmlToGs(<html>
		<head><title>ti</title></head>
		</html>, '<html[<head[<title"ti">]>]>');
		htmlToGs(<html>
		<head>
			<script></script>
		</head>
		</html>, '<html[<head[<script>]>]>');
		htmlToGs(<html>
		<head>
			<script>do("test")</script>
		</head>
		</html>, '<html[<head[<script!"do("test")!">]>]>');
		htmlToGs(<html>
		<head>
			<script>do('test!"')</script>
		</head>
		</html>, `<html[<head[<script!!"do('test!"')!!">]>]>`);
	});

	it("pi", function () {
		const div = <div/> as Element;
		div.appendChild(document.createProcessingInstruction("php", `ECHO 'Hello World!<br>'`));
		htmlToGs(div, `<div[<&php"ECHO 'Hello World!<br>'">]>`);
	});

})
;

function xmlToGs(node: Node, gs?: string) {
	//node -> GsLogicalHandler
	//         |-> gs
	//         |-> Node
	const toGs = new GsSerializer<GsStringWriter>();
	const toDomNode = new GsToDomXmlLH();
	new GsFromDomXml().setHandler(new GsMultiLH(toGs, toDomNode)).build(node);
	if (gs) expect(toGs.out.toString()).toEqual(gs);
	else console.log(toGs.out.toString());
	expect(serXml(node)).toEqual(serXml(toDomNode.parent.firstChild));
	//gs -> GsLogicalHandler -> Node
	if (gs) {
		new GsParser(toDomNode.reset()).parse(gs);
		expect(serXml(node)).toEqual(serXml(toDomNode.parent.firstChild));
	}
}

function htmlToGs(node: Node, gs?: string) {
	//node -> GsLogicalHandler
	//         |-> gs
	//         |-> Node
	const toGs = new GsSerializer<GsStringWriter>();
	const toDomNode = new GsToDomHtmlLH();
	new GsFromDomHtml().setHandler(new GsMultiLH(toGs, toDomNode)).build(node);
	if (gs) expect(toGs.out.toString()).toEqual(gs);
	else console.log(toGs.out.toString());
	expect(serHtml(node)).toEqual(serHtml(toDomNode.parent.firstChild));
	//gs -> GsLogicalHandler -> Node
	if (gs) {
		new GsParser(toDomNode.reset()).parse(gs);
		expect(serHtml(node)).toEqual(serHtml(toDomNode.parent.firstChild));
	}
}


function parseXml(xmlStr: string): XMLDocument {
	return new DOMParser().parseFromString(xmlStr, "text/xml");
}

function parseHtmlNode(htmlStr: string): Node {
	return new DOMParser().parseFromString(htmlStr, "text/html").body.firstChild;
}

function serXml(node: Node): string {
	return new XMLSerializer().serializeToString(node);
}

function serHtml(node: Node): string {
	if (node instanceof HTMLElement) return node.outerHTML;
	throw "ToDo toHTML::" + node;
}

JSX;