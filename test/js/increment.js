/*global define */
define(function (require, exports) {
	'use strict';
	var add = require('./math').add;
	exports.increment = function (val) {
		return add(val, 1);
	};
});