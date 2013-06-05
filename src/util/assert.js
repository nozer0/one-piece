/**
 * Author   : nozer0
 * Email    : c.nozer0@gmail.com
 * Modified : 2013-06-03 16:18
 * Name     : util/assert.js
 */

	// http://wiki.commonjs.org/wiki/Unit_Testing/1.0
define(function (require, exports, module) {
	'use strict';
	var AssertionError = exports.AssertionError = function (cfg) {
		var msg = this.message = (cfg && cfg.message) || 'AssertionError';
		this.name = 'AssertionError';
		if (cfg) {
			this.actual = cfg.actual;
			this.expected = cfg.expected;
		}
		Error.call(this, msg);
	}, deep;
	AssertionError.prototype = new Error();
	AssertionError.prototype.constructor = AssertionError;
	deep = function (actual, expected, matched, ematched) {
		var t = typeof actual, i, l, p, o, o2;
		if (t !== 'object') { return actual === expected; }
		if (typeof expected !== 'object') { return false; }
		// avoid cycle references
		for (i = 0, l = matched.length; i < l; i += 1) {
			if (matched[i] === actual) { return ematched[i] === expected; }
		}
		matched.push(actual);
		ematched.push(expected);

		l = 0;
		for (p in actual) {
			if (actual.hasOwnProperty(p)) {
				if (!expected.hasOwnProperty(p)) { return false; }
				l += 1;
				o = actual[p];
				o2 = expected[p];
				if (typeof o === 'object') {
					if (o.constructor === Date) {
						if (String(o) !== String(expected[p])) {
							return false;
						}
					} else if (!deep(o, o2, matched, ematched)) {
						return false;
					}
				} else if (o !== expected[p]) {
					return false;
				}
			}
		}
		for (p in expected) {
			if (expected.hasOwnProperty(p)) {
				l -= 1;
			}
		}
		return !l && actual.prototype === expected.prototype;
	};
	module.exports = {
		AssertionError : AssertionError,
		ok             : function (guard, msg) {
			if (!guard) {
				throw new AssertionError({message : msg, actual : guard, expected : true});
			}
		},
		equal          : function (actual, expected, msg) {
			if (actual != expected && (actual && actual.constructor !== Date || String(actual) !== String(expected))) {
				throw new AssertionError({message : msg, actual : actual, expected : expected});
			}
		},
		notEqual       : function (actual, expected, msg) {
			if (actual == expected || (actual && actual.constructor === Date && String(actual) === String(expected))) {
				throw new AssertionError({message : msg, actual : actual, expected : expected});
			}
		},
		strictEqual    : function (actual, expected, msg) {
			if (actual !== expected) {
				throw new AssertionError({message : msg, actual : actual, expected : expected});
			}
		},
		notStrictEqual : function (actual, expected, msg) {
			if (actual === expected) {
				throw new AssertionError({message : msg, actual : actual, expected : expected});
			}
		},
		deepEqual      : function (actual, expected, msg) {
			if (!deep(actual, expected, [], [])) {
				throw new AssertionError({message : msg, actual : actual, expected : expected});
			}
		},
		notDeepEqual   : function (actual, expected, msg) {
			if (deep(actual, expected, [], [])) {
				throw new AssertionError({message : msg, actual : actual, expected : expected});
			}
		},
		throws         : function (block, error_opt, msg) { throw new AssertionError({message : msg}); }
	};
});
