/**
 * Author   : nozer0
 * Email    : c.nozer0@gmail.com
 * Modified : 2013-06-20 19:07
 * Name     : base/load.js
 */

/*global define */
define(function (require, exports) {
	'use strict';

	var global = define.global, doc = global.document, re = /\.(\w+)(?=[?#]\S*$|$)/, host_re = /^(?:https?:\/\/)?([^\/]+)/, loaders, exts = exports.exts = {'js' : 'js', 'css' : 'css', 'png' : 'img', 'jpg' : 'img', 'jpeg' : 'img', 'bmp' : 'img', 'tiff' : 'img', 'ico' : 'img'}, getType = exports.getType = function (uri) {
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
								callback.call(ctx, uri, rs || e.type === 'load', this, e || global.event);
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
					var body = !exports.preserve && doc.body, timer = global.setTimeout(function () {
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
						global.clearTimeout(timer);
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
			var head = doc.getElementsByTagName('head')[0], ua = global.navigator.userAgent, ff = /Firefox\/\d/.test(ua), load = /MSIE \d/.test(ua) ? function (node, uri, callback, ctx) {
				// IE triggers 'load' for all situations, and 'styleSheet.rules' is accessible immediately if load or same host,
				// if 404 from different host, access is denied for 'styleSheet.rules',
				// IE8- use 'styleSheet.rules' rather than 'sheet.cssRules' for other browsers
				// http://help.dottoro.com/ljqlhiwa.php#cssRules
				node.onload/* = node.onabort*/ = function (e) {
					var t;
					this.onload/* = this.onabort*/ = null;
					try {
						t = this.styleSheet.rules.length;
					} catch (ingore) {}
					callback.call(ctx, uri, t, this, e || global.event);
				};
				node = null;
			} : function (node, uri, callback, ctx) {
				// ignore very old ff & webkit which don't trigger anything for all situations
				var t = !ff && isSameHost(uri), timer;
				if (node.onerror === undefined || global.opera) {   // opera won't trigger anything if 404
					timer = global.setTimeout(function () {
						node.onload = node.onerror/* = node.onabort*/ = null;
						callback.call(ctx, uri, t && node.sheet.cssRules.length, node);
						node = null;
					}, exports.timeout);
				}
				node.onload = node.onerror/* = node.onabort*/ = function (e) {
					this.onload = this.onerror/* = this.onabort*/ = null;
					if (timer) {
						global.clearTimeout(timer);
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
				if (global.opera && !isSameHost(uri)) {
					timer = global.setTimeout(function () {
						node.onload = node.onerror/* = node.onabort*/ = null;
						callback.call(ctx, uri, false, node);
						node = null;
					}, exports.timeout);
				}
				node.onload = node.onerror/* = node.onabort*/ = function (e) {
					this.onload = this.onerror/* = this.onabort*/ = null;
					if (timer) {
						global.clearTimeout(timer);
						timer = null;
					}
					node = null;
					e = e || global.event;
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
			loaders[type](uri, callback, ctx || define.context || global);
			return true;
		}
		return false;
	};
});
