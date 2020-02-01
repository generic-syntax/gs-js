import {IGsEventNode} from "../api/gs.js";
import {GSGR, GsgrConfig, GsgrTypeBase, IGsgrContext} from "../src/profileGraph/gsgr.js";

const EMPTY = new GsgrConfig();

class User {
	delegations: { u: User, date: Date, days: number }[];

	constructor(
		public account?: string,
		public name?: string,
		public chief?: User,
		public groups?: Group[]
	) {}

	addTemporaryDelegation(u: User, date: Date, days: number) {
		(this.delegations || (this.delegations = [])).push({u, date, days});
	}
}

class Group {
	aliases: string[];

	constructor(
		public id?: number,
		public name?: string
	) {}

	addAlias(alias: string) {
		(this.aliases || (this.aliases = [])).push(alias);
	}
}

class GsgrClassDate extends GsgrTypeBase<Date> {
	create(node: IGsEventNode, context: IGsgrContext): Date {
		return new Date(node.getAttr("day") || null);
	}
}

const USERS = new GsgrConfig()
	.addClass(User, "User", ["addTemporaryDelegation"])
	.addClass(Group, "Group", ["addAlias"])
	.addByName("Date", new GsgrClassDate());


describe("gsgr", function () {

	it("empty", async function () {
		await checkGsgr(EMPTY, "{}", [{}]);
		await checkGsgr(EMPTY, "[]", [[]]);
		await checkGsgr(EMPTY, "12", [12]);
		await checkGsgr(EMPTY, '"a"', ["a"]);
		await checkGsgr(EMPTY, "true T false F", [true, true, false, false]);
		await checkGsgr(EMPTY, "null N", [null, null]);
		await checkGsgr(EMPTY, "undefined U", [undefined, undefined]);
		await checkGsgr(EMPTY, "9007199254740991n", [BigInt("9007199254740991")]);
		await checkGsgr(EMPTY, '{s1={s11={}}s2={}s3={s31={}}}', [{s1: {s11: {}}, s2: {}, s3: {s31: {}}}]);
		await checkGsgr(EMPTY, '{a=1<#TODO[true false]>b=[2<#TODO{z="s"}>3]}', [{a: 1, b: [2, 3]}]);
	});


	it("users", async function () {
		await checkGsgr(USERS, "<User>", [new User()]);
		await checkGsgr(USERS, "<User account='2197' name='John Merting'>", [new User("2197", "John Merting")]);

		await checkGsgr(USERS, `
<User {
  account= "2197"
  name= "John Merting"
}>`,
			[new User("2197", "John Merting")]);

		await checkGsgr(USERS, `
<User account='2197' name='John Merting'{
  chief= <User account='2123' name='Marc Dublof'>
}>`,
			[new User("2197", "John Merting", new User('2123', 'Marc Dublof'))]);


	});


	const MARC = new User('2123', 'Marc Dublof');

	it("users_ref", async function () {
		await checkGsgr(USERS, `
<User account='2123' name='Marc Dublof' %id=u1>
<User account='2197' name='John Merting'{
  chief= <%ref "u1">
}>`,
			[MARC, new User("2197", "John Merting", MARC)]);
	});

	const G1 = new Group(1, "Admin");

	it("users_ref_async", async function () {
		await checkGsgr(USERS, `
<User account='2197' name='John Merting'{
  chief= <%ref "u1">
  groups= [
  	<%ref "g1">
  	<Group id=2>
  ]
}>
<User account='2123' name='Marc Dublof' %id=u1>
<Group id=1 name='Admin' %id=g1>
`,
			[new User("2197", "John Merting", MARC, [G1, new Group(2)]), MARC, G1]);
	});


	it("users_call", async function () {
		const ADMIN = new Group(1, "Admin");
		ADMIN.addAlias("administrators");
		await checkGsgr(USERS, `
<Group id=1 name='Admin' %id=g1 {
	addAlias= <%call [ "administrators" ]>
}>
`,
			[ADMIN]);
	});


	it("users_call_deleg", async function () {
		const MAD = new User('2123', 'Marc Dublof');
		const JOM = new User("2197", "John Merting", MAD);
		MAD.addTemporaryDelegation(JOM, new Date("2019-12-22"), 14);

		await checkGsgr(USERS, `
<User account='2197' name='John Merting' %id=u2 {
  chief= <%ref "u1">
}>
<User account='2123' name='Marc Dublof' %id=u1 {
	addTemporaryDelegation= <%call[
		<%ref "u2">
		<Date day='2019-12-22'>
		14
	]>
}>
`,
			[JOM, MAD]);
	});


	it("users_call_deleg_async", async function () {
		const MAD = new User('2123', 'Marc Dublof');
		const JOM = new User("2197", "John Merting", MAD);
		MAD.addTemporaryDelegation(JOM, new Date("2019-12-22"), 14);

		await checkGsgr(USERS, `
<User account='2123' name='Marc Dublof' %id=u1 {
	addTemporaryDelegation= <%call [ <%ref "u2"> <Date day='2019-12-22'> 14]>
}>
<User account='2197' name='John Merting' %id=u2 {
  chief= <%ref "u1">
}>
`,
			[MAD, JOM]);
	});

});

async function checkGsgr(config: GsgrConfig, gsgr: string, rootObjects: any) {
	const result = await GSGR.parse(gsgr, config);
	if (!equals(result.rootObjects, rootObjects, new Set())) {
		console.log(gsgr, rootObjects);
		throw Error(gsgr);
	}
}

function equals(o1: any, o2: any, done: Set<any>) {
	if (o1 === null && o2 === null) return true;
	if (o1 === undefined && o2 === undefined) return true;
	if (o1 == null || o2 == null) return false;
	//recursivity
	if (done.has(o1)) return true;
	done.add(o1);

	const t1 = typeof o1;
	if (t1 !== typeof o2) return false;
	if (t1 === "object") {
		if (o1.constructor !== o2.constructor) return false;
		const p1 = Object.getOwnPropertyNames(o1);
		const p2 = Object.getOwnPropertyNames(o2);
		if (p1.length !== p2.length) return false;
		for (let k of p1) {
			if (!equals(o1[k], o2[k], done)) return false;
		}
	} else if (t1 === "function" || t1 === "symbol") {
		//no eval equals possible ?
	} else {
		//primitive value
		if (o1 != o2) return false;
	}
	return true;
}