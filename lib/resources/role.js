var config = require('../../config');
var resource = require('resource');

var role = resource.define('role');

module['exports'] = role;

role.roles = {

  // "webadmin::login": {}, // TODO...maybe should just make users

  "hook::run" : {
    "description": "run any hook microservice"
  },
  "hook::update" : {
    "description": "update the properties or sources of any hook microservice"
  },
  "hook::create" : {
    "description": "create a new hook microservice"
  },
  "hook::destroy" : {
    "description": "destroy a hook microservice"
  },
  "hook::logs::read" : {
    "description": "read the logs"
  },
  "hook::logs::write" : {
    "description": "write to logs"
  },
  "hook::find": {
    "description": "search or list hooks"
  },
  "hook::source::read" : {
    "description": "read the source code for hook microservices"
  },
  "hook::view::read" : {
    "description": "read the View source code for hook microservices"
  },
  "hook::presenter::read" : {
    "description": "read the Presenter source code for hook microservices"
  },
  "hook::resource::read" : {
    "description": "read the database document for hook microservices"
  },
  "hook::package::read" : {
    "description": "read the package.json manifest for hook microservices"
  },
  "events::read" : {
    "description": "read from the system event log"
  },
  "events::write" : {
    "description": "write to the system event log"
  },
  "files::upload" : {
    "description": "upload a new cloud file"
  },
  "files::download" : {
    "description": "download a cloud file"
  },
  "files::readFile" : {
    "description": "read a cloud file"
  },
  "files::writeFile" : {
    "description": "write a new cloud file"
  },
  "files::removeFile" : {
    "description": "remove an existing cloud file"
  },
  "files::readdir" : {
    "description": "read a cloud directory"
  },
  "files::stat" : {
    "description": "perform a stat on a cloud file"
  },
  "files::createReadStream" : {
    "description": "create a new cloud read file stream"
  },
  "files::createWriteStream" : {
    "description": "create a new cloud write file stream"
  },
  "domain::create": {
    "description": "create a new domain or subdomain alias"
  },
  "domain::get": {
    "description": "get a domain or subdomain alias"
  },
  "domain::find": {
    "description": "search or list domain and subdomain aliases"
  },
  "domain::update": {
    "description": "update an existing domain or subdomain alias"
  },
  "domain::destroy": {
    "description": "destroy an existing domain or subdomain alias"
  },
  "datastore::del": {
    "description": "destroy a cloud datastore document"
  },
  "datastore::get": {
    "description": "get a cloud datastore document"
  },
  "datastore::recent": {
    "description": "get recent cloud datastore documents"
  },
  "datastore::set": {
    "description": "set a new cloud datastore document"
  },
  "env::read": {
    "description": "read environment variables"
  },
  "env::write": {
    "description": "write environment variables"
  },
  "keys::create": {
    "description": "create a new api key"
  },
  "keys::checkAccess": {
    "description": "determine if a key has valid role access for account"
  },
  "keys::destroy": {
    "description": "destroy api keys"
  },
  "keys::read": {
    "description": "read api keys"
  },
  "cron::create": {
    "description": "create a new cron job"
  },
  "cron::update": {
    "description": "update an existing cron job"
  },
  "cron::destroy": {
    "description": "destroy cron jobs"
  },
  "cron::read": {
    "description": "read cron jobs"
  },
  "cron::resource::read": {
    "description": "read the database document for cron services"
  }
  // TODO: keys::find

};
