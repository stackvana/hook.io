var r = require('request');

var workers =   [
   {
     "host": "0.0.0.0",
     "port": "10000"
   },
   {
     "host": "0.0.0.0",
     "port": "10001"
   },
   {
     "host": "0.0.0.0",
     "port": "10002"
   },
   {
     "host": "0.0.0.0",
     "port": "10003"
   },
   {
     "host": "0.0.0.0",
     "port": "10005"
   }
  ];

r({
  body: {
    secrets: {
      workers: workers
    }
  },
  method: "POST",
  json: true,
  url: "http://localhost:9999/_oys"
}, function (err, res, body){
  console.log(err, res, body)
})