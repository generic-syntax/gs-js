import {GsSerializerBd} from "../src/core/gsBuilder.js";
import {GsStringWriter} from "../src/core/gsSerializer.js";

describe("gsSerializer", function () {

	it("node", function () {
		const s = new GsSerializerBd<GsStringWriter>();
		s.node("html").end();
		expect(s.out.toString()).toEqual("<html>");
	});

	it("textNode", function () {
		const s = new GsSerializerBd<GsStringWriter>();
		s.text("text");
		expect(s.out.toString()).toEqual('"text"');
	});

	it("textNodes", function () {
		const s = new GsSerializerBd<GsStringWriter>();
		s.text("text1", false);
		s.text("text2", false);
		s.text("text: \"\\.", true);
		s.text("text: \"\\.", "");
		s.text("text: !\"\\.", "x");
		expect(s.out.toString()).toEqual('text1 text2"text: \\"\\\\."!"text: "\\.!"!x"text: !"\\.!x"');
	});

	it("html1", function () {
		const s = new GsSerializerBd<GsStringWriter>();
		s.node("html").att("lang").val("en").list(s => {
			s.node("head").list(s => {
				s.node("title").mixed().text("my title").end();
			}).end();
			s.node("body").list(s => {
				s.node("p").att("class").val("a b").mixed().text("a").node("em").mixed().text("1").end().text("b c ").end();
			}).end();
		}).end();
		expect(s.out.toString()).toEqual('<html lang=en[<head[<title`my title`>]><body[<p class=\'a b\'`a<em`1`>b c `>]>]>');
	});

	it("json1", function () {
		const s = new GsSerializerBd<GsStringWriter>();
		s.map(s => {
			s.prop("str").text("string");
			s.prop("num").text("12", false);
			s.prop("null").text("null", false);
			s.prop("array").list(s => {
				s.text("raw", false);
				s.text("escape \"quote\"");
				s.text("escape \"quote\" by bound", "");
			}).end();
			s.prop("object").map(s => {
				s.prop("boolean true").text("true", false);
				s.prop("boolean false").text("false", false);
			}).end();
		}).end();
		expect(s.out.toString()).toEqual('{str="string"num=12 null=null array=[raw"escape \\"quote\\""!"escape "quote" by bound!"]object={\'boolean true\'=true\'boolean false\'=false}}');
	});

	it("comments", function () {
		const s = new GsSerializerBd<GsStringWriter>();
		s.nodeSpecial("#", "TODO").att("by").val("sys").text("...").end();
		expect(s.out.toString()).toEqual('<#TODO by=sys"...">');
	});
});