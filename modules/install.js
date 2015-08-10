/* 
  THIS WILL OVERRIDE ALL LOCAL NPM LINKS ON PRODUCTION 
  Beware: resource / view / big / resource-http / etc
*/
var npm = require("npm");
var m = require('../lib/resources/modules');
var modules = require('./modules');
var fs = require("fs");
var colors = require('colors');

  var arr = Object.keys(modules);

  function _install () {

    if(arr.length === 0) {
      console.log('DONE'.blue);
      process.exit();
    }

    var p = arr.pop();
    m.install(p, function(err, r){
      if (err) {
        console.log('ERROR'.red, err.message, p);
        return;
      }
      console.log('INSTALLED'.green, p);
      _install();
    });
  };

_install();

return;
// legacy module installer code
npm.load({ exit: false }, function (err) {
 if (err) throw err;
 checkPackage();
});


function checkPackage () {
  if (arr.length === 0) {
    process.exit();
  }
  var m = arr.pop();
  if (isVersionInstalled(m, modules[m])) {
    // do not install if module@version is already installed
    console.log(('found ' + m + '@' + modules[m]).green);
    checkPackage();
  } else {
    // install version
    console.log(('missing ' + m + '@' + modules[m]).yellow);
    npm.commands.install([m + "@" + modules[m]], function (err, data) {
      if (err) throw err;
      console.log(('installed ' + m + '@' + modules[m]).blue);
      checkPackage();
    });
  }
};

//
// Checks local node_modules for package
// Returns boolean
function isVersionInstalled (m, v) {
  // console.log('checking version for', m, '@', v);
  var pkg, result = false;
  try {
    pkg = fs.readFileSync('./node_modules/' + m + '/package.json').toString();
    pkg = JSON.parse(pkg);
    // console.log(pkg.version)
    if (pkg.version === v) {
      result = true;
    }
  } catch (err) {
    result = false;
  }
  return result;
};