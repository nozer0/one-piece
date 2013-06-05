/**
 * Author   : nozer0
 * Email    : c.nozer0@gmail.com
 * Modified : 2013-06-03 14:48
 * Name     : util/test.js
 */

	// http://wiki.commonjs.org/wiki/Unit_Testing/1.0
define(function (require, exports) {
	'use strict';
	var console = define.modules.hasOwnProperty('util/console') ? require('util/console').constructor() : (this || window || {}).console || {log : 1, error : 1}, inspect = function (o) {
		if (JSON) {
			try {
				return JSON.stringify(o);
			} catch (e) {   // cyclic reference
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
		}
		if (o) {
			if (o.toSource && (o.constructor === Object || o.constructor === Array)) { return o.toSource(); }
			if (o.constructor === Date) { return o.toISOString(); }
		}
		return o;
	}, success = function (name, notall) {
		console.info(name || 'o_p', 'passed');
		if (!notall) {
			this.passed += 1;
			this.tested += 1;
			if (this.tested === this.total) {
				this.finish();
			}
		}
	}, fail = function (name, notall, e) {
		console.error(name || 'o_p', 'failed', e ? ', expected: ' + inspect(e.expected) + ', actual: ' + inspect(e.actual) : '');
		if (!notall) {
			this.tested += 1;
			if (this.tested === this.total) {
				this.finish();
			}
		}
	}, finish = function () {
		var t = new Date(), i = this.total, passed = this.passed;
		if (typeof this.tearDown === 'function') {
			this.tearDown();
		}
//		console.log('--->>>');
		console.log('End test', this.name || 'o_p', '(' + t.toLocaleTimeString() + '), time:', t - this.start, 'ms, total:', i, ', success:', passed, ', failed:', i - passed);
		console.groupEnd();
	};
	exports.run = function (cases) {
		var p, t = cases.start = new Date(), ret, async;
		cases.success = success;
		cases.fail = fail;
		cases.finish = finish;
		cases.total = cases.tested = cases.passed = 0;
		console.group('Start test ' + (cases.name || 'o_p') + ' (' + t.toLocaleTimeString() + '):');
		if (typeof cases.setUp === 'function') {
			cases.setUp();
		}
		for (p in cases) {
			if (cases.hasOwnProperty(p) && p.indexOf('test') === 0 && typeof cases[p] === 'function') {
				cases.total += 1;
				try {
					ret = cases[p]();
					if (ret === false) {
						async = true;
					} else {
						cases.passed += 1;
						cases.tested += 1;
						console.info(p + ' passed');
					}
				} catch (e) {
					cases.tested += 1;
					console.error(cases.name || 'o_p', 'failed', e ? ', expected: ' + inspect(e.expected) + ', actual: ' + inspect(e.actual) : '');
				}
			}
		}
		if (!async) {
			cases.finish();
		}
		return cases;
	};
});
