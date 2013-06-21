/*global define */
define(function (require) {
	'use strict';
	var inc = require('./increment').increment, a = 1;
	inc(a); // 2
});