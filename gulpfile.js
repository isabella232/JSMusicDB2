var gulp = require('gulp'),
	concat = require('gulp-concat'),
	uglify = require('gulp-uglify'),
	usemin = require('gulp-usemin'),
	ngmin = require('gulp-ngmin'),
	rev = require('gulp-rev'),
	minifyHtml = require('gulp-minify-html'),
	minifyCss = require('gulp-minify-css'),
	ngHtml2Js = require("gulp-ng-html2js"),
	imagemin = require('gulp-imagemin'),
	clean = require('gulp-clean');

// Store templates in javascript and add them to the template cache so Angular doesn't have to fetch them on demand.
gulp.task('template', function () {
	gulp.src('./templates/**/*').pipe(ngHtml2Js({
		moduleName: "jsmusicdb",
		prefix: 'templates/'
	}))
		.pipe(concat("templates.min.js"))
    	.pipe(uglify())
    	.pipe(gulp.dest("./dist/javascripts/templates"));
});

// Concat & Minify JS
gulp.task('minify', function() {
	gulp.src('./*.html')
    	.pipe(usemin({
      		css: [minifyCss(), 'concat'],
      		js: [rev()]
    	}))
    .pipe(gulp.dest('dist/'));
});
// copy files
gulp.task('cp', function () {
	gulp.src('./images/**/*').pipe(imagemin()).pipe(gulp.dest('./dist/images/'));
	gulp.src('./jsmusicdb/**/*').pipe(gulp.dest('./dist/jsmusicdb/'));
	gulp.src('./proxy/**/*').pipe(gulp.dest('./dist/proxy/'));
	gulp.src('./stylesheets/fonts/**/*').pipe(imagemin()).pipe(gulp.dest('./dist/stylesheets/fonts/'));
	gulp.src('./*.png').pipe(imagemin()).pipe(gulp.dest('./dist/'));
	gulp.src('./*.ico').pipe(gulp.dest('./dist/'));
	gulp.src('./browserconfig.xml').pipe(gulp.dest('./dist/'));
	gulp.src('./javascripts/angular/i18n/**/*').pipe(gulp.dest('./dist/javascripts/angular/i18n/'));
	gulp.src('./translations/**/*').pipe(gulp.dest('./dist/translations/'));
});

// clean folder
gulp.task('clean', function () {
	gulp.src('./dist/**/*', { read: false}).pipe(clean());
});

// Default
gulp.task('default', ['template', 'minify', 'cp']);