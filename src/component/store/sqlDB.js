/**
 * Author   : nozer0
 * Email    : c.nozer0@gmail.com
 * Modified : 2014-05-08 00:05
 * Name     : component/store/sqlDB.js
 */

/*global define */
define(function (require, exports) {
	'use strict';

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
	 * The web SQL database store which stores the data in the local SQL database.
	 *
	 * @param {Object}  cfg The configuration object includes the options below.
	 *  {string}    name            The data name to be stored, mapping to table name, required.
	 *  {Object}    fields          The fields configurations to be stored, required.
	 *  {string}    db_name         The database name, default use a random string.
	 *  {string}    db_version      The database version, default is '1.0'.
	 *  {int}       db_size         The database size, default is 2 megabytes.
	 *  {string}    db_description  The database description.
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
	var errors = Store.ERRORS = {
		0 : 'Initialization not start or finish yet',
		1 : 'Save without data',
		2 : 'Find without id',
		3 : 'Save Null to required field',
		4 : 'No row inserted or updated'
	};

	mixin(Store.prototype, {
		/**
		 * The flag property indicates the store status.
		 * @type {boolean}
		 */
		enabled : false,

		/**
		 * The method to initialize the table structure on database based on the fields setting.
		 *
		 * @param {Object}  cfg The configuration object includes the options below.
		 *  {string}    name            The data name to be stored, mapping to table name, required.
		 *  {Object}    fields          The fields configurations to be stored, required.
		 *  {string}    db_name         The database name, default use a random string.
		 *  {string}    db_version      The database version, default is '1.0'.
		 *  {int}       db_size         The database size, default is 2 megabytes.
		 *  {string}    db_description  The database description.
		 */
		init : function (cfg) {
			if (cfg) { mixin(this, cfg); }
			var name = this.name, fields = this.fields, db, p, t, s, self, onError;
			if (!name || !fields) { throw 'required parameter missed'; }

			db = this.db = openDatabase(this.db_name || (this.db_name = location.host), +this.db_version || (this.db_version = '1.0'), this.db_description || (this.db_description = 'generated on ' + new Date()), +this.db_size || (this.db_size = 2097152));
			s = [];
			self = this;
			onError = this.onError = function (tx, err) { self.trigger('error', tx && tx.code ? tx : err, true); };
			for (p in fields) {
				if (fields.hasOwnProperty(p) && p !== 'id') {
					t = fields[p];
					t = typeof t === 'string' ? t : t.type;
					s.push(p + (t === 'int' || t === 'boolean' ? ' INTEGER' : t === 'number' ? ' REAL' : ' TEXT') + (t.unique ? ' UNIQUE' : ''));
				}
			}
			db.transaction(function (tx) {
				tx.executeSql('CREATE TABLE IF NOT EXISTS ' + name + '(id INTEGER PRIMARY KEY, ' + s.join(', ') + ');', null, function () {
					delete self.cfg;
					self.enabled = true;
					self.trigger('initialized', {});
				}, onError);
			});
			this.seed = 0;
			return this;
		},

		/**
		 * The method to destroy the table and related data.
		 *
		 * @return {boolean} True means destroyed immediately.
		 */
		destroy : function () {
			var self = this;
			this.db.transaction(function (tx) {
				tx.executeSql('DROP TABLE ' + self.name + ';', [], function () {
					delete self.onError;
					delete self.db;
					self.enabled = false;
					self.trigger('destroyed', {});
				}, self.onError);
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
		 * Saves the data into store, triggers 'save:create' or 'save:update' event when success.
		 *
		 * @param {Object}  data    The data to be stored, required.
		 * @param {Object}  options The options object to be triggered as event when success.
		 *  {boolean}   validated   Indicates the set `data` need validate or not.
		 *  {Function}  callback    If sets, the function will be called when success instead of trigger event.
		 *  {*}         context     The context object of set `callback` function.
		 *  {boolean}   create      Implies the action is 'create' if true, 'update' if false, or check on store even the data includes id if not set.
		 *  {boolean}   blocking    Whether trigger the event with blocking mode or not, default is false.
		 */
		save : function (data, options) {
			if (!this.enabled || !data) {
				this.trigger('error:save', data ? {code : 0, message : errors[0]} : {code : 1, message : errors[1]}, true);
				return false;
			}
			if (!(options && options.validated || this.validate(data, !data.id))) { return false; }
			var fields = this.fields, s = [], v = [], p, sql, self = this, name = this.name, id = data.id, result, create = options && options.create;
			for (p in fields) {
				if (fields.hasOwnProperty(p) && data.hasOwnProperty(p)) {
					s.push(p);
					v.push(p === 'id' ? data[p] || (this.seed += 1) : data[p]);
				}
			}
			function onsuccess(tx) {
				tx.executeSql(sql, v, function (tx, ret) {
					var opts = options || {};
					opts.save_data = data;
					if (ret.rowsAffected) {
						opts.data = mixin(result || {id : opts.id = ret.insertId}, data);
						if (opts.callback) {
							opts.callback.call(opts.context, opts);
						} else {
							self.trigger('save:' + (result ? 'update' : 'create'), opts, opts.blocking);
						}
					} else {
						opts.ret = ret;
						opts.code = 4;
						opts.message = errors[4];
						self.trigger('error:save', opts, opts.blocking);
					}
				}, self.onError);
			}

			if (!id || create) {
				sql = 'INSERT INTO ' + name + '(' + s.join(', ') + ') VALUES (' + new Array(s.length).join('?, ') + '?);';
				this.db.transaction(onsuccess, self.onError);
			} else if (create === false) {
				result = {};
				sql = 'UPDATE ' + name + ' SET ' + s.join(' = ?, ') + ' = ? WHERE id = ' + id;
				this.db.transaction(onsuccess, self.onError);
			} else {
				sql = 'SELECT * FROM ' + name + ' WHERE id = ' + id;
				this.db.transaction(function (tx) {
					tx.executeSql(sql, null, function (tx, ret) {
						var d = ret.rows.item(0);
						if (d) {
							result = mixin({}, d);   // item's id property is readonly
							sql = 'UPDATE ' + name + ' SET ' + s.join(' = ?, ') + ' = ? WHERE id = ' + id;
						} else {
							sql = 'INSERT INTO ' + name + '(' + s.join(', ') + ') VALUES (' + new Array(s.length).join('?, ') + '?);';
						}
						onsuccess(tx);
					}, self.onError);
				});
			}
			return true;
		},

		_getWhereClause : function (conditions, values) {
			var condition, p, sql = [], arr = [], t, v, l, vl, s;
			for (conditions = conditions instanceof Array ? conditions : [conditions], l = conditions.length; l;) {
				condition = conditions[l -= 1];
				arr = [];
				for (p in condition) {
					if (condition.hasOwnProperty(p)) {
						t = condition[p];
						if (!t || typeof t !== 'object') {
							arr.push(p + ' = ?');
							values.push(t);
						} else if (!t.op || t.op === 'in') {
							for (v = t.op ? t.value : t, s = [], vl = v.length; vl;) {
								t = v[vl -= 1];
								s.push(typeof t === 'string' ? "'" + t + "'" : t);
							}
							arr.push(p + ' IN (' + s.join(', ') + ')');
						} else {
							arr.push(p + ' ' + t.op + ' ?');
							values.push(t.value);
						}
					}
				}
				sql.push(arr.join(' AND '));
			}
			return ' WHERE ' + sql.join(' OR ');
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
		updateAll       : function (data, conditions, options) {
			if (!this.enabled || !data) {
				this.trigger('error:updateAll', data ? {code : 0, message : errors[0]} : {code : 1, message : errors[1]}, true);
				return false;
			}
			if (!(options && options.validated || this.validate(data, false))) { return false; }
			var fields = this.fields, self = this, s = [], v = [], sql, p, t;
			for (p in fields) {
				if (fields.hasOwnProperty(p) && (p !== 'id' && data.hasOwnProperty(p))) {
					t = data[p];
					if (!t || typeof t !== 'object') {
						s.push(p + ' = ?');
						v.push(t);
					} else if (t.updater) {
						s.push(p + ' = ?');
						//noinspection JSUnresolvedFunction
						v.push(t.updater(data));
					} else if (t.expr) {
						s.push(p + ' = ' + t.expr);
					}
				}
			}
			sql = 'UPDATE ' + this.name + ' SET ' + s.join(', ');
			if (conditions) {
				sql += this._getWhereClause(conditions, v);
			}
			this.db.transaction(function (tx) {
				tx.executeSql(sql + ';', v, function (tx, ret) {
					var opts = options || {};
					opts.data = data;
					opts.conditions = conditions;
					opts.count = ret.rowsAffected;
					if (opts.callback) {
						setTimeout(function () { opts.callback.call(opts.context, opts); }, 0);
					} else {
						self.trigger('updateAll', opts);
					}
				}, self.onError);
			});
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
			var self = this, v, sql = 'DELETE FROM ' + this.name, opts = options || {};
			if (conditions) {
				sql += typeof conditions === 'object' ? this._getWhereClause(opts.conditions = conditions, v = []) : ' WHERE id = ' + (opts.id = conditions);
			}
			this.db.transaction(function (tx) {
				tx.executeSql(sql + ';', v, function (tx, ret) {
					opts.count = ret.rowsAffected;
					if (opts.callback) {
						setTimeout(function () { opts.callback.call(opts.context, opts); }, 0);
					} else {
						self.trigger('remove', opts);
					}
				}, self.onError);
			});
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
			var self = this, sql = 'SELECT * FROM ' + this.name + ' WHERE id = ' + id;
			this.db.transaction(function (tx) {
				tx.executeSql(sql, null, function (tx, ret) {
					var opts = options || {}, rows = ret.rows;
					opts.id = id;
					if (rows.length) {
						opts.data = mixin({}, rows.item(0));
					}
					if (opts.callback) {
						setTimeout(function () { opts.callback.call(opts.context, opts); }, 0);
					} else {
						self.trigger('find', opts);
					}
				}, self.onError);
			});
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
			var self = this, sql = 'SELECT * FROM ' + this.name, v, t, p, d;
			if (conditions) {
				sql += this._getWhereClause(conditions, v = []);
			}
			if (modifiers) {
				sql += ' ORDER BY ' + (modifiers.order + ', id' || 'id ASC');
				t = +modifiers.limit;
				d = +modifiers.offset || 0;
				p = +modifiers.page;
				if (t && p !== -1) {
					sql += ' LIMIT ' + t;
				}
				if (p) {
					t = t || 20;
					if (p !== -1) {
						sql += ' OFFSET ' + (p - 1) * t + d;
					}
				} else if (d) {
					sql += ' OFFSET ' + d;
				}
				sql += ';';
			} else {
				sql += ' ORDER BY id ASC;';
			}

			this.db.transaction(function (tx) {
				tx.executeSql(sql, v, function (tx, ret) {
					var rows = ret.rows, i, l = rows.length, data = [], opts = options || {};
					for (i = p === -1 ? (Math.ceil(l / t) - 1) * t + d : 0, p === -1 && (l = Math.min(l, i + t)); i < l; i += 1) {
						data.push(mixin({}, rows.item(i)));
					}
					opts.conditions = conditions;
					opts.modifiers = modifiers;
					opts.data = data;
					if (opts.callback) {
						setTimeout(function () { opts.callback.call(opts.context, opts); }, 0);
					} else {
						self.trigger('list', opts);
					}
				}, self.onError);
			});
			return true;
		}
	});

	require('util/observable').observable(Store.prototype);
	exports.Store = Store;
});
