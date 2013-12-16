/**
 * Author   : nozer0
 * Email    : c.nozer0@gmail.com
 * Modified : 2013-11-06 00:59
 * Name     : component/store/indexedDB.js
 */

/*global define */
define(function (require, exports) {
	'use strict';

	// https://developer.mozilla.org/en-US/docs/IndexedDB/Using_IndexedDB
	//noinspection JSUnresolvedVariable
	var global = define.global || window, util = require('util'), mixin = util.mixin, match = util.match, host = global.location.host, indexedDB = global.indexedDB || global.mozIndexedDB || global.webkitIndexedDB || global.msIndexedDB, READ_WRITE = (global.IDBTransaction || global.webkitIDBTransaction || global.msIDBTransaction).READ_WRITE || 'readwrite', IDBKeyRange = global.IDBKeyRange || global.webkitIDBKeyRange || global.msIDBKeyRange, IDBCursor = global.IDmsIDBTransactionBCursor || global.webkitIDBCursor || global.msIDBCursor, errors;

	/**
	 * The indexed database store which stores the data in the local indexed database.
	 *
	 * @param {Object}  cfg The configuration object includes the options below.
	 *  {string}    name        The data name to be stored, mapping to table name, required.
	 *  {Object}    fields      The fields configurations to be stored, required.
	 *  {string}    db_name     The database name, default use a random string.
	 *  {string}    db_version  The database version, default is 1.
	 * @constructor
	 */
	function Store(cfg) { mixin(this, cfg); }

	/**
	 * Indicates the store supports asynchronization or not.
	 * @type {boolean}
	 */
	Store.async = true;

	/**
	 * Error messages.
	 */
	errors = Store.ERRORS = {
		0 : 'Initialization not start or finish yet',
		1 : 'Save without data',
		2 : 'Find without id',
		3 : 'Save Null to required field',
		4 : 'Open database Timeout'
	};

	mixin(Store.prototype, {
		/**
		 * The flag property indicates the store status.
		 * @type {boolean}
		 */
		enabled : false,

		/**
		 * The method to initialize the store object structure on database based on the fields setting.
		 *
		 * @param {Object}  cfg The configuration object includes the options below.
		 *  {string}    name        The data name to be stored, mapping to table name, required.
		 *  {Object}    fields      The fields configurations to be stored, required.
		 *  {string}    db_name     The database name, default use a random string.
		 *  {string}    db_version  The database version, default is 1.
		 */
		init : function (cfg) {
			if (cfg) { mixin(this, cfg); }
			var name = this.name, fields = this.fields, self = this, req, onupgradeneeded, timer;
			if (!name || !fields) { throw 'required parameter missed'; }

			try {
				req = indexedDB.open(this.db_name || (this.db_name = host), this.db_version && Math.floor(this.db_version) || (this.db_version = 1));
			} catch (ex) {
				this.trigger('error', ex, true);
				return false;
			}
			onupgradeneeded = function () {
				var db = this.result, store, p;
				//noinspection JSUnresolvedVariable
				if (db.objectStoreNames.contains(name)) {
					self.trigger('upgradeneeded', {}, true);
				} else {
					//noinspection JSUnresolvedFunction
					store = db.createObjectStore(name, {keyPath : 'id', autoIncrement : true});
					for (p in fields) {
						if (fields.hasOwnProperty(p) && fields[p].unique) {
							//noinspection JSUnresolvedFunction
							store.createIndex(p, p, {unique : true});
						}
					}
				}
			};
			timer = setTimeout(req.onerror = this.onError = function (e) {
				self.trigger('error', e || {code : 4, message : errors[4]}, true);
			}, 3000);
			req.onsuccess = function () {
				clearTimeout(timer);
				var db = self.db = this.result, req;
				db.onerror = self.onError;
				//noinspection JSUnresolvedVariable
				if (db.setVersion && db.version !== self.db_version) {  // old webkit not support `upgradeneeded` event
					//noinspection JSUnresolvedFunction
					req = db.setVersion(self.db_version);
					req.onsuccess = function () {
						onupgradeneeded();
						self.enabled = true;
						self.trigger('initialized', {});
					};
					req.onerror = self.onError;
				} else {
					self.enabled = true;
					self.trigger('initialized', {});
				}
			};
			req.onupgradeneeded = onupgradeneeded;
			return this;
		},

		/**
		 * Be careful, this method will destroy the whole database.
		 *
		 * @return {boolean} True means destroyed immediately.
		 */
		destroy : function () {
			this.db.close();    // !!!Don't forget this
			this.enabled = false;
			//noinspection JSUnresolvedFunction
			var self = this, req = indexedDB.deleteDatabase(this.db_name);
			req.onerror = this.onError;
			req.onsuccess = function () {
				self.db.onerror = null;
				delete self.db;
				self.trigger('destroyed', {});
			};
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
		 * Saves the data into store, triggers 'save:create' or 'save:update' event when success.
		 *
		 * @param {Object}  data    The data to be stored, required.
		 * @param {Object}  options The options object to be triggered as event when success.
		 *  {boolean}   validated   Indicates the set `data` need validate or not.
		 *  {Function}  callback    If sets, the function will be called when success instead of trigger event.
		 *  {*}         context     The context object of set `callback` function.
		 *  {boolean}   create      Implies the action is 'create' if true, 'update' if false, or check on store even the data includes id if not set.
		 */
		save : function (data, options) {
			if (!this.enabled || !data) {
				this.trigger('error:save', data ? {code : 0, message : errors[0]} : {code : 1, message : errors[1]}, true);
				return false;
			}
			var self = this, store, id = data.id, onsuccess, ret, create = options && options.create;
			if (!(options && options.validated || this.validate(data, !id))) { return false; }
			//noinspection JSUnresolvedFunction
			store = this.db.transaction([this.name], READ_WRITE).objectStore(this.name);
//			console.info('save:local', data, options);
			onsuccess = function () {
				var opts = options || {};
				opts.save_data = data;
				opts.data = ret || mixin({id : opts.id = this.result}, data);
//				console.info('save:local:after', data, opts.data, opts);
				if (opts.callback) {
					setTimeout(function () { opts.callback.call(opts.context, opts); }, 0);
				} else {
					self.trigger('save:' + (ret ? 'update' : 'create'), opts);
				}
			};
			if (!id || create) {
				//noinspection JSUnresolvedFunction
				store.put(data).onsuccess = onsuccess;
			} else if (create === false) {
				ret = mixin({}, data);
				//noinspection JSUnresolvedFunction
				store.put(data).onsuccess = onsuccess;
			} else {
				store.get(id).onsuccess = function () {
					var d = this.result;
					//noinspection JSUnresolvedFunction
					store.put(d ? ret = mixin(d, data) : data).onsuccess = onsuccess;
				};
			}
			return true;
		},

		_evalExpression        : function (expr, data) {
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
		_getCursorByConditions : function (store, conditions) {
			//noinspection JSUnresolvedVariable
			var indexes = store.indexNames, p, t, op, range = null; // IE reports error if passed with `undefined`
			for (p in conditions) {
				if (conditions.hasOwnProperty(p) && indexes.contains(p)) {
					t = conditions[p];
					if (t && typeof t === 'object') {
						op = t.op;
						t = t.value;
					} else {
						op = '=';
					}
					if (t !== null && t !== undefined && (op === '<' || op === '>' || op === '=')) {
						range = IDBKeyRange[op === '=' ? 'only' : op === '>' ? 'lowerBound' : 'upperBound'](t, op !== '=');
					}
					//noinspection JSUnresolvedFunction
					return store.index(p).openCursor(range);
				}
			}
		},
		/**
		 * Updates all data matching the set `conditions` with set `data`, triggers 'updateAll' event when success.
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
		 *  {boolean}   validated   Indicates the set `data` need validate or not.
		 *  {Function}  callback    If sets, the function will be called when success instead of trigger event.
		 *  {*}         context     The context object of set `callback` function.
		 */
		updateAll              : function (data, conditions, options) {
			if (!this.enabled || !data) {
				this.trigger('error:updateAll', data ? {code : 0, message : errors[0]} : {code : 1, message : errors[1]}, true);
				return false;
			}
			if (!(options && options.validated || this.validate(data, false))) { return false; }
			//noinspection JSUnresolvedFunction
			var self = this, transaction = this.db.transaction([this.name], READ_WRITE), store = transaction.objectStore(this.name), t, cnt = 0;
//			console.info('update:local', data, conditions, options);
			transaction.oncomplete = function () {
				var opts = options || {};
				opts.conditions = t || conditions;
				opts.data = data;
				opts.count = cnt;
//				console.info('update:local:after', data, conditions, opts);
				if (opts.callback) {
					setTimeout(function () { opts.callback.call(opts.context, opts); }, 0);
				} else {
					self.trigger('updateAll', opts);
				}
			};
			if (conditions && !(conditions instanceof Array)) {
				t = conditions;
				conditions = [t];
			}
			//noinspection JSUnresolvedFunction
			(t && this._getCursorByConditions(store, t) || store.openCursor()).onsuccess = conditions ? function () {
				var cursor = this.result, d, l, p, v;
				if (cursor) {
					for (d = cursor.value, l = conditions.length; l;) {
						if (match(d, conditions[l -= 1])) {
							cnt += 1;
							d = mixin({}, d);
							for (p in data) {
								if (data.hasOwnProperty(p)) {
									v = data[p];
									//noinspection JSUnresolvedVariable,JSUnresolvedFunction
									d[p] = v && typeof v === 'object' ? (v.updater ? v.updater(d, data) : v.expr ? self._evalExpression(v.expr, d) : v) : v;
								}
							}
							cursor.update(d);
							break;
						}
					}
					cursor['continue']();   // for compatibility of IE8- and OP
				}
			} : function () {
				var cursor = this.result, d, p, v;
				if (cursor) {
					cnt += 1;
					d = mixin({}, cursor.value);
					for (p in data) {
						if (data.hasOwnProperty(p)) {
							v = data[p];
							//noinspection JSUnresolvedVariable,JSUnresolvedFunction
							d[p] = v && typeof v === 'object' ? (v.updater ? v.updater(d, data) : v.expr ? self._evalExpression(v.expr, d) : v) : v;
						}
					}
					cursor.update(d);
					cursor['continue']();   // for compatibility of IE8- and OP
				}
			};
			return true;
		},

		/**
		 * Removes all data matching the set `conditions` from store, triggers 'remove' event when success.
		 *
		 * @param {Object|Array|int}    conditions  The id of object to be removed; or the condition object or array of conditions includes filter fields and related values, removes all if ignored.
		 * @example
		 * {field1 : value1, field2 : {op : '>', value : value2}}
		 * [{field1 : value1, field2 : {op : '>', value : value2}}, {field3 : {op : 'like', value : value3}}]
		 *
		 * @param {Object}              options     The options object to be triggered as event when success.
		 *  {Function}  callback    If sets, the function will be called when success instead of trigger event.
		 *  {*}         context     The context object of set `callback` function.
		 */
		remove : function (conditions, options) {
			if (!this.enabled) {
				this.trigger('error:remove', {code : 0, message : errors[0]}, true);
				return false;
			}
			//noinspection JSUnresolvedFunction
			var self = this, transaction = this.db.transaction([this.name], READ_WRITE), store = transaction.objectStore(this.name), opts = options || {}, t, cnt;
//			console.info('remove:local', JSON.stringify(conditions));
			transaction.oncomplete = function () {
				opts.count = cnt;
//				console.info('remove:local:after', JSON.stringify(conditions));
				if (opts.callback) {
					setTimeout(function () { opts.callback.call(opts.context, opts); }, 0);
				} else {
					self.trigger('remove', opts);
				}
			};
			if (!conditions) {
				store.clear();
				cnt = -1;
			} else if (typeof conditions === 'object') {
				opts.conditions = conditions;
				conditions = conditions instanceof Array ? conditions : [t = conditions];
				//noinspection JSUnresolvedFunction
				(t && this._getCursorByConditions(store, t) || store.openCursor()).onsuccess = function () {
					var cursor = this.result, d, l;
					if (cursor) {
						for (d = cursor.value, l = conditions.length; l;) {
//							console.warn(JSON.stringify(d), JSON.stringify(conditions[l - 1]));
							if (match(d, conditions[l -= 1])) {
								cnt += 1;
								cursor['delete']();   // for compatibility of IE8- and OP
								break;
							}
						}
						cursor['continue']();
					}
				};
			} else {
				store['delete'](opts.id = +conditions);
				cnt = 1;
			}
			return true;
		},

		/**
		 * Returns the data related to the set `id`, triggers 'find' event when success.
		 *
		 * @param {int}     id      The id of object want to find, required.
		 * @param {Object}  options The options object to be triggered as event when success.
		 *  {Function}  callback    If sets, the function will be called when success instead of trigger event.
		 *  {*}         context     The context object of set `callback` function.
		 */
		find : function (id, options) {
			if (!this.enabled || isNaN(id) && id <= 0) {
				this.trigger('error:find', this.enabled ? {code : 2, message : errors[2]} : {code : 0, message : errors[0]}, true);
				return false;
			}
			var self = this;
//			console.info('find:local', id, options);
			// Notice!!! Must pass int value as parameter
			//noinspection JSUnresolvedFunction
			this.db.transaction([this.name]).objectStore(this.name).get(id = +id).onsuccess = function () {
				var opts = options || {};
				opts.id = id;
				opts.data = this.result;
//				console.info('find:local:after', id, opts.data, opts);
				if (opts.callback) {
					// to avoid the situation that change data in callback function, since the transaction is immutable and not complete yet
					setTimeout(function () { opts.callback.call(opts.context, opts); }, 0);
				} else {
					// do not set 'blocking' parameter to make transaction commit early
					self.trigger('find', opts);
				}
			};
			return true;
		},

		/**
		 * Indicates whether the data return by `list` method include full data of each item or not.
		 * @type {boolean}
		 */
		list_full_data : true,

		/**
		 * Returns the data list matching the set `conditions`, triggers 'list' event when success.
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
		 *  {Function}  callback    If sets, the function will be called when success instead of trigger event.
		 *  {*}         context     The context object of set `callback` function.
		 */
		list : function (conditions, modifiers, options) {
			if (!this.enabled) {
				this.trigger('error:list', {code : 0, message : errors[0]}, true);
				return false;
			}
			//noinspection JSUnresolvedVariable,JSUnresolvedFunction
			var self = this, transaction = this.db.transaction([this.name]), store = transaction.objectStore(this.name), indexes = store.indexNames, order = modifiers && modifiers.order, field, desc, cursor, p, data = [], condition;
//			console.info('list:local', conditions, options);
			if (order) {    // order first
				order = order.split(' ');
				p = order[0];
				if (indexes.contains(p)) {
					//noinspection JSUnresolvedFunction
					cursor = store.index(p).openCursor(null, IDBCursor[order[1] === 'desc' ? 'PREV' : 'NEXT']);
				} else if (p !== 'id') {
					field = p;
					desc = order[1] === 'desc';
				} else if (order[1] === 'desc') {
					//noinspection JSUnresolvedFunction,JSUnresolvedVariable
					cursor = store.openCursor(null, IDBCursor.PREV);
				}
			}
			if (conditions && !(conditions instanceof Array)) {
				conditions = [condition = conditions];
			}
			if (!cursor && condition) {   // conditions then
				cursor = this._getCursorByConditions(store, condition);
			}

			transaction.oncomplete = function () {
				var d = desc, p = field, t, opts = options || {};
				if (field && data.length) {
					data.sort(function (a, b) {
						return a[p] < b[p] ? (d ? 1 : -1) : (a[p] > b[p] ? (d ? -1 : 1) : (a.id > b.id ? 1 : -1));
					});
				}
				opts.conditions = condition || conditions;
				if (modifiers) {
					opts.modifiers = modifiers;
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
				opts.data = data;
//				console.info('list:local:after', opts.data, conditions, opts);
				if (opts.callback) {
					// to avoid the situation that change data in callback function, since the transaction is immutable and not complete yet
					setTimeout(function () { opts.callback.call(opts.context, opts); }, 0);
				} else {
					self.trigger('list', opts);
				}
			};

			//noinspection JSUnresolvedFunction
			(cursor || store.openCursor()).onsuccess = conditions ? function () {
				var cursor = this.result, d, l;
				if (cursor) {
					for (d = cursor.value, l = conditions.length; l;) {
						if (match(d, conditions[l -= 1])) {
							data.push(d);
							break;
						}
					}
					cursor['continue']();   // for compatibility of IE8- and Op
				}
			} : function () {
				var cursor = this.result;
				if (cursor) {
					data.push(cursor.value);
					cursor['continue']();   // for compatibility of IE8- and Op
				}
			};
			return true;
		}
	});

	require('util/observable').observable(Store.prototype);
	exports.Store = Store;
});
