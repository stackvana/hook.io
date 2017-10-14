var nodes = require('../../lib/resources/nodes');

nodes.rollingUpdate('pools.web', function (err, complete){
  console.log(err, complete);
});