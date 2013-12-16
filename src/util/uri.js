/**
 * Author   : nozer0
 * Email    : c.nozer0@gmail.com
 * Modified : 2013-08-20 00:17
 * Name     : util/uri.js
 */

/*global define */
define(function (require, exports) {
	'use strict';

	var _base = '', _maps = [], loc_re = /^(?:(\w+:)\/\/)?(([^:\/]+):?([\d]+)?)([^?#]+?([^\/?#]+?)?(\.\w*)?)(\?[^#]+)?(#\S*)?$/, protocol_re = /^\w+:\/\/\w/, root_re = /\w+:\/\/[^\/#?]+/, base_re = /[^\/]*$/, slash_re = /\/{2,}/g, relative_re = /\/\.(?=\/)/g, parent_re = /[^\/]+\/\.\.\//, location = define.global.location, normalize;
	/**
	 * Returns the location object based on the set `uri` parameter, which is the same as global location object.
	 *
	 * @param {string}  uri     The URI string to be parsed, required.
	 */
	exports.location = function (uri) {
		var t = loc_re.exec(uri);
		return t ? {uri : t[1] ? uri : 'http://' + uri, protocol : t[1] || 'http:', host : t[2], hostname : t[3], port : t[4] || '', pathname : t[5] || '', basename : t[6] || '', ext : t[7] || '', search : t[8] || '', hash : t[9] || ''} : {uri : uri};
	};

	/**
	 * Returns whether the `uri` is on the same host of set `host` or current host.
	 *
	 * @param {string}  uri     The URI string to be checked, required.
	 * @param {string}  host    The host name to be checked, default use current host.
	 */
	exports.isSameHost = function (uri, host) {
		var t = root_re.exec(uri);
		return t && t[0] === (host || (location && (location.protocol + '//' + location.host)));
	};

	/**
	 * Normalizes the `uri` string including '///', './' or '../' pattern into normal URI format string.
	 *
	 * @param {string}  uri     The URI string to be normalized.
	 */
	exports.normalize = normalize = function (uri) {
		var s = uri.replace(slash_re, '/').replace(':/', '://').replace(relative_re, '');
		while (parent_re.test(s)) {
			s = s.replace(parent_re, '');
		}
		return s;
	};

	/**
	 * Resolves the `uri` string based on the set `base` string, and apply the changes from assigned `maps` object.
	 *
	 * @param {string}  uri     The URI string to be resolved.
	 * @param {string}  base    Base string.
	 * @param {Array}   maps    Object like ['en-us', 'zh-cn'] to replace all 'en-us' strings in `uri` string to 'zh-cn'.
	 */
	exports.resolve = function (uri, base, maps) {
		var s = uri, i, l, t;
		if (typeof base === 'Object') {
			//noinspection JSUnresolvedVariable
			maps = base.maps;
			base = base.base;
		}
		if (!protocol_re.test(s)) {
			t = typeof base === 'string' ? base : _base;
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
		for (s = normalize(s), i = 0, t = maps ? maps.concat(_maps) : _maps, l = t.length; i < l; i += 1) {
			s = s.replace(t[i], t[i += 1]);
		}
		return s;
	};

	/**
	 * Sets the global configuration like `base` and `maps` which applied for all `resolve` methods.
	 *
	 * @param {Object}  cfg     The configuration object includes 'base' and 'maps' options.
	 */
	exports.config = function (cfg) {
		var k, src, i, l, m, s;
		if (cfg.hasOwnProperty('base')) { _base = cfg.base; }
		src = cfg.maps;
		if (src) {
			for (i = 0, l = src.length, m = _maps.length; i < l; i += 2) {
				for (s = String(src[i]), k = 0; k < m; k += 2) {
					if (String[_maps[k]] === s) {
						_maps[i + 1] = src[k + 1];
						break;
					}
				}
				if (k >= m) {    // no same map
					_maps.push(src[i], src[i + 1]);
				}
			}
		}
		return this;
	};

	/**
	 * Clears the current global configuration.
	 */
	exports.clearConfig = function () {
		_base = '';
		_maps = [];
		return this;
	};
});
