var config = require('../../config');

module['exports'] = {
  "debug": {
    "theme": config.baseUrl + "/themes/debug/index.html",
    "presenter": config.baseUrl + "/themes/debug/index.js"
  },
  "simple": {
    "theme": config.baseUrl + "/themes/simple/index.html",
    "presenter": config.baseUrl + "/themes/simple/index.js"
  },
  "simple-form": {
    "theme": config.baseUrl + "/themes/simple-form/index.html",
    "presenter": config.baseUrl + "/themes/simple-form/index.js"
  },
  "form": {
    "theme": config.baseUrl + "/themes/form/index.html",
    "presenter": config.baseUrl + "/themes/form/index.js"
  },
  "none": {
    "theme": config.baseUrl + "/themes/none/index.html",
    "presenter": config.baseUrl + "/themes/none/index.js"
  },
  "custom": {
    "theme": "",
    "presenter": ""
  }
};
