/*global require */
require('util/test').run({
	name               : 'assert',
	setUp              : function () {
		this.assert = require('util/assert');
	},
	testOK             : function () {
		var assert = this.assert;
		assert.ok(1);
		assert.ok([]);
	},
	testEqual          : function () {
		var assert = this.assert
		assert.equal(1, true);
		assert.equal(0, false);
		assert.equal('', 0);
		assert.equal([], false);
		assert.equal('123', 123);
		assert.equal(new Date(), new Date());
	},
	testNotEqual       : function () {
		var assert = this.assert
		assert.notEqual(1, 0);
		assert.notEqual([1], [1]);
		assert.notEqual({}, {});
	},
	testStrictEqual    : function () {
		this.assert.strictEqual(123, 123);
	},
	testNotStrictEqual : function () {
		var assert = this.assert
		assert.notStrictEqual(1, true);
		assert.equal([], false);
		assert.notStrictEqual('123', 123);
		assert.notStrictEqual(new Date(), new Date());
	},
	testDeepEqual      : function () {
		var assert = this.assert, o = {i : 1, d : new Date(), s : 'abc', a : [1, 2], o : {x : 1, y : 2}}, o2 = {i : 1, d : new Date(), s : 'abc', a : [1, 2], o : {x : 1, y : 2}};
		assert.deepEqual([1, 2, 3], [1, 2, 3]);
		assert.deepEqual(o, o2);
		o.o = o;
		assert.notDeepEqual(o, o2);
		o2.o = o2;
		assert.deepEqual(o, o2);
	}
});