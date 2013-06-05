/**
 * Author   : nozer0
 * Email    : c.nozer0@gmail.com
 * Modified : 2013-06-03 17:57
 * Name     : base/define.js
 *
 * a wrapper function to for user to write in unique format working with AMD, CommonJS, NodeJS, CMD or Global
 */

(function (ctx) {
	'use strict';
	var root = ctx || window, _define = root.define, doc = root.document, stack_re = /[@( ]([^@( ]+?)(?:\s*|:[^\/]*)$/, uri_re = /\/[^\/]+\/(.*?)(?:\.\w+)?(?:[?#].*)?$/, define, current_path, modules, normalize, getCurrentScriptSrc = doc.currentScript === undefined ? function () {
		try {
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
			var s = e.stack || e.stacktrace || (window.opera && e.message), ns, l;
			if (s) {    // safari5- and IE6-9 not support
				s = stack_re.exec(s);
				if (s) { return s[1]; }
			} else {    // IE6-9
				for (ns = doc.getElementsByTagName('script'), l = ns.length; l; 1) {
					s = ns[l -= 1];
					if (s.readyState === 'interactive') {
						return s.getAttribute('src', 4);    // for IE6-7, 's.src' won't return full url
					}
				}
			}
			return root.location && root.location.href;
		}
	} : function () { // ff 4+
		// https://developer.mozilla.org/en-US/docs/DOM/document.currentScript
		var s = doc.currentScript;
		return s ? s.src || s.baseURI : root.location && root.location.href;
	};

	if (!(_define && typeof _define === 'function' && (_define.amd || _define.cmd))) {    // AMD or CMD
		define = root.define = (root.module && typeof root.module.declare === 'function' && root.module.declare) || // CommonJS
			(typeof root.require === 'function' && typeof root.exports === 'object' && function (factory) {   // NodeJS
				factory(root.require, root.exports, root.module);
			});
		if (!define) {
			normalize = function (uri) {
				var s = uri.replace(/(^|[^:])\/{2,}/g, '$1/').replace(/\/\.(?=\/)/g, ''), parent_re = /[^\/]+\/\.\.\//;
				while (parent_re.test(s)) {
					s = s.replace(parent_re, '');
				}
				return s;
			};
			root.require = function (id) {
				var m = modules[id] || modules[normalize((current_path || (uri_re.exec(getCurrentScriptSrc()) || [0, ''])[1]).replace(/[^\/]*$/, id))];
				if (m) { return m.exports; }
				throw id + ' is not defined';
			};
			define = root.define = function (id, factory) {    // Global
				var uri = getCurrentScriptSrc(), re = /[^\/]*$/, t = uri_re.exec(uri), path = define.base ? t[1].replace(new RegExp(define.base + '\\/'), '') : t[1], m;
				if (typeof id !== 'string') {
					factory = id;
				} else {
					path = path.replace(re, id);
				}
				m = modules[path] = {id : re.exec(path)[0], path : path, uri : uri, exports : {}};
				if (typeof factory === 'function') {
					m.factory = factory;
					current_path = path;
					factory.call(define.context, root.require, m.exports, m);
					current_path = null;
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
			define.context = root;
			modules = define.modules = {};
		}
	}

	define.getCurrentScriptSrc = getCurrentScriptSrc;
}());
