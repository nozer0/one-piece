*******************************************************************************
       _____   __   _   _____        _____   _   _____   _____   _____         
      /  _  \ |  \ | | | ____|      |  _  \ | | | ____| /  ___| | ____|        
      | | | | |   \| | | |__        | |_| | | | | |__   | |     | |__          
      | | | | | |\   | |  __|       |  ___/ | | |  __|  | |     |  __|         
      | |_| | | | \  | | |___       | |     | | | |___  | |___  | |___         
      \_____/ |_|  \_| |_____|      |_|     |_| |_____| \_____| |_____|        
                                                                               
*******************************************************************************

One Piece
=========

Mass of separate web modules.
Collect pieces of small modules together to satisify different requirements, and with module loader itself, 
so call it as 'One Piece', actully, its also my favorite animation name ^_^

Module Loader
-------------

### Concepts ###

Module is a piece of codes which is offered privacy of their top scope, 
facility for importing singleton objects from other modules, and exporting their own APIs.
Please check [commonJS](http://wiki.commonjs.org/wiki/Modules/1.1.1) for details.

And for web client, it uses a wrapper function `define` to implement the feature. Something like

       define('hello', ['util/console'], function(require, exports, module) {
              var console = require('util/console');
              exports.hello = function (name) { console.info('hello ' + name); };
       });

### Status ###

Based on the different situations, one module can have 6 status at different time.

1. Uninitialized  
       This happens when some modules are first required by their parent module, 
       created by the parent module with 'uninitialized' status.

2. Loading  
       It's easy to understand from naming, the module is under loading currently.

3. Loaded & Failed  
       The module is loaded successfully or failed.

4. Interactive  
       All required children modules are ready, which means on the status of 'interactive' or 'complete'.
       But not be executed yet.

5. Complete  
       When a module tree is ready, it will run the codes from the root module first, 
       and when first `require` function called, the definition of related module is executed, 
       and set status to 'complete'.

### Recylic ###

About the module require cyclic situation, assume we have such javascript files.
a.js

       define(function (require, exports) {
              console.log('a starting');
              exports.done = false;
              var b = require('./b.js');
              console.log('in a, b.done = %j', b.done);
              exports.done = true;
              console.log('a done');
       });

b.js

       define(function (require, exports) {
              console.log('b starting');
              exports.done = false;
              var a = require('./a.js');
              console.log('in b, a.done = %j', a.done);
              exports.done = true;
              console.log('b done');
       });

main.js

       define(function (require, exports) {
              console.log('main starting');
              var a = require('./a.js');
              var b = require('./b.js');
              console.log('in main, a.done=%j, b.done=%j', a.done, b.done);
       });
       
We can get the output

       main starting
       a starting
       b starting
       in b, a.done = false
       b done
       in a, b.done = true
       a done
       in main, a.done=true, b.done=true

The same result as [nodejs](http://nodejs.org/api/modules.html)
