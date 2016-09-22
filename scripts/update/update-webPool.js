var r = require('request');

var webPool = [{
    "host": "web0",
    "port": "11000"
  },
  {
    "host": "web0",
    "port": "11001"
  },
  {
    "host": "web0",
    "port": "11003"
  }];

var workerPool = [];

r({
  body: {
    secrets: {
      webPool: webPool
    }
  },
  method: "POST",
  json: true,
  url: "http://localhost:9999/_oys"
}, function (err, res, body){
  console.log(err, res, body)
})