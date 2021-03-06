/**
 * Author   : nozer0
 * Email    : c.nozer0@gmail.com
 * Modified : 2013-06-13 21:32
 * Name     : require-shim.js
 */

/*global define */
define(function () {
	'use strict';

	var exec = define.execModule;
	define.execModule = function (module) {
		var t = define.shims[module.id];
		if (t) {
			module.exports = define.global[t];
		}
		return exec(module);
	};
});
