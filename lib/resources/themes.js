var config = require('../../config');

module['exports'] = {
  "debug": {
    "theme": config.app.url + "/themes/debug/index.html",
    "presenter": config.app.url + "/themes/debug/index.js"
  },
  "simple": {
    "theme": config.app.url + "/themes/simple/index.html",
    "presenter": config.app.url + "/themes/simple/index.js"
  },
  "simple-form": {
    "theme": config.app.url + "/themes/simple-form/index.html",
    "presenter": config.app.url + "/themes/simple-form/index.js"
  },
  "form": {
    "theme": config.app.url + "/themes/form/index.html",
    "presenter": config.app.url + "/themes/form/index.js"
  },
  "none": {
    "theme": config.app.url + "/themes/none/index.html",
    "presenter": config.app.url + "/themes/none/index.js"
  },
  "custom": {
    "theme": "",
    "presenter": ""
  }
};
