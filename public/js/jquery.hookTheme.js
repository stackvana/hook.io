$.fn.croneditor = function(opts) {

  var el = this;
  
};

// HTML Template for plugin
var tmpl = '<input type="text" id="cronString" name="cronString" value="* * * * *" size="80"/>\
<br/>\
<input type="button" value="Reset" id="clear"/>\
<br/>\
<!-- TODO: add back next estimated time -->\
<!-- <span>Will run next at:<em><span class="next"></span></em></span> -->\
<!-- the cron editor will be here -->\
<div id="tabs" class="tabs">\
  <ul>\
    <li><a href="#tabs-minute">Minute</a></li>\
    <li><a href="#tabs-hour">Hour</a></li>\
    <li><a href="#tabs-day">Day of Month</a></li>\
    <li><a href="#tabs-month">Month</a></li>\
    <li><a href="#tabs-week">Day of Week</a></li>\
  </ul>\
  <div id="tabs-minute">\
    <div class="tabs">\
      <ul>\
        <li id="button-minute-every"><a href="#tabs-minute-every">Every Minute</a></li>\
        <li id="button-minute-n"><a href="#tabs-minute-n">Every n minutes</a></li>\
        <li id="button-minute-each"><a href="#tabs-minute-each">Each Selected Minute</a></li>\
      </ul>\
      <div id="tabs-minute-every" class="preview">\
        <div>*</div>\
        <div>Every minute.</div>\
      </div>\
      <div id="tabs-minute-n">\
        <div class="preview"> Every 1 minutes</div>\
        <div class="slider"></div>\
      </div>\
      <div id="tabs-minute-each" class="preview">\
        <div>Each selected minute</div><br/>\
        <div class="tabs-minute-format"></div>\
      </div>\
    </div>\
  </div>\
  <div id="tabs-hour">\
    <div class="tabs">\
      <ul>\
        <li id="button-hour-every"><a href="#tabs-hour-every">Every Hour</a></li>\
        <li id="button-hour-n"><a href="#tabs-hour-n">Every n Hours</a></li>\
        <li id="button-hour-each"><a href="#tabs-hour-each">Each Selected Hour</a></li>\
      </ul>\
      <div id="tabs-hour-every" class="preview">\
        <div>*</div>\
        <div>Every hour</div>\
      </div>\
      <div id="tabs-hour-n">\
        <div class="preview">Every 1 hours</div>\
        <div class="slider"></div>\
      </div>\
      <div id="tabs-hour-each" class="preview">\
        <div>Each selected hour</div><br/>\
        <div class="tabs-hour-format"></div>\
      </div>\
    </div>\
  </div>\
  <div id="tabs-day">\
    <div class="tabs">\
      <ul>\
        <li id="button-day-every"><a href="#tabs-day-every">Every Day</a></li>\
        <li id="button-day-each"><a href="#tabs-day-each">Each Day</a></li>\
      </ul>\
      <div id="tabs-day-every" class="preview">\
        <div>*</div>\
        <div>Every Day</div>\
      </div>\
      <div id="tabs-day-each" class="preview">\
        <div>Each selected Day</div><br/>\
        <div class="tabs-day-format"></div>\
      </div>\
    </div>\
  </div>\
  <div id="tabs-month">\
    <div class="tabs">\
      <ul>\
        <li id="button-month-every"><a href="#tabs-month-every">Every Month</a></li>\
        <li id="button-month-each"><a href="#tabs-month-each">Each Month</a></li>\
      </ul>\
      <div id="tabs-month-every" class="preview">\
        <div>*</div>\
        <div>Every month</div>\
      </div>\
      <div id="tabs-month-each" class="preview">\
        <div>Each selected month</div><br/>\
        <div class="tabs-month-format"></div>\
      </div>\
    </div>\
  </div>\
  <div id="tabs-week">\
    <div class="tabs">\
      <ul>\
        <li id="button-week-every"><a href="#tabs-week-every">Every Week</a></li>\
        <li id="button-week-each"><a href="#tabs-week-each">Each Week</a></li>\
      </ul>\
      <div id="tabs-week-every" class="preview">\
        <div>*</div>\
        <div>Every Day</div>\
      </div>\
      <div id="tabs-week-each">\
        <div class="preview">Each selected Day</div><br/>\
        <div class="tabs-week-format"></div>\
      </div>\
    </div>\
  </div>\
</div>';