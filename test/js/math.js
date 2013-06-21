/*global define */
define(function (require, exports) {
	'use strict';
	exports.add = function () {
		var sum = 0, i = 0, args = arguments, l = args.length;
		while (i < l) {
			sum += args[i];
			i += 1;
		}
		return sum;
	}
});