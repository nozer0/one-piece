/*global require */
require('util/test').run({
	name    : 'console',
	setUp   : function () {
		this.assert = require('util/assert');
		this.console = require('util/console').constructor();
	},
	testLog : function () {
		var assert = this.assert, console = this.console;
		assert.equal(console.log('hello', 'world'), 'hello world');
		assert.equal(console.log('%s world', 'hello'), 'hello world');
		assert.equal(console.log('%d, %d, %d', 1, 2, 3), '1, 2, 3');
		assert.equal(console.log('%d, %d, %d', 1, 2), '%d, %d, %d 1 2');
		assert.equal(console.log('%d, %d, %d', 1, 2, 3, 4), '1, 2, 3 4');
	}
});