// This function taken from Ember
var isNativeFunction = function(fn) {
	return fn && Function.prototype.toString.call(fn).indexOf('[native code]') >= 0;
};

EG.ArrayPolyfills = {
	some: isNativeFunction(Array.prototype.some) ? Array.prototype.some : function(predicate, thisArg) {
		if (this === void 0 || this === null) {
			throw new TypeError('Array.prototype.some called on null or undefined');
		}

		if (typeof predicate !== 'function') {
			throw new TypeError('predicate must be a function');
		}

		var list = Object(this);
		var length = list.length >>> 0;

		for (var i = 0; i < length; ++i) {
			if (i in list && predicate.call(thisArg, list[i], i, list)) {
				return true;
			}
		}

		return false;
	},

	reduce: isNativeFunction(Array.prototype.reduce) ? Array.prototype.reduce : function(predicate, initialValue) {
		if (this === void 0 || this === null) {
			throw new TypeError('Array.prototype.reduce called on null or undefined');
		}

		if (typeof predicate !== 'function') {
			throw new TypeError('predicate must be a function');
		}

		var list = Object(this);
		var length = list.length >>> 0;
		var value = initialValue;

		if (length <= 0 && arguments.length < 2) {
			throw new TypeError('Reduce of empty array with no initial value');
		}

		for (var i = 0; i < length; ++i) {
			if (i in list) {
				value = callback(value, list[i], i, list);
			}
		}

		return value;
	}
};

if (Em.SHIM_ES5) {
	Array.prototype.some = Array.prototype.some || EG.ArrayPolyfills.some;

	Array.prototype.reduce = Array.prototype.reduce || EG.ArrayPolyfills.reduce;
}