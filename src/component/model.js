/**
 * Author   : nozer0
 * Email    : c.nozer0@gmail.com
 * Modified : 2013-11-06 01:49
 * Name     : component/model.js
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

	function pseudo() {}

	/**
	 * The model base class from which customise models extend.
	 *
	 * @param {Object}  cfg The configuration object includes options below.
	 *  {string}    name            The model name to be stored, required.
	 *  {Object}    fields          The fields configurations, required.
	 *  {Store}     local_store     The local store instance the model has.
	 *  {Store}     remote_store    The remote store instance the model has.
	 *  {boolean}   async           Indicates the model supports asynchronous mode or not.
	 *  {int}       timeout         Takes the data out of date from local store if the difference between current time and the timestamp of fetched data is larger than this set value, -1 means no timeout, unit: millisecond.
	 *  {Function}  onError         The error callback function, default implementation is trigger 'error' event.
	 *  {Function}  beforeSave      The preposed function which is called before `save` method, return false to stop the `save` method.
	 *  {Function}  beforeRemove    The preposed function which is called before `remove` method, return false to stop the `remove` method.
	 * @constructor
	 */
	function Model(cfg) { mixin(this, cfg); }

	/**
	 * Error messages.
	 */
	var errors = Model.ERRORS = {
		0 : 'Initialization not start or finish yet',
		1 : 'Save without data',
		2 : 'Find without id',
		3 : 'Save Null to required field',
		4 : 'Invalid field'
	};
	Model.patterns = {
		'int'    : /^-?(?:0|[1-9]\d*)$/,
		'number' : /^-?(?:[1-9]\d*\.?\d*|0?\.\d+)$/
	};

	mixin(Model.prototype, {
		/**
		 * The flag property indicates the store status.
		 * @type {boolean}
		 */
		enabled : false,

		/**
		 * Indicates the model supports asynchronous mode or not.
		 * @type {boolean}
		 */
		async : false,

		/**
		 * The local store instance the model has.
		 * @type {Store}
		 */
		local_store : null,

		/**
		 * The remote store instance the model has.
		 * @type {Store}
		 */
		remote_store : null,

		/**
		 * Takes the data out of date from local store if the difference between current time and the timestamp of fetched data is larger than this set value, -1 means no timeout, unit: millisecond.
		 * @type {int}
		 */
		timeout : 12000,

		/**
		 * Initialization method.
		 *
		 * @param {Object}  cfg The configuration object includes options below.
		 *  {string}    name            The model name to be stored, required.
		 *  {Object}    fields          The fields configurations, required.
		 *  {Store}     local_store     The local store instance the model has.
		 *  {Store}     remote_store    The remote store instance the model has.
		 *  {boolean}   async           Indicates the model supports asynchronous mode or not.
		 *  {int}       timeout         Takes the data out of date from local store if the difference between current time and the timestamp of fetched data is larger than this set value, -1 means no timeout, unit: millisecond.
		 *  {Function}  onError         The error callback function, default implementation is trigger 'error' event.
		 *  {Function}  beforeSave      The preposed function which is called before `save` method, return false to stop the `save` method.
		 *  {Function}  beforeRemove    The preposed function which is called before `remove` method, return false to stop the `remove` method.
		 */
		init : function (cfg) {
			if (cfg) { mixin(this, cfg); }
			if (!this.name || !this.fields) { throw 'required parameter missed'; }
			var name = this.name, fields = this.fields, local = this.local_store, remote = this.remote_store, self = this, wait = 0, fn = function (e) {
				wait -= 1;
				this.off('initialized');
				if (!wait) {
					self.enabled = true;
					self.trigger('initialized', e);
				}
			};
			if (!this.onError) {
				this.onError = function (e) { self.trigger('error', e, true); };
			}
			if (local) {
				if (local.constructor.async) {
					wait += 1;
					local.on('initialized', fn);
					local.on('save', this._onSaveToStore);
					local.on('updateAll', this._onUpdateAllOnStore);
					local.on('remove', this._onRemoveFromStore);
					// if not found or timeout from local store, try to get from remote store then.
					local.on('find', remote ? this._onFindFromLocalStore : this._onFindFromStore);
					local.on('list', this._onListFromStore);
				}
				local.on('error', this.onError).init({name : name, fields : this.timeout === -1 ? fields : mixin({__timestamp : 'int'}, fields)});
			}
			if (remote) {
				// 2 means support both asynchronize and synchronize modes
				if (remote.constructor.async === true || remote.constructor.async === 2 && this.async) {
					wait += 1;
					remote.on('initialized', fn);
					if (local) {
						// continue to save to local store
						remote.on('save', this._onSaveToRemoteStore);
						remote.on('updateAll', this._onUpdateAllOnRemoteStore);
						// continue to remove from local store
						remote.on('remove', this._onRemoveFromRemoteStore);
						// save the found data from remote store to local store
						remote.on('find', this._onFindFromRemoteStore);
						// update the data list from remote store to local store
//						if (remote.list_full_data) {
						remote.on('list', this._onListFromRemoteStore);
//						}
					} else {
						remote.on('save', this._onSaveToStore);
						remote.on('updateAll', this._onUpdateAllOnStore);
						remote.on('remove', this._onRemoveFromStore);
					}
					remote.on('find', this._onFindFromStore).on('list', this._onListFromStore);
				}
				remote.on('error', this.onError).init({name : name, fields : fields, async : this.async});
			}
			if (!wait) { this.enabled = true; }
			return this;
		},

		/**
		 * Destroyed method.
		 */
		destroy : function () {
			var self = this, local = this.local_store, remote = this.remote_store, wait = 0, fn = function (e) {
				wait -= 1;
				this.off('error');
				this.off('destroyed');
				if (!wait) {
					self.enabled = false;
					self.trigger('destroyed', e);
				}
			};
			if (local) {
				if (!local.destroy()) {
					wait += 1;
					local.on('destroyed', fn);
				}
				if (local.constructor.async) {
					local.off('save').off('updateAll').off('remove').off('find').off('list');
				}
			}
			if (remote) {
				if (!remote.destroy()) {
					wait += 1;
					remote.on('destroyed', fn);
				}
				if (remote.constructor.async === true || remote.constructor.async === 2 && this.async) {
					remote.off('save').off('updateAll').off('remove').off('find').off('list');
				}
			}
			if (!wait) {
				this.enabled = false;
			}
			return this;
		},

		/**
		 * Returns default data object based on the fields configuration.
		 */
		getDefaults : function () {
			var fields = this.fields, p, o = {};
			for (p in fields) {
				if (fields.hasOwnProperty(p)) {
					o[p] = fields[p].defaultValue;
				}
			}
			return o;
		},

		/**
		 * Validates the set `data` according to the fields configuration.
		 *
		 * @param {Object}  data    The data to be validated, require.
		 * @param {boolean} full    Whether the data contains all fields or not, default is false.
		 */
		validate : function (data, full) {
			if (!data) { return false; }
			var fields = this.fields, p, v, cfg, t;
			for (p in fields) {
				if (fields.hasOwnProperty(p) && ((full || data.hasOwnProperty(p)))) {
					v = data[p];
					cfg = fields[p];
					if (v === undefined || v === null || v === '') {
						if (cfg.hasOwnProperty('defaultValue')) {
							v = data[p] = cfg.defaultValue;
						} else if (cfg.required) {
							this.trigger('error:invalid', {code : 3, field : p, value : v, message : errors[3]}, true);
							return false;
						}
					} else if ((t = cfg.validator) && !t.call(this, v) ||
						(t = cfg.pattern) && !t.test(v) ||
						(t = cfg.type) && (t = this.constructor.patterns[t]) && !t.test(v) ||
						(t = cfg.maxLength) && v.length > t) {
						this.trigger('error:invalid', {code : 4, field : p, value : v, message : errors[4]}, true);
						return false;
					}
				}
			}
			return true;
		},

		_onSaveToStore       : function (e) {
			if (this.enabled) { e.context.trigger(e.type, e, true); }
		},
		_onSaveToRemoteStore : function (e) {
			var ctx = e.context, local = ctx.local_store, data;
			if (!local.enabled) { return; }
			data = e.data;
			if (this.timeout !== -1) { data.__timestamp = Date.now(); }
			data = local.save(data, e);
			if (data !== true && data !== false) {
				e.data = data;
				ctx.trigger(e.type, e, true);
			}
		},
		/**
		 * Saves the data into store, returns result immediately for synchronous mode, or triggers 'save' event with related data when success for asynchronous mode.
		 *
		 * @param {Object}  data    The data to be stored, required.
		 * @param {Object}  options The options passed to the stores and trigger events.
		 *  {boolean}   validated   The set `data` is already checked as validated or not, default is false.
		 */
		save                 : function (data, options) {
			if (!this.enabled || !data) {
				this.trigger('error:save', data ? {code : 0, message : errors[0]} : {code : 1, message : errors[1]}, true);
				return false;
			}
			if (this.trigger('beforeSave', {data : data}, true) === false || !(options && options.validated || this.validate(data, !data.id))) { return false; }
			var opts = options ? mixin({}, options) : {}, store = this.remote_store, t;
			opts.context = this;
			opts.validated = true;
			if (this.async) { opts.async = true; }

			if (store) {
				delete data.__timestamp;
				t = store.save(data, opts);
				// save action always be blocking, no need time sequence control
				if (t === true || t === false) { return t; }
				data = t;
			}
			if ((store = this.local_store)) {
				if (this.timeout !== -1) { data.__timestamp = Date.now(); }
				t = store.save(data, opts);
				if (t === true || t === false) { return t; }
			}
			return t;
		},

		_onUpdateAllOnStore       : function (e) {
			if (this.enabled) { e.context.trigger(e.type, e, true); }
		},
		_onUpdateAllOnRemoteStore : function (e) {
			var ctx = e.context, local = ctx.local_store, data;
			if (!local.enabled) { return; }
			if (!e.count) {  // no matching rows, so remove from local store
				local.remove(e.conditions, {callback : pseudo});
				return ctx.trigger(e.type, e, true);
			}
			data = e.data;
			if (this.timeout !== -1) { data.__timestamp = Date.now(); }
			data = local.updateAll(data, e.conditions, e);
			if (data !== true && data !== false) {
				e.count = data;
				ctx.trigger(e.type, e, true);
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
		 */
		updateAll                 : function (data, conditions, options) {
			if (!this.enabled || !data) {
				this.trigger('error:updateAll', data ? {code : 0, message : errors[0]} : {code : 1, message : errors[1]}, true);
				return false;
			}
			if (!(options && options.validated || this.validate(data, false))) { return false; }
			var opts = options ? mixin({}, options) : {}, remote = this.remote_store, local = this.local_store, t;
			opts.context = this;
			opts.validated = true;
			if (this.async) { opts.async = true; }

			if (remote) {
				delete data.__timestamp;
				t = remote.updateAll(data, conditions, opts);
				if (!local || t === true || t === false) { return t; }
				if (t === 0) {  // no matching rows, so remove from local store
					remote.remove(conditions, {callback : pseudo});
					return t;
				}
			}
			if (local) {
				if (this.timeout !== -1) { data.__timestamp = Date.now(); }
				return local.updateAll(data, conditions, opts);
			}
		},

		_onRemoveFromStore       : function (e) {
			if (this.enabled) { e.context.trigger(e.type, e, true); }
		},
		_onRemoveFromRemoteStore : function (e) {
			var ctx = e.context, local = ctx.local_store, data;
			if (!local.enabled) { return; }
			data = local.remove(e.id || e.conditions, e);
			if (data !== true && data !== false) {
				ctx.trigger(e.type, e, true);
			}
		},
		/**
		 * Removes all data matching the set `conditions`, returns result immediately for synchronous mode, or triggers 'remove' event with related data when success for asynchronous mode.
		 *
		 * @param {Object|Array|int}    conditions  The id of object to be removed; or the condition object or array of conditions includes filter fields and related values, removes all if ignored.
		 * @example
		 * {field1 : value1, field2 : {op : '>', value : value2}}
		 * [{field1 : value1, field2 : {op : '>', value : value2}}, {field3 : {op : 'like', value : value3}}]
		 *
		 * @param {Object}              options     The options passed to the stores and trigger events.
		 */
		remove                   : function (conditions, options) {
			if (!this.enabled) {
				this.trigger('error:remove', {code : 0, message : errors[0]}, true);
				return false;
			}
			var opts = options ? mixin({}, options) : {}, t;
			if (conditions) { opts[typeof conditions === 'object' ? 'conditions' : 'id'] = conditions; }
			if (this.trigger('beforeRemove', opts, true) === false) { return false; }
			opts.context = this;
			if (this.async) { opts.async = true; }

			t = this.remote_store;
			if (t) {
				t = t.remove(conditions, opts);
				return t !== true && t !== false && (t = this.local_store) ? t.remove(conditions, opts) : t;
			}
			return this.local_store.remove(conditions, opts);
		},

		_onFindFromStore       : function (e) {
			if (this.enabled) { e.context.trigger(e.type, e, true); }
		},
		_onFindFromLocalStore  : function (e) {
			var ctx = e.context, remote = ctx.remote_store, ld, d;
			if (!this.enabled || !remote.enabled) { return; }
			ld = e.data;
			if (!ld || ctx.timeout !== -1 && Date.now() - ld.__timestamp > ctx.timeout) {
				e._checked = true;
				e._create = !ld;
				// Be careful!!! `e.type` property will be taken as ajax `type` option, now change name to `responseType`
				d = ctx.remote_store.find(e.id, e);
				if (d === true || d === false) { return d; }
				delete e._checked;
				delete e._create;
				e.data = d;
				if (d) {
					if (ctx.timeout !== -1) { d.__timestamp = Date.now(); }
					this.save(d, {callback : pseudo, create : !d});
				} else if (ld) {  // exists or not checked
					this.remove(e.id, {callback : pseudo});
				}
			}
			ctx.trigger(e.type, e, true);
		},
		_onFindFromRemoteStore : function (e) {
			var ctx = e.context, local = ctx.local_store, data;
			if (!local.enabled) { return; }
			data = e.data;
			if (data) {
				if (ctx.timeout !== -1) { data.__timestamp = Date.now(); }
				local.save(data, e._checked ? {callback : pseudo, create : e._create} : {callback : pseudo});
			} else if (!e._checked) {  // exists or not checked
				local.remove(e.id, {callback : pseudo});
			}
			delete e._checked;
			delete e._create;
		},
		/**
		 * Finds the data related to the set `id`, returns result immediately for synchronous mode, or triggers 'find' event with related data when success for asynchronous mode.
		 *
		 * @param {int}     id      The id of object want to find, required.
		 * @param {Object}  options The options passed to the stores and trigger events.
		 */
		find                   : function (id, options) {
			if (!this.enabled || isNaN(id) && id <= 0) {
				this.trigger('error:find', this.enabled ? {code : 2, message : errors[2]} : {code : 0, message : errors[0]}, true);
				return false;
			}
			var opts = options ? mixin({}, options) : {}, local = this.local_store, remote, d, ld, t;
			opts.context = this;
			if (this.async) { opts.async = true; }

			if (local && this.timeout) {
				ld = local.find(id, opts);
				if (ld === true || ld === false) { return ld; }
				t = true;
			}
			// no remote store or no timeout
			if (ld && (this.timeout === -1 || Date.now() - ld.__timestamp <= this.timeout) || !(remote = this.remote_store)) {
				return ld;
			}
			if (t) {
				opts._checked = t;
				opts._create = !ld;
			}
			d = remote.find(id, opts);
			if (!local || d === true || d === false) { return d; }
			if (d) {
				if (this.timeout !== -1) { d.__timestamp = Date.now(); }
				local.save(d, t ? {callback : pseudo, create : !ld} : {callback : pseudo});
			} else if (ld || !t) {  // exists or not checked
				local.remove(id, {callback : pseudo});
			}
			return d;
		},

		_onListFromStore       : function (e) {
			if (this.enabled) { e.context.trigger(e.type, e, true); }
		},
		// only triggered when `list_full_data` is true, save list data from remote store to local store.
		_onListFromRemoteStore : function (e) {
			var ctx = e.context, local = ctx.local_store, data, t, i, l;
			if (!local.enabled) { return; }
			data = e.data;
			l = data && data.length;
			if (!l) {  // no matching rows, so remove from local store
				local.remove(e.conditions, {callback : pseudo});
			} else if (ctx.remote_store.list_full_data) {
				for (e = {callback : pseudo}, t = ctx.timeout !== -1 && Date.now(), i = 0; i < l; i += 1) {
					if (t) { data[i].__timestamp = t; }
					local.save(data[i], e);
				}
			}
		},
		/**
		 * Lists the data matching the set `conditions`, returns result immediately for synchronous mode, or triggers 'list' event with related data when success for asynchronous mode.
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
		 * @param {Object}  options     The options passed to the stores and trigger events.
		 */
		list                   : function (conditions, modifiers, options) {
			if (!this.enabled) {
				this.trigger('error:list', {code : 0, message : errors[0]}, true);
				return false;
			}
			var opts = options ? mixin({}, options) : {}, remote = this.remote_store, local = this.local_store, data, e, t, i, l;
			opts.context = this;
			if (this.async) { opts.async = true; }

			// only remote store has full data
			if (remote) {
				data = remote.list(conditions, modifiers, opts);
				if (!local || data === true || data === false) { return data; }
				if (!data || !data.length) {  // no matching rows, so remove from local store
					local.remove(conditions, {callback : pseudo});
				} else if (remote.list_full_data) {
					for (e = {callback : pseudo}, t = this.timeout !== -1 && Date.now(), i = 0, l = data.length; i < l; i += 1) {
						if (t) { data[i].__timestamp = t; }
						local.save(data[i], e);
					}
				}
				return data;
			}
			return local.list(conditions, modifiers, opts);
		}
	});

	require('util/observable').observable(Model.prototype);
	exports.Model = Model;
});
