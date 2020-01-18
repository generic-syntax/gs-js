import {IGsEventNode, IGsEventText, IGsLogicalHandler, IGsName} from "api/gs";
import {GsParser} from "../src/core/gsParser.js";
import {GsSerializer, GsStringWriter} from "../src/core/gsSerializer.js";


describe("gsParser", function () {

	it("name", function () {
		parseTest("<a>");
		parseTest("<'a'>");
		parseTest("<'a b'>");
		parseTest("<' a b '>");
		parseTest("<' a\\'\\' b '>");
		parseTest("<'\\\\ \\\" \\\' \\` \\< \\b \\f \\n \\r \\t \\u00FFFC'>", "<'\\\\ \" \\\' ` < \b \f \n \r \t ￼'>");
		parseTest("<''>", "<>");
		parseTest("<|'|'>", "<>");
		parseTest("<|'a|'>");
		parseTest("<|'a |'>");
		parseTest("<|' a |'>");
		parseTest("<|' a'| |'>");
		parseTest("<|.' a'|' |.'>");
	});

	it("empty", function () {
		parseTest("<>");
		parseTest("<node>");
		parseTest("<'node'>");
		parseTest("<|'node|'>");
		parseTest("<node att>");
		parseTest("< att>");
		parseTest("< a=1 b=2>");
		parseTest("<node a='s'>");
		parseTest("<node'a'='s''b''c'=1>");
		parseTest("<node a=|'s|'>");
	});

	it("list", function () {
		parseTest("[][]");
		parseTest("<[]><x[]>");
		parseTest("[a][b]");
		parseTest("<node[<n1><n2>]>");
	});

	it("map", function () {
		parseTest('{}');
		parseTest('<{}>');
		parseTest("<node{a=<n1>'b'=<n2>c=t3 d'e'f=\"y\"g=`y`}>");
		parseTest('{a<#"">b=1}');
	});


	it("text", function () {
		parseTest('""');
		parseTest('null');
		parseTest('"a"');
		parseTest('"\\""');
		parseTest('"\\"a"');
		parseTest('"a\\""');
		parseTest('"a\\"a<b"');
		parseTest('"\\u0000E9"', '"é"');
		parseTest('"\\u00FFFCa"', '"￼a"');
		//\'"`<bfnrt u
		parseTest('"\\\\ \\" \\\' \\` \\< \\b \\f \\n \\r \\t \\u00FFFC"', '"\\\\ \\" \' ` < \b \f \n \r \t ￼"');
	});

	it("mixed", function () {
		parseTest("``");
		parseTest("`a<>`");
		parseTest("`\\`a<>`");
		parseTest("`a\\`<>`");
		parseTest("`a<>\\``");
		parseTest("`a<>a\\``");
		parseTest("`a<>\\`b`");
		parseTest("`a<>b\\`b`");
		parseTest('`\\\\ \\" \\\' \\` \\< \\b \\f \\n \\r \\t \\u00FFFC`', '`\\\\ " \' \\` \\< \b \f \n \r \t ￼`');
	});

	it("atts", function () {
		parseTest("<node[<aa x y=e z><bb 1='a'2'3'='c'>< 1=aa>]>");
	});

	it("bounds", function () {
		parseTest(`!"text!"`);
		parseTest(`!°"text!°"`);
		parseTest(`<!"text!">`);
		parseTest(`<!^"text!^">`);
		parseTest(`<node!^"text!^">`);
		parseTest(`<|'node|'!^"text!^">`);
		parseTest(`<|'node|'|'att|'|°'a|°'=|x'val|x'!^"text!^">`);
	});


	it("specialTypes", function () {
		parseTest("<#aa#b=1%'c'?d=2><% #b=1%'c'?d=2&''=meta><&'x'#|'a|'>");
	});

});

function parseTest(src: string, res?: string) {
	const s = new GsSerializer<GsStringWriter>();
	new GsParser().setHandler(s).parse(src);
	expect(s.out.toString()).toEqual(res || src);
}


class LogSH implements IGsLogicalHandler {
	startNode(node: IGsEventNode): void {
		console.log("startNode", node);
	}

	bodyMapProp(name: IGsName, isNull: boolean, holder: IGsEventNode): void {
		console.log("bodyMapProp", name, isNull);
	}

	bodyText(text: IGsEventText, holder: IGsEventNode): void {
		console.log("bodyText", text);
	}

	endNode(node: IGsEventNode): void {
		console.log("endNode", node);
	}

}