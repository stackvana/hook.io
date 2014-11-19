var request = require('hyperquest');
var dateFormat = require('dateformat');
var forms = require('mschema-forms');
var mustache = require('mustache');

module['exports'] = function view (opts, callback) {

  var params = opts.request.resource.params;

  var req = opts.request,
      res = opts.response
      result = opts;

  var $ = this.$;
  var run = params.run;
  $('title').html(req.params.username + "/" + req.params.hook);
  
  if (params.run) {

   if (result.headers && result.headers.code === 500) {
     return showForm(function(){
       $('.hookResult .message').html('Error executing Hook!');
       $('.hookResult .message').addClass('error');
       $('.hookResult .message').removeClass('success');
       var errors = JSON.parse(result.output.toString());
       errors.forEach(function(e){
         $('form input[name="' + e.property + '"]').addClass('error');
       });
       return callback(null, $.html());
     });
   }
  
   $('.hookOutput').html('<textarea cols="80" rows="10" class="hookOutput">' + result.output + '</textarea>');

   return callback(null, $.html());

  }


 var strParams = '';
 var ignoreParams = ['hook', 'subhook', 'username', 'format', 'run'];
 for (var p in params) {
   if (ignoreParams.indexOf(p) === -1) {
     strParams += ("&" + p + "=" + encodeURI(params[p]));
   }
 }

  $('.hookResult').remove();
  showForm(callback);
  function showForm (cb) {
    var formSchema = req.hook.mschema || {};

    formSchema.run = {
      "type": "string",
      "default": "true",
      "format": "hidden"
    };

    forms.generate({
      type: "generic",
      form: {
        legend: "Form",
        submit: "Submit",
        action: ""
      },
      schema: formSchema,
      }, function (err, result){
        $('.testForm').html(result);
        cb(null, $.html());
    });
    
  }

};