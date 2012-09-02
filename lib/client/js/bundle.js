(function(){var require = function (file, cwd) {
    var resolved = require.resolve(file, cwd || '/');
    var mod = require.modules[resolved];
    if (!mod) throw new Error(
        'Failed to resolve module ' + file + ', tried ' + resolved
    );
    var cached = require.cache[resolved];
    var res = cached? cached.exports : mod();
    return res;
};

require.paths = [];
require.modules = {};
require.cache = {};
require.extensions = [".js",".coffee",".json"];

require._core = {
    'assert': true,
    'events': true,
    'fs': true,
    'path': true,
    'vm': true
};

require.resolve = (function () {
    return function (x, cwd) {
        if (!cwd) cwd = '/';
        
        if (require._core[x]) return x;
        var path = require.modules.path();
        cwd = path.resolve('/', cwd);
        var y = cwd || '/';
        
        if (x.match(/^(?:\.\.?\/|\/)/)) {
            var m = loadAsFileSync(path.resolve(y, x))
                || loadAsDirectorySync(path.resolve(y, x));
            if (m) return m;
        }
        
        var n = loadNodeModulesSync(x, y);
        if (n) return n;
        
        throw new Error("Cannot find module '" + x + "'");
        
        function loadAsFileSync (x) {
            x = path.normalize(x);
            if (require.modules[x]) {
                return x;
            }
            
            for (var i = 0; i < require.extensions.length; i++) {
                var ext = require.extensions[i];
                if (require.modules[x + ext]) return x + ext;
            }
        }
        
        function loadAsDirectorySync (x) {
            x = x.replace(/\/+$/, '');
            var pkgfile = path.normalize(x + '/package.json');
            if (require.modules[pkgfile]) {
                var pkg = require.modules[pkgfile]();
                var b = pkg.browserify;
                if (typeof b === 'object' && b.main) {
                    var m = loadAsFileSync(path.resolve(x, b.main));
                    if (m) return m;
                }
                else if (typeof b === 'string') {
                    var m = loadAsFileSync(path.resolve(x, b));
                    if (m) return m;
                }
                else if (pkg.main) {
                    var m = loadAsFileSync(path.resolve(x, pkg.main));
                    if (m) return m;
                }
            }
            
            return loadAsFileSync(x + '/index');
        }
        
        function loadNodeModulesSync (x, start) {
            var dirs = nodeModulesPathsSync(start);
            for (var i = 0; i < dirs.length; i++) {
                var dir = dirs[i];
                var m = loadAsFileSync(dir + '/' + x);
                if (m) return m;
                var n = loadAsDirectorySync(dir + '/' + x);
                if (n) return n;
            }
            
            var m = loadAsFileSync(x);
            if (m) return m;
        }
        
        function nodeModulesPathsSync (start) {
            var parts;
            if (start === '/') parts = [ '' ];
            else parts = path.normalize(start).split('/');
            
            var dirs = [];
            for (var i = parts.length - 1; i >= 0; i--) {
                if (parts[i] === 'node_modules') continue;
                var dir = parts.slice(0, i + 1).join('/') + '/node_modules';
                dirs.push(dir);
            }
            
            return dirs;
        }
    };
})();

require.alias = function (from, to) {
    var path = require.modules.path();
    var res = null;
    try {
        res = require.resolve(from + '/package.json', '/');
    }
    catch (err) {
        res = require.resolve(from, '/');
    }
    var basedir = path.dirname(res);
    
    var keys = (Object.keys || function (obj) {
        var res = [];
        for (var key in obj) res.push(key);
        return res;
    })(require.modules);
    
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key.slice(0, basedir.length + 1) === basedir + '/') {
            var f = key.slice(basedir.length);
            require.modules[to + f] = require.modules[basedir + f];
        }
        else if (key === basedir) {
            require.modules[to] = require.modules[basedir];
        }
    }
};

(function () {
    var process = {};
    
    require.define = function (filename, fn) {
        if (require.modules.__browserify_process) {
            process = require.modules.__browserify_process();
        }
        
        var dirname = require._core[filename]
            ? ''
            : require.modules.path().dirname(filename)
        ;
        
        var require_ = function (file) {
            var requiredModule = require(file, dirname);
            var cached = require.cache[require.resolve(file, dirname)];

            if (cached && cached.parent === null) {
                cached.parent = module_;
            }

            return requiredModule;
        };
        require_.resolve = function (name) {
            return require.resolve(name, dirname);
        };
        require_.modules = require.modules;
        require_.define = require.define;
        require_.cache = require.cache;
        var module_ = {
            id : filename,
            filename: filename,
            exports : {},
            loaded : false,
            parent: null
        };
        
        require.modules[filename] = function () {
            require.cache[filename] = module_;
            fn.call(
                module_.exports,
                require_,
                module_,
                module_.exports,
                dirname,
                filename,
                process
            );
            module_.loaded = true;
            return module_.exports;
        };
    };
})();


require.define("path",function(require,module,exports,__dirname,__filename,process){function filter (xs, fn) {
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (fn(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length; i >= 0; i--) {
    var last = parts[i];
    if (last == '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Regex to split a filename into [*, dir, basename, ext]
// posix version
var splitPathRe = /^(.+\/(?!$)|\/)?((?:.+?)?(\.[^.]*)?)$/;

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
var resolvedPath = '',
    resolvedAbsolute = false;

for (var i = arguments.length; i >= -1 && !resolvedAbsolute; i--) {
  var path = (i >= 0)
      ? arguments[i]
      : process.cwd();

  // Skip empty and invalid entries
  if (typeof path !== 'string' || !path) {
    continue;
  }

  resolvedPath = path + '/' + resolvedPath;
  resolvedAbsolute = path.charAt(0) === '/';
}

// At this point the path should be resolved to a full absolute path, but
// handle relative paths to be safe (might happen when process.cwd() fails)

// Normalize the path
resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
var isAbsolute = path.charAt(0) === '/',
    trailingSlash = path.slice(-1) === '/';

// Normalize the path
path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }
  
  return (isAbsolute ? '/' : '') + path;
};


// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    return p && typeof p === 'string';
  }).join('/'));
};


exports.dirname = function(path) {
  var dir = splitPathRe.exec(path)[1] || '';
  var isWindows = false;
  if (!dir) {
    // No dirname
    return '.';
  } else if (dir.length === 1 ||
      (isWindows && dir.length <= 3 && dir.charAt(1) === ':')) {
    // It is just a slash or a drive letter with a slash
    return dir;
  } else {
    // It is a full dirname, strip trailing slash
    return dir.substring(0, dir.length - 1);
  }
};


exports.basename = function(path, ext) {
  var f = splitPathRe.exec(path)[2] || '';
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPathRe.exec(path)[3] || '';
};

});

require.define("__browserify_process",function(require,module,exports,__dirname,__filename,process){var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
        && window.setImmediate;
    var canPost = typeof window !== 'undefined'
        && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return window.setImmediate;
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'browserify-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('browserify-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    if (name === 'evals') return (require)('vm')
    else throw new Error('No such module. (Possibly not yet loaded)')
};

(function () {
    var cwd = '/';
    var path;
    process.cwd = function () { return cwd };
    process.chdir = function (dir) {
        if (!path) path = require('path');
        cwd = path.resolve(dir, cwd);
    };
})();

});

require.define("/node_modules/signals/package.json",function(require,module,exports,__dirname,__filename,process){module.exports = {"main":"dist/signals.js"}
});

require.define("/node_modules/signals/dist/signals.js",function(require,module,exports,__dirname,__filename,process){/*jslint onevar:true, undef:true, newcap:true, regexp:true, bitwise:true, maxerr:50, indent:4, white:false, nomen:false, plusplus:false */
/*global define:false, require:false, exports:false, module:false, signals:false */

/** @license
 * JS Signals <http://millermedeiros.github.com/js-signals/>
 * Released under the MIT license
 * Author: Miller Medeiros
 * Version: 0.8.1 - Build: 266 (2012/07/31 03:33 PM)
 */

(function(global){

    // SignalBinding -------------------------------------------------
    //================================================================

    /**
     * Object that represents a binding between a Signal and a listener function.
     * <br />- <strong>This is an internal constructor and shouldn't be called by regular users.</strong>
     * <br />- inspired by Joa Ebert AS3 SignalBinding and Robert Penner's Slot classes.
     * @author Miller Medeiros
     * @constructor
     * @internal
     * @name SignalBinding
     * @param {Signal} signal Reference to Signal object that listener is currently bound to.
     * @param {Function} listener Handler function bound to the signal.
     * @param {boolean} isOnce If binding should be executed just once.
     * @param {Object} [listenerContext] Context on which listener will be executed (object that should represent the `this` variable inside listener function).
     * @param {Number} [priority] The priority level of the event listener. (default = 0).
     */
    function SignalBinding(signal, listener, isOnce, listenerContext, priority) {

        /**
         * Handler function bound to the signal.
         * @type Function
         * @private
         */
        this._listener = listener;

        /**
         * If binding should be executed just once.
         * @type boolean
         * @private
         */
        this._isOnce = isOnce;

        /**
         * Context on which listener will be executed (object that should represent the `this` variable inside listener function).
         * @memberOf SignalBinding.prototype
         * @name context
         * @type Object|undefined|null
         */
        this.context = listenerContext;

        /**
         * Reference to Signal object that listener is currently bound to.
         * @type Signal
         * @private
         */
        this._signal = signal;

        /**
         * Listener priority
         * @type Number
         * @private
         */
        this._priority = priority || 0;
    }

    SignalBinding.prototype = {

        /**
         * If binding is active and should be executed.
         * @type boolean
         */
        active : true,

        /**
         * Default parameters passed to listener during `Signal.dispatch` and `SignalBinding.execute`. (curried parameters)
         * @type Array|null
         */
        params : null,

        /**
         * Call listener passing arbitrary parameters.
         * <p>If binding was added using `Signal.addOnce()` it will be automatically removed from signal dispatch queue, this method is used internally for the signal dispatch.</p>
         * @param {Array} [paramsArr] Array of parameters that should be passed to the listener
         * @return {*} Value returned by the listener.
         */
        execute : function (paramsArr) {
            var handlerReturn, params;
            if (this.active && !!this._listener) {
                params = this.params? this.params.concat(paramsArr) : paramsArr;
                handlerReturn = this._listener.apply(this.context, params);
                if (this._isOnce) {
                    this.detach();
                }
            }
            return handlerReturn;
        },

        /**
         * Detach binding from signal.
         * - alias to: mySignal.remove(myBinding.getListener());
         * @return {Function|null} Handler function bound to the signal or `null` if binding was previously detached.
         */
        detach : function () {
            return this.isBound()? this._signal.remove(this._listener, this.context) : null;
        },

        /**
         * @return {Boolean} `true` if binding is still bound to the signal and have a listener.
         */
        isBound : function () {
            return (!!this._signal && !!this._listener);
        },

        /**
         * @return {Function} Handler function bound to the signal.
         */
        getListener : function () {
            return this._listener;
        },

        /**
         * Delete instance properties
         * @private
         */
        _destroy : function () {
            delete this._signal;
            delete this._listener;
            delete this.context;
        },

        /**
         * @return {boolean} If SignalBinding will only be executed once.
         */
        isOnce : function () {
            return this._isOnce;
        },

        /**
         * @return {string} String representation of the object.
         */
        toString : function () {
            return '[SignalBinding isOnce:' + this._isOnce +', isBound:'+ this.isBound() +', active:' + this.active + ']';
        }

    };


/*global SignalBinding:false*/

    // Signal --------------------------------------------------------
    //================================================================

    function validateListener(listener, fnName) {
        if (typeof listener !== 'function') {
            throw new Error( 'listener is a required param of {fn}() and should be a Function.'.replace('{fn}', fnName) );
        }
    }

    /**
     * Custom event broadcaster
     * <br />- inspired by Robert Penner's AS3 Signals.
     * @name Signal
     * @author Miller Medeiros
     * @constructor
     */
    function Signal() {
        /**
         * @type Array.<SignalBinding>
         * @private
         */
        this._bindings = [];
        this._prevParams = null;
    }

    Signal.prototype = {

        /**
         * Signals Version Number
         * @type String
         * @const
         */
        VERSION : '0.8.1',

        /**
         * If Signal should keep record of previously dispatched parameters and
         * automatically execute listener during `add()`/`addOnce()` if Signal was
         * already dispatched before.
         * @type boolean
         */
        memorize : false,

        /**
         * @type boolean
         * @private
         */
        _shouldPropagate : true,

        /**
         * If Signal is active and should broadcast events.
         * <p><strong>IMPORTANT:</strong> Setting this property during a dispatch will only affect the next dispatch, if you want to stop the propagation of a signal use `halt()` instead.</p>
         * @type boolean
         */
        active : true,

        /**
         * @param {Function} listener
         * @param {boolean} isOnce
         * @param {Object} [listenerContext]
         * @param {Number} [priority]
         * @return {SignalBinding}
         * @private
         */
        _registerListener : function (listener, isOnce, listenerContext, priority) {

            var prevIndex = this._indexOfListener(listener, listenerContext),
                binding;

            if (prevIndex !== -1) {
                binding = this._bindings[prevIndex];
                if (binding.isOnce() !== isOnce) {
                    throw new Error('You cannot add'+ (isOnce? '' : 'Once') +'() then add'+ (!isOnce? '' : 'Once') +'() the same listener without removing the relationship first.');
                }
            } else {
                binding = new SignalBinding(this, listener, isOnce, listenerContext, priority);
                this._addBinding(binding);
            }

            if(this.memorize && this._prevParams){
                binding.execute(this._prevParams);
            }

            return binding;
        },

        /**
         * @param {SignalBinding} binding
         * @private
         */
        _addBinding : function (binding) {
            //simplified insertion sort
            var n = this._bindings.length;
            do { --n; } while (this._bindings[n] && binding._priority <= this._bindings[n]._priority);
            this._bindings.splice(n + 1, 0, binding);
        },

        /**
         * @param {Function} listener
         * @return {number}
         * @private
         */
        _indexOfListener : function (listener, context) {
            var n = this._bindings.length,
                cur;
            while (n--) {
                cur = this._bindings[n];
                if (cur._listener === listener && cur.context === context) {
                    return n;
                }
            }
            return -1;
        },

        /**
         * Check if listener was attached to Signal.
         * @param {Function} listener
         * @param {Object} [context]
         * @return {boolean} if Signal has the specified listener.
         */
        has : function (listener, context) {
            return this._indexOfListener(listener, context) !== -1;
        },

        /**
         * Add a listener to the signal.
         * @param {Function} listener Signal handler function.
         * @param {Object} [listenerContext] Context on which listener will be executed (object that should represent the `this` variable inside listener function).
         * @param {Number} [priority] The priority level of the event listener. Listeners with higher priority will be executed before listeners with lower priority. Listeners with same priority level will be executed at the same order as they were added. (default = 0)
         * @return {SignalBinding} An Object representing the binding between the Signal and listener.
         */
        add : function (listener, listenerContext, priority) {
            validateListener(listener, 'add');
            return this._registerListener(listener, false, listenerContext, priority);
        },

        /**
         * Add listener to the signal that should be removed after first execution (will be executed only once).
         * @param {Function} listener Signal handler function.
         * @param {Object} [listenerContext] Context on which listener will be executed (object that should represent the `this` variable inside listener function).
         * @param {Number} [priority] The priority level of the event listener. Listeners with higher priority will be executed before listeners with lower priority. Listeners with same priority level will be executed at the same order as they were added. (default = 0)
         * @return {SignalBinding} An Object representing the binding between the Signal and listener.
         */
        addOnce : function (listener, listenerContext, priority) {
            validateListener(listener, 'addOnce');
            return this._registerListener(listener, true, listenerContext, priority);
        },

        /**
         * Remove a single listener from the dispatch queue.
         * @param {Function} listener Handler function that should be removed.
         * @param {Object} [context] Execution context (since you can add the same handler multiple times if executing in a different context).
         * @return {Function} Listener handler function.
         */
        remove : function (listener, context) {
            validateListener(listener, 'remove');

            var i = this._indexOfListener(listener, context);
            if (i !== -1) {
                this._bindings[i]._destroy(); //no reason to a SignalBinding exist if it isn't attached to a signal
                this._bindings.splice(i, 1);
            }
            return listener;
        },

        /**
         * Remove all listeners from the Signal.
         */
        removeAll : function () {
            var n = this._bindings.length;
            while (n--) {
                this._bindings[n]._destroy();
            }
            this._bindings.length = 0;
        },

        /**
         * @return {number} Number of listeners attached to the Signal.
         */
        getNumListeners : function () {
            return this._bindings.length;
        },

        /**
         * Stop propagation of the event, blocking the dispatch to next listeners on the queue.
         * <p><strong>IMPORTANT:</strong> should be called only during signal dispatch, calling it before/after dispatch won't affect signal broadcast.</p>
         * @see Signal.prototype.disable
         */
        halt : function () {
            this._shouldPropagate = false;
        },

        /**
         * Dispatch/Broadcast Signal to all listeners added to the queue.
         * @param {...*} [params] Parameters that should be passed to each handler.
         */
        dispatch : function (params) {
            if (! this.active) {
                return;
            }

            var paramsArr = Array.prototype.slice.call(arguments),
                n = this._bindings.length,
                bindings;

            if (this.memorize) {
                this._prevParams = paramsArr;
            }

            if (! n) {
                //should come after memorize
                return;
            }

            bindings = this._bindings.slice(); //clone array in case add/remove items during dispatch
            this._shouldPropagate = true; //in case `halt` was called before dispatch or during the previous dispatch.

            //execute all callbacks until end of the list or until a callback returns `false` or stops propagation
            //reverse loop since listeners with higher priority will be added at the end of the list
            do { n--; } while (bindings[n] && this._shouldPropagate && bindings[n].execute(paramsArr) !== false);
        },

        /**
         * Forget memorized arguments.
         * @see Signal.memorize
         */
        forget : function(){
            this._prevParams = null;
        },

        /**
         * Remove all bindings from signal and destroy any reference to external objects (destroy Signal object).
         * <p><strong>IMPORTANT:</strong> calling any method on the signal instance after calling dispose will throw errors.</p>
         */
        dispose : function () {
            this.removeAll();
            delete this._bindings;
            delete this._prevParams;
        },

        /**
         * @return {string} String representation of the object.
         */
        toString : function () {
            return '[Signal active:'+ this.active +' numListeners:'+ this.getNumListeners() +']';
        }

    };


    // Namespace -----------------------------------------------------
    //================================================================

    /**
     * Signals namespace
     * @namespace
     * @name signals
     */
    var signals = Signal;

    /**
     * Custom event broadcaster
     * @see Signal
     */
    // alias for backwards compatibility (see #gh-44)
    signals.Signal = Signal;



    //exports to multiple environments
    if(typeof define === 'function' && define.amd){ //AMD
        define(function () { return signals; });
    } else if (typeof module !== 'undefined' && module.exports){ //node
        module.exports = signals;
    } else { //browser
        //use string because of Google closure compiler ADVANCED_MODE
        /*jslint sub:true */
        global['signals'] = signals;
    }

}(this));

});

require.define("/node_modules/store/package.json",function(require,module,exports,__dirname,__filename,process){module.exports = {"main":"store"}
});

require.define("/node_modules/store/store.js",function(require,module,exports,__dirname,__filename,process){/* Copyright (c) 2010-2012 Marcus Westin
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

;(function(){
	var store = {},
		win = window,
		doc = win.document,
		localStorageName = 'localStorage',
		globalStorageName = 'globalStorage',
		namespace = '__storejs__',
		storage

	store.disabled = false
	store.set = function(key, value) {}
	store.get = function(key) {}
	store.remove = function(key) {}
	store.clear = function() {}
	store.transact = function(key, defaultVal, transactionFn) {
		var val = store.get(key)
		if (transactionFn == null) {
			transactionFn = defaultVal
			defaultVal = null
		}
		if (typeof val == 'undefined') { val = defaultVal || {} }
		transactionFn(val)
		store.set(key, val)
	}
	store.getAll = function() {}

	store.serialize = function(value) {
		return JSON.stringify(value)
	}
	store.deserialize = function(value) {
		if (typeof value != 'string') { return undefined }
		return JSON.parse(value)
	}

	// Functions to encapsulate questionable FireFox 3.6.13 behavior
	// when about.config::dom.storage.enabled === false
	// See https://github.com/marcuswestin/store.js/issues#issue/13
	function isLocalStorageNameSupported() {
		try { return (localStorageName in win && win[localStorageName]) }
		catch(err) { return false }
	}

	function isGlobalStorageNameSupported() {
		try { return (globalStorageName in win && win[globalStorageName] && win[globalStorageName][win.location.hostname]) }
		catch(err) { return false }
	}

	if (isLocalStorageNameSupported()) {
		storage = win[localStorageName]
		store.set = function(key, val) {
			if (val === undefined) { return store.remove(key) }
			storage.setItem(key, store.serialize(val))
		}
		store.get = function(key) { return store.deserialize(storage.getItem(key)) }
		store.remove = function(key) { storage.removeItem(key) }
		store.clear = function() { storage.clear() }
		store.getAll = function() {
			var ret = {}
			for (var i=0; i<storage.length; ++i) {
				var key = storage.key(i)
				ret[key] = store.get(key)
			}
			return ret
		}
	} else if (isGlobalStorageNameSupported()) {
		storage = win[globalStorageName][win.location.hostname]
		store.set = function(key, val) {
			if (val === undefined) { return store.remove(key) }
			storage[key] = store.serialize(val)
		}
		store.get = function(key) { return store.deserialize(storage[key] && storage[key].value) }
		store.remove = function(key) { delete storage[key] }
		store.clear = function() { for (var key in storage ) { delete storage[key] } }
		store.getAll = function() {
			var ret = {}
			for (var i=0; i<storage.length; ++i) {
				var key = storage.key(i)
				ret[key] = store.get(key)
			}
			return ret
		}

	} else if (doc.documentElement.addBehavior) {
		var storageOwner,
			storageContainer
		// Since #userData storage applies only to specific paths, we need to
		// somehow link our data to a specific path.  We choose /favicon.ico
		// as a pretty safe option, since all browsers already make a request to
		// this URL anyway and being a 404 will not hurt us here.  We wrap an
		// iframe pointing to the favicon in an ActiveXObject(htmlfile) object
		// (see: http://msdn.microsoft.com/en-us/library/aa752574(v=VS.85).aspx)
		// since the iframe access rules appear to allow direct access and
		// manipulation of the document element, even for a 404 page.  This
		// document can be used instead of the current document (which would
		// have been limited to the current path) to perform #userData storage.
		try {
			storageContainer = new ActiveXObject('htmlfile')
			storageContainer.open()
			storageContainer.write('<s' + 'cript>document.w=window</s' + 'cript><iframe src="/favicon.ico"></frame>')
			storageContainer.close()
			storageOwner = storageContainer.w.frames[0].document
			storage = storageOwner.createElement('div')
		} catch(e) {
			// somehow ActiveXObject instantiation failed (perhaps some special
			// security settings or otherwse), fall back to per-path storage
			storage = doc.createElement('div')
			storageOwner = doc.body
		}
		function withIEStorage(storeFunction) {
			return function() {
				var args = Array.prototype.slice.call(arguments, 0)
				args.unshift(storage)
				// See http://msdn.microsoft.com/en-us/library/ms531081(v=VS.85).aspx
				// and http://msdn.microsoft.com/en-us/library/ms531424(v=VS.85).aspx
				storageOwner.appendChild(storage)
				storage.addBehavior('#default#userData')
				storage.load(localStorageName)
				var result = storeFunction.apply(store, args)
				storageOwner.removeChild(storage)
				return result
			}
		}
		function ieKeyFix(key) {
			// In IE7, keys may not begin with numbers.
			// See https://github.com/marcuswestin/store.js/issues/40#issuecomment-4617842
			return '_'+key
		}
		store.set = withIEStorage(function(storage, key, val) {
			key = ieKeyFix(key)
			if (val === undefined) { return store.remove(key) }
			storage.setAttribute(key, store.serialize(val))
			storage.save(localStorageName)
		})
		store.get = withIEStorage(function(storage, key) {
			key = ieKeyFix(key)
			return store.deserialize(storage.getAttribute(key))
		})
		store.remove = withIEStorage(function(storage, key) {
			key = ieKeyFix(key)
			storage.removeAttribute(key)
			storage.save(localStorageName)
		})
		store.clear = withIEStorage(function(storage) {
			var attributes = storage.XMLDocument.documentElement.attributes
			storage.load(localStorageName)
			for (var i=0, attr; attr=attributes[i]; i++) {
				storage.removeAttribute(attr.name)
			}
			storage.save(localStorageName)
		})
		store.getAll = withIEStorage(function(storage) {
			var attributes = storage.XMLDocument.documentElement.attributes
			storage.load(localStorageName)
			var ret = {}
			for (var i=0, attr; attr=attributes[i]; ++i) {
				ret[attr] = store.get(attr)
			}
			return ret
		})
	}

	try {
		store.set(namespace, namespace)
		if (store.get(namespace) != namespace) { store.disabled = true }
		store.remove(namespace)
	} catch(e) {
		store.disabled = true
	}
	
	if (typeof module != 'undefined') { module.exports = store }
	else if (typeof define === 'function' && define.amd) { define(store) }
	else { this.store = store }
})()

});

require.define("/node_modules/tinycon/package.json",function(require,module,exports,__dirname,__filename,process){module.exports = {}
});

require.define("/node_modules/tinycon/tinycon.js",function(require,module,exports,__dirname,__filename,process){/*!
 * Tinycon - A small library for manipulating the Favicon
 * Tom Moor, http://tommoor.com
 * Copyright (c) 2012 Tom Moor
 * MIT Licensed
 * @version 0.2.6
*/

(function(){
	
	var Tinycon = {};
	var currentFavicon = null;
	var originalFavicon = null;
	var originalTitle = document.title;
	var faviconImage = null;
	var canvas = null;
	var options = {};
	var defaults = {
		width: 7,
		height: 9,
		font: '10px arial',
		colour: '#ffffff',
		background: '#F03D25',
		fallback: true
	};
	
	var ua = (function () {
		var agent = navigator.userAgent.toLowerCase();
		// New function has access to 'agent' via closure
		return function (browser) {
			return agent.indexOf(browser) !== -1;
		};
	}());

	var browser = {
		ie: ua('msie'),
		chrome: ua('chrome'),
		webkit: ua('chrome') || ua('safari'),
		safari: ua('safari') && !ua('chrome'),
		mozilla: ua('mozilla') && !ua('chrome') && !ua('safari')
	};
	
	// private methods
	var getFaviconTag = function(){
		
		var links = document.getElementsByTagName('link');
		
		for(var i=0, len=links.length; i < len; i++) {
			if ((links[i].getAttribute('rel') || '').match(/\bicon\b/)) {
				return links[i];
			}
		}
		
		return false;
	};
	
	var removeFaviconTag = function(){
	
		var links = document.getElementsByTagName('link');
		var head = document.getElementsByTagName('head')[0];
		
		for(var i=0, len=links.length; i < len; i++) {
			var exists = (typeof(links[i]) !== 'undefined');
			if (exists && links[i].getAttribute('rel') === 'icon') {
				head.removeChild(links[i]);
			}
		}
	};
	
	var getCurrentFavicon = function(){
		
		if (!originalFavicon || !currentFavicon) {
			var tag = getFaviconTag();
			originalFavicon = currentFavicon = tag ? tag.getAttribute('href') : '/favicon.ico';
		}

		return currentFavicon;
	};
	
	var getCanvas = function (){
		
		if (!canvas) {
			canvas = document.createElement("canvas");
			canvas.width = 16;
			canvas.height = 16;
		}
		
		return canvas;
	};
	
	var setFaviconTag = function(url){
		removeFaviconTag();
		
		var link = document.createElement('link');
		link.type = 'image/x-icon';
		link.rel = 'icon';
		link.href = url;
		document.getElementsByTagName('head')[0].appendChild(link);
	};
	
	var log = function(message){
		if (window.console) window.console.log(message);
	};
	
	var drawFavicon = function(num, colour) {

		// fallback to updating the browser title if unsupported
		if (!getCanvas().getContext || browser.ie || browser.safari || options.fallback === 'force') {
			return updateTitle(num);
		}
		
		var context = getCanvas().getContext("2d");
		var colour = colour || '#000000';
		var num = num || 0;
		var src = getCurrentFavicon();
		
		faviconImage = new Image();
		faviconImage.onload = function() {
			
			// clear canvas  
			context.clearRect(0, 0, 16, 16);

			// draw original favicon
			context.drawImage(faviconImage, 0, 0, faviconImage.width, faviconImage.height, 0, 0, 16, 16);
			
			// draw bubble over the top
			if (num > 0) drawBubble(context, num, colour);
			
			// refresh tag in page
			refreshFavicon();
		};
		
		// allow cross origin resource requests if the image is not a data:uri
		// as detailed here: https://github.com/mrdoob/three.js/issues/1305
		if (!src.match(/^data/)) {
			faviconImage.crossOrigin = 'anonymous';
		}
		
		faviconImage.src = src;
	};
	
	var updateTitle = function(num) {
		
		if (options.fallback) {
			if (num > 0) {
				document.title = '('+num+') ' + originalTitle;
			} else {
				document.title = originalTitle;
			}
		}
	};
	
	var drawBubble = function(context, num, colour) {
		
		// bubble needs to be larger for double digits
		var len = (num+"").length-1;
		var width = options.width + (6*len);
		var w = 16-width;
		var h = 16-options.height;

		// webkit seems to render fonts lighter than firefox
		context.font = (browser.webkit ? 'bold ' : '') + options.font;
		context.fillStyle = options.background;
		context.strokeStyle = options.background;
		context.lineWidth = 1;
		
		// bubble
		context.fillRect(w,h,width-1,options.height);
		
		// rounded left
		context.beginPath();
		context.moveTo(w-0.5,h+1);
		context.lineTo(w-0.5,15);
		context.stroke();
		
		// rounded right
		context.beginPath();
		context.moveTo(15.5,h+1);
		context.lineTo(15.5,15);
		context.stroke();
		
		// bottom shadow
		context.beginPath();
		context.strokeStyle = "rgba(0,0,0,0.3)";
		context.moveTo(w,16);
		context.lineTo(15,16);
		context.stroke();
		
		// number
		context.fillStyle = options.colour;
		context.textAlign = "right";
		context.textBaseline = "top";
		
		// unfortunately webkit/mozilla are a pixel different in text positioning
		context.fillText(num, 15, browser.mozilla ? 7 : 6);  
	};
	
	var refreshFavicon = function(){
		// check support
		if (!getCanvas().getContext) return;
		
		setFaviconTag(getCanvas().toDataURL());
	};
	
	
	// public methods
	Tinycon.setOptions = function(custom){
		options = {};
		
		for(var key in defaults){
			options[key] = custom.hasOwnProperty(key) ? custom[key] : defaults[key];
		}
		return this;
	};
	
	Tinycon.setImage = function(url){
		currentFavicon = url;
		refreshFavicon();
		return this;
	};
	
	Tinycon.setBubble = function(num, colour){
		
		// validate
		if(isNaN(parseFloat(num)) || !isFinite(num)) return log('Bubble must be a number');
		
		drawFavicon(num, colour);
		return this;
	};
	
	Tinycon.reset = function(){
		Tinycon.setImage(originalFavicon);
	};
	
	Tinycon.setOptions(defaults);

  module.exports = Tinycon;

})();

});

require.define("/lib/client/js/client.js",function(require,module,exports,__dirname,__filename,process){(function() {
  var App, EntryForm, FilterPane, ImageMedia, Media, Message, MessageList, Node, Upload, YoutubeMedia, global, signals, store, tinycon,
    __hasProp = Object.prototype.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; },
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  Node = (function() {

    function Node() {}

    Node.prototype.add_class = function(class_name) {
      return this.node.className += ' ' + class_name;
    };

    Node.prototype.remove_class = function(class_name) {
      return this.node.className = this.node.className.split(class_name).join('');
    };

    Node.prototype.has_class = function(class_name) {
      return !!(this.node.className.indexOf(class_name) !== -1);
    };

    Node.prototype.toggle_class = function(class_name) {
      if (this.has_class(class_name)) {
        return this.remove_class(class_name);
      } else {
        return this.add_class(class_name);
      }
    };

    return Node;

  })();

  signals = require('signals');

  Media = (function(_super) {

    __extends(Media, _super);

    function Media(url, message) {
      this.url = Media.html_decode(url);
      this.message = message;
    }

    Media.prototype.build = function() {
      var media_node;
      this.node = document.createElement('div');
      this.node.className = 'media';
      this.message.content_node.appendChild(this.node);
      this.message.set_media(this);
      media_node = this.build_media();
      this.node.appendChild(media_node);
      this.build_zoomer();
      Media.item_loaded.dispatch(this);
      return this.node;
    };

    Media.prototype.build_zoomer = function() {
      var _this = this;
      this.zoomer = document.createElement('button');
      this.zoomer.className = 'zoomer';
      this.zoomer.innerHTML = '+';
      this.node.appendChild(this.zoomer);
      return this.zoomer.addEventListener('click', function() {
        if (_this.has_class('zoomed')) {
          _this.unzoom();
        } else {
          _this.zoom();
        }
        return _this.toggle_class('zoomed');
      });
    };

    Media.types = [];

    Media.add_type = function(type) {
      return this.types.push(type);
    };

    Media.match = function(url) {
      var type, _i, _len, _ref, _results;
      url = this.html_decode(url);
      _ref = this.types;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        type = _ref[_i];
        if (type.is_match(url)) _results.push(type);
      }
      return _results;
    };

    Media.build = function(url, message) {
      var media, medias;
      medias = this.match(url);
      if (medias.length === 0) return null;
      media = medias[0];
      media = new media(url, message);
      return media.start();
    };

    Media.item_loaded = new signals.Signal;

    Media.decode_node = document.createElement('div');

    Media.html_decode = function(html) {
      this.decode_node.innerHTML = html;
      return this.decode_node.innerHTML;
    };

    return Media;

  })(Node);

  ImageMedia = (function(_super) {

    __extends(ImageMedia, _super);

    function ImageMedia() {
      ImageMedia.__super__.constructor.apply(this, arguments);
    }

    ImageMedia.prototype.start = function() {
      var _this = this;
      this.img = new Image();
      this.img.src = this.url;
      if (this.img.loaded) return this.build();
      return this.img.addEventListener('load', function() {
        return _this.build();
      });
    };

    ImageMedia.prototype.build_media = function() {
      var _this = this;
      this.original_width = this.img.width;
      this.node.className += ' image';
      this.link_node = document.createElement('a');
      this.link_node.href = this.url;
      this.link_node.target = '_blank';
      this.link_node.appendChild(this.img);
      setTimeout((function() {
        var gcs;
        gcs = window.getComputedStyle(_this.img);
        _this.small_width = parseInt(gcs.width);
        return _this.unzoom();
      }), 1);
      return this.link_node;
    };

    ImageMedia.prototype.zoom = function() {
      this.zoomer.style.left = this.original_width - 20 + 'px';
      return this.zoomer.style.right = 'auto';
    };

    ImageMedia.prototype.unzoom = function() {
      var target_width;
      target_width = this.small_width > 20 ? this.small_width : 20;
      this.zoomer.style.left = this.small_width - 20 + 'px';
      return this.zoomer.style.right = 'auto';
    };

    ImageMedia.is_match = function(url) {
      return !!url.match(/\/[^\/]+\.(png|jpg|jpeg|gif)(\?.*)?$/i);
    };

    return ImageMedia;

  })(Media);

  Media.add_type(ImageMedia);

  YoutubeMedia = (function(_super) {

    __extends(YoutubeMedia, _super);

    function YoutubeMedia() {
      YoutubeMedia.__super__.constructor.apply(this, arguments);
    }

    YoutubeMedia.regex = /http:\/\/\w{0,3}.?youtube+\.\w{2,3}\/watch\?.*v=([\w-]{11})(\&.*)?/;

    YoutubeMedia.prototype.start = function() {
      return this.build();
    };

    YoutubeMedia.prototype.build_media = function() {
      var matches;
      this.node.className += ' youtube';
      matches = this.url.match(YoutubeMedia.regex);
      this.iframe = document.createElement('iframe');
      if (!matches) return this.iframe;
      this.video_id = matches[1];
      this.iframe.type = 'text/html';
      this.iframe.src = "http://www.youtube.com/embed/" + this.video_id + "?wmode=opaque";
      return this.iframe;
    };

    YoutubeMedia.prototype.zoom = function() {};

    YoutubeMedia.prototype.unzoom = function() {};

    YoutubeMedia.is_match = function(url) {
      return !!url.match(this.regex);
    };

    return YoutubeMedia;

  })(Media);

  Media.add_type(YoutubeMedia);

  store = require('store');

  App = (function() {

    function App() {
      var _this = this;
      this.node = document.body;
      this.socket = io.connect();
      this.socket.on('connect', function() {
        if (!_this.started) {
          _this.started = true;
          return _this.start();
        }
      });
    }

    App.prototype.start = function() {
      var _this = this;
      this.message_list = new MessageList(this.socket, this.get_options());
      this.entry_form = new EntryForm(this.socket, this.get_options().name);
      return this.socket.emit('create_session', this.get_options(), function(session) {
        _this.set_option('token', session.token);
        _this.set_option('color', session.color);
        _this.build();
        return _this.attach_signals();
      });
    };

    App.prototype.build = function() {
      this.node.appendChild(this.message_list.node);
      this.node.appendChild(this.entry_form.node);
      this.focus();
      this.entry_form.set_color(this.get_options().color);
      return this.entry_form.set_token(this.get_options().token);
    };

    App.prototype.attach_signals = function() {
      var _this = this;
      this.entry_form.message_submitted.add(function(text, extra_params) {
        var message;
        message = Message.build(text, _this.get_options(), _this.socket, extra_params);
        return message.send();
      });
      return this.entry_form.name_changed.add(function(name) {
        return _this.set_option('name', name);
      });
    };

    App.prototype.focus = function() {
      return this.entry_form.focus();
    };

    App.prototype.get_options = function() {
      if (this.options) return this.options;
      return this.options = {
        name: store.get('name'),
        color: store.get('color'),
        token: store.get('token')
      };
    };

    App.prototype.set_option = function(name, value) {
      store.set(name, value);
      return this.get_options()[name] = value;
    };

    App.start = function() {
      return global.app = new App;
    };

    return App;

  })();

  global = this;

  if (window.addEventListener) {
    addEventListener('DOMContentLoaded', App.start);
  } else {
    attachEvent('onload', App.start);
  }

  signals = require('signals');

  FilterPane = (function() {

    function FilterPane() {
      this.build();
      this.attach_events();
      this.filters = {};
    }

    FilterPane.prototype.build = function() {
      var fieldset, joinpart_field, joinpart_label, keyword_field, keyword_label, legend, mediaonly_field, mediaonly_label;
      this.node = document.createElement('div');
      this.node.id = 'filter_pane';
      fieldset = document.createElement('fieldset');
      this.node.appendChild(fieldset);
      legend = document.createElement('legend');
      legend.innerHTML = 'Filters';
      fieldset.appendChild(legend);
      keyword_field = document.createElement('div');
      keyword_field.className = 'field keyword';
      fieldset.appendChild(keyword_field);
      keyword_label = document.createElement('label');
      keyword_label.innerHTML = 'Keyword';
      keyword_label["for"] = 'keyword';
      keyword_field.appendChild(keyword_label);
      this.keyword = document.createElement('input');
      this.keyword.id = 'keyword';
      this.keyword.type = 'text';
      keyword_field.appendChild(this.keyword);
      joinpart_field = document.createElement('div');
      joinpart_field.className = 'field show_joinpart';
      fieldset.appendChild(joinpart_field);
      joinpart_label = document.createElement('label');
      joinpart_label.innerHTML = 'Show join / part messages';
      joinpart_label["for"] = 'show_joinpart';
      joinpart_field.appendChild(joinpart_label);
      this.show_joinpart = document.createElement('input');
      this.show_joinpart.id = 'show_joinpart';
      this.show_joinpart.value = true;
      this.show_joinpart.checked = false;
      this.show_joinpart.type = 'checkbox';
      joinpart_field.appendChild(this.show_joinpart);
      mediaonly_field = document.createElement('div');
      mediaonly_field.className = 'field mediaonly';
      fieldset.appendChild(mediaonly_field);
      mediaonly_label = document.createElement('label');
      mediaonly_label.innerHTML = 'With Media Only';
      mediaonly_label["for"] = 'mediaonly';
      mediaonly_field.appendChild(mediaonly_label);
      this.mediaonly = document.createElement('input');
      this.mediaonly.id = 'mediaonly';
      this.mediaonly.value = true;
      this.mediaonly.checked = false;
      this.mediaonly.type = 'checkbox';
      return mediaonly_field.appendChild(this.mediaonly);
    };

    FilterPane.prototype.attach_events = function() {
      var _this = this;
      this.show_joinpart.addEventListener('change', function() {
        return _this.set_option('show_joinpart', _this.show_joinpart.checked);
      });
      this.keyword.addEventListener('change', function() {
        var keywords;
        keywords = _this.keyword.value.split(/\s+/);
        if (keywords[0] === '') keywords = [];
        return _this.set_option('keywords', keywords);
      });
      return this.mediaonly.addEventListener('change', function() {
        return _this.set_option('mediaonly', _this.mediaonly.checked);
      });
    };

    FilterPane.prototype.change = function() {
      return this.changed.dispatch(this.get_filters());
    };

    FilterPane.prototype.get_filters = function() {
      return this.filters;
    };

    FilterPane.prototype.set_option = function(name, value) {
      this.filters[name] = value;
      return this.change();
    };

    FilterPane.prototype.changed = new signals.Signal;

    return FilterPane;

  })();

  signals = require('signals');

  Upload = (function() {

    function Upload(drop_target, socket) {
      this.socket = socket;
      this.drop_target = drop_target;
      this.build();
      this.attach_events();
      this.windowUrl = window.URL || window.webkitURL;
    }

    Upload.prototype.build = function() {
      this.node = document.createElement('div');
      this.node.className = 'uploader';
      this.name_node = document.createElement('p');
      this.name_node.className = 'name';
      this.size_node = document.createElement('p');
      this.size_node.className = 'size';
      this.preview_icon = new Image();
      this.preview_icon.className = 'preview_icon';
      this.node.appendChild(this.preview_icon);
      this.cancel_btn = document.createElement('button');
      this.cancel_btn.innerHTML = 'X';
      this.file_input = document.createElement('input');
      this.file_input.type = 'file';
      this.file_input.accept = 'image/*';
      this.file_input.multiple = '';
      this.select_button = document.createElement('div');
      this.select_button.id = 'upload_select_button';
      this.select_button_node = document.createElement('button');
      this.select_button_node.innerHTML = '...';
      this.select_button.appendChild(this.file_input);
      this.select_button.appendChild(this.select_button_node);
      this.select_button.className = 'select_file section';
      this.progress_bar = document.createElement('progress');
      this.progress_bar.setAttribute('min', 0);
      this.progress_bar.setAttribute('max', 100);
      this.progress_bar.setAttribute('value', 0);
      this.progress_bar.className = 'upload_progress_bar';
      this.node.appendChild(this.cancel_btn);
      this.node.appendChild(this.name_node);
      return this.node.appendChild(this.size_node);
    };

    Upload.prototype.attach_events = function() {
      var _this = this;
      this.drop_target.addEventListener('dragenter', function(e) {
        e.preventDefault();
        return e.stopPropagation();
      });
      this.drop_target.addEventListener('dragover', function(e) {
        e.preventDefault();
        return e.stopPropagation();
      });
      this.drop_target.addEventListener('drop', function(e) {
        var dt, file, files, uri;
        e.preventDefault();
        e.stopPropagation();
        dt = e.dataTransfer;
        files = dt.files;
        file = files[0];
        if (file) {
          return _this.set_selected_file(file);
        } else if ((uri = dt.getData('text/uri-list')) && typeof uri === 'string') {
          return _this.add_selected_uri(uri);
        }
      });
      this.cancel_btn.addEventListener('click', function(e) {
        return _this.clear();
      });
      this.select_button_node.addEventListener('click', function(e) {
        return _this.file_input.click();
      });
      return this.file_input.addEventListener('change', function(e) {
        var file;
        file = _this.file_input.files[0];
        if (!file) return false;
        return _this.set_selected_file(file);
      });
    };

    Upload.prototype.valid_file = function(file) {
      var valid_types;
      if (!(file != null)) return false;
      valid_types = ["image/jpg", "image/jpeg", "image/png", "image/gif"];
      if (valid_types.indexOf(file.type) === -1) return false;
      return true;
    };

    Upload.prototype.set_selected_file = function(file) {
      if (!this.valid_file(file)) return false;
      if (this.windowUrl) {
        this.preview_icon.src = this.windowUrl.createObjectURL(file);
      }
      this.selected_file = file;
      this.file_selected.dispatch(file);
      this.name_node.innerHTML = file.name;
      return this.size_node.innerHTML = (file.size / 1024).toFixed(2) + 'KB';
    };

    Upload.prototype.add_selected_uri = function(uri) {
      return this.uri_added.dispatch(uri);
    };

    Upload.prototype.set_token = function(token) {
      return this.token = token;
    };

    Upload.prototype.start = function() {
      this.progress_bar.style.display = 'block';
      return this.started.dispatch();
    };

    Upload.prototype.clear = function() {
      this.selected_file = null;
      this.progress_bar.value = 0;
      this.progress_bar.style.display = 'none';
      return this.cleared.dispatch();
    };

    Upload.prototype.upload = function() {
      var fd, xhr,
        _this = this;
      if (!this.selected_file) return false;
      fd = new FormData;
      fd.append('image', this.selected_file);
      xhr = new XMLHttpRequest;
      xhr.upload.addEventListener('progress', function(e) {
        var percent;
        percent = e.loaded / e.totalSize * 100;
        if (percent === 100) return _this.progress_bar.removeAttribute('value');
        return _this.progress_bar.setAttribute('value', percent);
      });
      xhr.addEventListener('load', function(e) {
        var response;
        _this.progress_bar.removeAttribute('value');
        if (xhr.status === 200) {
          response = JSON.parse(xhr.responseText);
          _this.completed.dispatch(response.path);
          return _this.clear();
        }
      });
      xhr.addEventListener('error', function(e) {
        return console.log('error', e);
      });
      xhr.addEventListener('abort', function(e) {
        return console.log('abort', e);
      });
      xhr.open('POST', '/upload');
      xhr.setRequestHeader('X-Upload-Length', this.selected_file.size);
      xhr.setRequestHeader('X-Token', this.token);
      xhr.send(fd);
      return this.start();
    };

    Upload.prototype.file_selected = new signals.Signal;

    Upload.prototype.uri_added = new signals.Signal;

    Upload.prototype.cleared = new signals.Signal;

    Upload.prototype.started = new signals.Signal;

    Upload.prototype.progress = new signals.Signal;

    Upload.prototype.completed = new signals.Signal;

    Upload.supported = function() {
      if (!XMLHttpRequest) return false;
      return !!((typeof FileList !== "undefined" && FileList !== null) && (typeof FormData !== "undefined" && FormData !== null) && ((new XMLHttpRequest).upload != null));
    };

    return Upload;

  })();

  signals = require('signals');

  EntryForm = (function() {

    function EntryForm(socket, name) {
      this.name = name || "Anonymous";
      this.socket = socket;
      this.build();
      this.attach_events();
    }

    EntryForm.prototype.build = function() {
      var _this = this;
      this.node = document.createElement('div');
      this.node.id = 'entry_form';
      this.name_section = document.createElement('div');
      this.name_section.className = 'name section';
      this.node.appendChild(this.name_section);
      this.name_input = document.createElement('input');
      this.name_input.type = 'text';
      this.name_input.value = this.name;
      this.name_section.appendChild(this.name_input);
      this.message_section = document.createElement('div');
      this.message_section.className = 'message section';
      this.node.appendChild(this.message_section);
      this.message_input = document.createElement('textarea');
      this.message_section.appendChild(this.message_input);
      this.send_section = document.createElement('div');
      this.send_section.className = 'send section';
      this.node.appendChild(this.send_section);
      this.send_button = document.createElement('button');
      this.send_button.innerHTML = 'Send';
      this.send_section.appendChild(this.send_button);
      if (Upload.supported()) {
        this.upload_section = document.createElement('div');
        this.upload_section.className = 'upload section';
        this.uploader = new Upload(document.body, this.socket);
        this.upload_section.appendChild(this.uploader.node);
        this.uploader.uri_added.add(function(uri) {
          return _this.message_input.value += uri;
        });
        this.message_section.appendChild(this.uploader.progress_bar);
        this.node.insertBefore(this.upload_section, this.message_section);
        this.select_file_section = this.uploader.select_button;
        this.node.insertBefore(this.select_file_section, this.send_section);
      }
      return this.node;
    };

    EntryForm.prototype.attach_events = function() {
      var _this = this;
      this.message_input.addEventListener('keypress', function(e) {
        if (e.keyCode !== 13 || e.shiftKey) return null;
        e.preventDefault();
        return _this.submit_message();
      });
      this.send_button.addEventListener('click', function() {
        return _this.submit_message();
      });
      this.name_input.addEventListener('keypress', function(e) {
        if (e.keyCode === 13) return _this.focus();
        return setTimeout((function() {
          return _this.change_name();
        }), 1);
      });
      this.name_input.addEventListener('change', function(e) {
        return _this.change_name();
      });
      if (this.uploader) {
        this.uploader.file_selected.add(function(file) {
          return _this.upload_section.className += ' selected';
        });
        this.uploader.cleared.add(function() {
          return _this.upload_section.className = _this.upload_section.className.split('selected').join('');
        });
        this.uploader.started.add(function() {
          return _this.disable();
        });
        return this.uploader.completed.add(function() {
          return _this.enable();
        });
      }
    };

    EntryForm.prototype.disable = function() {
      this.disabled = true;
      this.message_input.setAttribute('disabled', 'disabled');
      return this.send_button.setAttribute('disabled', 'disabled');
    };

    EntryForm.prototype.enable = function() {
      this.disabled = false;
      this.message_input.removeAttribute('disabled');
      return this.send_button.removeAttribute('disabled');
    };

    EntryForm.prototype.set_color = function(color) {
      this.color = color;
      return this.name_input.style.backgroundColor = "rgb(" + color[0] + ", " + color[1] + ", " + color[2] + ")";
    };

    EntryForm.prototype.set_token = function(token) {
      this.token = token;
      if (this.uploader) return this.uploader.set_token(token);
    };

    EntryForm.prototype.focus = function() {
      return this.message_input.focus();
    };

    EntryForm.prototype.submit_message = function() {
      var cb, has_upload_file, text, valid,
        _this = this;
      if (this.disabled) return null;
      text = this.message_input.value;
      has_upload_file = this.uploader && this.uploader.selected_file;
      valid = !!text.match(/[^\s]/);
      if (has_upload_file) {
        this.uploader.upload();
        cb = function(image_path) {
          _this.uploader.completed.remove(cb);
          return _this.perform_submit({
            image: image_path
          });
        };
        return this.uploader.completed.add(cb);
      } else if (valid) {
        return this.perform_submit();
      }
    };

    EntryForm.prototype.perform_submit = function(params) {
      this.message_submitted.dispatch(this.message_input.value, params);
      this.message_input.value = '';
      return this.focus();
    };

    EntryForm.prototype.change_name = function() {
      var text, valid;
      text = this.name_input.value;
      valid = !!text.match(/[^\s]/);
      if (valid) return this.name_changed.dispatch(this.name_input.value);
    };

    EntryForm.prototype.message_submitted = new signals.Signal;

    EntryForm.prototype.name_changed = new signals.Signal;

    return EntryForm;

  })();

  tinycon = require('tinycon/tinycon');

  MessageList = (function(_super) {

    __extends(MessageList, _super);

    MessageList.prototype.window_focused = null;

    function MessageList(socket, options) {
      this.filters_set = __bind(this.filters_set, this);      this.socket = socket;
      this.options = options;
      this.messages = [];
      this.messages_while_away = 0;
      this.window_focused = true;
      this.filter_pane = new FilterPane();
      this.build();
      this.attach_events();
    }

    MessageList.prototype.build = function() {
      var lost_message;
      this.node = document.createElement('div');
      this.node.id = 'message_list';
      this.scroll_node = document.createElement('div');
      this.scroll_node.className = 'scroller';
      this.list_node = document.createElement('ul');
      this.list_node.className = 'messages';
      this.scroll_node.appendChild(this.list_node);
      this.node.appendChild(this.scroll_node);
      this.node.appendChild(this.filter_pane.node);
      this.resize();
      this.lost_connection_node = document.createElement('li');
      this.lost_connection_node.className = 'lost_connection';
      this.lost_connection_node.appendChild(document.createElement('div'));
      lost_message = document.createElement('div');
      this.lost_connection_node.appendChild(lost_message);
      lost_message.innerHTML = 'Your connection was lost.';
      this.remember_line = document.createElement('div');
      this.remember_line.className = 'remember_line';
      this.remember_line.appendChild(document.createElement('div'));
      this.remember_line.appendChild(document.createElement('div'));
      this.remember_line.appendChild(document.createElement('div'));
      this.socket.emit('get_messages');
      return this.node;
    };

    MessageList.prototype.attach_events = function() {
      var _this = this;
      this.socket.on('messages', function(messages) {
        var message, _i, _len, _ref;
        _ref = messages.reverse();
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          message = _ref[_i];
          _this.add_message(message);
        }
        return _this.messages_added(messages);
      });
      this.socket.on('connect', function() {
        if (_this.lost_connection_node.parentNode) {
          return _this.list_node.removeChild(_this.lost_connection_node);
        }
      });
      this.socket.on('disconnect', function() {
        _this.list_node.appendChild(_this.lost_connection_node);
        return _this.scroll_bottom();
      });
      window.addEventListener('resize', function() {
        return _this.resize();
      });
      Media.item_loaded.add(function() {
        return _this.scroll_bottom();
      });
      this.filter_pane.changed.add(this.filters_set);
      if (this.is_hidden()) this.place_remember_line();
      return this.on_visibility_changed(function(e) {
        if (_this.is_hidden(e)) {
          return _this.blurred();
        } else {
          return _this.focused();
        }
      });
    };

    MessageList.prototype.place_remember_line = function() {
      this.list_node.appendChild(this.remember_line);
      return this.scroll_bottom;
    };

    MessageList.prototype.check_remember_line = function() {
      var gcs, node;
      if (!this.remember_line.parentNode) return null;
      node = this.remember_line;
      while (node = node.nextSibling) {
        gcs = window.getComputedStyle(node);
        if (gcs.display !== 'none') return null;
      }
      return this.list_node.removeChild(this.remember_line);
    };

    MessageList.prototype.is_hidden = function(e) {
      if (e && e.type === 'blur') {
        this.window_focused = false;
      } else if (e && e.type === 'focus') {
        this.window_focused = true;
      } else {
        if (this.visibility_support()) {
          this.window_focused = !document[this.visibility_support()];
        }
      }
      return !this.window_focused;
    };

    MessageList.prototype.visibility_support = function() {
      var impl, impls, _i, _len;
      impls = "hidden msHidden mozHidden webkitHidden".split(' ');
      for (_i = 0, _len = impls.length; _i < _len; _i++) {
        impl = impls[_i];
        if (document[impl] !== void 0) return impl;
      }
    };

    MessageList.prototype.on_visibility_changed = function(cb) {
      var event, event_map, impl;
      impl = this.visibility_support();
      event_map = {
        hidden: 'visibilitychange',
        msHidden: 'msvisibilitychange',
        mozHidden: 'mozvisibilitychange',
        webkitHidden: 'webkitvisibilitychange'
      };
      event = event_map[impl];
      if (event) return document.addEventListener(event, cb);
      window.addEventListener('focus', function() {
        var args;
        args = arguments;
        return setTimeout((function() {
          return cb.apply(null, args);
        }), 1);
      });
      return window.addEventListener('blur', function() {
        var args;
        args = arguments;
        return setTimeout((function() {
          return cb.apply(null, args);
        }), 1);
      });
    };

    MessageList.prototype.add_message = function(message) {
      message.user_name = this.options.name;
      message = new Message(message);
      this.messages[this.messages.length] = message;
      this.list_node.appendChild(message.build());
      message.filter(this.filter_pane.get_filters());
      return this.scroll_bottom();
    };

    MessageList.prototype.messages_added = function(messages) {
      if (this.is_hidden()) {
        this.messages_while_away += messages.length;
        return tinycon.setBubble(this.messages_while_away);
      }
    };

    MessageList.prototype.focused = function() {
      this.messages_while_away = 0;
      tinycon.setBubble(0);
      return this.check_remember_line();
    };

    MessageList.prototype.blurred = function() {
      return this.place_remember_line();
    };

    MessageList.prototype.resize = function() {
      this.node.style.height = window.innerHeight - 40 + 'px';
      return this.scroll_bottom();
    };

    MessageList.prototype.scroll_bottom = function() {
      return this.scroll_node.scrollTop = this.list_node.scrollHeight;
    };

    MessageList.prototype.filters_set = function(filters) {
      var _this = this;
      return setTimeout((function() {
        var message, _i, _len, _ref;
        if (filters.show_joinpart) {
          _this.add_class('show_joinpart');
        } else {
          _this.remove_class('show_joinpart');
        }
        if (filters.mediaonly) {
          _this.add_class('mediaonly');
        } else {
          _this.remove_class('mediaonly');
        }
        _ref = _this.messages;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          message = _ref[_i];
          message.filter(filters);
        }
        return _this.scroll_bottom();
      }), 1);
    };

    return MessageList;

  })(Node);

  Message = (function(_super) {

    __extends(Message, _super);

    Message.prototype.url_regex = /(http|ftp|https):\/\/[\w\-_]+(\.[\w\-_]+)+([\w\-\.\(\),@?^=%&amp;:/~\+#]*[\w\-\@?^=%&amp;/~\+#])?/g;

    Message.prototype.reference_regex = /\@(\w+)/;

    function Message(params, socket) {
      this.id = params.id;
      this.content = params.content;
      this.author_name = params.author_name;
      this.color = params.color;
      this.user_name = params.user_name;
      this.image = params.image;
      this.server_event = params.server_event;
      this.sent_at = params.sent_at ? new Date(params.sent_at) : new Date();
      this.socket = socket;
      this.media = null;
      if (this.user_name != null) {
        this.reference_regex = new RegExp("\@(" + this.user_name + ")");
      }
      this.reference = false;
      return this;
    }

    Message.prototype.attributes = function() {
      return {
        id: this.id,
        content: this.content,
        author_name: this.author_name,
        color: this.color,
        image: this.image,
        sent_at: this.sent_at
      };
    };

    Message.prototype.send = function() {
      this.socket.emit('message', this.attributes());
      return this;
    };

    Message.prototype.build_content = function() {
      var content, urls;
      urls = this.content.match(this.url_regex);
      content = this.handle_reference(this.content);
      if (urls) {
        content = this.content.replace(this.url_regex, "<a href='$&' target='_blank'>$&</a>", 'g');
        this.content_node.innerHTML = content;
      } else {
        this.content_node.innerHTML = this.content;
      }
      if (this.image) {
        return Media.build(this.image, this);
      } else if (urls) {
        return Media.build(urls[0], this);
      }
    };

    Message.prototype.build = function() {
      var style;
      this.node = document.createElement('li');
      this.node.className = 'message';
      this.author_node = document.createElement('p');
      this.author_node.className = 'author';
      this.author_node.innerHTML = this.author_name;
      if (this.color != null) {
        style = "rgb(" + this.color[0] + ", " + this.color[1] + ", " + this.color[2] + ")";
        this.author_node.style.backgroundColor = style;
      }
      this.node.appendChild(this.author_node);
      this.content_node = document.createElement('div');
      this.content_node.className = 'content';
      this.node.appendChild(this.content_node);
      this.build_content();
      this.time_node = document.createElement('div');
      this.time_node.className = 'time';
      this.time_wrapper = document.createElement('span');
      this.time_wrapper.className = 'time_wrapper';
      this.time_wrapper.appendChild(this.time_node);
      this.node.appendChild(this.time_wrapper);
      if (this.sent_at) this.time_node.innerHTML = this.format_date(this.sent_at);
      if (this.is_joinpart()) this.node.className += ' joinpart';
      if (this.reference) this.node.className += ' reference';
      return this.node;
    };

    Message.prototype.format_date = function(dt) {
      return dt = new Date(Date.parse(dt.toString())).toLocaleTimeString();
    };

    Message.prototype.is_filtered = function() {
      return this.node.style.display !== 'none';
    };

    Message.prototype.set_media = function(media) {
      this.media = media;
      if (this.has_media()) return this.node.className += ' media';
    };

    Message.prototype.handle_reference = function(content) {
      if (!(this.user_name != null)) return content;
      if (content.match(this.reference_regex)) this.reference = true;
      return content;
    };

    Message.prototype.hide = function() {
      return this.add_class('filtered');
    };

    Message.prototype.show = function() {
      return this.remove_class('filtered');
    };

    Message.prototype.is_joinpart = function() {
      return this.server_event;
    };

    Message.prototype.has_media = function() {
      return !!this.media;
    };

    Message.prototype.filter = function(filters) {
      var keyword, _i, _len, _ref;
      if (filters.keywords) {
        _ref = filters.keywords;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          keyword = _ref[_i];
          if (this.content.indexOf(keyword) === -1) return this.hide();
        }
      }
      return this.show();
    };

    Message.build = function(content, options, socket, extra_params) {
      var image;
      image = extra_params && extra_params.image ? extra_params.image : null;
      return new Message({
        content: content,
        author_name: options.name,
        color: options.color,
        image: image
      }, socket);
    };

    return Message;

  })(Node);

}).call(this);

});
require("/lib/client/js/client.js");
})();
