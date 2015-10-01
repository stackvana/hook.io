module['exports'] = function i18nViewHelper (i, $) {
  // TODO: make into helper function
  $('.i18n').each(function(index, item){
    var el = $(item),
        tagType = el[0].name;
    switch (tagType) {
      case 'input':
        var v = $(item).attr('value');
        $(item).attr('value', i.__(v));
        var ph = $(item).attr('placeholder');
        $(item).attr('placeholder', i.__(ph));
        var t = $(item).attr('title');
        $(item).attr('title', i.__(t));
      break;
      default:
        var v = $(item).text();
        $(item).text(i.__(v));
      break;
    }
  });
};