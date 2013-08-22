/*global define */
var $_ = {define : define};
$_.define('module-0', [], function (require, exports, module) {
	'use strict';
	module.exports = {value : '0'};
});
$_.define('module-1', ['module-0'], function (require, exports, module) {
	'use strict';
	module.exports = require('module-0');
});
$_.define('module-2', ['module-1'], function (require, exports, module) {
	'use strict';
	module.exports = require('module-1');
});
$_.define('module-3', ['module-2'], function (require, exports, module) {
	'use strict';
	module.exports = require('module-2');
});
$_.define('module-4', ['module-3'], function (require, exports, module) {
	'use strict';
	module.exports = require('module-3');
});
$_.define('module-5', ['module-4'], function (require, exports, module) {
	'use strict';
	module.exports = require('module-4');
});
$_.define('module-6', ['module-5'], function (require, exports, module) {
	'use strict';
	module.exports = require('module-5');
});
$_.define('module-7', ['module-6'], function (require, exports, module) {
	'use strict';
	module.exports = require('module-6');
});
$_.define('module-8', ['module-7'], function (require, exports, module) {
	'use strict';
	module.exports = require('module-7');
});
$_.define('module-9', ['module-8'], function (require, exports, module) {
	'use strict';
	module.exports = require('module-8');
});
$_.define('module-10', ['module-9'], function (require, exports, module) {
	'use strict';
	module.exports = require('module-9');
});

define(function (require) {
	'use strict';

	var assert = require('util/assert');
//	require('../src/require-shim'); // for safety, require again
	require('./js/program');
	require('util/test').run({
		testNormal   : function () {
			var css = define.getModule('./css/test.css', require.main), body = document.getElementsByTagName('body')[0];
			assert.strictEqual(require('./js/increment').increment(8), 9, 'increment(8)');
			assert.strictEqual(css.status, 3, 'test.css status');
			require('./css/test.css');
			assert.strictEqual(css.status, 4, 'test.css status');
			if (body.currentStyle) {
				assert.strictEqual(body.currentStyle.backgroundColor, '#deedf7', 'backgroundColor');
			} else {
				assert.strictEqual(window.getComputedStyle(body, null).getPropertyValue('background-color'), 'rgb(222, 237, 247)', 'backgroundColor');
			}
		},
		testCyclic   : function () {
			var _console = require('util/console'), s = [];
			define.global.console = {log : function () { s.push(_console.log.apply(_console, arguments)); }};
			require('./js/main.js');
			define.global.console = _console;
			assert.strictEqual(s.join('\n').replace(/\xA0/g, ' '), 'main starting\na starting\nb starting\nin b, a.done = false\nb done\nin a, b.done = true\na done\nin main, a.done=true, b.done=true');
		},
		testMultiple : function () {
			assert.strictEqual(require('module-10').value, '0');
		},
		testShim     : function () {
			assert.strictEqual(require('underscore').size({a : 1, b : 2, c : 3}), 3);
		},
		testText:function() {
			//assert.strictEqual(require('./asset/test.txt'), 'something I want to show you. 你好');
		}
	});
});