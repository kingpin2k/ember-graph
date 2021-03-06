/**
 * Models are the classes that represent your domain data.
 * Each type of object in your domain should have its own
 * model, with attributes and relationships declared using the
 * [attr](EG.html#method_attr), [hasOne](EG.html#method_hasOne)
 * and [hasMany](EG.html#method_hasMany) functions.
 *
 * To create a model, subclass this class (or any other Model
 * subclass) and place it your app's namespace. The name
 * that you give it is important, since that's how it will be
 * looked up by the container. The usual convention is to use
 * a camel-cased name like `App.PostComment` or `App.ForumAdmin`.
 * For more information on resolving, read the Ember.js entry
 * on the [DefaultResolver](http://emberjs.com/api/classes/Ember.DefaultResolver.html).
 *
 * @class Model
 * @constructor
 * @uses Ember.Evented
 */
EG.Model = Em.Object.extend(Em.Evented, {

	/**
	 * This property is available on every model instance and every
	 * model subclass (after being looked up at least once by the
	 * container). This is the key that you use to refer to the model
	 * in relationships and store methods. Examples:
	 *
	 * ```
	 * App.User => user
	 * App.PostComment => postComment
	 * ```
	 *
	 * @property typeKey
	 * @type String
	 * @final
	 */
	typeKey: null,

	_id: null,

	/**
	 * The ID of the record. The ID can only be changed once, and only if
	 * it's being changed from a temporary ID to a permanent one. Only the
	 * store should change the ID from a temporary one to a permanent one.
	 *
	 * @property id
	 * @type String
	 * @final
	 */
	id: Em.computed(function(key, value) {
		var id = this.get('_id');

		if (arguments.length > 1) {
			var prefix = this.constructor.temporaryIdPrefix;

			if (id === null) {
				this.set('_id', value);
				return value;
			} else if (EG.String.startsWith(id, prefix) && !EG.String.startsWith(value, prefix)) {
				this.set('_id', value);
				return value;
			} else {
				throw new Error('Cannot change the \'id\' property of a model.');
			}
		}

		return id;
	}).property('_id'),

	/**
	 * @property store
	 * @type EmberGraph.Store
	 * @final
	 */
	store: null,

	/**
	 * Loads JSON data from the server into the record. This may be used when
	 * the record is brand new, or when the record is being reloaded. This
	 * should generally only be used by the store or for testing purposes.
	 * However, this can be useful to override to intercept data before it's
	 * loaded into the record;
	 *
	 * @method loadData
	 * @param {Object} json
	 * @deprecated Use `loadDataFromServer` instead
	 */
	loadData: Em.aliasMethod('loadDataFromServer'),

	/**
	 * Takes a payload from the server and merges the data into the current data.
	 * This is generally only called by the store, but it may be useful to
	 * override it if you're looking to intercept and modify server data before
	 * it's loaded into the record.
	 *
	 * @method loadDataFromServer
	 * @param {Object} json
	 */
	loadDataFromServer: function(json) {
		json = json || {};
		Em.assert('The record `' + this.typeKey + ':' + this.get('id') + '` was attempted to be reloaded ' +
			'while dirty with `reloadDirty` disabled.', !this.get('isDirty') || this.get('store.reloadDirty'));

		this._loadAttributes(json);
		this.loadRelationshipsFromServer(json);
	},

	/**
	 * Takes the data passed to the store's {{link-to-method 'Store' 'createRecord'}}
	 * method and loads it into the newly created record by calling the model's
	 * public API methods for manipulating records. This should really only be
	 * called by the store and when a record is brand new.
	 *
	 * @method loadDataFromClient
	 * @param {Object} json
	 */
	loadDataFromClient: function(json) {
		json = json || {};

		this.loadAttributesFromClient(json);
		this.loadRelationshipsFromClient(json);
	},

	/**
	 * Proxies the store's save method for convenience.
	 *
	 * @method save
	 * @return Promise
	 */
	save: function() {
		var _this = this;
		var property = null;

		if (this.get('isNew')) {
			property = 'isCreating';
		} else {
			property = 'isSaving';
		}

		this.set(property, true);
		return this.get('store').saveRecord(this).finally(function() {
			_this.set(property, false);
		});
	},

	/**
	 * Proxies the store's reload method for convenience.
	 *
	 * @method reload
	 * @return Promise
	 */
	reload: function() {
		var _this = this;

		this.set('isReloading', true);
		return this.get('store').reloadRecord(this).finally(function() {
			_this.set('isReloading', false);
		});
	},

	/**
	 * Proxies the store's delete method for convenience.
	 *
	 * @method destroy
	 * @return Promise
	 */
	destroy: function() {
		var _this = this;

		this.set('isDeleting', true);
		return this.get('store').deleteRecord(this).then(function() {
			_this.set('isDeleted', true);
			_this.set('store', null);
		}).finally(function() {
			_this.set('isDeleting', false);
		});
	},

	/**
	 * Determines if the other object is a model that represents the same record.
	 *
	 * @method isEqual
	 * @return Boolean
	 */
	isEqual: function(other) {
		if (!other) {
			return;
		}

		return (this.typeKey === Em.get(other, 'typeKey') && this.get('id') === Em.get(other, 'id'));
	},

	/**
	 * Rolls back changes to both attributes and relationships.
	 *
	 * @method rollback
	 */
	rollback: function() {
		this.rollbackAttributes();
		this.rollbackRelationships();
	}
});

EG.Model.reopenClass({

	/**
	 * The prefix added to generated IDs to show that the prefix wasn't given
	 * by the server and is only temporary until the real one comes in.
	 *
	 * @property temporaryIdPrefix
	 * @type String
	 * @static
	 */
	temporaryIdPrefix: 'EG_TEMP_ID_',

	/**
	 * @method isTemporaryId
	 * @param {String} id
	 * @return Boolean
	 * @static
	 */
	isTemporaryId: function(id) {
		return EG.String.startsWith(id, this.temporaryIdPrefix);
	},

	create: function() {
		Em.assert('You can\'t create a record directly. Use the store.');
	},

	_create: EG.Model.create,

	/**
	 * @method extend
	 * @static
	 */
	extend: function() {
		var args = Array.prototype.slice.call(arguments, 0);
		var options = args.pop() || {};
		var attributes = {};
		var relationships = {};

		// Ember.Mixin doesn't have a `detectInstance` method
		if (!(options instanceof Em.Mixin)) {
			Em.keys(options).forEach(function(key) {
				var value = options[key];

				if (options[key]) {
					if (options[key].isRelationship) {
						relationships[key] = value;
						delete options[key];
					} else if (options[key].isAttribute) {
						attributes[key] = value;
						delete options[key];
					}
				}
			});
		}

		args.push(options);

		var subclass = this._super.apply(this, args);
		subclass._declareAttributes(attributes);
		subclass.declareRelationships(relationships);
		return subclass;
	},

	/**
	 * Determines if the two objects passed in are equal models (or model proxies).
	 *
	 * @param {Model} a
	 * @param {Model} b
	 * @return Boolean
	 * @static
	 */
	isEqual: function(a, b) {
		if (Em.isNone(a) || Em.isNone(b)) {
			return false;
		}

		if (this.detectInstance(a)) {
			return a.isEqual(b);
		}

		if (this.detectInstance(b)) {
			return b.isEqual(a);
		}

		if (this.detectInstance(Em.get(a, 'content'))) {
			return Em.get(a, 'content').isEqual(b);
		}

		if (this.detectInstance(Em.get(b, 'content'))) {
			return Em.get(b, 'content').isEqual(a);
		}

		return false;
	}
});

