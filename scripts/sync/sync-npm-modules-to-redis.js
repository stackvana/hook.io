// used to take a node_modules/ folder and return all first-level package names
// these names are then inserted into our redis to indicate they are installed
// the purpose of this package is to sync the DB to the actual state of the node_modules/ folder

var dir = "/Users/chroot/node_modules/";

var packages = require('../../lib/resources/packages');

var fs = require('fs');

var modules = fs.readdirSync(dir);

var i = 0;

function addModule () {

  if (modules.length === 0) {
    process.exit();
  }

  // setup a limit for testing
  /*
  i++;
  if(i > 1) {
    process.exit();
  }
  */

  var m = modules.pop();
  
  if (m.substr(0, 1) === ".") {
    return addModule();
  }
  try {
    var pkgPath = dir + m + '/package.json';
    //console.log(pkgPath);
    var pkg = JSON.parse(fs.readFileSync(pkgPath).toString());
  } catch (err) {
    
  }
  console.log(pkg.name, pkg.version);
  packages.setStatus('installed', pkg.name + '@' + pkg.version, function (err, res){
    if (err) {
      throw err;
    }
    addModule();
  })
  
}

addModule();
//console.log(modules)
