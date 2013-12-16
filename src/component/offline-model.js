/**
 * Author   : nozer0
 * Email    : c.nozer0@gmail.com
 * Modified : 2013-12-02 21:56
 * Name     : component/offline-model.js
 */

/*global define */
define(function (require, exports) {
	'use strict';

	function mixin(dest, src, preserve) {
		var p;
		for (p in src) {
			if (src.hasOwnProperty(p) && !(preserve && dest.hasOwnProperty(p))) {
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
	 *  {boolean}   offline         Indicates the network connect status, default is false.
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
		4 : 'Invalid field',
		5 : 'Operate with the removed data'
	}, match = require('util').match;

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
		async : true,

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
		 *  {boolean}   offline         Indicates the network connect status, default is false.
		 *  {Function}  onError         The error callback function, default implementation is trigger 'error' event.
		 *  {Function}  beforeSave      The preposed function which is called before `save` method, return false to stop the `save` method.
		 *  {Function}  beforeRemove    The preposed function which is called before `remove` method, return false to stop the `remove` method.
		 */
		init           : function (cfg) {
			if (cfg) { mixin(this, cfg); }
			if (!this.name || !this.fields) { throw 'required parameter missed'; }
			var name = this.name, fields = this.fields, local = this.local_store, remote = this.remote_store, self = this, wait = 0, fn = function () {
				var d, t;
				wait -= 1;
				if (!wait) {
					local.off('initialized');
					remote.off('initialized');
					// the queue contains new created data which do not have `__rid`, also have another queue contains update data
					self._saved_data = [];
					self._updated_data = [];
					self._sync_updaters = [];
					self._remove_ids = [];
					self._remove_conditions = [];
					self._timestamps = {};  // indicates the data timestamp
					self._maps = {};
					self._waits = {};   // signals for remote change
					self._syncFromQueue = self.__syncFromQueue();
					d = local.list([
						{__updated : 1},
						{__deleted : 1}
					], null, t = {context : self});
					if (d === true) {
						t.callback = self._initSyncQueue;
					} else if (d !== false) {
						t.data = d;
						self._initSyncQueue(t);
					}
				}
			};
			if (!this.onError) {
				this.onError = function (e) { self.trigger('error', e, true); };
			}

			if (local.constructor.async) {
				wait += 1;
				local.on('initialized', fn);
				local.on('save', this._onSaveToLocalStore).on('updateAll', this._onUpdateAllOnLocalStore).on('remove', this._onRemoveFromLocalStore).on('list', this._onListFromLocalStore);
				local.on('find', this._onFindByLidFromLocal);
			}
			cfg = {
				__rid       : {type : 'int', unique : true},
				__updated   : {type : 'int', defaultValue : 0},
				__deleted   : {type : 'int', defaultValue : 0},
				__timestamp : 'int'
			};
			local.on('error', this.onError).init({name : name, fields : mixin(cfg, fields)});

			if (remote.constructor.async === true || remote.constructor.async === 2 && this.async) {
				wait += 1;
				remote.on('initialized', fn);
				remote.on('save', this._onSaveToRemoteStore).on('updateAll', this._onUpdateAllOnRemoteStore).on('remove', this._onRemoveFromRemoteStore).on('find', this._onFindFromRemoteStore).on('list', this._onListFromRemoteStore);
			}
			remote.on('error', this.onError).init({name : name, fields : fields, async : this.async});

			if (!wait) {
				wait = 1;
				fn();
			}
			return this;
		},
		_initSyncQueue : function (e) {
			var ctx = e.context, remote = ctx.remote_store, data = e.data, l = data && data.length, sds, uds, ids, ts, maps, d, t, online = remote.enabled = !ctx.offline;
			// online status change again, destroyed, or previous operation
			if (l) {
				for (sds = ctx._saved_data, uds = ctx._updated_data, ids = ctx._remove_ids, ts = ctx._timestamps, maps = ctx._maps; l;) {
					d = data[l -= 1];
					if (d.__deleted) {
						ts[maps[d.__rid] = d.id] = Infinity;
						ids.push(d.__rid);
					} else {
						t = {context : ctx, create : false, save_data : ctx.getRemoteData(d, true), validated : true};
						if (d.__rid) {
							maps[d.__rid] = d.id;
							uds.push(t);
						} else {
							sds.push(t);
						}
					}
				}
				if (online && (sds.length || uds.length || ids.length)) {
					ctx._sync_timestamp = Date.now();   // used to avoid repeat operations
					ctx._sync_timer = setTimeout(ctx._syncFromQueue, 0);
				}
			}
			ctx.enabled = true;
			ctx.trigger('initialized', e, true);
		},

		/**
		 * Destroyed method.
		 */
		destroy : function () {
			var self = this, local = this.local_store, remote = this.remote_store, wait = 2, fn = function (e) {
				wait -= 1;
				this.off('error');
				this.off('destroyed');
				if (!wait) {
					delete self._updated_data;
					delete self._saved_data;
					delete self._sync_updaters;
					delete self._remove_ids;
					delete self._remove_conditions;
					delete self._waits;
					delete self._timestamps;
					delete self._maps;
					self.enabled = false;
					self.trigger('destroyed', e, true);
				}
			};
			if (this._sync_timer) {
				clearTimeout(this._sync_timer);
				this._sync_timer = null;
			}
			if (local.destroy()) {
				wait -= 1;
			} else {
				local.on('destroyed', fn);
			}
			if (local.constructor.async) {
				local.off('save').off('updateAll').off('remove').off('find').off('list');
			}
			if (remote.destroy()) {
				wait -= 1;
			} else {
				remote.on('destroyed', fn);
			}
			if (remote.constructor.async === true || remote.constructor.async === 2 && this.async) {
				remote.off('save').off('updateAll').off('remove').off('find').off('list');
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
					} else { //noinspection JSUnresolvedVariable
						if ((t = cfg.validator) && !t.call(this, v) ||
							(t = cfg.pattern) && !t.test(v) ||
							(t = cfg.type) && (t = this.constructor.patterns[t]) && !t.test(v) ||
							(t = cfg.maxLength) && v.length > t) {
							this.trigger('error:invalid', {code : 4, field : p, value : v, message : errors[4]}, true);
							return false;
						}
					}
				}
			}
			return true;
		},

		/**
		 * Returns local data based on the set remote data.
		 *
		 * @param {Object}  data    The remote data based on, required.
		 * @param {boolean} mutable Changes the set remote data directly if true, otherwise creates a new object.
		 */
		getLocalData  : function (data, mutable) {
			if (!data) { return; }
			var d = mutable ? data : mixin({}, data);
			if (d.id) {
				d.__rid = +d.id;
			} else {
				delete d.__rid;
			}
			if (d.__lid) {
				d.id = +d.__lid;
			} else {
				delete d.id;
			}
			delete d.__lid;
			if (!d.__updated) {
				d.__updated = 0;
			}
			if (!d.__deleted) {
				d.__deleted = 0;
			}
			return d;
		},
		/**
		 * Returns remote data based on the set local data.
		 *
		 * @param {Object}  data    The local data based on, required.
		 * @param {boolean} mutable Changes the set local data directly if true, otherwise creates a new object.
		 */
		getRemoteData : function (data, mutable) {
			if (!data) { return; }
			var d = mutable ? data : mixin({}, data);
			if (d.id) {
				d.__lid = +d.id;
			} else {
				delete d.__lid;
			}
			if (d.__rid) {
				d.id = +d.__rid;
			} else {
				delete d.id;
			}
			delete d.__rid;
			delete d.__updated;
			delete d.__deleted;
//			delete d.__timestamp;
			return d;
		},

		_onSyncDeletedDataToRemoteStore : function (e) {
			var local = e.context.local_store;
			if (local.enabled) {    // detect local store enabled to avoid still execute after destroy
				local.remove({__deleted : 1}, {callback : pseudo});
			}
		},
		_flushQueue                     : function (conditions) {
			var remote = this.remote_store, maps = this._maps, waits = this._waits, ds = this._remove_ids, o = this._remove_conditions, d, t, i, l = ds.length, cl = o.length, lid;
//			console.warn('flush', conditions, 'rds', l, o.length, 'sps', this._sync_updaters.length, 'sds', this._saved_data.length, this._saved_data, 'uds', this._updated_data.length, this._updated_data);

			if (cl || l) {
				if (!cl && l === 1) { // one id only
					o = ds[0];
				} else if (l) {
					o.push({id : ds});
				} else if (cl === 1) {
					o = o[0];
				}

				d = remote.remove(o, t = {context : this});
				if (d === true) {
					t.callback = this._onSyncDeletedDataToRemoteStore;
				} else if (d !== false) {
					this.local_store.remove({__deleted : 1}, {callback : pseudo});
				} else {
					return d;
				}
				this._remove_ids = [];
				this._remove_conditions = [];
			}

			ds = this._sync_updaters;
			l = ds.length;
			if (l) {
				for (i = 0; i < l; i += 1) {
					o = ds[i];
					o._syncing = true;
					o._timestamp = Date.now();
					if (false === remote.updateAll(o.data, o.conditions, o)) {
						return false;
					}
				}
				this._sync_updaters = [];
			}

			ds = this._saved_data;
			l = ds.length;
			if (l) {
				if (conditions) {   // try to get the last matched one
					mc: for (cl = conditions.length; l;) {
						for (o = ds[l -= 1], d = o.save_data, i = 0; i < cl; i += 1) {
							if (match(d, conditions[i])) {
								l += 1;
								break mc;
							}
						}
					}
				}
				for (i = 0; i < l; i += 1) {
					o = ds[i];
//					console.warn('flush:save', o.save_data, o);
					// also can set retry count here if wish
					o._syncing = true;
					o._timestamp = Date.now();
					t = remote.save(d = o.save_data, o);
					if (t === true) {
						lid = d.__lid;
						if (lid) {  // for very special situation, lid is not set yet by local save method
							d = waits[lid];
							waits[lid] = d ? d + 1 : 1;
						}
					} else if (t !== false) {
						d.id = +t.id;
						t.__updated = 0;
						t.__timestamp = o._timestamp;
						if (false === this._saveToLocalStore(this.getLocalData(t, true), o)) {
							return false;
						}
					} else {
						return t;
					}
				}
				ds.splice(0, l);
			}

			for (ds = this._updated_data, i = 0, l = ds.length; i < l;) {
				o = ds[i];
				d = o.save_data;
				if (conditions) {
					for (t = true, cl = conditions.length; cl;) {
						if (match(d, conditions[cl -= 1])) {
							t = false;
							break;
						}
					}
					if (t) {    // not matched
						i += 1;
						continue;
					}
				}
				lid = d.__lid;
				if (!d.id) {  // need wait for the previous request
					// check whether get id from remote store after push to queue
					for (t in maps) {
						if (maps.hasOwnProperty(t) && (maps[t] === lid)) {
							d.id = t;
							break;
						}
					}
					if (!d.id) {
						i += 1;
						continue;
					}
				}
//				console.warn('flush:update', d, o);
				o._syncing = true;
				o._timestamp = Date.now();
				t = remote.save(d, o);
				if (t === true) {
					d = waits[lid];
					waits[lid] = d ? d + 1 : 1;
				} else if (t !== false) {
					t.__updated = 0;
					t.__timestamp = o._timestamp;
					if (false === this._saveToLocalStore(this.getLocalData(t, true), o)) {
						return false;
					}
				} else {
					return t;
				}
				ds.splice(i, 1);
				l -= 1;
			}
		},
		__syncFromQueue                 : function () {
			var self = this, fn = function () {
				var remote = self.remote_store, ups = self._sync_updaters, sds = self._saved_data, uds = self._updated_data, maps = self._maps, waits = self._waits, o = self._remove_ids, d = self._remove_conditions, t, i = d.length, l = o.length, lid;
//				console.warn('sync', 'sds', sds.length, sds, 'uds', uds.length, uds);

				if (i || l) {
					if (!i && l === 1) { // one id only
						d = o[0];
					} else if (l) {
						d.push({id : o});
					} else if (i === 1) {
						d = d[0];
					}
					d = remote.remove(d, o = {context : self});
					if (d === true) {
						o.callback = self._onSyncDeletedDataToRemoteStore;
					} else if (d !== false) {
						self.local_store.remove({__deleted : 1}, {callback : pseudo});
					} else {
						return d;
					}
					self._remove_ids = [];
					self._remove_conditions = [];
				}

				if (ups.length) {
					o = ups.shift();
					o._syncing = true;
					o._timestamp = Date.now();
					if (false === remote.updateAll(o.data, o.conditions, o)) {
						return false;
					}
				}

				o = sds[0];
				if (o && (d = o.save_data) && (lid = d.__lid)) {
//					console.warn('sync:save', o.save_data, o);
					// also can set retry count here if wish
					o._syncing = true;
					o._timestamp = Date.now();
					t = remote.save(d, o);
					if (t === true) {
						d = waits[lid];
						waits[lid] = d ? d + 1 : 1;
					} else if (t) {
						d.id = +t.id;
						t.__updated = 0;
						t.__timestamp = o._timestamp;
						if (false === self._saveToLocalStore(self.getLocalData(t, true), o)) {
							return false;
						}
					} else {
						return t;
					}
					sds.shift();
				}

				for (i = 0, l = uds.length; i < l;) {
					o = uds[i];
					d = o.save_data;
					lid = d.__lid;
					if (!d.id) {  // need wait for the previous request
						// check whether get id from remote store after push to queue
						for (t in maps) {
							if (maps.hasOwnProperty(t) && (maps[t] === lid)) {
								d.id = t;
								break;
							}
						}
						if (!d.id) {
							i += 1;
							continue;
						}
					}
//					console.warn('sync:update', d, o);
					o._syncing = true;
					o._timestamp = Date.now();
					t = remote.save(d, o);
					if (t === true) {
						d = waits[lid];
						waits[lid] = d ? d + 1 : 1;
					} else if (t) {
						t.__updated = 0;
						t.__timestamp = o._timestamp;
						if (false === self._saveToLocalStore(self.getLocalData(t, true), o)) {
							return false;
						}
					} else {
						return t;
					}
					uds.splice(i, 1);
					break;
				}

				self._sync_timer = ups.length || sds.length || uds.length ? setTimeout(fn, 0) : null;
			};
			return fn;
		},
		/**
		 * Set the online status if changed.
		 *
		 * @param {boolean} online  True if online.
		 */
		changeOnlineStatus              : function (online) {
			var remote = this.remote_store;
//			console.warn('change', online, !this.offline, remote.enabled);
			if (online && this.offline) {    // offline to online
				this.offline = false;
				remote.enabled = true;
				if (!this._sync_timer && (this._remove_conditions.length || this._sync_updaters.length || this._saved_data.length || this._updated_data.length)) {
					this._sync_timestamp = Date.now();   // used to avoid repeat operations
					this._sync_timer = setTimeout(this._syncFromQueue, 0);
				}
			} else if (!online && !this.offline) { // online to offline
				this.offline = true;
				remote.enabled = false;
				if (this._sync_timer) {
					clearTimeout(this._sync_timer);
					this._sync_timer = null;
				}
			}
			return true;
		},

		_onSaveToLocalStore  : function (e) {
			var ctx = e.context, d, sd;
			if (!ctx.local_store.enabled) { return; }
			d = e.data;
			if (d.__rid) {
				ctx._maps[d.__rid] = d.id;
			}
			sd = e._saved_data;
			ctx._timestamps[sd.__lid = d.id] = d.__timestamp;
			if (!e._syncing) {
				e.save_data = sd;
				delete e._saved_data;
				// if save from queue, for local store, it's already update operation
				e.type = 'save:' + e.action;
				delete e.action;
				e.data = ctx.getRemoteData(d, true);
//				if (d.id) { sd.id = d.id; }
				ctx.trigger(e.type, e, true);
			}
		},
		_saveToLocalStore    : function (ld, e) {
			var ctx = e.context, sd = e.save_data, ts = ctx._timestamps, tm = ld.__timestamp, lid = ld.id, id = ld.__rid, maps = ctx._maps;
			if (lid && id) {
				maps[id] = lid;
			}
			if (lid && ts[lid] === Infinity) {    // save with removed data
				ctx.trigger('error:save', {code : 5, message : errors[5], data : sd}, true);
				return false;
			}
			// if timestamp is earlier than the one already operated, no need step further
			if (!lid || !ts.hasOwnProperty(lid) || ts[lid] < tm) {
				ld = ctx.local_store.save(ld, e);
				if (ld === true) {
					e._saved_data = sd;
					if (lid) {
						ts[lid] = tm;
					}
				} else if (ld) {
					ts[lid = sd.__lid = ld.id] = tm;
					if (id) {
						maps[id] = lid;
					}
				}
			}
			return ld;
		},
		_onSaveToRemoteStore : function (e) {
			var ctx = e.context, sd, d;
			if (!ctx.local_store.enabled) { return; }
			sd = e.save_data;
			d = sd.__lid;
			if (d) {
				ctx._waits[d] -= 1;
			}
			d = e.data;
			d.__updated = 0;
			d.__timestamp = e._timestamp;
			d = ctx._saveToLocalStore(ctx.getLocalData(d, true), e);
			if (d !== true && d !== false && !e._syncing) {
				e.data = ctx.getRemoteData(d, true);
				sd.id = d.id;
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
			var opts, remote = this.remote_store, t = this._maps, id = data.id, lid = data.__lid || id && t[id], p, d, i, uds, sds, online;
			if (lid) {
				data.__lid = lid;
				if (!id) {   // get `id` from `_maps`
					for (p in t) {
						if (t.hasOwnProperty(p) && t[p] === lid) {
							id = data.id = p;
							break;
						}
					}
				}
			}
			if (this.trigger('beforeSave', {data : data}, true) === false || !(options && options.validated || this.validate(data, !id))) { return false; }

			if (lid && this._timestamps[lid] === Infinity) {    // save with removed data
				this.trigger('error:save', {code : 5, message : errors[5], data : data}, true);
				return false;
			}

			opts = options ? mixin({}, options) : {};
			opts.context = this;
			opts.validated = opts.blocking = true;
			if (this.async) { opts.async = true; }
			opts._timestamp = Date.now();
			opts.save_data = data;
			opts.action = id || lid ? 'update' : 'create';

			online = remote.enabled;
//			console.info('save', online, data, opts);
			uds = this._updated_data;
			sds = this._saved_data;
			p = sds.length;
			// sent to remote store directly when the data contains `id` or save queue is empty
			if (id || online && !p) {
				if (id) {   // remove from update queue if matched
					for (i = 0, p = uds.length; i < p; i += 1) {
						d = uds[i].save_data;
						if (d.id === id) {
							data = mixin(d, data);
							opts.create = false;
							t = false;
							break;
						}
					}
				}
				if (online) {
					d = remote.save(data, opts);
					if (d === false) { return d; }
					if (!t) {  // removed from queue
						uds.splice(i, 1);
					}
					if (d === true) {
						if (lid) {    // add lock if need
							t = this._waits;
							t[lid] = t.hasOwnProperty(lid) ? t[lid] + 1 : 1;
						}
						return d;
					}
					data.id = d.id;
					this.getLocalData(d, true);
				} else {
					if (t) {    // not matched, add to queue
						uds.push(mixin({}, opts));
					}
					d = this.getLocalData(data);
					d.__updated = 1;
				}
			} else {
				if (lid && this._waits[lid]) {  // if `id` isn't set but wait for the previous request
					uds.push(mixin({}, opts));
					if (online && !this._sync_timer) {
						this._sync_timestamp = Date.now();   // used to avoid repeat operations
						this._sync_timer = setTimeout(this._syncFromQueue, 0);
					}
				} else {
					// the save data already be set with `__lid` and no previous request to be waited, try to find match one from save queue
					if (lid) {
						while (p) {
							d = sds[p -= 1].save_data;
							if (d.__lid === lid) {
								data = mixin(d, data);
								opts.create = false;
								t = false;
								break;
							}
						}
					}
					if (t) {    // if not matched
						sds.push(mixin({}, opts));
					}
				}
				d = this.getLocalData(data);
				d.__updated = 1;
			}

			d.__timestamp = opts._timestamp;
			t = this._saveToLocalStore(d, opts);
			if (t === true || t === false) { return t; }
			data.__lid = t.id;
			return this.getRemoteData(t, true);
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

		__changeConditions : function (conditions, additions, preserve) {
			var ret = {}, p;
			for (p in conditions) {
				if (conditions.hasOwnProperty(p)) {
					ret[p === 'id' ? '__rid' : p === '__lid' ? 'id' : p] = conditions[p];
				}
			}
			for (p in additions) {
				if (additions.hasOwnProperty(p) && !(preserve && ret.hasOwnProperty(p))) {
					ret[p] = additions[p];
				}
			}
			return ret;
		},
		_changeConditions  : function (conditions, additions, preserve) {
			var ret, i, l;
			if (conditions instanceof Array) {
				for (ret = [], i = 0, l = conditions.length; i < l; i += 1) {
					ret[i] = this.__changeConditions(conditions[i], additions);
				}
				return ret;
			}
			return conditions ? this.__changeConditions(conditions, additions, preserve) : conditions;
		},

		_onUpdateAllOnLocalStore  : function (e) {
			var ctx = e.context;
			if (!ctx.enabled) { return; }
			e.data = e._data;
			delete e._data;
			e.conditions = e._conditions;
			delete e._conditions;
			ctx.trigger(e.type, e, true);
		},
		_onUpdateAllOnRemoteStore : function (e) {
			var ctx = e.context, local = ctx.local_store, conditions, t, data;
			if (!local.enabled || e._syncing) { return; }
			conditions = e.conditions;
			if (!e.count) { // no matching rows, so remove from local store except the new added ones
				local.remove(ctx._changeConditions(conditions, {__updated : 0}), {callback : pseudo});
			}
			data = e.data;
			data.__timestamp = e._timestamp;
			t = local.updateAll(ctx.getLocalData(data), conditions && ctx._changeConditions(conditions), e);
			if (t === true) {
				e._conditions = conditions;
				e._data = data;
			} else if (t !== false) {
				e.count = t;
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

			var opts = options ? mixin({}, options) : {}, remote = this.remote_store, d, t, l, cl, ds, c, p, v, online;

			opts.context = this;
			opts.validated = opts.blocking = true;
			if (this.async) { opts.async = true; }
			opts._timestamp = Date.now();

			online = remote.enabled;
//			console.info('updateAll', online, data, conditions, opts);
			if (online) {
				t = remote.updateAll(data, conditions, opts);
				if (t === false) { return t; }
			}
			// update matched data in the queues
			ds = this._saved_data.concat(this._updated_data);
			l = ds.length;
			if (l) {
				if (conditions) {
					for (c = conditions instanceof Array ? conditions : [conditions], cl = c.length; l;) {
						for (d = ds[l -= 1].save_data, cl = c.length; cl;) {
							if (match(d, c[cl -= 1])) {
								for (p in data) {
									if (data.hasOwnProperty(p)) {
										v = data[p];
										//noinspection JSUnresolvedVariable,JSUnresolvedFunction
										d[p] = v && typeof v === 'object' ? (v.updater ? v.updater(d, data) : v.expr ? this._evalExpression(v.expr, d) : v) : v;
									}
								}
								break;
							}
						}
					}
				} else {
					while (l) {
						d = ds[l -= 1].save_data;
						for (p in data) {
							if (data.hasOwnProperty(p)) {
								v = data[p];
								//noinspection JSUnresolvedVariable,JSUnresolvedFunction
								d[p] = v && typeof v === 'object' ? (v.updater ? v.updater(d, data) : v.expr ? this._evalExpression(v.expr, d) : v) : v;
							}
						}
					}
				}
			}

			if (online) {
				if (t === true) { return t; }
				// take the data without `__updated` as same as remote store, so remove them all, include ones to be removed
				if (!t) {
					this.local_store.remove(this._changeConditions(conditions, {__updated : 0}), {callback : pseudo});
					// continue to update on the data with `__updated` flag
				}
				d = this.getLocalData(data);
				// no need to set `__updated` flag
			} else {
				this._sync_updaters.push(mixin({data : data, conditions : conditions}, opts));
				d = this.getLocalData(data);
				d.__updated = 1;
			}
			d.__timestamp = opts._timestamp;
			// also update for the deleted data
			t = this.local_store.updateAll(d, conditions && this._changeConditions(conditions), opts);
			if (t === true) {
				opts._conditions = conditions;
				opts._data = data;
			}
			return t;
		},

		_onRemoveFromLocalStore        : function (e) {
			var ctx = e.context;
			if (!ctx.local_store.enabled) { return; }
			delete e.conditions;
			if (e._id) {
				ctx._timestamps[e._id] = Infinity;
				e.id = e._id;
				delete e._id;
			} else if (e._conditions) {
				e.conditions = e._conditions;
				delete e._conditions;
			}
			if (e._count) { // add updateAll count for offline
				e.count += e._count;
			}
			ctx.trigger('remove', e, true);
		},
		_removeFromLocalStoreAfterFind : function (e) {
			var ctx = e.context, local = ctx.local_store, id, d, t;
			if (!local.enabled) { return; }
			id = e.id;
			d = e.data;
			if (!id) {
				d = d[0];
			}
			if (!d) { return 0; }
			if (d.__rid) {
				d.__updated = 1;
				ctx._maps[d.__rid] = id;
				e.create = false;
				t = local.save(d, e);
			} else {
				t = local.remove(id, e);
			}
			if (t === false) { return t; }
			ctx._timestamps[id] = Infinity;
			if (t !== true) { return 1; }
			e.count = 1;
			e.callback = ctx._onRemoveFromLocalStore;
			return t;
		},
		_updateDeletedOnLocalStore     : function (e) {
			var ctx = e.context, local = ctx.local_store, t;
			if (local.enabled) {
				e._count = e.count;
				e.callback = ctx._onRemoveFromLocalStore;
				t = e._conditions;
				local.updateAll({__deleted : 1}, t && ctx._changeConditions(t), e);
			}
		},
		_removeFromLocalStore          : function (conditions, e) {
			var local = this.local_store, d, t, p;
			if (conditions) {
				d = local.remove(this._changeConditions(e._conditions = conditions, {__rid : null}, true), e);
				if (d === true) {
					e.callback = this._updateDeletedOnLocalStore;
				} else if (d !== false) {
					t = local.updateAll({__deleted : 1}, this._changeConditions(conditions), e);
					return t === false ? t : d + t;
				}
			} else {
				d = local.remove({__rid : null}, e);
				if (d === false) { return d; }
				t = this._timestamps;
				for (p in t) {
					if (t.hasOwnProperty(p)) {
						t[p] = Infinity;
					}
				}
				if (d === true) {
					this._waits = {};
					e.callback = this._updateDeletedOnLocalStore;
				} else if (d) {
					t = local.updateAll({__deleted : 1}, null, e);
					return t === false ? t : d + t;
				}
			}
			return d;
		},
		_onRemoveFromRemoteStore       : function (e) {
			var ctx = e.context, local = ctx.local_store, conditions = e.conditions, p = e.id, lid, d, t;
			if (!local.enabled) { return; }
			if (p) {
				lid = ctx._maps[e._id = p];
				d = local.remove(lid || {__rid : p}, e);
				if (d === false) { return d; }
				if (lid) {
					ctx._timestamps[lid] = Infinity;
				}
			} else if (conditions) {
				d = local.remove(ctx._changeConditions(e._conditions = conditions), e);
				if (d === false) { return d; }
			} else {
				ctx._waits = {};
				d = local.remove(null, e);
				if (d === false) { return d; }
				t = ctx._timestamps;
				for (p in t) {
					if (t.hasOwnProperty(p)) {
						t[p] = Infinity;
					}
				}
			}
			if (d !== true && d !== false) {
				e.count = d;
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
		remove                         : function (conditions, options) {
			if (!this.enabled) {
				this.trigger('error:remove', {code : 0, message : errors[0]}, true);
				return false;
			}
			var opts = options ? mixin({}, options) : {}, remote, local, t, d, p, id, lid, ds, c, i, ts, online;
			if (conditions) { opts[typeof conditions === 'object' ? 'conditions' : 'id'] = conditions; }
			if (this.trigger('beforeRemove', opts, true) === false) { return false; }

			id = opts.id;
			ts = this._timestamps;
			if (id && ((lid = this._maps[id]) && ts[lid] === Infinity || ts['@' + id] === Infinity)) {    // already removed
				this.trigger('error:remove', {code : 5, message : errors[5], id : id}, true);
				return false;
			}

			opts.context = this;
			if (this.async) { opts.async = true; }
			local = this.local_store;

			remote = this.remote_store;
			online = remote.enabled;
//			console.info('remove', online, conditions, opts);
			if (!conditions) {
				if (online) {
					d = remote.remove(null, opts);
					if (d === false) { return d; }
					if (this._sync_timer) {
						clearTimeout(this._sync_timer);
						this._sync_timer = null;
					}
					this._remove_conditions = [];
					this._remove_ids = [];
					if (d === true) {
						t = this._waits;
						for (p in t) {
							if (t.hasOwnProperty(p)) {
								t[p] = Infinity;
							}
						}
					} else {
						if (false === local.remove(null, opts)) {
							return false;
						}
						for (p in ts) {
							if (ts.hasOwnProperty(p)) {
								ts[p] = Infinity;
							}
						}
					}
				} else {
					d = this._removeFromLocalStore(null, opts);
					this._remove_conditions = [null];
					this._remove_ids = [];
				}
				this._saved_data = [];
				this._updated_data = [];
				this._sync_updaters = [];
			} else if (id) {
				if (online) {
					d = remote.remove(id, opts);
					if (d === true) {
						this._waits[lid ? opts._lid = lid : '@' + id] = Infinity;
					} else if (d !== false) {
						opts._id = id;
						d = local.remove(lid || {__rid : id}, opts);
						if (d === false) { return d; }
						ts[lid || '@' + id] = Infinity;
					} else {
						return d;
					}
				} else {
					d = lid ? local.find(lid, opts) : local.list({__rid : id}, opts);
					if (d === true) {
						opts.callback = this._removeFromLocalStoreAfterFind;
					} else if (d !== false) {
						opts.id = lid;
						opts.data = d;
						d = this._removeFromLocalStoreAfterFind(opts);
					}
					if (d === false) { return d; }
					this._remove_ids.push(id);
					ts[lid || '@' + id] = Infinity;
				}
				// remove the matched data from queue
				for (ds = this._updated_data, p = ds.length; p;) {
					if (ds[p -= 1].id === id) {
						ds.splice(p, 1);
						break;
					}
				}
			} else {
				if (online) {
					d = remote.remove(conditions, opts);
					if (d === false) { return d; }
				}

				// remove the matched data from queue
				for (ds = this._saved_data, p = ds.length, c = conditions instanceof Array ? conditions : [conditions], t = c.length, lid = []; p;) {
					for (d = ds[p -= 1], i = 0; i < t; i += 1) {
						if (match(d, c[i])) {
							if (d.id) { lid.push(d.id); }
							ds.splice(p, 1);
							break;
						}
					}
				}
				for (ds = this._updated_data, p = ds.length; p;) {
					for (d = ds[p -= 1], i = 0; i < t; i += 1) {
						if (match(d, c[i])) {
							lid.push(d.id);
							ds.splice(p, 1);
							break;
						}
					}
				}

				if (online) {
					p = lid.length;
					if (p) {
						for (i = 0; i < p; i += 1) {
							ts[lid[i]] = Infinity;
						}
					}
					if (d !== true) {
						d = local.remove(this._changeConditions(opts._conditions = conditions), opts);
						if (d === false) { return d; }
					} else if (p) {
						for (opts._lids = lid, t = this._waits, i = 0; i < p; i += 1) {
							t[lid[i]] = Infinity;
						}
					}
				} else {
					d = this._removeFromLocalStore(conditions, opts);
					this._remove_conditions.push(conditions);
				}
			}
			return d;
		},

		_onSaveToLocalStoreAfterFind : function (e) {
			var ctx = e.context, d;
			if (!ctx.enabled) { return; }
			delete e.callback;
			d = e.data;
			ctx._timestamps[ctx._maps[d.__rid] = d.id] = e._timestamp;
			e.data = ctx.getRemoteData(d);
			ctx.trigger('find', e, true);
		},
		_saveToLocalStoreAfterFind   : function (d, ld, e) {
			var local = this.local_store, tm, t;
			if (d) {
				tm = d.__timestamp = e._timestamp;
				if (ld) {
					t = this._timestamps[ld.id];
					// if timestamp is earlier than the one already operated, no need step further
					if (t && tm <= t) { return d; }
					e.create = false;
					mixin(ld, this.getLocalData(d));
				} else {
					ld = this.getLocalData(d);
				}
				t = local.save(ld, e);
				if (t === true) {
					if (ld.id) { this._timestamps[ld.id] = tm; }
					e.callback = this._onSaveToLocalStoreAfterFind;
				} else if (t) {
					this._timestamps[this._maps[t.__rid] = t.id] = tm;
				}
				return t;
			}
			if (ld) {  // exists
				local.remove(ld.id, {callback : pseudo});
				this._timestamps[ld.id] = Infinity;
			}
			return null;
		},
		_onFindFromRemoteStore       : function (e) {
			var ctx = e.context, d;
			if (!ctx.local_store.enabled) { return; }
			d = ctx._saveToLocalStoreAfterFind(e.data, e._local_data, e);
			delete e._local_data;
			if (d !== true && d !== false) {
				e.data = d;
				ctx.trigger(e.type, e, true);
			}
		},
		_findFromLocalStore          : function (e) {
			var ctx = e.context, id, ld, remote, t;
			delete e.callback;
			t = e.data;
			ld = e.id ? t : t && t[0];
			id = e.id = e._id;
			delete e._id;
			if (ld) {
				ctx._maps[id] = ld.id;
				if (ld.__deleted) { return null; }
			}
			remote = ctx.remote_store;
			if (!remote.enabled || ld && (ld.__updated || ctx.timeout === -1 || Date.now() - ld.__timestamp <= ctx.timeout)) {
				return this.getRemoteData(ld, true);
			}

			e._timestamp = Date.now();
			t = remote.find(id, e);
			if (t === true) {
				e._local_data = ld;
				return t;
			}
			return t === false ? t : this._saveToLocalStoreAfterFind(t, ld, e);
		},
		_onFindFromLocalStore        : function (e) {
			var ctx = e.context, t;
			if (!ctx.local_store.enabled) { return; }
			t = ctx._findFromLocalStore(e);
			if (t !== true && t !== false) {
				e.data = t;
				ctx.trigger('find', e, true);
			}
		},
		/**
		 * Finds the data related to the set `id`, returns result immediately for synchronous mode, or triggers 'find' event with related data when success for asynchronous mode.
		 *
		 * @param {int}     id      The id of object want to find, required.
		 * @param {Object}  options The options passed to the stores and trigger events.
		 */
		find                         : function (id, options) {
			if (!this.enabled || isNaN(id) && id <= 0) {
				this.trigger('error:find', this.enabled ? {code : 2, message : errors[2]} : {code : 0, message : errors[0]}, true);
				return false;
			}
			var opts = options ? mixin({}, options) : {}, local = this.local_store, remote = this.remote_store, ld, d, lid = this._maps[id], async;
			opts.context = this;
			opts.id = id;
			async = this.async ? opts.async = true : (local.constructor.async || remote.constructor.async);
//			console.info('find', this.remote_store.enabled, id, opts);

			if (lid) {
				if (this._timestamps[lid] === Infinity) {
					return async ? this.trigger('find', opts, true) : null;
				}
				ld = local.find(lid, opts);
			} else {
				ld = local.list({__rid : id}, null, opts);
			}
			if (ld === false) { return ld; }
			opts._id = id;
			if (ld === true) {
				opts.callback = this._onFindFromLocalStore;
				return ld;
			}
			opts.data = ld;
			d = this._findFromLocalStore(opts);
			return async && d !== true && d !== false ? this.trigger('find', opts, true) : d;
		},

		_onFindByLidFromLocal : function (e) {
			var ctx = e.context, d;
			if (!ctx.local_store.enabled) { return; }
			delete e.id;
			d = e.data;
			if (d && d.__deleted) {
				delete e.data;
			}
			ctx.getRemoteData(d, true);
			ctx.trigger('find:local', e, true);
		},
		findByLid             : function (lid, options) {
			if (!this.enabled || isNaN(lid) && lid <= 0) {
				this.trigger('error:find', this.enabled ? {code : 2, message : errors[2]} : {code : 0, message : errors[0]}, true);
				return false;
			}
			var opts = options ? mixin({}, options) : {}, local = this.local_store, ld;
			opts.context = this;
			opts.lid = lid;
			if (this.async || local.constructor.async) { opts.async = true; }
//			console.info('findByLid', lid, opts, this._timestamps[lid], opts.async);
			if (this._timestamps[lid] === Infinity) {
				return opts.async ? this.trigger('find:local', opts, true) : null;
			}

			ld = local.find(lid, opts);
			return ld !== true && ld !== false && ld && ld.__deleted ? null : ld;
		},

		_onListFromLocalStore      : function (e) {
			var ctx = e.context, data, l;
			if (!ctx.enabled) { return; }
			for (data = e.data, l = data && data.length; l;) {
				ctx.getRemoteData(data[l -= 1], true);
			}
			e.conditions = e._conditions;
			delete e._conditions;
			e.modifiers = e._modifiers;
			delete e._modifiers;
			e.context.trigger(e.type, e, true);
		},
		_onSaveListToLocalStore    : function (e) {
			var ctx = e.context, d;
			if (!ctx.enabled) { return; }
			d = e.data;
			e._remote_data.__lid = d.id;
			delete e._remote_data;
			ctx._timestamps[ctx._maps[d.__rid] = d.id] = e._timestamp;
			if (!(e._count -= 1)) {
				delete e._count;
				e.data = e._data;
				delete e._data;
				ctx.trigger('list', e, true);
			}
		},
		_saveListToLocalStore      : function (e) {
			var ctx = e.context, local = ctx.local_store, data, p, d, ld, rl, tm, ts, maps;
			if (!local.enabled) { return; }
			for (data = e.data, p = e._count = data && data.length, tm = e._timestamp, ts = ctx._timestamps, maps = ctx._maps, rl = e._remote_list, e.callback = ctx._onSaveListToLocalStore, e.create = false, delete e._remote_list; p;) {    // update all existed synchronized ones
				ld = data[p -= 1];
				d = rl[ld.__rid];
				d.__timestamp = tm;
				delete rl[d.id];
				d = local.save(mixin(ld, ctx.getLocalData(e._remote_data = d)), e);
				if (d === false) { return d; }
				if (ld.id) {
					ts[ld.id] = tm;
				}
			}

			// save new ones
			delete e.create;
			for (p in rl) {
				if (rl.hasOwnProperty(p)) {
					ld = ctx.getLocalData(data = e._remote_data = rl[p]);
					ld.__timestamp = tm;
					d = local.save(ld, e);
					if (d === false) { return d; }
					if (d && d !== true) {
						ts[maps[d.__rid] = data.__lid = d.id] = tm;
					}
				}
			}

			if (d !== true) {
				delete e._count;
				d = e._data;
				delete e._data;
			}
			return d;
		},
		_saveToLocalStoreAfterList : function (data, conditions, modifiers, e) {
			var ds, l, d, t;
			if (data) {
				l = data.length;
			} else {
				data = [];
			}
			if (!l) {
				// take the data without `__updated` as same as remote store, so remove them all, include ones to be removed
				this.local_store.remove(conditions ? this._changeConditions(conditions, {__updated : 0}) : {__updated : 0}, {callback : pseudo});
			} else if (this.remote_store.list_full_data) {
				for (e._data = data, t = [], ds = e._remote_list = {}; l;) {
					d = data[l -= 1];
					t.push(d.id);
					ds[d.id] = d;
				}
				t = this.local_store.list({__rid : t}, null, e);
				if (t === false) { return t; }
				if (t === true) {
					e.callback = this._saveListToLocalStore;
					return t;
				} else {
					e.data = t;
					return this._saveListToLocalStore(e);
				}
			}
			return data;
		},
		_onListFromRemoteStore     : function (e) {
			var ctx = e.context, t;
			if (!ctx.local_store.enabled) { return; }
			t = ctx._saveToLocalStoreAfterList(e.data, e.conditions, e.modifiers, e);
			if (t !== true && t !== false) {
				e.data = t;
				ctx.trigger(e.type, e);
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
		 * @param {Object}          options     The options passed to the stores and trigger events.
		 */
		list                       : function (conditions, modifiers, options) {
			if (!this.enabled) {
				this.trigger('error:list', {code : 0, message : errors[0]}, true);
				return false;
			}
			var opts = options ? mixin({}, options) : {}, remote = this.remote_store, data, d, l;
			opts.context = this;
			opts.blocking = true;
			if (this.async) { opts.async = true; }
//			console.info('list', remote.enabled, conditions, modifiers, opts);

			if (remote.enabled) {
//				console.warn('list:flush', this._saved_data[0], this._updated_data[0]);
				if (this._saved_data.length || this._updated_data.length || this._remove_ids.length || this._remove_conditions.length || this._sync_updaters.length) {
					d = this._flushQueue(conditions);
					if (d === false) { return d; }
//					if (this.async || this.local_store.constructor.async || remote.constructor.async) {
//						d = this;
//						setTimeout(function() { d.list(conditions, modifiers, opts); }, 0);
//						return true;
//					}
//					return false;
				}

				opts._timestamp = Date.now();
				data = remote.list(conditions, modifiers, opts);
				return data === true || data === false ? data : this._saveToLocalStoreAfterList(data, conditions, modifiers, opts);
			}
			if (modifiers) {
				opts._modifiers = modifiers;
				d = modifiers.order;
				if (d) {
					modifiers = mixin({}, modifiers);
					d = d.split(' ');
					l = d[0];
					modifiers.order = (l === 'id' ? '__rid' : l === '__lid' ? 'id' : l) + ' ' + (d[1] || 'asc');
				}
			}
			data = this.local_store.list(conditions ? this._changeConditions(opts._conditions = conditions, {__deleted : 0}) : {__deleted : 0}, modifiers, opts);
			if (data === true || !data) { return data; }
			for (l = data.length; l;) {
				this.getRemoteData(data[l -= 1], true);
			}
			return data;
		}
	});

	require('util/observable').observable(Model.prototype);
	exports.Model = Model;
});
