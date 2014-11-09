/*

  install.js - installs npm dependencies from the ./modules.js file

*/

var npm = require("npm");
var modules = require('./modules');

var arr = Object.keys(modules);

npm.load({exit: false}, function (err) {
 if(err) throw err;
 iterate();
});

function iterate () {
  if (arr.length === 0) {
    process.exit();
  }
  var m = arr.pop();
  npm.commands.install([m + "@" + modules[m]], function (err, data) {
    if (err) throw err;
   iterate();
  });
};