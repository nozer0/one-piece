/**
 * Author   : nozer0
 * Email    : c.nozer0@gmail.com
 * Modified : 2013-06-14 17:12
 * Name     : require.js
 */

/*global require,define */
(function (ctx) {
	'use strict';

	var root = ctx || window, doc = root.document, stack_re = /[@( ]([^@( ]+?)(?:\s*|:[^\/]*)$/, getCurrentScriptSrc = doc.currentScript === undefined ? function () {
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
				ns = doc.getElementsByTagName('script');
				l = ns.length;
				while (l) {
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
	}, define, require, uri_re;

	/**
	 * For developers, it's simple and clear to implement each module in separate file in developing phase,
	 * and module id is implicitly assigned from file name.
	 * Oppositely, in deployment phase, it's better to package several files into one to limit the requests numbers.
	 * When package all modules into one or several files by something like 'combo', it MUST be indicate each module for assigning 'id' explicitly.
	 *
	 * If module definiens knows clearly about the dependencies(usually he does), skip the automatic dependency parsing for performance.
	 *
	 * @param {String}  id              the path relative to related base, the whole path of 'xxx/yyy' should be <base> + 'xxx/yyy'
	 * @param {Array}   dependencies    the dependencies array, it's only used in combine file
	 * @param {Mixed}   definition      the definition function or object
	 */
	define = root.define = function (id, dependencies, definition) {
		var modules = define.modules, m, cfg;
		//		if (typeof id !== 'string' && !(id instanceof Array)) {   // define(def)
		//			definition = id;
		//			dependencies = define.parse(definition.toString());
		//			id = null;
		//		} else if (!(dependencies instanceof Array)) {
		//			definition = dependencies;
		//			if (id instanceof Array) {  // define(deps, def)
		//				dependencies = id;
		//				id = null;
		//			} else {    // define(id, def)
		//				dependencies = define.parse(definition.toString());
		//			}
		//		}   // define(id, deps, def)
		if (typeof id === 'string') {
			m = modules.hasOwnProperty(id) ? modules[id] : modules[id] = {id : id, path : define.base + id, exports : {}, status : 0};
			m.dependencies = dependencies;
			m.definition = definition;
		} else {
			m = define.getModule(getCurrentScriptSrc());
			m.definition = id;
		}
		define.current_module = m;
		m.status = 2;   // LOADED
		if (define.debug && define.log) {
			define.log(m.id + ' loaded');
		}
		cfg = define.configModule;
		if (!cfg || cfg.status === 4 || (cfg.dependencies && cfg.dependencies.hasOwnProperty(m.id))) {
			define.resolveDependencies(m);
		}
	};

	/**
	 * @param {String} id   both relative and absolute uris like './xxx', '../xxx', '/xxx/yyy' and even 'http://outof.domain.com/xxx/yyy' are as same as normal uri, for global uris like 'xxx/yyy', which is based on the 'base' option
	 */
	require = root.require = define.require = function (id) {
		var m = define.getModule(id, require.main), main;
		if (m) {
			// lazy execute until first require called
			if (m.status !== 4) {
				main = require.main;
				define.execModule(m);
				require.main = main;
			}
			return m.exports;
		}
		throw id + ' is not defined';
	};

	define.UNINITIALIZED = 0;
	define.LOADING = 1;
	define.LOADED = 2;
	define.INTERACTIVE = 3;
	define.COMPLETE = 4;
	define.FAILED = -1;
	define.modules = {};
	define.base = /.*?(?=[^\/]*$)/.exec(getCurrentScriptSrc())[0];
	define.alias = {};
	define.context = root;
	uri_re = new RegExp('((?:' + define.base + ')?(.*?))(?:\\.js)?(?:[?#].*)?$');

	define.config = function (cfg) {
		var p, m, deps, plugins, i, l, s;
		if (cfg) {
			for (p in cfg) {
				if (cfg.hasOwnProperty(p)) {
					define[p] = cfg[p];
				}
			}
			if (cfg.base) {
				uri_re = new RegExp('((?:' + cfg.base + ')?(.*?))(?:\\.js)?(?:[?#].*)?$');
			}
			define.loader.preserve = define.debug;
			m = define.configModule = define.getModule(define.configPath || getCurrentScriptSrc());
			if (cfg.plugins) {
				for (deps = m.dependencies = [], i = 0, plugins = cfg.plugins, l = plugins.length, s = 'require-'; i < l; i += 1) {
					deps.push(s + plugins[i]);
				}
				if (!define.configPath) {   // not config by 'data-config' attribute
					define.resolveDependencies(m);
				}
			}
		}
		return this;
	};

	define.getModule = function (uri, parent) {
		var modules = define.modules, id, t;
		if (parent && parent.maps.hasOwnProperty(uri)) {
			return modules[parent.maps[uri]];
		}
		id = define.alias[uri] || uri;
		t = id[0];
		if (t === '.' || t === '/') {
			id = define.resolve(id, parent ? parent.path : define.base);
		}
		if (id.indexOf(':') === -1) {
			t = define.base + id;
			// although we can add logic here to join id through require.paths array, but no way to detect which file exists
		} else {
			t = uri_re.exec(id);
			id = t[2];
			t = t[1];
		}
		if (parent) {
			parent.maps[uri] = id;
		}
		return modules.hasOwnProperty(id) ? modules[id] : modules[id] = {id : id, path : t, exports : {}, status : 0};
	};

	function cyclic(modules, deps, ancestors) {
		var p, i, l;
		for (p in deps) {
			if (deps.hasOwnProperty(p) && !deps[p] && modules[p].status === 2) {
				if (p === ancestors[0]) { return true; }    // got cyclic
				for (i = 1, l = ancestors.length; i < l; i += 1) {
					if (ancestors[i] === p) { return; } // inside cyclic
				}
				if (cyclic(modules, modules[p].dependencies, ancestors.concat(p))) { return true; }
			}
		}
	}

	define.resolveDependencies = function (module) {
		var getModule = define.getModule, i = -1, deps = module.dependencies || (module.definition ? define.parse(module.definition.toString()) : []), l = deps.length - 1, dependencies = module.dependencies = {}, wait = 0, loads = [], id = module.id, m;
		if (i < l) {
			module.maps = {};
		}
		while (i < l) {
			m = getModule(deps[i += 1], module);
			if (!m.status) {
				m.ancestors = [];
				loads.push(m);
			}
			if (m.status > 2 || (m.status === 2 && cyclic(define.modules, m.dependencies, [id]))) {   // INTERACTIVE, COMPLETE or cyclic dependencies
				dependencies[m.id] = true;
			} else {
				if (m.ancestors) {
					m.ancestors.push(id);
				} else {
					m.ancestors = [id];
				}
				wait += 1;
				dependencies[m.id] = false;
			}
		}
		if (wait) {
			module.wait = wait;
			define.load(loads);
		} else {
			define.onReady(module);
		}
	};

	define.onLoad = function (uri, ret) {
		var m, cfg = define.configModule;
		if (define.current_module && (!cfg || uri !== cfg.uri)) {
			delete define.current_module;
		} else {   // js file without 'define' or files of other types
			m = define.getModule(uri);
			if (ret) {
				m.status = 2;   // LOADED
				if (define.debug && define.log) {
					define.log(m.id + ' loaded');
				}
				define.resolveDependencies(m);
			} else {
				m.status = -1;  // FAILED
				if (define.debug && define.log) {
					define.log(m.id + ' failed');
				}
			}
		}
	};

	define.execModule = function (module) {
		var definition = module.definition, t = typeof definition, p;
		module.status = 4;  // COMPLETE
		if (define.debug && define.log) {
			define.log(module.id + ' complete');
		}
		if (t === 'function') {
			require.main = module;
			definition.call(define.context, require, module.exports, module);
			if (module.exports.constructor) {
				module.exports.constructor();
			}
			delete require.main;
		} else if (t === 'object') {
			t = module.exports;
			for (p in definition) {
				if (definition.hasOwnProperty(p)) {
					t[p] = definition[p];
				}
			}
		}
		if (define.onComplete) {
			define.onComplete(module);
		}
		return module;
	};

	define.onReady = function (module) {
		var ancestors = module.ancestors, m, l, id, onReady, modules;
		delete module.wait;
		module.status = 3;  // INTERACTIVE
		if (define.debug && define.log) {
			define.log(module.id + ' interactive');
		}
		if (ancestors) {
			for (l = ancestors.length - 1, onReady = define.onReady, modules = define.modules, id = module.id; l >= 0; l -= 1) {
				m = modules[ancestors[l]];
				if (m.wait) {
					m.dependencies[id] = true;
					m.wait -= 1;
					if (!m.wait) {
						onReady(m);
					}
				}
			}
			delete module.ancestors;
		} else {
			define.execModule(module);
		}
	};

	define.onComplete = function (module) {
		var modules, deps, p, m, resolveDependencies = define.resolveDependencies;
		if (module === define.configModule) {
			delete define.onComplete;
			delete define.configModule;
			modules = define.modules;
			deps = module.dependencies;
			for (p in modules) {
				if (modules.hasOwnProperty(p)) {
					m = modules[p];
					if (m.status === 3 && deps.hasOwnProperty(p)) {
						define.execModule(modules[p]);
					} else if (m.status === 2) {
						resolveDependencies(m);
					}
				}
			}
			m = define.main;
			if (m && !m.status) {
				define.load([m]);
			}
		}
	};
}());

/**
 * @module util/uri
 */
define('util/uri', [], function (require, exports) {
	'use strict';

	var base = '', maps = [], loc_re = /^(?:(\w+:)\/\/)?(([^:\/]+):?([\d]+)?)([^?#]+?([^\/?#]+?)?(\.\w*)?)(\?[^#]+)?(#\S*)?$/, protocol_re = /^\w+:\/\/\w/, root_re = /\w+:\/\/[^\/#?]+/, base_re = /[^\/]*$/, slash_re = /\/{2,}/g, relative_re = /\/\.(?=\/)/g, parent_re = /[^\/]+\/\.\.\//, location = (this || window).location, normalize;
	exports.location = function (uri) {
		var t = loc_re.exec(uri);
		return t ? { uri : t[1] ? uri : 'http://' + uri, protocol : t[1] || 'http:', host : t[2], hostname : t[3], port : t[4] || '', pathname : t[5] || '', basename : t[6] || '', ext : t[7] || '', search : t[8] || '', hash : t[9] || '' } : { uri : uri };
	};
	exports.isSameHost = function (uri, host) {
		var t = root_re.exec(uri);
		return t && t[0] === (host || (location && (location.protocol + '//' + location.host)));
	};
	/**
	 * Format the uri including '///', './' or '../' pattern to normal uri.
	 * @param {String}  uri the uri string to be normalized
	 */
	exports.normalize = normalize = function (uri) {
		var s = uri.replace(slash_re, '/').replace(':/', '://').replace(relative_re, '');
		while (parent_re.test(s)) {
			s = s.replace(parent_re, '');
		}
		return s;
	};
	/**
	 * Format the uri based on the passed base string, and apply the changes from passed maps.
	 * @param {String}  uri
	 * @param {String}  ubase   base string
	 * @param {String}  umaps   maps object, like ['en-us', 'zh-cn'] to replace all 'en-us' strings to 'zh-cn'
	 */
	exports.resolve = function (uri, ubase, umaps) {
		var s = uri, i, l, t;
		if (typeof ubase === 'Object') {
			umaps = ubase.maps;
			ubase = ubase.base;
		}
		if (!protocol_re.test(s)) {
			t = typeof ubase === 'string' ? ubase : base;
			if (t) {
				if (s[0] === '/') {
					t = root_re.exec(t);
					if (t) {
						s = t[0] + s;
					}
				} else {
					s = t.replace(base_re, s);
				}
			}
		}
		for (s = normalize(s), i = 0, t = umaps ? umaps.concat(maps) : maps, l = t.length; i < l; i += 1) {
			s = s.replace(t[i], t[i += 1]);
		}
		return s;
	};
	exports.config = function (cfg) {
		var k, src, i, l, m, s;
		if (!cfg) { return this; }
		if (cfg.hasOwnProperty('base')) { base = cfg.base; }
		src = cfg.maps;
		if (src) {
			for (i = 0, l = src.length, m = maps.length; i < l; i += 2) {
				for (s = String(src[i]), k = 0; k < m; k += 2) {
					if (String[maps[k]] === s) {
						maps[i + 1] = src[k + 1];
						break;
					}
				}
				if (k >= m) {    // no same map
					maps.push(src[i], src[i + 1]);
				}
			}
		}
		return this;
	};
	exports.clearConfig = function () {
		base = '';
		maps = [];
		return this;
	};
});

/**
 * @module base/parser
 */
define('base/parser', [], function (require, exports) {

	'use strict';

	// string|comment|(|) + uncertain slash|)|regexp
	var re = /(".*?"|'.*?')|(\/\*[\s\S]*?\*\/|\/\/.*)|[\w$\]]\s*\/(?![*\/])|(?:[^$]return\s*)?(\/)[\s\S]*/g, re2 = /((\$|\.\s*)?\b(?:if|for|while)\b\s*)?(\()|(([\w$)\]])\s*)(\/([^\/*][\s\S]*$))|(\))|([^$]return\s*)?(\/(?:[^*\/\[\r\n]|\[.*?\])(?:[^\/\[\r\n]|\[.*?\])*\/[img]{0,3})((\/)?[\s\S]*)/g,
		precompile = exports.precompile = function (code) {
			var escapes = [], parenthesis = [], strings = [], comments = [], regexps = [], store, f1, replacer = function (m, s, cm, slash) {
				if (slash) {
					f1 = true;
					return m;
				}
				f1 = false;
				if (s) {
					return '\x1c@' + strings.push(m);
				}
				if (cm) {
					comments.push(m);
					return '\xa0';  // it can use '\s' to match
				}
				return m;
			}, replacer2 = function (m, lp_prefix, $, lp, slash_prefix, slash_w$, slash_suffix, slash_suffix2, rp, regexp_prefix, regexp, regexp_suffix, slash) {
				var t, s;
				if (lp) {
					// to be faster, do less array operations via flag variable check
					if (lp_prefix && !$) {
						store = true;
						parenthesis.push(true);
					} else if (store) {
						parenthesis.push(false);
					}
					return m;
				}
				if (slash_w$) {
					t = store && slash_w$ === ')' && parenthesis.pop();
					// to be faster, use capture group instead of string concatenation
					// and not start from the beginning each time
					if (t) {    // regexp
						return slash_prefix + slash_suffix.replace(re2, replacer2);
					}
					if (t === undefined) {
						store = false;
					}
					s = slash_suffix2.replace(re, replacer);
					return slash_prefix + '/' + (f1 ? s.replace(re2, replacer2) : s);
				}
				if (rp && store) {
					parenthesis.pop();
				}
				if (regexp) {
					regexps.push(regexp);
					if (slash) {    // maybe divisor follow on
						s = regexp_suffix.replace(/^/, 0).replace(re, replacer);
						return regexp_prefix + '\x1c$' + (f1 ? s.replace(re2, replacer2) : s).replace(0, '');
					}
					s = regexp_suffix.replace(re, replacer);
					return regexp_prefix + '\x1c$' + (f1 ? s.replace(re2, replacer2) : s);
				}
				return m;
			}, s = code.replace(/\\[\s\S]/g,
				function (m) {
					escapes.push(m);
					return '\x1b';
				}).replace(re, replacer);
			return {s : f1 ? s.replace(re2, replacer2) : s, escapes : escapes, strings : strings, comments : comments, regexps : regexps};
		},
		var_re = /(?:[\w$]|\.\s*)var|var\s+([\s\S]+?(?:;|[\w$@\])]\s*[\r\n]\s*(?=[\w$\x1d]|\x1c@)))/g,
		group_re = /[(\[][^()\[\]]+[)\]]/g, vars_re = /(?:^|,)\s*([\w$]+)/g,
		sub_re = /\x1d([$#])(\d+)/g,
		block_re = /([\w$]|\.\s*)function|([=(]\s*)?function(\s*([\w$]*)\s*)(\([^)]*\)\s*)\{([^{}]*)\}|([=(,]\s*)?\{([^{}]*)\}/g;
	exports.parse = function (code, compiled) {
		var ret = compiled ? code : precompile(code), functions = ret.functions = [], blocks = ret.blocks = [], objects = ret.objects = [], s = ret.s, t = [], vars_replacer = function (m, m1) { return t.push(m1); }, var_replacer = function (m, m1) {
			if (m1) {
				while (group_re.test(m1)) { // remove the commas inside array or parenthesis
					m1 = m1.replace(group_re, 0);
				}
				m1.replace(vars_re, vars_replacer);
			}
			return '';
		}, fn_replacer = function (m, m1, n) {  // get named function
			if (m1 === '$') {
				n = functions[n - 1].name;
				if (n) { t.push(n); }
			} else {
				n = blocks[n - 1].variables;
				if (n.length) { t = t.concat(n); }
			}
			return '';
		}, replacer = function (m, w$, fn_prefix, head, name, args, body, block_prefix, block) {
			if (w$) {
				return m;
			}
			if (block_prefix) {
				return block_prefix + '\x1d@' + objects.push(block);
			}
			if (args) {
				t = args.match(/[\w$]+/g) || [];
				body.replace(var_re, var_replacer).replace(sub_re, fn_replacer);
				return fn_prefix + '\x1d$' + functions.push({name : !fn_prefix && name, variables : t, head : head, args : args, body : body});
			}
			t = [];
			block.replace(var_re,
				function (m, m1) {
					while (group_re.test(m1)) { // remove the commas inside array or parenthesis
						m1 = m1.replace(group_re, 0);
					}
					m1.replace(vars_re, vars_replacer);
					return '';
				});
			return '\x1d#' + blocks.push({s : block, variables : t});
		};
		s.replace(var_re, var_replacer).replace(sub_re, fn_replacer);
		ret.variables = t;
		while (/\{/.test(s)) {
			s = s.replace(block_re, replacer);
		}
		ret.s = s;
		return ret;
	};
});

/**
 * @module base/load
 */
define('base/load', [], function (require, exports) {
	'use strict';

	var root = window, doc = root.document, re = /\.(\w+)(?=[?#]\S*$|$)/, host_re = /^(?:https?:\/\/)?([^\/]+)/, loaders, exts = exports.exts = {'js' : 'js', 'css' : 'css', 'png' : 'img', 'jpg' : 'img', 'jpeg' : 'img', 'bmp' : 'img', 'tiff' : 'img', 'ico' : 'img'}, getType = exports.getType = function (uri) {
		var ext = re.exec(uri);
		return (ext && exts[ext[1]]) || 'js';
	};

	function isSameHost(uri, host) {
		var t = host_re.exec(uri);
		return t && t[1] === (host || (location && location.hostname));
	}

	// http://pieisgood.org/test/script-link-events/
	// http://seajs.org/tests/research/load-js-css/test.html
	loaders = {
		js  : (function () {
			// IE8- || others, since 'load' is infrequently called, merge to make less codes is better than quicker
			var t = doc.createElement('script'), un,
				load = (t.onload === un || t.onerror !== un) ? function (node, uri, callback, ctx) {
					// we can know if the js file is loaded or not, but can't know whether it's empty or invalid,
					// ie8- triggers 'loading' and 'loaded' both normal without cache or error
					// IE10:
					//  loading - complete - loaded, complete (cache), loading - loaded (404)
					// IE9-:
					//  complete (cache), loading - loaded
					// http://requirejs.org/docs/api.html#ieloadfail
					var body = !exports.preserve && doc.body;
					node.onload = node.onerror/* = node.onabort*/ = node.onreadystatechange = function (e) {
						var rs = this.readyState;
						if (!rs || rs === 'loaded' || rs === 'complete') {
							this.onload = this.onerror/* = this.onabort*/ = this.onreadystatechange = null;
							if (callback) {
								callback.call(ctx, uri, rs || e.type === 'load', this, e || ctx.event);
							}
							if (body) {
								body.removeChild(this);
							}
						}
					};
					node = null;
				} : function (node, uri, callback, ctx) {    // opera12-
					// although it supports both 'onload' and 'onreadystatechange',
					// but it won't trigger anything if 404, empty or invalid file, use timer instead
					var body = !exports.preserve && doc.body, timer = root.setTimeout(function () {
						node.onload = null;
						if (callback) {
							callback.call(ctx, uri, false, node);
						}
						if (body) {
							body.removeChild(node);
						}
						node = null;
					}, exports.timeout);
					node.onload = function (e) {
						this.onload = null;
						root.clearTimeout(timer);
						node = timer = null;
						if (callback) {
							callback.call(ctx, uri, true, this, e);
						}
						if (body) {
							body.removeChild(this);
						}
					};
				};
			return function (uri, callback, ctx) {
				var node = doc.createElement('script');
				node.type = 'text/javascript';
				node.async = true; // https://developer.mozilla.org/en-US/docs/HTML/Element/script
				node.charset = exports.charset;
				//				if (defer) {    // support by all browsers except Opera
				//					s.defer = true;
				//				}
				if (callback || !exports.preserve) { load(node, uri, callback, ctx); }
				node.src = uri;
				doc.body.appendChild(node);
				node = null;
			};
		}()),
		css : (function () {
			var head = doc.getElementsByTagName('head')[0], ua = root.navigator.userAgent, ff = /Firefox\/\d/.test(ua), load = /MSIE \d/.test(ua) ? function (node, uri, callback, ctx) {
				// IE triggers 'load' for all situations, and 'styleSheet.rules' is accessible immediately if load or same host,
				// if 404 from different host, access is denied for 'styleSheet.rules',
				// IE8- use 'styleSheet.rules' rather than 'sheet.cssRules' for other browsers
				// http://help.dottoro.com/ljqlhiwa.php#cssRules
				node.onload/* = node.onabort*/ = function (e) {
					var t;
					this.onload/* = this.onabort*/ = null;
					try {
						t = this.styleSheet.rules.length;
					} finally {
						callback.call(ctx, uri, t, this, e || ctx.event);
					}
				};
				node = null;
			} : function (node, uri, callback, ctx) {
				// ignore very old ff & webkit which don't trigger anything for all situations
				var t = !ff && isSameHost(uri), timer;
				if (node.onerror === undefined || ctx.opera) {   // opera won't trigger anything if 404
					timer = root.setTimeout(function () {
						node.onload = node.onerror/* = node.onabort*/ = null;
						callback.call(ctx, uri, t && node.sheet.cssRules.length, node);
						node = null;
					}, exports.timeout);
				}
				node.onload = node.onerror/* = node.onabort*/ = function (e) {
					this.onload = this.onerror/* = this.onabort*/ = null;
					if (timer) {
						root.clearTimeout(timer);
						timer = null;
					}
					node = null;
					// 'sheet.cssRules' is accessible only if same host, and ff always returns 0 for 'cssRules.length'
					callback.call(ctx, uri, e.type === 'load' && (!t || this.sheet.cssRules.length), this, e);
				};
			};
			return function (uri, callback, ctx) {
				var node = doc.createElement('link');
				node.rel = 'stylesheet';
				node.type = 'text/css';
				node.charset = exports.charset;
				if (callback) { load(node, uri, callback, ctx); }
				node.href = uri;
				head.appendChild(node);
				node = null;
			};
		}()),
		img : function (uri, callback, ctx) {
			var node = new Image(), timer;
			if (callback) {
				// opera12- supports 'onerror', but won't trigger if 404 from different host
				if (ctx.opera && !isSameHost(uri)) {
					timer = root.setTimeout(function () {
						node.onload = node.onerror/* = node.onabort*/ = null;
						callback.call(ctx, uri, false, node);
						node = null;
					}, exports.timeout);
				}
				node.onload = node.onerror/* = node.onabort*/ = function (e) {
					this.onload = this.onerror/* = this.onabort*/ = null;
					if (timer) {
						root.clearTimeout(timer);
						timer = null;
					}
					node = null;
					e = e || ctx.event;
					callback.call(ctx, uri, e.type === 'load', this, e);
				};
			}
			node.src = uri;
		}
	};

	exports.timeout = 10000;
	exports.charset = 'utf8';
	exports.setLoader = function (type, loader) {
		loaders[type] = loader;
	};

	// http://www.fantxi.com/blog/archives/preload-images-css-js
	// https://developer.mozilla.org/en-US/docs/Link_prefetching_FAQ
	exports.preload = function (uri, type) {
		var cfg = [], o, l, s, t;
		// IE can't preload js&css via Image, and other browsers can't use cache via Image
		if (typeof uri === 'string') {
			t = type || getType(uri);
			if (t === 'js' || t === 'css') {
				cfg.push({uri : uri, type : t});
			} else {
				loaders.img(uri);
			}
		} else {    // multiple
			l = uri.length;
			while (l) {
				o = uri[l -= 1];
				if (typeof o === 'string') {
					s = o;
					t = getType(uri);
				} else {
					s = o.uri;
					t = o.type;
				}
				if (t === 'js' || t === 'css') {
					cfg.push({uri : s, type : t});
				} else {
					loaders.img(s);
				}
			}
		}
		l = cfg.length;
		if (!l) { return; }
		s = doc.createElement('iframe');
		s.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(1px 1px 1px 1px);clip:rect(1px,1px,1px,1px)';
		s.scrolling = 'no';
		s.onload = function () {
			s.onload = null;
			doc.body.removeChild(s);
		};
		doc.body.appendChild(s);
		t = s.contentDocument || s.contentWindow.document;
		t.open();
		t.write('<!doctype><html><head></head><body>');
		while (l) {
			o = cfg[l -= 1];
			if (o.type === 'js') {
				t.write('<script type="text/javascript" src="' + o.url + '"></script>');
			} else if (o.type === 'css') {
				t.write('<link type="text/css" rel="stylesheet" href="' + o.url + '">');
			} else {
				t.write('<img src="' + o.url + '">');
			}
		}
		t.write('</body></html>');
		t.close();
	};
	exports.load = function (uri, type, callback, ctx) {
		var t = typeof type;
		if (t !== 'string') {
			ctx = callback;
			callback = type;
			type = getType(uri);
		}
		if (loaders[type]) {
			loaders[type](uri, callback, ctx || define.context || root);
			return true;
		}
		return false;
	};
});

/**
 * @module util/console
 */
define('util/console', [], function (require, exports, module) {
	'use strict';

	var root = this || window, console = root.console, maps = {1 : 'log', 2 : 'info', 4 : 'warn', 8 : 'error'}, _level = 15, p, escape = function (s) {
		return s.replace(/&/g, '&amp;').replace(/ /g, '&nbsp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\\r|\\n|\\r\\n/g, '<br>');
	};
	exports = module.exports = {
		LOG         : 1,
		INFO        : 2,
		WARN        : 4,
		ERROR       : 8,
		constructor : function (level) {
			var el;
			if (this.console) { return this; }
			_level = level || 15;
			if (root === window) {
				el = this.console = this.output = root.document.createElement('div');
				el.innerHTML = (1 & _level ? '<input type="checkbox" name="log" checked>log' : '') + (2 & _level ? '<input type="checkbox" name="info" checked>info' : '') + (4 & _level ? '<input type="checkbox" name="warn" checked>warn' : '') + (1 & _level ? '<input type="checkbox" name="error" checked>error' : '') + '<br>';
				el.id = 'console';
				root.document.getElementsByTagName('body')[0].appendChild(el);
			}
			return this;
		},
		_log        : function (logs, level) {
			var m = maps[level] || 'log', s, i, l, subs;
			if (console) {
				console[m].apply(console, logs);
			}
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
				el = root.document.createElement('fieldset');
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
	for (p in console) {
		if (console.hasOwnProperty(p) && !exports.hasOwnProperty(p)) {
			exports[p] = console[p];
		}
	}
});

(function (ctx) {
	'use strict';
	var precompile = require('base/parser').precompile, loader = define.loader = require('base/load'), load = loader.load, resolve = define.resolve = require('util/uri').resolve, root = ctx || window, doc = root.document, current_script, ns, l, m;

	delete define.current_module;

	define.log = require('util/console').log;

	define.parse = function (s) {
		var ret = precompile(s), deps = [], rets = {}, strs = ret.strings;
		ret.s.replace(/([\w$]|\.\s*)?require\s*\(.*?(\d+)\s*\)/g, function (m, w$, n) {
			var s;
			if (!w$) {
				s = strs[n - 1].replace(/^['"]\s*|\s*['"]$/g, '');
				if (!rets.hasOwnProperty(s)) {
					rets[s] = true;
					deps.push(s);
				}
			}
			return '';
		});
		return deps;
	};

	define.load = function (modules) {
		var onLoad = define.onLoad, maps = define.maps, i = -1, l = modules.length - 1, m;
		while (i < l) {
			m = modules[i += 1];
			m.status = 1;   // LOADING
			if (define.debug) {
				define.log(m.id + ' loading');
			}
			load(m.uri = resolve(/\.\w+$/.test(m.path) ? m.path : m.path + '.js', '', maps), onLoad);
		}
	};

	current_script = doc.currentScript || doc.getElementById('$_');
	if (!current_script) {
		for (ns = doc.getElementsByTagName('script'), l = ns.length; l; 1) {
			current_script = ns[l -= 1];
			if (current_script.readyState === 'interactive') {
				break;
			}
		}
	}
	l = current_script.getAttribute('data-config');
	if (l) {
		define.load([m = define.configModule = define.getModule(define.configPath = resolve(l, root.location.href))]);
	}
	l = current_script.getAttribute('data-main');
	if (l) {
		define.main = define.getModule(resolve(l, root.location.href));
		if (!m) {
			define.load([define.main]);
		}
	}
}());
