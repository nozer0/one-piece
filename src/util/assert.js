/**
 * Author   : nozer0
 * Email    : c.nozer0@gmail.com
 * Modified : 2013-08-19 22:51
 * Name     : util/assert.js
 */

/*global define */
// http://wiki.commonjs.org/wiki/Unit_Testing/1.0
define(function (require, exports, module) {
	'use strict';

	var inspect = define.global.JSON ? function (o) {
		try {
			return JSON.stringify(o);
		} catch (ignore) {   // cyclic reference
			var another = {}, os = [o], p, t, i, l;
			for (p in o) {
				if (o.hasOwnProperty(p)) {
					t = o[p];
					if (t.constructor === Object) {
						for (i = 0, l = os.length; i < l; i += 1) {
							if (os[i] === t) {
								another[p] = '[cyclic object]';
								break;
							}
						}
						if (i === l) {
							os.push(t);
							another[p] = t;
						}
					} else {
						another[p] = t;
					}
				}
			}
			return JSON.stringify(another);
		}
	} : function (o) {
		if (o) {
			if (o.toSource && (o.constructor === Object || o.constructor === Array)) { return o.toSource(); }
			if (o.constructor === Date) { return o.toISOString(); }
		}
		return o;
	}, AssertionError = function (cfg) {
		var msg = this.message = (cfg && cfg.message) || 'AssertionError';
		this.name = 'AssertionError';
		if (cfg) {
			this.actual = cfg.actual;
			this.expected = cfg.expected;
			this.message = (this.message ? this.message + ', expected: ' : 'expected: ') + inspect(this.expected) + ', actual: ' + inspect(this.actual);
		}
		Error.call(this, msg);
	}, deep;
	AssertionError.prototype = new Error();
	AssertionError.prototype.constructor = AssertionError;
	AssertionError.prototype.toString = function () { return this.message; };
	deep = function (actual, expected, matched, matched2) {
		var t = typeof actual, i, l, p, o, o2;
		if (t !== 'object') { return actual === expected; }
		if (typeof expected !== 'object') { return false; }
		// avoid cycle references
		for (i = 0, l = matched.length; i < l; i += 1) {
			if (matched[i] === actual) {
				return matched2[i] === expected;
			}
		}
		matched.push(actual);
		matched2.push(expected);

		l = 0;
		for (p in actual) {
			if (actual.hasOwnProperty(p)) {
				if (!expected.hasOwnProperty(p)) {
					return false;
				}
				l += 1;
				o = actual[p];
				o2 = expected[p];
				if (typeof o === 'object') {
					if (o.constructor === Date) {
						if (String(o) !== String(expected[p])) {
							return false;
						}
					} else if (!deep(o, o2, matched, matched2)) {
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
		/**
		 * Extend error object inherits from `Error`.
		 *
		 * @param {object}  cfg     Configuration object, includes the options below.
		 *  {string}    message     The error message string, default is 'AssertionError'.
		 *  {*}         actual      The actual result object, required.
		 *  {*}         expected    The expected result object, required.
		 */
		AssertionError : AssertionError,
		ok             : function (guard, msg) {
			if (!guard) {
				throw new AssertionError({message : msg, actual : guard, expected : true});
			}
		},
		equal          : function (actual, expected, msg) {
			//noinspection JSHint
			if (actual != expected && (!actual || actual.constructor !== Date || String(actual) !== String(expected))) {
				throw new AssertionError({message : msg, actual : actual, expected : expected});
			}
		},
		notEqual       : function (actual, expected, msg) {
			//noinspection JSHint
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
		throws         : function (actual, expected, msg) {
			throw new AssertionError({message : msg, actual : actual, expected : expected});
		}
	};
});
