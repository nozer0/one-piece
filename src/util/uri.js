/**
 * Author   : nozer0
 * Email    : c.nozer0@gmail.com
 * Modified : 2013-06-20 23:41
 * Name     : util/uri.js
 */

/*global define */
define(function (require, exports) {
	'use strict';

	var base = '', maps = [], loc_re = /^(?:(\w+:)\/\/)?(([^:\/]+):?([\d]+)?)([^?#]+?([^\/?#]+?)?(\.\w*)?)(\?[^#]+)?(#\S*)?$/, protocol_re = /^\w+:\/\/\w/, root_re = /\w+:\/\/[^\/#?]+/, base_re = /[^\/]*$/, slash_re = /\/{2,}/g, relative_re = /\/\.(?=\/)/g, parent_re = /[^\/]+\/\.\.\//, location = define.global.location, normalize;
	exports.location = function (uri) {
		var t = loc_re.exec(uri);
		return t ? { uri : t[1] ? uri : 'http://' + uri, protocol : t[1] || 'http:', host : t[2], hostname : t[3], port : t[4] || '', pathname : t[5] || '', basename : t[6] || '', ext : t[7] || '', search : t[8] || '', hash : t[9] || '' } : { uri : uri };
	};
	exports.isSameHost = function (uri, host) {
		var t = root_re.exec(uri);
		return t && t[0] === (host || (location && (location.protocol + '//' + location.host)));
	};
	/**
	 * Format the uri including '///', './' or '../' pattern to normal uri.
	 * @param {String}  uri the uri string to be normalized
	 */
	exports.normalize = normalize = function (uri) {
		var s = uri.replace(slash_re, '/').replace(':/', '://').replace(relative_re, '');
		while (parent_re.test(s)) {
			s = s.replace(parent_re, '');
		}
		return s;
	};
	/**
	 * Format the uri based on the passed base string, and apply the changes from passed maps.
	 * @param {String}  uri
	 * @param {String}  ubase   base string
	 * @param {String}  umaps   maps object, like ['en-us', 'zh-cn'] to replace all 'en-us' strings to 'zh-cn'
	 */
	exports.resolve = function (uri, ubase, umaps) {
		var s = uri, i, l, t;
		if (typeof ubase === 'Object') {
			umaps = ubase.maps;
			ubase = ubase.base;
		}
		if (!protocol_re.test(s)) {
			t = typeof ubase === 'string' ? ubase : base;
			if (t) {
				if (/^\//.test(s)) {    // IE7- returns undefined for s[0]
					t = root_re.exec(t);
					if (t) {
						s = t[0] + s;
					}
				} else {
					s = t.replace(base_re, s);
				}
			}
		}
		for (s = normalize(s), i = 0, t = umaps ? umaps.concat(maps) : maps, l = t.length; i < l; i += 1) {
			s = s.replace(t[i], t[i += 1]);
		}
		return s;
	};
	exports.config = function (cfg) {
		var k, src, i, l, m, s;
		if (!cfg) { return this; }
		if (cfg.hasOwnProperty('base')) { base = cfg.base; }
		src = cfg.maps;
		if (src) {
			for (i = 0, l = src.length, m = maps.length; i < l; i += 2) {
				for (s = String(src[i]), k = 0; k < m; k += 2) {
					if (String[maps[k]] === s) {
						maps[i + 1] = src[k + 1];
						break;
					}
				}
				if (k >= m) {    // no same map
					maps.push(src[i], src[i + 1]);
				}
			}
		}
		return this;
	};
	exports.clearConfig = function () {
		base = '';
		maps = [];
		return this;
	};
});
