/*global define */
define(function () {
	'use strict';

	var exec = define.execModule;
	define.execModule = function (module) {
		var t = define.shims[module.id];
		if (t) {
			module.exports = define.context[t];
		}
		return exec(module);
	};
});