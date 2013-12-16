/*global define */
define(function (require, exports) {
	'use strict';
	exports.add = function () {
		var sum = 0, i = 0, l = arguments.length;
		while (i < l) {
			sum += arguments[i];
			i += 1;
		}
		return sum;
	};
});