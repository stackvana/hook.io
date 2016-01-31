module['exports'] = function view (opts, callback) {
  var self = this, $ = self.$;
  if (opts.theme) {
    $('#theme').attr('value', opts.theme);
    var themes = opts.themes;
    Object.keys(themes).forEach(function(t,i){
      // attempt to set drop down box
      if(themes[t].theme === opts.theme) {
       $('.themeSelect').prepend('<option value="' + opts.them + '">' + t + '</option>');
      }
    });
  }
  if (opts.presenter) {
    $('#presenter').attr('value', opts.presenter);
  }
  callback(null, this.$.html());
};

module['exports'].useLayout = false;