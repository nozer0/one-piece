/*global require */
require('util/test').run({
	name    : 'console',
	testLog : function () {
		var assert = require('util/assert'), console = require('util/console');
		assert.equal(console.log('hello', 'world'), 'hello world');
		assert.equal(console.log('%s world', 'hello'), 'hello world');
		assert.equal(console.log('%d, %d, %d', 1, 2, 3), '1, 2, 3');
		assert.equal(console.log('%d, %d, %d', 1, 2), '%d, %d, %d 1 2');
		assert.equal(console.log('%d, %d, %d', 1, 2, 3, 4), '1, 2, 3 4');
	}
});