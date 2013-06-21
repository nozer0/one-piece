/**
 * Author   : nozer0
 * Email    : c.nozer0@gmail.com
 * Modified : 2013-06-20 18:00
 * Name     : util/test.js
 */

/*global define */
// http://wiki.commonjs.org/wiki/Unit_Testing/1.0
define(function (require, exports) {
	'use strict';

	var console = define.modules.hasOwnProperty('util/console') ? require('util/console') : define.global.console || {log : 1, error : 1}, success = function (name, notall) {
		console.info(name || '', 'passed');
		if (!notall) {
			this.passed += 1;
			this.tested += 1;
			if (this.tested === this.total) {
				this.finish();
			}
		}
	}, fail = function (name, notall, e) {
		console.error(name || '', 'failed --> ', e);
		if (!notall) {
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
	exports.run = function (cases) {
		var p, t = cases.start = new Date(), ret, async;
		cases.success = success;
		cases.fail = fail;
		cases.finish = finish;
		cases.total = cases.tested = cases.passed = 0;
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
					console.error(p || '', 'failed --> ', e);
				}
			}
		}
		if (!async) {
			cases.finish();
		}
		return cases;
	};
});
