/**
 * Author   : nozer0
 * Email    : c.nozer0@gmail.com
 * Modified : 2013-11-05 23:33
 * Name     : component/store/ajax.js
 */

/*global define */
define(function (require, exports) {
	'use strict';

	var ajax = require('dom/ajax'), errors;

	function mixin(dest, src) {
		var p;
		for (p in src) {
			if (src.hasOwnProperty(p)) {
				dest[p] = src[p];
			}
		}
		return dest;
	}

	/**
	 * The store which stores the data in the Javascript objects.
	 *
	 * @param {Object}  cfg The configuration object includes the options below.
	 *  {string}    name            The data name to be stored, mapping to url, required.
	 *  {Object}    fields          The fields configurations to be stored, required.
	 *  {string}    host            The host name of server connect with, default is current host.
	 *  {Object}    urls            The request urls, if not set, use REST naming convention.
	 *  {boolean}   async           True if want asynchronize request, default is false.
	 *  {string}    responseType    Response type, one of 'text', 'json', 'arraybuffer', 'blob' and 'document', returns the response object with set type, default is 'json'.
	 *  {int}       timeout         The number of milliseconds a request can take before automatically being terminated.
	 * @constructor
	 */
	function Store(cfg) { mixin(this, cfg); }

	/**
	 * Indicates the store supports asynchronization or not, specially, 2 means support both modes.
	 * @type {boolean|int}
	 */
	Store.async = 2;

	/**
	 * Error messages.
	 */
	errors = Store.ERRORS = {
		0 : 'Initialization not start or finish yet',
		1 : 'Save without data',
		2 : 'Find without id',
		3 : 'Save Null to required field',
		4 : 'Request fail'
	};

	//noinspection JSHint,JSUnusedLocalSymbols,JSValidateJSDoc
	mixin(Store.prototype, {
		/**
		 * The flag property indicates the store status.
		 * @type {boolean}
		 */
		enabled : false,

		/**
		 * Initialization method.
		 *
		 * @param {Object}  cfg The configuration object includes the options below.
		 *  {string}    name            The data name to be stored, mapping to url, required.
		 *  {Object}    fields          The fields configurations to be stored, required.
		 *  {string}    host            The host name of server connect with, default is current host.
		 *  {Object}    urls            The request urls, if not set, use REST naming convention.
		 *  {boolean}   async           True if want asynchronize request, default is true.
		 *  {string}    responseType    Response type, one of 'text', 'json', 'arraybuffer', 'blob' and 'document', returns the response object with set type, default is 'json'.
		 *  {int}       timeout         The number of milliseconds a request can take before automatically being terminated.
		 */
		init : function (cfg) {
			if (cfg) { mixin(this, cfg); }
			var name = this.name, fields = this.fields, urls, url, t, l, p;
			if (!name || !fields) { throw 'required parameter missed'; }
			if (!this.responseType) { this.responseType = 'json'; }
			urls = this.urls || (this.urls = {});
			url = (this.host || (this.host = location.protocol + '//' + location.host)) + (urls.prefix ? urls.prefix + '/' : '/') + name;
			if (!urls.create) { urls.create = urls.save; }
			if (!urls.update) { urls.update = urls.save; }
			for (t = ['create', 'update', 'updateAll', 'remove', 'find', 'list'], l = t.length; l;) {
				p = t[l -= 1];
				if (!urls[p]) {
					urls[p] = url;
				}
			}
			this.enabled = true;
			if ((this.async = this.async !== false)) {
				this.trigger('initialized', cfg || {});
			}
			return this;
		},

		/**
		 * Destroyed method.
		 */
		destroy : function (options) {
			var urls = this.urls;
			ajax.ajax({
				url          : options && options.url || (this.host + (urls.prefix ? urls.prefix + '/' : '/') + this.name + '/destroy'),
				method       : options && options.method || 'DELETE',
				data         : options && options.data,
				responseType : options && options.responseType || this.responseType,
				context      : this,
				onsuccess    : function (res) {
					this.enabled = false;
					this.trigger('destroyed', res);
				},
				onfail       : function (status) { this.trigger('error:destroy', {status : status}); }
			});
			return false;
		},

		/**
		 * Validates the set `data` according to the fields configuration.
		 *
		 * @param {Object}  data    The data to be validated, require.
		 * @param {boolean} full    Whether the data contains all fields or not, default is false.
		 */
		validate : function (data, full) {
			if (!data) { return false; }
			var fields = this.fields, p, t, v;
			for (p in fields) {
				// id can be null in full data
				if (fields.hasOwnProperty(p) && (p !== 'id' && (full || data.hasOwnProperty(p)) && (t = fields[p]) && typeof t === 'object')) {
					v = data[p];
					if (v === undefined || v === null || v === '') {
						if (t.hasOwnProperty('defaultValue')) {
							data[p] = t.defaultValue;
						} else if (t.required) {
							this.trigger('error:invalid', {code : 3, field : p, value : v, message : errors[3]}, true);
							return false;
						}
					}
				}
			}
			return true;
		},

		/**
		 * Formats the data to the request format need.
		 *
		 * @param {Object}  data    The data to be sent, required.
		 * @param {string}  action  The name of action, one of 'create', 'update' and 'updateAll'.
		 */
		format : function (data, action) {
			var fields = this.fields, d = {}, p, t;
			for (p in fields) {
				if (fields.hasOwnProperty(p) && data.hasOwnProperty(p)) {
					t = data[p];
					if (t !== undefined && t !== null && t !== '' || (fields[p].type || fields[p]) === 'string') {
						d[p] = t;
					}
				}
			}
			return d;
		},

		/**
		 * Parses the data from the response, and returns the data
		 *
		 * @param {Object}  res     The response data returned from server, required.
		 * @param {string}  action  The name of action, one of 'create', 'update', 'updateAll', 'remove', 'find' and 'list'.
		 *
		 * @return {Object} Returns the data like `{id : id, data : data, ...}`.
		 *
		 * parse:function(res, action) { return res; }
		 */

		/**
		 * Sends the data to be stored to server, returns result immediately for synchronous mode, or triggers 'save:create' or 'save:update' event with related data when success for asynchronous mode.
		 *
		 * @param {Object}  data    The data to be stored, required.
		 * @param {Object}  options The options object to be triggered as event when success.
		 *  {boolean}   validated       Indicates the set `data` need validate or not.
		 *  {Function}  callback        If sets, the function will be called when success instead of trigger event.
		 *  {*}         context         The context object of set `callback` function.
		 *  {string}    method          Request method, default is 'POST'.
		 *  {boolean}   async           Indicates the store uses asynchronization or not, default is false.
		 *  {string}    url             The request save url, if not set, use REST naming convention.
		 *  {string}    responseType    Response type, one of 'text', 'json', 'arraybuffer', 'blob' and 'document', returns the response object with set type, default is 'json'.
		 *  {int}       timeout         The number of milliseconds a request can take before automatically being terminated.
		 *  {boolean}   blocking        Whether trigger the event with blocking mode or not, default is false.
		 */
		save : function (data, options) {
			if (!this.enabled || !data) {
				this.trigger('error:save', data ? {code : 0, message : errors[0]} : {code : 1, message : errors[1]}, true);
				return false;
			}
			if (!(options && options.validated || this.validate(data, !data.id))) { return false; }
			var id = data.id, opts = options || {}, async = opts.hasOwnProperty('async') ? opts.async : this.async, ret = null;
			opts.save_data = data;
//			console.info('save:remote', data, opts);
			ajax.ajax({
				url          : opts.url || (id ? this.urls.update + '/' + id : this.urls.create),
				method       : opts.method || 'POST',
				async        : async,
				data         : this.format ? this.format(data, id ? 'update' : 'create') : data,
				responseType : opts.responseType || this.responseType,
				context      : this,
				timeout      : opts.timeout || this.timeout,
				onsuccess    : function (res) {
					if (this.parse) {
						res = this.parse(res);
					}
					var id = opts.id = +res.id;
					opts.data = res.data || mixin({id : id}, data);
					opts.res = res;
//					console.info('save:remote:after', data, opts.data, opts);
					if (!async) {
						ret = opts.data;
					} else if (opts.callback) {
						opts.callback.call(opts.context, opts);
					} else {
						//noinspection JSPotentiallyInvalidUsageOfThis
						this.trigger('save:' + (data.id ? 'update' : 'create'), opts, opts.blocking);
					}
				},
				onfail       : function (status) {
					opts.status = status;
					opts.code = 4;
					opts.message = errors[4];
					//noinspection JSPotentiallyInvalidUsageOfThis
					this.trigger('error:save', opts, opts.blocking);
				}
			});
			return async ? true : ret;
		},

		/**
		 * Updates all data matching the set `conditions` with set `data`, returns result immediately for synchronous mode, or triggers 'updateAll' event with related data when success for asynchronous mode.
		 *
		 * @param {Object}          data        The updated data applied to all matching data, required, and also supports complex setting for special properties.
		 * @example
		 * {
		 *  p1 : 1,
		 *  p2 : {updater : function(data) { return data[p1] * 2; },
		 *  p3 : {expr : 'p1 + p2 + 2'}
		 * }
		 * it updates 'p1' field to 1, 'p2' field to double current 'p1' value before update, and 'p3' to the sum of current 'p1', 'p2' and 2.
		 *
		 * @param {Object|Array}    conditions  The condition object or array of conditions includes filter fields and related values, updates all if ignored.
		 * @example
		 * {field1 : value1, field2 : {op : '>', value : value2}}
		 * [{field1 : value1, field2 : {op : '>', value : value2}}, {field3 : {op : 'like', value : value3}}]
		 *
		 * @param {Object}          options     The options object to be triggered as event when success.
		 *  {boolean}   validated       Indicates the set `data` need validate or not.
		 *  {Function}  callback        If sets, the function will be called when success instead of trigger event.
		 *  {*}         context         The context object of set `callback` function.
		 *  {string}    method          Request method, default is 'POST'.
		 *  {boolean}   async           Indicates the store uses asynchronization or not, default is false.
		 *  {string}    url             The request save url, if not set, use REST naming convention.
		 *  {string}    responseType    Response type, one of 'text', 'json', 'arraybuffer', 'blob' and 'document', returns the response object with set type, default is 'json'.
		 *  {int}       timeout         The number of milliseconds a request can take before automatically being terminated.
		 *  {boolean}   blocking        Whether trigger the event with blocking mode or not, default is false.
		 */
		updateAll : function (data, conditions, options) {
			if (!this.enabled || !data) {
				this.trigger('error:updateAll', data ? {code : 0, message : errors[0]} : {code : 1, message : errors[1]}, true);
				return false;
			}
			if (!(options && options.validated || this.validate(data, false))) { return false; }
			var opts = options || {}, async = opts.hasOwnProperty('async') ? opts.async : this.async, ret = null;
			opts.data = data;
			opts.conditions = conditions;
//			console.info('updateAll:remote', data, conditions, opts);
			ajax.ajax({
				url          : opts.url || this.urls.updateAll + (conditions ? '?' + ajax.serialize(conditions) : ''),
				method       : opts.method || 'POST',
				async        : async,
				data         : this.format ? this.format(data, 'updateAll') : data,
				responseType : opts.responseType || this.responseType,
				context      : this,
				timeout      : opts.timeout || this.timeout,
				onsuccess    : function (res) {
					opts.res = this.parse ? res = this.parse(res) : res;
					opts.count = res.count;
//					console.info('updateAll:remote:after', data, conditions, opts);
					if (!async) {
						ret = res.count;
					} else if (opts.callback) {
						opts.callback.call(opts.context, opts);
					} else {
						//noinspection JSPotentiallyInvalidUsageOfThis
						this.trigger('updateAll', opts, opts.blocking);
					}
				},
				onfail       : function (status) {
					opts.status = status;
					opts.code = 4;
					opts.message = errors[4];
					//noinspection JSPotentiallyInvalidUsageOfThis
					this.trigger('error:updateAll', opts, opts.blocking);
				}
			});
			return async ? true : ret;
		},

		/**
		 * Removes all data matching the set `conditions` from store, returns result immediately for synchronous mode, or triggers 'remove' event with related data when success for asynchronous mode.
		 *
		 * @param {Object|Array|int}    conditions  The id of object to be removed; or the condition object or array of conditions includes filter fields and related values, removes all if ignored.
		 * @example
		 * {field1 : value1, field2 : {op : '>', value : value2}}
		 * [{field1 : value1, field2 : {op : '>', value : value2}}, {field3 : {op : 'like', value : value3}}]
		 *
		 * @param {Object}              options     The options object to be triggered as event when success.
		 *  {Function}  callback        If sets, the function will be called when success instead of trigger event.
		 *  {*}         context         The context object of set `callback` function.
		 *  {string}    method          Request method, default is 'DELETE'.
		 *  {boolean}   async           Indicates the store uses asynchronization or not, default is false.
		 *  {string}    url             The request save url, if not set, use REST naming convention.
		 *  {string}    responseType    Response type, one of 'text', 'json', 'arraybuffer', 'blob' and 'document', returns the response object with set type, default is 'json'.
		 *  {int}       timeout         The number of milliseconds a request can take before automatically being terminated.
		 *  {boolean}   blocking        Whether trigger the event with blocking mode or not, default is false.
		 */
		remove : function (conditions, options) {
			if (!this.enabled) {
				this.trigger('error:remove', {code : 0, message : errors[0]}, true);
				return false;
			}
			var opts = options || {}, async = opts.hasOwnProperty('async') ? opts.async : this.async, ret = null;
			if (conditions) {
				opts[typeof conditions === 'object' ? 'conditions' : 'id'] = conditions;
			}
//			console.info('remove:remote', conditions, opts);
			ajax.ajax({
				url          : opts.url || this.urls.remove + (conditions ? opts.id ? '/' + opts.id : '?' + ajax.serialize(conditions) : ''),
				method       : opts.method || 'DELETE',
				async        : async,
				responseType : opts.responseType || this.responseType,
				context      : this,
				timeout      : opts.timeout || this.timeout,
				onsuccess    : function (res) {
					opts.res = this.parse ? res = this.parse(res) : res;
					opts.count = res.count;
//					console.info('remove:remote:after', conditions, opts);
					if (!async) {
						ret = res.count;
					} else if (opts.callback) {
						opts.callback.call(opts.context, opts);
					} else {
						//noinspection JSPotentiallyInvalidUsageOfThis
						this.trigger('remove', opts, opts.blocking);
					}
				},
				onfail       : function (status) {
					opts.status = status;
					opts.code = 4;
					opts.message = errors[4];
					//noinspection JSPotentiallyInvalidUsageOfThis
					this.trigger('error:remove', opts, opts.blocking);
				}
			});
			return async ? true : ret;
		},

		/**
		 * Requests the data related to the set `id`, returns result immediately for synchronous mode, or triggers 'find' event with related data when success for asynchronous mode.
		 *
		 * @param {int}     id      The id of object want to find, required.
		 * @param {Object}  options The options object to be triggered as event when success.
		 *  {Function}  callback        If sets, the function will be called when success instead of trigger event.
		 *  {*}         context         The context object of set `callback` function.
		 *  {string}    method          Request method, default is 'DELETE'.
		 *  {boolean}   async           Indicates the store uses asynchronization or not, default is false.
		 *  {string}    url             The request save url, if not set, use REST naming convention.
		 *  {string}    responseType    Response type, one of 'text', 'json', 'arraybuffer', 'blob' and 'document', returns the response object with set type, default is 'json'.
		 *  {int}       timeout         The number of milliseconds a request can take before automatically being terminated.
		 *  {boolean}   blocking        Whether trigger the event with blocking mode or not, default is false.
		 */
		find : function (id, options) {
			if (!this.enabled || isNaN(id) && id <= 0) {
				this.trigger('error:find', this.enabled ? {code : 2, message : errors[2]} : {code : 0, message : errors[0]}, true);
				return false;
			}
			var opts = options || {}, async = opts.hasOwnProperty('async') ? opts.async : this.async, ret = null;
			opts.id = id;
//			console.info('find:remote', id, opts);
			ajax.ajax({
				url          : opts.url || (this.urls.find + '/' + id),
				method       : opts.method || 'GET',
				async        : async,
				responseType : opts.responseType || this.responseType,
				context      : this,
				timeout      : opts.timeout || this.timeout,
				onsuccess    : function (res) {
					opts.res = this.parse ? res = this.parse(res) : res;
					opts.data = res.data;
//					console.info('find:remote:after', id, opts.data, opts);
					if (!async) {
						ret = res.data;
					} else if (opts.callback) {
						opts.callback.call(opts.context, opts);
					} else {
						//noinspection JSPotentiallyInvalidUsageOfThis
						this.trigger('find', opts, opts.blocking);
					}
				},
				onfail       : function (status) {
					opts.status = status;
					opts.code = 4;
					opts.message = errors[4];
					//noinspection JSPotentiallyInvalidUsageOfThis
					this.trigger('error:find', opts, opts.blocking);
				}
			});
			return async ? true : ret;
		},

		/**
		 * Indicates whether the data return by `list` method include full data of each item or not.
		 * @type {boolean}
		 */
		list_full_data : false,

		/**
		 * Requests the data list matching the set `conditions`, returns result immediately for synchronous mode, or triggers 'list' event with related data when success for asynchronous mode.
		 *
		 * @param {Object|Array}    conditions  The condition object or array of conditions includes filter fields and related values, gets all if ignored.
		 * @example
		 * {field1 : value1, field2 : {op : '>', value : value2}}
		 * [{field1 : value1, field2 : {op : '>', value : value2}}, {field3 : {op : 'like', value : value3}}]
		 *
		 * @param {Object}          modifiers   The options to modify the list data.
		 *  {string}    order   The sort field and order, default is 'id asc'.
		 *  {int}       offset  The offset from where the return data should start, default is 0.
		 *  {int}       limit   How many matching data should return, default is 20.
		 *  {int}       page    The page number data return from, default is 1, especially, -1 means last page.
		 *
		 * @param {Object}          options     The options object to be triggered as event when success.
		 *  {Function}  callback        If sets, the function will be called when success instead of trigger event.
		 *  {*}         context         The context object of set `callback` function.
		 *  {string}    method          Request method, default is 'DELETE'.
		 *  {boolean}   async           Indicates the store uses asynchronization or not, default is false.
		 *  {string}    url             The request save url, if not set, use REST naming convention.
		 *  {string}    responseType    Response type, one of 'text', 'json', 'arraybuffer', 'blob' and 'document', returns the response object with set type, default is 'json'.
		 *  {int}       timeout         The number of milliseconds a request can take before automatically being terminated.
		 *  {boolean}   blocking        Whether trigger the event with blocking mode or not, default is false.
		 */
		list : function (conditions, modifiers, options) {
			if (!this.enabled) {
				this.trigger('error:list', {code : 0, message : errors[0]}, true);
				return false;
			}
			var opts = options || {}, async = opts.hasOwnProperty('async') ? opts.async : this.async, ret = null;
			opts.conditions = conditions;
			opts.modifiers = modifiers;
//			console.info('list:remote', conditions, opts);
			ajax.ajax({
				url          : opts.url || this.urls.list,
				method       : opts.method || 'GET',
				async        : async,
				data         : modifiers ? mixin({__modifiers : modifiers}, conditions) : conditions,
				responseType : opts.responseType || this.responseType,
				context      : this,
				timeout      : opts.timeout || this.timeout,
				onsuccess    : function (res) {
					opts.res = this.parse ? res = this.parse(res) : res;
					opts.data = res.data;
//					console.info('list:remote:after', opts.data, conditions, opts);
					if (!async) {
						ret = res.data;
					} else if (opts.callback) {
						opts.callback.call(opts.context, opts);
					} else {
						//noinspection JSPotentiallyInvalidUsageOfThis
						this.trigger('list', opts, opts.blocking);
					}
				},
				onfail       : function (status) {
					opts.status = status;
					opts.code = 4;
					opts.message = errors[4];
					//noinspection JSPotentiallyInvalidUsageOfThis
					this.trigger('error:list', opts, opts.blocking);
				}
			});
			return async ? true : ret;
		}
	});

	require('util/observable').observable(Store.prototype);
	exports.Store = Store;
});
