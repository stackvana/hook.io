var config = require('../../config');
var resource = require('resource');

var role = resource.define('role');

module['exports'] = role;

role.roles = {

  "webadmin::login": {}, // TODO...maybe should just make users

  "hook::run" : {},
  "hook::update" : {},
  "hook::create" : {},
  "hook::destroy" : {},
  "hook::logs::read" : {},
  "hook::logs::write" : {},
  
  "hook::source::read" : {},
  "hook::view::read" : {},
  "hook::presenter::read" : {},
  "hook::resource::read" : {},
  "hook::package::read" : {},

  "events::read" : {},
  "events::write" : {},

  "domain::create": {},
  "domain::destroy": {},
  
  "datastore::read": {},
  "datastore::write": {},

  "env::read": {},
  "env::write": {},

  "keys::create": {},
  "keys::destroy": {}
};
