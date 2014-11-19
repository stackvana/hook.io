var gulp = require('gulp');
var rename = require('gulp-rename');
var mustache = require('gulp-mustache');

/* 
  task for generating modules view
*/
gulp.task('modules', function(cb) {
  var modules = require('../modules/modules');
  var html = '';
  Object.keys(modules).forEach(function(m){
    html += '<tr>\
      <td><a href="https://www.npmjs.org/package/' + m + '">' + m + '</a></td>\
      <td>' + modules[m] + '</td>\
    </tr>';
  });
  return gulp.src('../view/modules.html')
    .pipe(mustache({
       'modules': html
     }))
    .pipe(gulp.dest('../view'))
});

gulp.task('default', ['modules']);