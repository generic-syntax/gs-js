import {GsParser} from "../src/core/gsParser.js";
import {GsPrettyLH, GsSerializer, GsStringWriter, GsUnformatLH, GsUnformatSH} from "../src/core/gsSerializer.js";

describe("unformat", function () {

	it("unformatLH", function () {
		const out = new GsStringWriter();
		const parser = new GsParser(new GsUnformatLH(new GsPrettyLH(new GsSerializer(out))));
		parser.parse(`<a att=~'  a\n\n\n\tb \r\n\r '>`);
		expect(out.toString()).toEqual(`<a att=~' a b '>`);
		out.reset();
		parser.parse(`<a~"  a b\nc\td\t\t\e\n\n">`);
		expect(out.toString()).toEqual(`<a ~" a b c d e ">`);
	});

	it("unformatSH", function () {
		const out = new GsStringWriter();
		const parser = new GsParser(new GsPrettyLH(new GsUnformatSH(new GsSerializer(out))));
		parser.parse(`<a att=~'  a\n\n\n\tb \r\n\r '>`);
		expect(out.toString()).toEqual(`<a att=~' a b '>`);
		out.reset();
		parser.parse(`<a~"  a b\nc\td\t\t\e\n\n">`);
		expect(out.toString()).toEqual(`<a ~" a b c d e ">`);
	});
});