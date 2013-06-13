/*global define */
define(function (require) {
	'use strict';

	var assert = require('util/assert'), console = require('util/console').constructor();
	require('util/test').run({
		testLog	: function() {
			assert.equal(console.log('hello', 'world'), 'hello world');
			assert.equal(console.log('%s world', 'hello'), 'hello world');
			assert.equal(console.log('%d, %d, %d', 1, 2, 3), '1, 2, 3');
			assert.equal(console.log('%d, %d, %d', 1, 2), '%d, %d, %d 1 2');
			assert.equal(console.log('%d, %d, %d', 1, 2, 3, 4), '1, 2, 3 4');
		}
	});
});