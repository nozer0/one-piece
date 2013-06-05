/**
 * User: nozer0
 * Date: 2/5/13
 * Time: 4:33 PM
 */

define(function (require, exports, module) {
	'use strict';
	exports.add = function () {
		var sum = 0, i = 0, args = arguments, l = args.length;
		while (i < l) {
			sum += args[i++];
		}
		return sum;
	}
});