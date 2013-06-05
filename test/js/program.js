/**
 * User: nozer0
 * Date: 2/5/13
 * Time: 4:33 PM
 */

define(function (require, exports, module) {
	'use strict';
	var inc = require('./increment').increment;
	var a = 1;
	inc(a); // 2
});