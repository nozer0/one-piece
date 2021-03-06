/**
 * Author   : nozer0
 * Email    : c.nozer0@gmail.com
 * Modified : 2013-06-20 23:39
 * Name     : util/console.js
 */

/*global define */
define(function (require, exports, module) {
	'use strict';

	var global = define.global || window, console = global.console, maps = {1 : 'log', 2 : 'info', 4 : 'warn', 8 : 'error'}, _level = 15, p, escape = function (s) {
		return s.replace(/&/g, '&amp;').replace(/ /g, '&nbsp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\\r|\\n|\\r\\n/g, '<br>');
	}, _join = Array.prototype.join;
	exports = module.exports = {
		LOG         : 1,
		INFO        : 2,
		WARN        : 4,
		ERROR       : 8,
		constructor : function (level) {
			var el;
			if (this.console) { return this; }
			_level = level || 15;
			if (global === window) {
				el = this.console = this.output = global.document.createElement('div');
				el.innerHTML = (1 & _level ? '<input type="checkbox" name="log" checked>log' : '') + (2 & _level ? '<input type="checkbox" name="info" checked>info' : '') + (4 & _level ? '<input type="checkbox" name="warn" checked>warn' : '') + (1 & _level ? '<input type="checkbox" name="error" checked>error' : '') + '<br>';
				el.id = 'console';
				global.document.getElementsByTagName('body')[0].appendChild(el);
			}
			return this;
		},
		_log        : function (logs, level) {
			var m = maps[level] || 'log', s, i, l, subs;
			if (exports.output && (level & _level)) {
				l = logs.length;
				s = logs[0];
				if (l > 1) {
					for (subs = s.match(/%[a-zA-Z]/g), l = subs && (subs.length < l) ? subs.length : -1, i = 0; i < l; i) {
						s = s.replace(subs[i], logs[i += 1]);
					}
					for (i += 1, l = logs.length; i < l; i += 1) {
						s += ' ' + logs[i];
					}
				}
				exports.output.innerHTML += '<p class="' + m + '">' + (typeof s === 'string' ? escape(s) : s) + '</p>';
			}
			if (console) {
				l = console[m];
				if (typeof l === 'function') {
					l.apply(console, logs);
				} else {
					console[m](s || _join.call(logs, ' '));
				}
			}
			return s;
		},
		log         : function () { return exports._log(arguments, 1); },
		info        : function () { return exports._log(arguments, 2); },
		warn        : function () { return exports._log(arguments, 4); },
		error       : function () { return exports._log(arguments, 8); },
		group       : function (title) {
			var el;
			title = title || '';
			if (console.group) {
				console.group(title);
			} else {
				console.log(title);
			}
			if (exports.output) {
				el = global.document.createElement('fieldset');
				el.innerHTML = '<legend>' + escape(title) + '</legend>';
				exports.output.appendChild(el);
				exports.output = el;
			}
		},
		groupEnd    : function () {
			if (console.groupEnd) {
				console.groupEnd();
			} else {
				console.log('');
			}
			if (exports.output) {
				exports.output = this.output.parentNode;
			}
		},
		call        : function (name, args) {
			var fn = console && console[name];
			return fn.apply(exports, args);
		}
	};
	//noinspection JSLint
	for (p in console) {
		//noinspection JSUnfilteredForInLoop
		if (!exports.hasOwnProperty(p) && (console.hasOwnProperty ? console.hasOwnProperty(p) : true)) {
			//noinspection JSUnfilteredForInLoop
			exports[p] = console[p];
		}
	}
});
