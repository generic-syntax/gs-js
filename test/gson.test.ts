import {GsMultiLH} from "../src/core/gsHelpers.js";
import {GsParser} from "../src/core/gsParser.js";
import {GsSerializer, GsStringWriter} from "../src/core/gsSerializer.js";
import {GsFromJson, GSON, GsToJsonLH} from "../src/profileOn/gson.js";

describe("gson", function () {

	it("single", function () {
		toGs("", '""');
		toGs("str", '"str"');
		toGs({}, '{}');
		toGs([], '[]');
		toGs(null, 'null');
		toGs(true, 'true');
		toGs(false, 'false');
		toGs(34, '34');
		toGs(12.656, '12.656');
		toGs(-12.656, '-12.656');
	});

	it("array", function () {
		toGs(["str", 12, false, null], '["str"12 false null]');
		toGs([true, ["", -.2, []]], '[true[""-0.2[]]]');
	});

	it("object", function () {
		toGs({a: 12, "my prop": "p", sub: {}}, `{a=12'my prop'="p"sub={}}`);
	});

	it("nullProp", function () {
		toGs({a: null}, `{a}`);
	});

	it("deep", function () {
		toGs({s1: {s11: {}}, s2: {}, s3: {s31: {}}}, '{s1={s11={}}s2={}s3={s31={}}}');
		toGs({s1: {s11: {}, s12: {}}}, '{s1={s11={}s12={}}}');
		toGs({s1: {s11: {s111: {}, s112: [1121, "1122", {}], s113: {}}}}, '{s1={s11={s111={}s112=[1121"1122"{}]s113={}}}}');
	});

	it("comments", function () {
		gsToJson('[1<#a[xx]>2]', [1, 2]);
		gsToJson('{a=1<#TODO"cmt">b=[2<#TODO"cmt">3]}', {a: 1, b: [2, 3]});
		gsToJson('{a=1<#TODO[true false]>b=[2<#TODO{z="s"}>3]}', {a: 1, b: [2, 3]});
	});

	it("edgeCases", function () {
		toGs([null, undefined, NaN, Infinity, -Infinity, function () {}, Symbol("x")], '[null null null null null null null]');
		toGs([new Boolean(true), new Boolean(false), new String('x'), new Number(12)], '[true false"x"12]');
		toGs(new Date("2019-11-24"), '"2019-11-24T00:00:00.000Z"');

		toGs({[Symbol('foo')]: 'foo'}, '{}');


		// String-keyed array elements are not enumerable and make no sense in JSON
		let a: any = ['foo', 'bar'];
		a['baz'] = 'quux';      // a: [ 0: 'foo', 1: 'bar', baz: 'quux' ]
		toGs(a, '["foo""bar"]');

		// Standard data structures
		toGs([new Set([1]), new Map([[1, 2]]), new WeakSet([{a: 1}]), new WeakMap([[{a: 1}, 2]])], '[{}{}{}{}]');

		// TypedArray
		toGs([new Int8Array([1]), new Int16Array([1]), new Int32Array([1])], '[{0=1}{0=1}{0=1}]');
		toGs([new Uint8Array([1]), new Uint8ClampedArray([1]), new Uint16Array([1]), new Uint32Array([1])], '[{0=1}{0=1}{0=1}{0=1}]');
		toGs([new Float32Array([1]), new Float64Array([1])], '[{0=1}{0=1}]');

		// toJSON()
		toGs({x: 5, y: 6, toJSON() { return this.x + this.y; }}, '11');

		// Symbols:
		toGs({[Symbol('foo')]: 'foo'}, '{}');
		toGs({x: undefined, y: Object, z: Symbol('')}, '{}');

		// Non-enumerable properties:
		toGs(Object.create(null, {x: {value: 'x', enumerable: false}, y: {value: 'y', enumerable: true}}), '{y="y"}');

		// BigInt values throw
		if (window.BigInt) expect(() => GSON.stringify({x: BigInt(2)})).toThrow();
	});


	it("gsMultiRoot", function () {
		//gsToJson('3 4 true false null', [3, 4, true, false, null]);
		gsToJson('3 4 true false null', [3, 4, true, false, null]);
		//gsToJson('"a"12 true true false -123.3 {a=1}[null{}{p=32 p2="33"}]', ["a", 12, true, true, false, -123.3, {a: 1}, [null, {}, {p:32, p2:"33"}]]);
	});

});

function toGs(jsonIn: any, gs?: string) {
	//json -> GsLogicalHandler
	//         |-> gs
	//         |-> json
	const toGs = new GsSerializer<GsStringWriter>();
	const toJson = new GsToJsonLH();
	new GsFromJson().setHandler(new GsMultiLH(toGs, toJson)).build(jsonIn);
	if (gs) expect(toGs.out.toString()).toEqual(gs);
	else console.log(toGs.out.toString());
	expect(JSON.stringify(toJson.result)).toEqual(JSON.stringify(jsonIn));
	//gs -> GsLogicalHandler -> json
	if (gs) {
		new GsParser(toJson.reset()).parse(gs);
		expect(JSON.stringify(toJson.result)).toEqual(JSON.stringify(jsonIn));
	}
}

function gsToJson(gs: string, jsonOut: any) {
	const toJson = new GsToJsonLH();
	new GsParser(toJson).parse(gs);
	expect(JSON.stringify(toJson.result)).toEqual(JSON.stringify(jsonOut));
}