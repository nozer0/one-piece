/**
 * Author   : nozer0
 * Email    : c.nozer0@gmail.com
 * Modified : 2013-11-06 00:00
 * Name     : component/store/cache.js
 */

/*global define */
define(function (require, exports) {
	'use strict';

	var util = require('util'), mixin = util.mixin, match = util.match, errors;

	/**
	 * The store which stores the data in the Javascript objects.
	 *
	 * @param {Object}  cfg The configuration object includes the options below.
	 *  {Object}    fields  The fields configurations to be stored, required.
	 * @constructor
	 */
	function Store(cfg) { mixin(this, cfg); }

	/**
	 * Indicates the store supports asynchronization or not.
	 * @type {boolean}
	 */
	Store.async = false;

	/**
	 * Error messages.
	 */
	errors = Store.ERRORS = {
		0 : 'Initialization not start or finish yet',
		1 : 'Save without data',
		2 : 'Find without id',
		3 : 'Save Null to required field',
		4 : 'Save existed value to unique field'
	};

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
		 *  {Object}    fields  The fields configurations to be stored, required.
		 */
		init : function (cfg) {
			if (cfg && cfg.hasOwnProperty('fields')) {
				this.fields = cfg.fields;
			}
			if (!this.fields) { throw 'required parameter missed'; }
			this.cache = {};
			//noinspection JSUnusedGlobalSymbols
			this.seed = 0;
			this.enabled = true;
			return this;
		},

		/**
		 * Destroyed method.
		 */
		destroy : function () {
			this.cache = {};
			this.enabled = false;
			return true;
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
		 * Saves the data into store.
		 *
		 * @param {Object}  data    The data to be stored, required.
		 * @param {Object}  options The options object, includes properties below.
		 *  {boolean}   validated   Indicates the set `data` need validate or not.
		 */
		save : function (data, options) {
			if (!this.enabled || !data) {
				this.trigger('error:save', data ? {code : 0, message : errors[0]} : {code : 1, message : errors[1]}, true);
				return false;
			}
			if (!(options && options.validated || this.validate(data, !data.id))) { return false; }
			//noinspection JSUnusedGlobalSymbols
			var fields = this.fields, id = data.id || (this.seed += 1), d = this.cache[id] || (this.cache[id] = {id : id}), p, ret = {};
			for (p in fields) {
				if (fields.hasOwnProperty(p)) {
					ret[p] = data.hasOwnProperty(p) ? (d[p] = data[p]) : d[p];
				}
			}
			return ret;
		},

		_evalExpression : function (expr, data) {
			var ret = expr.match(/\w+|\d+|'[^']*'|[+-\\*\/%\|]+/g), v = ret[0], r, op, i, l;
			for (v = /^[a-z_]/.test(v) ? data[v] : v.indexOf('\'') === 0 ? v.substring(1, v.length - 1) : +v, i = 1, l = ret.length; i < l; i += 1) {
				op = ret[i];
				r = ret[i += 1];
				r = /^[a-z_]/.test(r) ? data[r] : r.indexOf('\'') === 0 ? r.substring(1, r.length - 1) : +r;
				switch (op) {
					case '-':
						v -= r;
						break;
					case '*':
						v *= r;
						break;
					case '/':
						v /= r;
						break;
					case '%':
						v %= r;
						break;
					default:
						v += r;
				}
			}
			return v;
		},

		/**
		 * Updates all data matching the set `conditions` with set `data`.
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
		 * @param {Object}          options     The options object, includes properties below.
		 *  {boolean}   validated   Indicates the set `data` need validate or not.
		 */
		updateAll : function (data, conditions, options) {
			if (!this.enabled || !data) {
				this.trigger('error:updateAll', data ? {code : 0, message : errors[0]} : {code : 1, message : errors[1]}, true);
				return false;
			}
			if (!(options && options.validated || this.validate(data, false))) { return false; }
			var cache = this.cache, fields = this.fields, p, d, v, l, cnt = 0;
			if (!conditions) {
				for (p in cache) {
					if (cache.hasOwnProperty(p) && (d = cache[p])) {
						cnt += 1;
						for (p in data) {
							if (data.hasOwnProperty(p) && fields.hasOwnProperty(p)) {
								v = data[p];
								//noinspection JSUnresolvedVariable,JSUnresolvedFunction
								d[p] = v && typeof v === 'object' ? (v.updater ? v.updater(d, data) : v.expr ? this._evalExpression(v.expr, d) : v) : v;
							}
						}
					}
				}
			} else {
				conditions = conditions instanceof Array ? conditions : [conditions];
				for (p in cache) {
					if (cache.hasOwnProperty(p) && (d = cache[p])) {
						for (l = conditions.length; l;) {
							if (match(d, conditions[l -= 1])) {
								cnt += 1;
								for (p in data) {
									if (data.hasOwnProperty(p) && fields.hasOwnProperty(p)) {
										v = data[p];
										//noinspection JSUnresolvedVariable,JSUnresolvedFunction
										d[p] = v && typeof v === 'object' ? (v.updater ? v.updater(d, data) : v.expr ? this._evalExpression(v.expr, d) : v) : v;
									}
								}
								break;  // break the conditions loop
							}
						}
					}
				}
			}
			return cnt;
		},

		/**
		 * Removes all data matching the set `conditions` from store.
		 *
		 * @param {Object|Array|int}    conditions  The id of object to be removed; or the condition object or array of conditions includes filter fields and related values, removes all if ignored.
		 * @example
		 * {field1 : value1, field2 : {op : '>', value : value2}}
		 * [{field1 : value1, field2 : {op : '>', value : value2}}, {field3 : {op : 'like', value : value3}}]
		 */
		remove : function (conditions) {
			if (!this.enabled) {
				this.trigger('error:remove', {code : 0, message : errors[0]}, true);
				return false;
			}
			var cache = this.cache, d, p, l, cnt = 0;
			if (!conditions) {
				this.cache = {};
				return -1;  // all
			}
			if (typeof conditions !== 'object') {    // id
				d = cache.hasOwnProperty('conditions');
				delete cache[conditions];
				return d ? 1 : 0;
			}
			conditions = conditions instanceof Array ? conditions : [conditions];
			for (p in cache) {
				if (cache.hasOwnProperty(p) && (d = cache[p])) {
					for (l = conditions.length; l;) {
						if (match(d, conditions[l -= 1])) {
							cnt += 1;
							delete cache[d.id];
							break;
						}
					}
				}
			}
			return cnt;
		},

		/**
		 * Returns the data related to the set `id`.
		 *
		 * @param {int} id  The id of object want to find, required.
		 */
		find : function (id) {
			if (!this.enabled || isNaN(id) && id <= 0) {
				this.trigger('error:find', this.enabled ? {code : 2, message : errors[2]} : {code : 0, message : errors[0]}, true);
				return false;
			}
			var data = this.cache[id];
			return data ? mixin({}, data) : data;
		},

		/**
		 * Indicates whether the data return by `list` method include full data of each item or not.
		 * @type {boolean}
		 */
		list_full_data : true,

		/**
		 * Returns the data list matching the set `conditions` from store.
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
		 */
		list : function (conditions, modifiers) {
			if (!this.enabled) {
				this.trigger('error:list', {code : 0, message : errors[0]}, true);
				return false;
			}
			var cache = this.cache, data = [], i, d, t, p, l;
			if (conditions) {
				conditions = conditions instanceof Array ? conditions : [conditions];
				for (p in cache) {
					if (cache.hasOwnProperty(p) && (d = cache[p])) {
						for (l = conditions.length; l;) {
							if (match(d, conditions[l -= 1])) {
								data.push(d);
								break;
							}
						}
					}
				}
				if (!data.length) { return data; }
			} else {
				for (p in cache) {
					if (cache.hasOwnProperty(p)) {
						data.push(cache[p]);
					}
				}
			}
			if ((t = modifiers && modifiers.order)) {
				t = t.split(' ');
				p = t[0];
				d = t[1] === 'desc';
			} else {
				p = 'id';
				d = false;
			}
			data.sort(function (a, b) {
				return a[p] < b[p] ? (d ? 1 : -1) : (a[p] > b[p] ? (d ? -1 : 1) : (a.id > b.id ? 1 : -1));
			});
			if (modifiers) {
				d = +modifiers.offset || 0;
				t = +modifiers.limit;
				p = +modifiers.page;
				if (p) {
					t = t || 20;
					data = data.splice((p === -1 ? Math.ceil(data.length / t) - 1 : p - 1) * t + d, t);
				} else if (t) {
					data = data.splice(d, t);
				} else if (d) {
					data.splice(0, d);
				}
			}
			for (i = 0, t = data.length; i < t; i += 1) {
				data[i] = mixin({}, data[i]);
			}
			return data;
		}
	});

	require('util/observable').observable(Store.prototype);
	exports.Store = Store;
});
