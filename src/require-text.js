/**
 * Author   : nozer0
 * Email    : c.nozer0@gmail.com
 * Modified : 2013-08-20 19:28
 * Name     : require-text.js
 */

/*global define */
define(function () {
	'use strict';

	var load = require('base/load'), exts = load.extensions, ajax = require('dom/ajax'), onLoad = define.onLoad;
	load.setLoader('txt', function (uri, callback, ctx) {
		ajax.ajax({
			url       : uri,
			onsuccess : function (res) {
				callback.call(ctx, uri, true, res);
			},
			onfail    : function () {
				callback.call(ctx, uri, false);
			}
		});
	});
	exts.txt = 'txt';
	exts.log = 'txt';
	define.onLoad = function (uri, ret, res) {
		if (load.getType(uri) === 'txt') {
			var m = define.getModule(uri);
			m.exports = res;
		}
		onLoad(uri, ret);
	};
});
