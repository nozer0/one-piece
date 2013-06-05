/**
 * User: nozer0
 * Date: 2/5/13
 * Time: 4:33 PM
 */

define(function (require, exports, module) {
	'use strict';
	var add = require('./math').add;
	exports.increment = function (val) {
		return add(val, 1);
	};
});