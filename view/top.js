var forms = require('mschema-forms');
var config = require('../config');

var metric = require('../lib/resources/metric');
// TODO: add top running services / top hits report using sets and http://redis.io/commands/zrevrangebyscore methods
module['exports'] = function topPresenter (opts, callback) {
  var formSchema = {};
  formSchema.user = {
     "type": "string",
     "default": "bob"
   };

   formSchema.hits = {
      "type": "string",
      "default": "42"
    };

  var req = opts.req, res = opts.res, $ = this.$;
  var appName = req.hostname;
  if (req.session.user !== "marak") {
    return res.end('unauthorized');
  }
  metric.top('running', function(err, members){
    if (err) {
      return res.end(err.message);
    }
    $('.running').html(JSON.stringify(members, true , 2));
    // turn members into something useful
    var _sorted = [];
    
    while (members.length > 0) {
      var user = members.shift();
      var hits = members.shift();
      _sorted.push({ user: user, hits: hits});
    }

    formSchema.user.formatter = function (val) {
      return '<a href="' + config.app.url + '/' + val + '">' + val + '</a>';
    }
    forms.generate({
      type: "grid",
      form: {
        legend: 'Top Usage',
        submit: "Submit",
        action: ""
      },
      data: _sorted,
      schema: formSchema,
      }, function (err, result){
        $('.running').html(result);
        metric.top('hits', function(err, members){
           if (err) {
             return res.end(err.message);
           }
           //$('.hits').html(JSON.stringify(members, true , 2));
           var _sorted = [];
            while (members.length > 0) {
               var user = members.shift();
               var hits = members.shift();
               _sorted.push({ user: user, hits: hits});
             }
             formSchema.user.formatter = function (val) {
               return '<a target="_blank" href="' + config.app.url + '/' + val + '">' + val + '</a>';
             }
             forms.generate({
               type: "grid",
               name: 'hits-forms',
               form: {
                 legend: 'top form',
                 submit: "Submit",
                 action: ""
               },
               data: _sorted,
               schema: formSchema,
               }, function (err, result){
                 $('.hits').html(result);
                 callback(null, $.html());
             });
         });

    });
 
  });
};