/**
 * Author   : nozer0
 * Email    : c.nozer0@gmail.com
 * Modified : 2013-08-20 00:03
 * Name     : util/test.js
 */

/*global define */
// http://wiki.commonjs.org/wiki/Unit_Testing/1.0
define(function (require, exports) {
	'use strict';

	var g_console = define.global.console, console = define.modules.hasOwnProperty('util/console') ? require('util/console') : g_console || {log : 1, error : 1}, success = function (name, partial) {
		if (!partial) {
			var l = this.retry, t = this.times;
			if (l && (this.times = t ? t + 1 : 1) < l) {
				try {
					this[name]();
				} catch (e) {
					this.tested += 1;
					if (g_console && console !== g_console && g_console.error) {
						g_console.error(e);
					}
					console.error(name || '', 'failed --> ', e || '');
				}
			} else {
				console.info(name || '', l ? ' passed (' + l + ' times)' : ' passed');
				this.passed += 1;
				this.tested += 1;
				if (this.tested === this.total) {
					this.finish();
				}
			}
		}
	}, fail = function (name, partial, e) {
		if (g_console && console !== g_console && g_console.error) {
			g_console.error(e);
		}
		console.error(name || '', ' failed --> ', e || '');
		if (!partial) {
			this.tested += 1;
			if (this.tested === this.total) {
				this.finish();
			}
		}
	}, finish = function () {
		var t = new Date(), i = this.total, passed = this.passed;
		if (typeof this.tearDown === 'function') {
			try {
				this.tearDown();
			} catch (ignore) {}
		}
		console.log('End test', this.name || '', '(' + t.toLocaleTimeString() + '), time:', t - this.start, 'ms, total:', i, ', success:', passed, ', failed:', i - passed);
		if (console.groupEnd) { console.groupEnd(); }
	};

	/**
	 * Runs the cases one by one, and gives the test result in the console UI, and returns the test object for later use.
	 *
	 * @param {Object}  cases   Includes the cases to be tested, which use 'test' as prefix of key name, required; for synchronize test case, throw Errors if failure; for the cases can't get result immediately, MUST return false to indicate it's an asynchronize test case, and call `success(case_name)` or `fail(case_name)` function of return object to notify the result later; also support `setUp` and `tearDown` functions like normal Unit Test.
	 */
	exports.run = function (cases) {
		var p, t = cases.start = new Date(), ret, async, i, l = cases.retry;
		if (console.group) {
			console.group('Start test ' + (cases.name || '') + ' (' + t.toLocaleTimeString() + '):');
		} else {    // IE not support group
			console.log('Start test ' + (cases.name || '') + ' (' + t.toLocaleTimeString() + '):');
		}
		if (typeof cases.setUp === 'function') {
			try {
				cases.setUp();
			} catch (ignore) {}
		}
		cases.success = success;
		cases.fail = fail;
		cases.finish = finish;
		cases.total = cases.tested = cases.passed = 0;
		for (p in cases) {
			if (cases.hasOwnProperty(p) && (p.indexOf('test') === 0 && typeof cases[p] === 'function')) {
				cases.total += 1;
				try {
					ret = cases[p]();
					if (ret === false) {
						async = true;
					} else {
						for (i = 1; i < l; i += 1) {
							ret = cases[p]();
						}
						cases.passed += 1;
						cases.tested += 1;
						console.info(p, ' passed', l ? ' passed (' + l + ' times)' : ' passed');
					}
				} catch (e) {
					cases.tested += 1;
					if (g_console && console !== g_console && g_console.error) {
						g_console.error(e);
					}
					console.error(p || '', 'failed --> ', e || '');
				}
			}
		}
		if (!async) {
			cases.finish();
		}
		return cases;
	};
});
