var nodes = require('../../lib/resources/nodes');

nodes.rollingUpdate('pools.worker', function (err, complete){
  console.log(err, complete);
});