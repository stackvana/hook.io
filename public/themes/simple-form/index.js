var request = require('hyperquest');
var dateFormat = require('dateformat');
var forms = require('mschema-forms');
var mustache = require('mustache');

module['exports'] = function view (opts, callback) {

  var params = opts.request.resource.params;

  var req = opts.request,
      res = opts.response,
      service = opts.service,
      result = opts;

  var $ = this.$;
  var run = params.run;
  $('title').html(service.owner + "/" + service.name);
  $('.hookTitle').html(service.name + ' hook');
  
  var gist = opts.gist || params.gist;
  $('.gistEmbed').html('<script src="' + gist + '.js"></script>');

  if (result.output !== null) {

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

  }

  showForm(callback);
  function showForm (cb) {
    var formSchema = service.mschema || {};

    for (var p in formSchema) {
      if(typeof params[p] !== 'undefined') {
        formSchema[p].default = params[p];
      }
    }

    formSchema.run = {
      "type": "string",
      "default": "true",
      "format": "hidden"
    };

    formSchema.theme = {
      "type": "string",
      "format": "hidden",
      "default": params.theme
    };

    forms.generate({
      type: "generic",
      form: {
        legend: 'hook input',
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