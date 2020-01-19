import {IGsLogicalHandler} from "../api/gs.js";
import {IGsWriter} from "../api/gsSerializer.js";
import {GsBuilderToLH, GsBuilderToString} from "../src/core/gsBuilder.js";
import {buildSerializer, GsStringWriter} from "../src/core/gsSerializer.js";

describe("gsBuilderToLH", function () {

	it("node", function () {
		const s = new GsBuilderToString();
		s.node("html").end();
		expect(s.toString()).toEqual("<html>");
	});

	it("textNode", function () {
		const s = new GsBuilderToString();
		s.text("text");
		s.text("my text");
		expect(s.toString()).toEqual('text"my text"');
	});

	it("textNodes", function () {
		const s = new GsBuilderToString();
		s.text("text1", false);
		s.text("text2", false);
		s.text("text: \"\\.", true);
		s.text("text: \"\\.", "");
		s.text("text: !\"\\.", "x", true);
		expect(s.toString()).toEqual('text1 text2"text: \\"\\\\."!"text: "\\.!"~!x"text: !"\\.!x"');
	});

	it("mixedNode", function () {
		const s = new GsBuilderToString();
		s.node("title").mixed(true).text("my title").end();
		expect(s.toString()).toEqual('<title~`my title`>');
	});

	it("mixedNodes", function () {
		const s = new GsBuilderToString();
		s.mixed().text("my title").end();
		s.mixed(true).text("a").text("b").end();
		s.mixed(true).text("c").mixed().text("d").end().mixed(true).text("e").end().end();
		expect(s.toString()).toEqual('`my title`~`ab`~`c<`d`><~`e`>`');
	});

	it("html1", function () {
		const s = new GsBuilderToString();
		s.node("html").att("lang").val("en").list(s => {
			s.node("head").list(s => {
				s.node("title").mixed().text("my title").end();
			}).end();
			s.node("body").list(s => {
				s.node("p").att("class").val("a b").mixed().text("a").node("em").mixed().text("1").end().text("b c ").end();
			}).end();
		}).end();
		expect(s.toString()).toEqual('<html lang=en[<head[<title`my title`>]><body[<p class=\'a b\'`a<em`1`>b c `>]>]>');
	});

	it("json1", function () {
		const s = new GsBuilderToString();
		s.map(s => {
			s.prop("str").text("string", true);
			s.prop("num").text("12", false);
			s.prop("null").text("null", false);
			s.prop("array").list(s => {
				s.text("raw", false);
				s.text("escape \"quote\"", true);
				s.text("escape \"quote\" by bound", "");
			}).end();
			s.prop("object").map(s => {
				s.prop("boolean true").text("true", false);
				s.prop("boolean false").text("false", false);
			}).end();
		}).end();
		expect(s.toString()).toEqual('{str="string"num=12 null=null array=[raw"escape \\"quote\\""!"escape "quote" by bound!"]object={\'boolean true\'=true\'boolean false\'=false}}');
	});

	it("comments", function () {
		const s = new GsBuilderToString();
		s.nodeSpecial("#", "TODO").att("by").val("sys").text("...").end();
		expect(s.toString()).toEqual('<#TODO by=sys"...">');
	});

	it("tailAttributes", function () {
		const s = new GsBuilderToString();
		s.node("1").text("xx").att("hash").val("12").end();
		s.node("2").list().text("xx").att("hash").val("12").end();
		s.node("3").att("before").map().att("h1").att("h2").end();
		expect(s.toString()).toEqual('<1"xx"hash=12><2[xx]hash=12><3 before{}h1 h2>');
	});

});


function newBuilder(): [GsBuilderToLH<IGsLogicalHandler>, IGsWriter] {
	const w = new GsStringWriter();
	return [new GsBuilderToLH<IGsLogicalHandler>(buildSerializer(w)), w];
}