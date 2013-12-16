/**
 * Author   : nozer0
 * Email    : c.nozer0@gmail.com
 * Modified : 2013-06-21 19:18
 * Name     : dom/meta.js
 */

/*global define */
define(function (require, exports) {
	'use strict';

	var global = define.global || window, nav = global.navigator, ua = nav.userAgent, maps = {CriOS : 'Chrome', Version : 'Safari'}, t;
	if (nav.taintEnabled === undefined) {
		t = ua.match(/it\/(\d+\.\d+).*\([^)]+\) (\w+)\/(\d+\.\d+)/);
		if (t) {
			exports.Webkit = +t[1];
			exports[maps[t[2]] || t[2]] = +t[3];
		} else {
			exports.Webkit = 0;
		}
		exports.kernel = 'Webkit';
	} else if (global.ActiveXObject !== undefined) {
		t = ua.match(/IE (\d+\.\d+)/);
		exports.Trident = exports.IE = t ? +t[1] : 0;
		exports.kernel = 'Trident';
	} else if (global.crypto !== undefined) {
		t = ua.match(/rv:(\d+\.\d+)/);
		exports.Gecko = exports.Firefox = t ? +t[1] : 0;
		exports.kernel = 'Gecko';
	} else if (global.opera !== undefined) {
		t = ua.match(/to\/(\d+\.\d+)/);
		exports.Presto = t ? +t[1] : 0;
		exports.kernel = 'Presto';
		exports.Opera = +(ua.match(/on\/(\d+\.\d+)/) || [])[1];
	}
	exports.platform = nav.platform;
	exports.language = (nav.language || nav.userLanguage || 'en').toLowerCase();
	exports.navigator = ua;
});
