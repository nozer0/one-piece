/**
 * Author   : nozer0
 * Email    : c.nozer0@gmail.com
 * Modified : 2013-11-05 23:33
 * Name     : util.js
 */

/*global define */
define(function (require, exports) {
	'use strict';

	//noinspection JSUnusedLocalSymbols
	function replacer(m, m1) { return m1.toUpperCase(); }

	/**
	 * Formats the strings from snake style('text-color') to camelCase style('textColor').
	 *
	 * @param {string}  s           The string to be formatted, required.
	 * @param {string}  separator   The separator string, default is hyphen('-').
	 */
	exports.camelCase = function (s, separator) {
		return s.replace(new RegExp((separator || '-') + '([a-z])', 'g'), replacer);
	};

	/**
	 * Formats the strings from camelCase style('textColor') to snake style('text-color').
	 *
	 * @param {string}  s           The string to be formatted, required.
	 * @param {string}  separator   The separator string, default is hyphen('-').
	 */
	exports.hyphenate = function (s, separator) {
		var sep = separator || '-';
		return s.replace(/[A-Z]/g, function (m) { return sep + m.toLowerCase(); });
	};

	var plurals = {
		'quiz'   : 'quizzes',
		'matrix' : 'matrices',
		'vertex' : 'vertices',
		'index'  : 'indices',
		'child'  : 'children',
		'person' : 'people',
		'foot'   : 'feet',
		'tooth'  : 'teeth',
		'mouse'  : 'mice',
		'ox'     : 'oxen',
		'money'  : 'monies',
		'turf'   : 'turfs'
	}, re_es = /(?:s|sh|ch|x|^potato|^tomato)$/, re_y = /(?:[^aeiouy]|qu)y$/, re_f = /(?:[^f]fe|[lr]f)$/, re_man = /man$/, re_um = /[ti]um$/, re_means = /^(?:deer|sheep|fish|people|police|cattle)$/;
	/**
	 * Returns the plural word of set `name`.
	 * @param {string}  name    The singular word, required.
	 */
	exports.pluralize = function (name) {
		return plurals.hasOwnProperty(name) ? plurals[name] : re_es.test(name) ? name + 'es' : re_y.test(name) ? name.replace(/y$/, 'ies') : re_f.test(name) ? name.replace(/f$/, 'ves') : re_man.test(name) ? name.replace(re_man, 'men') : re_um.test(name) ? name.replace(/um$/, 'a') : re_means.test(name) ? name : name + 's';
	};

	/**
	 * Mixin the data from `src` object to `dest` object, and return it.
	 *
	 * @param {Object}  dest    The destination object to mixin to, required.
	 * @param {Object}  src     The source object to mixin from, required.
	 */
	exports.mixin = function (dest, src) {
		var p;
		for (p in src) {
			if (src.hasOwnProperty(p)) {
				dest[p] = src[p];
			}
		}
		return dest;
	};

	function _match(v1, v2, op) {
		var l;
		switch (op) {
			case '>':
				return v1 > v2;
			case '>=':
				return v1 >= v2;
			case '<':
				return v1 < v2;
			case '<=':
				return v1 <= v2;
			case '!=':
				//noinspection JSHint
				return v1 != v2;
			case 'not in':
				if (v2.indexOf) { return v2.indexOf(v1) === -1; }
				for (l = v2.length; l;) {
					if (v1 === v2[l -= 1]) { return false; }
				}
				return true;
			case 'like':
				return new RegExp('^' + v2.replace(/%/g, '.+').replace(/\?/g, '.').replace(/\\/g, '\\').replace(/\$/g, '\\$') + '$').test(v1);
			default:
				if (op === 'in' || v2 instanceof Array) {
					if (v2.indexOf) { return v2.indexOf(v1) !== -1; }
					for (l = v2.length; l;) {
						if (v1 === v2[l -= 1]) { return true; }
					}
					return false;
				}
				//noinspection JSHint
				return v1 == v2;
		}
	}

	/**
	 * Returns the result that the `data` matches by the set `conditions` or not.
	 * @param {Object}  data        The data to be checked, required.
	 * @param {Object}  conditions  The conditions that data need to match, required.
	 */
	exports.match = function (data, conditions) {
		var p, t;
		for (p in conditions) {
			if (conditions.hasOwnProperty(p) && p !== 'or') {
				t = conditions[p];
				if (t && typeof t === 'object' ? !_match(data[p], t.op ? t.value : t, t.op) : !_match(data[p], t)) { return false; }
			}
		}
		return true;
	};

	/**
	 * Creates a function extends from parent function, it inherits properties and methods from both prototype and constructor of parent function.
	 *
	 * @param {Function}    Parent      The parent function extended from, required.
	 * @param {Object}      properties  Additional prototype properties and methods for the extend function.
	 * @param {Object}      statics     Additional constructor properties and methods for the extend function.
	 */
	exports.extend = function (Parent, properties, statics) {
		if (typeof Parent !== 'function') { return; }
		//noinspection JSPrimitiveTypeWrapperUsage
		var constructor = properties && properties.hasOwnProperty('constructor') ? properties.constructor : function () {
			return Parent.apply(this, arguments);
		}, proto = constructor.prototype = new Parent(), p;
		proto.constructor = constructor;
		for (p in properties) {
			if (properties.hasOwnProperty(p)) {
				proto[p] = properties[p];
			}
		}
		// static properties and methods
		for (p in Parent) {
			if (Parent.hasOwnProperty(p)) {
				constructor[p] = Parent[p];
			}
		}
		for (p in statics) {
			if (statics.hasOwnProperty(p)) {
				constructor[p] = statics[p];
			}
		}
		return constructor;
	};
});
