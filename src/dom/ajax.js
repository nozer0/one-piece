/**
 * Author   : nozer0
 * Email    : c.nozer0@gmail.com
 * Modified : 2013-08-18 23:39
 * Name     : dom/ajax.js
 */

/*global define */
define(function (require, exports) {
	'use strict';

	var global = define.global, FormData = global.FormData, FileReader = global.FileReader, Blob = global.Blob, doc = global.document, global_cfg = {}, uri_re = /^(?:(\w+:)\/\/)?([^:\/]+:?[\d]*)/, domain_re = /\w+\.[a-z]+:?\d*$/i, getXHR = global.XMLHttpRequest ? function () {
		return new global.XMLHttpRequest();
	} : function () {  // IE8-
		try {
			return new global.ActiveXObject('Msxml2.XMLHTTP');
		} catch (ignore) {
			try {
				return new global.ActiveXObject('Microsoft.XMLHTTP');
			} catch (ignored) {}
		}
	}, supportCORS, supportCreateElementByHTML, getFormData, _enctypes = {
		'flatten'                           : -1,
		''                                  : 0,   // get
		'application/x-www-form-urlencoded' : 1,
		'text/plain'                        : 2,
		'multipart/form-data'               : 3
	}, serialize, form2Req, data2Req, loader, cnt = 0;

	function isCrossDomain(url) {
		var t = uri_re.exec(url), s;
		if (!t || t[1] !== location.protocol) {
			//noinspection JSHint
			return /^[./\w]/.test(url) ? 0 : -1;
		}
		s = location.host;
		if (t[2] === s) {   // same domain
			return 0;
		}
		t = domain_re.exec(t[2]);
		return t && s.lastIndexOf(t[0]) + t[0].length === s.length ? 1 : -1;    // same main domain
	}

	/**
	 * Returns whether support CORS (Cross-Origin Resource Sharing) or not.
	 */
	supportCORS = exports.supportCORS = (function () {
		var xhr = getXHR(), ret, s = 'base/load';
		ret = xhr && (xhr.withCredentials !== undefined);// || global.XDomainRequest !== undefined);
		if (!ret) { loader = require(s); }
		return ret;
	}());

	try {
		doc.createElement('<input>');
		supportCreateElementByHTML = true;
	} catch (ignore) {}

	/**
	 * Translates the Form element into object which includes all field values need submit.
	 *
	 * @param {HTMLElement} form    The Form element to be translated.
	 */
	getFormData = exports.getFormData = function (form) {
		if (!form) { return {}; }
		var data = {}, ctls = form.elements, i = 0, l = ctls.length, ctl, re = /\[\]$/, name, v, j, k, t, d, un;
		for (; i < l; i += 1) {
			ctl = ctls[i];
			if ((ctl.hasAttribute ? ctl.hasAttribute('name') : ctl.name) && !ctl.disabled) {
				name = ctl.nodeName;
				if (name === 'TEXTAREA') {
					v = ctl.value.replace(/\r?\n/g, '\r\n');
				} else if (name === 'SELECT') {
					if (ctl.multiple) {    // multiple select
						for (v = [], j = 0, t = ctl.options, k = t.length; j < k; j += 1) {
							d = t[j];
							if (d.selected) {
								v.push(d.value === '' ? d.innerText : d.value);
							}
						}
						if (v.length < 2) { v = v[0]; }
					} else {
						v = ctl.value;
						if (v === '') { //IE8-
							for (t = ctl.options, j = t.length; j;) {
								d = t[j -= 1];
								if (d.selected) {
									v = d.value === '' ? d.innerText : d.value;
									break;
								}
							}
						}
					}
				} else if (name === 'INPUT') {
					t = ctl.type;
					if (t === 'text' || t === 'hidden' || (t === 'checkbox' || t === 'radio') && ctl.checked) {
						v = ctl.value;
					} else if (t === 'file' && ctl.files && ctl.files.length) {
						v = ctl.files;
					}
				}

				if (v !== un) {
					name = ctl.name;
					t = data;
					if (re.test(name)) {    // name like 'a[]'
						name = name.substr(0, name.length - 2);
						if (!t.hasOwnProperty(name)) {
							t[name] = typeof v === 'string' ? [v] : v;
						} else if (typeof v === 'string') {
							t[name].push(v);
						} else {
							t[name] = t[name].concat(v);
						}
					} else {    // use the last item if without setting name like 'a[]'
						t[name] = typeof v === 'string' ? v : v[v.length - 1];
					}
					//noinspection JSUnusedAssignment
					v = un;
				}
			}
		}
		return data;
	};

	if (!Array.prototype.hasOwnProperty('indexOf')) {
		Array.prototype.indexOf = function (needle) {
			var i = 0, l = this.length;
			for (; i < l; i += 1) {
				if (this[i] === needle) { return i; }
			}
			return -1;
		};
	}

	function _serialize(obj, serializer, matched, ret, prefix) {
		var toString = Object.prototype.toString, t = toString.call(obj), data = [], k, v, i, l;
		if (t === '[object Object]') {
			for (k in obj) {
				if (obj.hasOwnProperty(k)) {
					v = obj[k];
					k = prefix ? prefix + '[' + k + ']' : k;
					t = toString.call(v);
					if (t !== '[object Object]' && t !== '[object Array]' && t !== '[object FileList]') {
//						if (t === '[object File]') { ret.hasFile = true; }
						data.push(serializer(k, typeof v === 'function' ? v() : v, ret));
					} else if (matched.indexOf(v) === -1) {
						data = data.concat(_serialize(v, serializer, matched, ret, k));
					}
				}
			}
		} else if (t === '[object Array]' || t === '[object FileList]') {
			for (i = 0, l = obj.length; i < l; i += 1) {
				v = obj[i];
				k = prefix ? prefix + '[]' : i;
				t = toString.call(v);
				if (t !== '[object Object]' && t !== '[object Array]' && t !== '[object FileList]') {
//					if (t === '[object File]') { ret.hasFile = true; }
					data.push(serializer(k, typeof v === 'function' ? v() : v, ret));
				} else if (matched.indexOf(v) === -1) {
					data = data.concat(_serialize(v, serializer, matched, ret, k));
				}
			}
		}
		return data;
	}

	function serializer(name, value) {    // flatten
		return {name : name, value : value};
	}

	function serializer1(name, value) {    // GET or application/x-www-form-urlencoded
		return Object.prototype.toString.call(value) === '[object File]' ? false : encodeURIComponent(name) + (value === undefined || value === null ? '=' : '=' + encodeURIComponent(value));
	}

	function serializer2(name, value) {    // text/plain
		return Object.prototype.toString.call(value) === '[object File]' ? false : name + (value === undefined || value === null ? '=' : '=' + value);
	}

	function serializer3(name, value, ret) {    // multipart/form-data
		var rd, o = Object.prototype.toString.call(value);
		if (o === '[object File]' || o === '[object Blob]') {
			rd = new FileReader();
			o = {name : name, value : {file : value}};
			rd.readAsText(value);
			ret.waiting += 1;
			rd.onload = function (e) {
				o.value.content = e.target.result;
				ret.waiting -= 1;
				rd = null;
				if (!ret.waiting) {
					ret._done();
				}
			};
			return o;
		}
		return 'Content-Disposition: form-data; name="' + name + '"\r\n\r\n' + value;
	}

	function serializer4(name, value) {    // multipart/form-data after read file
		var file = value.file;
		return 'Content-Disposition: form-data; name="' + name + '"; filename="' + (file.name || file.fileName) + '"\r\nContent-type: ' + file.type + ';\r\n\r\n' + value.content;
	}

	function _done() {
		var i = 0, data = this.data, l = data.length, boundary = '--' + this.boundary, d;
		for (; i < l; i += 1) {
			d = data[i];
			if (typeof d === 'object') {
				data[i] = serializer4(d.name, d.value);
			}
		}
		this.done(boundary + '\r\n' + data.join('\r\n' + boundary + '\r\n') + '\r\n' + boundary + '--');
	}

	/**
	 * Serializes the object into strings based on the encode type.
	 *
	 * @param {object}      obj         The object or array to be serialized, required.
	 * @param {int}         enctype     Indicates which encode type applying to the serialization, one of 'application/x-www-form-urlencoded', 'text/plain', 'multipart/form-data', 'flatten'; the special one is 'flatten', just flattens the data and returns an object indicates file included or not, and an array composed of `{name:name, value:value}` object; use 'GET' if ignored.
	 * @param {string}      boundary    The boundary string, required if 'multipart/form-data' enctype.
	 * @param {function}    done        Callback function triggered when all files read, required as `boundary`.
	 */
	serialize = exports.serialize = function (data, enctype, boundary, done) {
		if (!data) { return; }
		var ret;
		enctype = _enctypes[enctype] || 0;
		if (enctype === 0 || enctype === 1) {
			data = _serialize(data, serializer1, [data]).join('&');
			return enctype ? data : data.replace(/%20/g, '+');
		}
		if (enctype === -1) {
			return _serialize(data, serializer, [data]);
		}
		if (enctype === 2) {
			return _serialize(data, serializer2, [data]).join('\r\n');
		}
		// notice, read file is asynchronize action, no result returns directly here
		ret = {
			waiting  : 1,
			done     : done,
			boundary : boundary,
			_done    : _done
		};
		ret.data = _serialize(data, serializer3, [data], ret);
		ret.waiting -= 1;
		if (!ret.waiting) {
			ret._done();
		}
	};

	function processResponse(res, type, xhr) {
		var ifm, body, win, arr, i, l;
		switch (type) {
			case 'arraybuffer':
				if (xhr && xhr.responseBody) {  // IE7+
					res = xhr.responseBody;
				} else if (global.Uint8Array) { // FF
					for (i = 0, l = res.length, arr = new Uint8Array(l); i < l; i += 1) {
						arr[i] = res.charCodeAt(i) & 0xff;
					}
					return arr.buffer;
				}
				break;
			case 'document':
				ifm = doc.createElement('iframe');
				ifm.style.display = 'none';
				body = doc.body;
				body.appendChild(ifm);
				win = ifm.contentWindow;
				win.document.write(res);
				res = win.document;
				if (res.readyState && res.readyState !== 'complete') {  // OP
					global.setTimeout(function () {
						body.removeChild(ifm);
						body = ifm = null;
					}, 500);
				}
				win = null;
				break;
			case 'blob':
				return Blob ? new Blob([res]) : res;
			case 'json':
				try {
					return JSON.parse(res);
				} catch (ignore) {
					try {
						//noinspection JSHint
						eval('res=' + res);
					} catch (ignored) {}
				}
				break;
		}
		return res;
	}

	//noinspection JSUnusedLocalSymbols
	function onJSONPFail(uri, ret) {
		if (!ret) { this.cfg.onfail.call(this.cfg.context); }
	}

	function onreadystatechange() {
		if (this.readyState === 4) {
			if (this.status >= 200 && this.status < 300) {
				var res = this.response || this.hasOwnProperty('responseText') && this.responseText;
				this.cfg.onsuccess.call(this.cfg.context, typeof res === 'string' ? processResponse(res, this.cfg.responseType, this) : res);
			} else {
				this.cfg.onfail.call(this.cfg.context, this.status);
			}
		}
	}

	function onfail() {
		this.cfg.onfail.call(this.cfg.context, this.status);
	}

	form2Req = FormData ? function (form) { // CH7+, FF4+, IE10+, OP12+, SA5+
		return new FormData(form);
	} : FileReader ? function (form, xhr) { // CH6+, FF4+, IE10+, OP12+, SA6+
		var p = '---------------------------' + Date.now().toString(16);
		serialize(getFormData(form), 'multipart/form-data', p, function (data) { xhr.send(data); });
		xhr.setRequestHeader('Content-Type', 'multipart/form-data; boundary=' + p);
	} : supportCreateElementByHTML ? function (form, xhr) {    // IE 8- don't support name property setter
		var cfg = xhr.cfg, body = doc.body, t = '_' + Date.now().toString(), ifm = doc.createElement('<iframe style="display:none" name="' + t + '"></iframe>');
		form.action = cfg.url;
		form.method = cfg.method;
		if (cfg.encoding) { form.acceptCharset = cfg.encoding; }
		form.enctype = form.encoding = 'multipart/form-data';   // encoding for IE7-
		form.target = t;
		body.appendChild(ifm);
		// contentDocument is not ready when onload triggers
		ifm.attachEvent('onreadystatechange', function () {
			if (doc.readyState === 'complete' && ifm.readyState === 'complete') {
				var document = ifm.contentWindow.document;
				body.removeChild(ifm);
				cfg.onsuccess(cfg.responseType === 'document' ? document : processResponse(document.body.innerHTML, cfg.responseType));
			}
		});
		form.submit();
		form.removeAttribute('target');
		form = null;
	} : function (form, xhr) {
		var cfg = xhr.cfg, body = doc.body, t = '_' + Date.now().toString(), ifm = doc.createElement('iframe');
		ifm.name = t;
		ifm.style.display = 'none';
		form.action = cfg.url;
		form.method = cfg.method;
		if (cfg.encoding) { form.acceptCharset = cfg.encoding; }
		form.enctype = 'multipart/form-data';
		form.target = t;
		body.appendChild(ifm);
		ifm.onload = function () {
			var doc = ifm.contentDocument || ifm.contentWindow.document;
			if (doc.readyState && doc.readyState !== 'complete') {  // OP
				global.setTimeout(function () {
					body.removeChild(ifm);
					body = ifm = null;
				}, 500);
			} else {
				body.removeChild(ifm);
				body = ifm = null;
			}
			cfg.onsuccess.call(cfg.context, cfg.responseType === 'document' ? doc : processResponse(doc.body.innerHTML, cfg.responseType));
		};
		form.submit();
		form.removeAttribute('target');
		form = null;
	};

	data2Req = FormData && FormData.prototype.append.length === 3 ? function (data) {
		var req = new FormData(), i = 0, l, d;
		for (data = serialize(data, 'flatten'), l = data.length; i < l; i += 1) {
			d = data[i];
			if (String(d.value) === '[object Blob]') {
				//noinspection JSCheckFunctionSignatures
				req.append(d.name, d.value, d.value.name || 'blob');
			} else {
				req.append(d.name, d.value);
			}
		}
		return req;
	} : function (data, xhr) {
		var p = '---------------------------' + Date.now().toString(16);
		serialize(data, 'multipart/form-data', p, function (data) { xhr.send(data); });
		xhr.setRequestHeader('Content-Type', 'multipart/form-data; boundary=' + p);
	};

	/**
	 * Ajax wrapper function. Supports set a form element directly as sending data instead of normal data object, and each way support files included.
	 *
	 * @param {object}  cfg     Configuration object, includes the options below.
	 *  {string}            url                 Request url, if not set, use the `action` attribute of `form`.
	 *  {HTMLFormElement}   form                The form element to be sent.
	 *  {object}            data                The data object or array to be sent.
	 *  {string}            method              Request method, default is 'GET'.
	 *  {string}            enctype             Request encoding type, one of 'application/x-www-form-urlencoded', 'text/plain', 'multipart/form-data'; if not set, use the `enctype` attribute of `form`; MUST be set to 'multipart/form-data' if file included.
	 *  {string}            encoding            The request encoding.
	 *  {*}                 context             The context object for callbacks such as `onsuccess` and `onfail`, default is the `cfg` object itself.
	 *  {boolean}           async               False if want synchronise request.
	 *  {string}            username            The username used for authorization.
	 *  {string}            password            The password used for authorization.
	 *  {object}            headers             Request headers.
	 *  {string}            responseType        Response type, one of 'text', 'json', 'arraybuffer', 'blob' and 'document', returns the response object with set request type, default is 'text'.
	 *  {int}               timeout             The number of milliseconds a request can take before automatically being terminated.
	 *  {boolean}           cacheable           Whether the request is cacheable or not, default is false.
	 *  {function}          onprogress          Download progress listener function.
	 *  {function}          upload/onprogress   Upload progress listener function.
	 *  {function}          onsuccess           Callback function when request successfully, takes `response` as it's argument.
	 *  {function}          onfail              Callback function when request failed, takes `status` as it's argument.
	 *
	 * @returns {XMLHttpRequest}   Returns the xhr object itself.
	 */
	exports.ajax = function (cfg) {
		// https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/Using_XMLHttpRequest
		if (!cfg) { return; }
		var xhr, cross, async, enctype, method, encoding, form = cfg.form, data = cfg.data, req, url, p, t, reading;
		if (!cfg.url && (!form || !form.action)) { return; }
		for (p in global_cfg) {
			if (global_cfg.hasOwnProperty(p) && !cfg.hasOwnProperty(p)) {
				cfg[p] = global_cfg[p];
			}
		}
		url = cfg.url || (cfg.url = form.action);
		if (!cfg.cacheable) {
			url += (url.indexOf('?') > 0 ? '&' : '?') + Date.now() + (cnt += 1);
		}
		if (!cfg.context) { cfg.context = cfg; }
		cross = isCrossDomain(cfg.url);
		async = cfg.async !== false;
		enctype = cfg.enctype || (cfg.enctype = form && form.enctype);
		method = cfg.method || form && form.method;
		method = cfg.method = method ? method.toUpperCase() : data || form || enctype ? 'POST' : 'GET';
		enctype = cfg.enctype || (cfg.enctype = 'application/x-www-form-urlencoded');
		xhr = getXHR();

		if (xhr && (!cross || supportCORS)) {
			xhr.cfg = cfg;
			xhr.onreadystatechange = onreadystatechange;
			xhr.onprogress = cfg.onprogress;
			xhr.onerror = xhr.onabort = xhr.ontimeout = onfail;
			p = cfg.upload;
			t = xhr.upload;
			if (p && t) {
				t.onprogress = cfg.upload.onprogress;
				t.onerror = t.onabort = onfail;
			}

			if (method === 'GET') {
				t = form ? getFormData(form) : data;
				xhr.open(method, t ? url + (url.indexOf('?') > 0 ? '&' : '?') + serialize(t) : url, async, cfg.username, cfg.password);
			} else {
				xhr.open(method, url, async, cfg.username, cfg.password);
				if (form || data) {
					if (enctype === 'multipart/form-data') {
						req = form ? form2Req(form, xhr) : data2Req(data, xhr);
						if (!req) { reading = true; }
					} else {
						req = serialize(form ? getFormData(form) : data, enctype);
						encoding = cfg.encoding || (cfg.encoding = form && form.encoding);
						xhr.setRequestHeader('Content-Type', enctype + (encoding ? '; charset=' + encoding : ''));
					}
				}
			}

			if (cfg.hasOwnProperty('headers')) {
				req = cfg.headers;
				for (p in req) {
					if (req.hasOwnProperty(p)) {
						xhr.setRequestHeader(p, req[p]);
					}
				}
			}
			if (async) {    // Gecko 11+ throws exception if set for synchronous request
				if (cfg.hasOwnProperty('responseType') && (!global.opera || cfg.responseType !== 'document')) {
					try {   // support by ff10+, op12+
						xhr.responseType = cfg.responseType;
					} catch (ignore) {}
				}
				if (cfg.timeout) { xhr.timeout = cfg.timeout; }
				// if (cross) { xhr.withCredentials = true; }
			}
			if ((cfg.responseType === 'xml') && xhr.overrideMimeType) {
				xhr.overrideMimeType('text/xml');
			}
			if (!reading) { xhr.send(req); }
		} else {   // cross domain request but XHR doesn't support CORS yet
			xhr = {cfg : cfg};
			// jsonp if no file, form + iframe + hash
//			if (enctype === 'multipart/form-data') {
//			} else {
			cnt += 1;
			t = xhr.jsonp = '__jsonp' + cnt;
			global[t] = function (res) {
				try {
					delete global[t];
				} catch (ignore) {
					global[t] = undefined;
				}
				cfg.onsuccess.call(cfg.context, typeof res === 'string' ? processResponse(res, cfg.responseType) : res);
			};
			loader.load(url + (url.indexOf('?') > 0 ? '&' : '?') + 'jsonp=' + t + '&' + serialize(form ? getFormData(form) : data), 'js', onJSONPFail, xhr);
//			}
		}
		return xhr;
	};

	/**
	 * Sets global configuration object.
	 *
	 * @param {object}  cfg The configuration object, required.
	 */
	exports.ajaxSetup = function (cfg) {
		if (!cfg) { return; }
		var form = cfg.form, data = cfg.data, o = {}, p;
		for (p in cfg) {
			if (cfg.hasOwnProperty(p)) {
				o[p] = cfg[p];
			}
		}
		o.async = cfg.async !== false;
		cfg.enctype = cfg.enctype || form && form.enctype;
		o.encoding = cfg.encoding || form && form.encoding;
		p = cfg.method || form && form.method;
		o.method = p ? p.toUpperCase() : data || form || cfg.enctype ? 'POST' : 'GET';
		o.enctype = cfg.enctype || 'application/x-www-form-urlencoded';
		global_cfg = o;
	};
});
