import {GsParser} from "../src/core/gsParser.js";
import {GsIndentLH, GsSerializer, GsStringWriter} from "../src/core/gsSerializer.js";

describe("indentors", function () {

	it("indent", function () {
		const out = new GsStringWriter();
		const parser = new GsParser(new GsIndentLH({indent: "  "}, new GsSerializer(out)));
		parser.parse('<a[<b{c=1 noVal d="x" e=`y<f``>` g=`z<h[<i>]>`}><j{k l}>]>');
		expect(out.toString()).toEqual(`<a [
  <b {
    c= 1
    noVal
    d= "x"
    e= \`y<f \`\`>\`
    g= \`z<h [
        <i>
      ]>\`
  }>
  <j {
    k
    l
  }>
]>
`);
	});
});