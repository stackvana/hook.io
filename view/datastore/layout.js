module['exports'] = function get (opts, cb) {
  //console.log(this.parent.parent.layout.template)
  // TODO: fix issue with view package, should probably auto-load the parent
  //var $$ = this.$.load(this.parent.layout.template);
  //var $ = this.$.load(this.parent.parent.layout.template);
  //var $ = this.parent.$;
  var $ = this.$, req = opts.request;
  
  return cb(null, $.html());
  
  console.log('hi', this.parent.parent.layout.template)
  //$('body').html($$.html())
  
  // TODO: implement datastore root assignement based on API access key role granting...
  
  console.log('me', this.template)
  
  // TODO: view package should understand nested sub layouts with optional disabling / override behaviors
  
  // load the parent template into a new $$ context
  var $$ = this.$.load(this.parent.parent.layout.template);
  

  // in addition, we need to apply the parent layout presenter logic
  // TODO: this should be part of the view package
  var parentLayoutPresenter = this.parent.parent.layout.presenter;
  //console.log(parentLayoutPresenter.toString())
  parentLayoutPresenter.call(this, opts, function(err, result){
    // yield the current layout template into the parent template
    console.log('fudge', result)
    // don't show the datastore root information unless we are on a specific API method landing page
    
    $$('.yield').append(result);
    
    $$('.datastoreRoot .owner').html(req.session.user);
    if (req.session.user !== "anonymous") {
      $$('.anonymousLogin').remove();
    }
    if (req.url === "/datastore") {
      $$('.datastoreRoot').remove();
    }
    
    cb(null, $$.html());
  })
  
};
