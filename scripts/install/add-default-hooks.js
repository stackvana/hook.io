var hooks = require('hook.io-hooks');

var config = require('../../config');

var hookM = require('../../lib/resources/hook');

var colors = require('colors');


hookM.persist(config.couch);

var services = Object.keys(hooks.services);

function addHook () {
  
  if (services.length === 0) {
    console.log('done'.green);
    process.exit();
  }
  
  var h = services.pop();
  var hook = hooks.services[h];
  
  // add a new hook to the database
  var newHook = {
    name: h,
    owner: "marak",
    language: hook.language,
    description: hook.description,
    source: hook.source
  };

  hookM.find({ owner: "marak", name: h }, function (err, results) {
    if (err) {
      throw err;
    }

    if (results.length === 0) {
      hookM.create(newHook, function(err, res){
        if(err) {
          throw err;
        }
        console.log('blue'.blue, newHook);
        // iterate
        addHook();
      });
    } else {
      var _h = results[0];
      _h.source = newHook.source;
      _h.description = newHook.description;
      _h.language = newHook.language;
      console.log(_h)
      _h.save(function(){
        if(err) {
          throw err;
        }
        console.log('updated hook'.blue, newHook);
        
        addHook();
      });
    }
  });

}

addHook();