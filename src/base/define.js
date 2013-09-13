/**
 * Author   : nozer0
 * Email    : c.nozer0@gmail.com
 * Modified : 2013-06-20 22:00
 * Name     : base/define.js
 *
 * a wrapper function to for user to write in unique format working with AMD, CommonJS, NodeJS, CMD or Global
 */

(function (ctx) {
	'use strict';

	//noinspection JSUnresolvedVariable
	var global = ctx || window, _define = global.define, doc = global.document, stack_re = /[@( ]([^@( ]+?)(?:\s*|:[^\/]*)$/, uri_re = /\/[^\/]+\/(.*?)(?:\.\w+)?(?:[?#].*)?$/, define, modules, normalize, getCurrentScriptSrc = doc.currentScript === undefined ? function () {
		try {
			//noinspection JSUnresolvedFunction
			this.__();
		} catch (e) {
			/*
			 * https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Error/Stack
			 * stack
			 *  chrome23:   at http://localhost:8080/path/name.js:2:2
			 *  firefox17:  @http://localhost:8080/path/name.js:2
			 *  opera12:    @http://localhost:8080/path/name.js:2
			 *  ie10:       at Global code (http://localhost:8080/path/name.js:2:2)
			 *
			 * stacktrace
			 *  opera11:    line 2, column 2 in http://localhost:8080/path/name.js:
			 *  opera10b:   @http://localhost:8080/path/name.js:2
			 *  opera10a:   Line 2 of inline#2 script in http://localhost:8080/path/name.js: In function foo\n
			 *
			 * message
			 *  opera9:     Line 2 of inline#2 script in http://localhost:8080/path/name.js\n
			 *
			 * @see http://www.cnblogs.com/rubylouvre/archive/2013/01/23/2872618.html
			 */
			//noinspection JSUnresolvedVariable
			var s = e.stack || e.stacktrace || (global.opera && e.message), ns, l, src;
			if (s) {    // safari5- and IE6-9 not support
				s = stack_re.exec(s);
				if (s) { return s[1]; }
			} else {    // IE6-9
				for (ns = doc.getElementsByTagName('script'), l = ns.length; l; 1) {
					s = ns[l -= 1];
					if (s.readyState === 'interactive') {
						// for IE8-, 's.src' won't return full url, in contract, IE8+ can only get full rul via 's.src'
						src = doc.querySelector ? s.src : s.getAttribute('src', 4);
						break;
					}
				}
			}
			return src || (global.location && global.location.href);    // internal script will return '' for 'src'
		}
	} : function () { // ff 4+
		// https://developer.mozilla.org/en-US/docs/DOM/document.currentScript
		//noinspection JSUnresolvedVariable
		var s = doc.currentScript;
		return s ? s.src || s.baseURI : global.location && global.location.href;
	};

	//noinspection JSUnresolvedVariable
	if (!(_define && typeof _define === 'function' && (_define.amd || _define.cmd))) {    // AMD or CMD
		define = global.define = (global.module && typeof global.module.declare === 'function' && global.module.declare) || // CommonJS
			(typeof global.require === 'function' && typeof global.exports === 'object' && function (factory) {   // NodeJS
				factory(global.require, global.exports, global.module);
			});
		if (!define) {
			normalize = function (uri) {
				var s = uri.replace(/(^|[^:])\/{2,}/g, '$1/').replace(/\/\.(?=\/)/g, ''), parent_re = /[^\/]+\/\.\.\//;
				while (parent_re.test(s)) {
					s = s.replace(parent_re, '');
				}
				return s;
			};
			global.require = function (id) {
				var m = modules[id] || modules[normalize((define.current_path || (uri_re.exec(getCurrentScriptSrc()) || [0, ''])[1]).replace(/[^\/]*$/, id))];
				if (m) { return m.exports; }
				throw id + ' is not defined';
			};
			define = global.define = function (id, factory) {    // Global
				var uri = getCurrentScriptSrc(), re = /[^\/]*$/, t = uri_re.exec(uri), path = define.base ? t[1].replace(new RegExp(define.base + '\\/'), '') : t[1], m;
				if (typeof id === 'string') {
					path = path.replace(re, id);
				} else {
					factory = id;
				}
				m = modules[path] = {id : re.exec(path)[0], path : path, uri : uri, exports : {}};
				if (typeof factory === 'function') {
					m.factory = factory;
					define.current_path = path;
					factory.call(define.global, global.require, m.exports, m);
					if (m.exports.constructor) {
						m.exports.constructor();
					}
					define.current_path = null;
				} else {
					m = m.exports;
					for (t in factory) {
						if (factory.hasOwnProperty(t)) {
							m[t] = factory[t];
						}
					}
				}
				return m;
			};
			define.base = 'one-piece/src';
			define.global = global;
			modules = define.modules = {};
		}
	}

	define.getCurrentScriptSrc = getCurrentScriptSrc;
}());
