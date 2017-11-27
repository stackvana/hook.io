var request = require('hyperquest');
var dateFormat = require('dateformat');
var forms = require('mschema-forms');

module['exports'] = function view (opts, callback) {

  var params = opts.request.resource.params;

  var req = opts.request,
      res = opts.response,
      service = opts.service,
      result = opts;

  var $ = this.$;
  var run = params.run;
  //$('title').html(req.params.owner + "/" + req.params.hook);
  
  
//  $('.themeSelector').append('<option>' + req.hook.theme + '</option>')
  
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

   // return callback(null, $.html());

  }


 var strParams = '';
 var ignoreParams = ['hook', 'subhook', 'username', 'format', 'run'];
 for (var p in params) {
   if (ignoreParams.indexOf(p) === -1) {
     strParams += ("&" + p + "=" + encodeURI(params[p]));
   }
 }

 // $('.forkButton').attr('data-url', 'https://hook.io/' + req.hook.owner + "/" + req.hook.name + "?fork=true");

  // $('.hookResult').remove();
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

    formSchema.format = {
      "type": "string",
      "default": "friendly",
      "enum": ["raw", "friendly"]
    };

    formSchema.theme = {
      "type": "string",
      "format": "hidden",
      "default": params.theme
    };


    var themeSelect = '<form class="themeForm" action="" method="GET">\
    Switch Theme: <select class="themeSelector" name="theme">\
      <option value="simple-form">simple-form</option>\
      <option value="">custom</option>\
      <option value="debug">debug</option>\
      <option value="form">form</option>\
      <option value="none">none</option>\
    </select></form>';
    

    forms.generate({
      type: "generic",
      form: {
        legend: service.name + ' form',
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