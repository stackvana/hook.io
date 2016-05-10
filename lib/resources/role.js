var config = require('../../config');
var resource = require('resource');

var role = resource.define('role');

module['exports'] = role;

role.roles = {

  // "webadmin::login": {}, // TODO...maybe should just make users

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

  "files::upload" : {},
  "files::download" : {},
  "files::readFile" : {},
  "files::writeFile" : {},
  "files::removeFile" : {},
  "files::readdir" : {},
  "files::stat" : {},
  "files::createReadStream" : {},
  "files::createWriteStream" : {},

  "domain::create": {},
  "domain::get": {},
  "domain::find": {},
  "domain::update": {},
  "domain::destroy": {},
  
  "datastore::del": {},
  "datastore::get": {},
  "datastore::recent": {},
  "datastore::set": {},

  "env::read": {},
  "env::write": {},

  "keys::create": {},
  "keys::checkAccess": {},
  "keys::destroy": {},
  "keys::read": {}

};
