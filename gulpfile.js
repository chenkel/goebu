"use strict";
var gulp = require('gulp');
var gutil = require('gulp-util');
var bower = require('bower');
var sass = require('gulp-sass');
var minifyCss = require('gulp-minify-css');
var rename = require('gulp-rename');
var plumber = require('gulp-plumber');
var sh = require('shelljs');

// Gulp plumber error handler
var onError = function (err) {
    console.log(err);
};

gulp.task('default', ['sassy']);

gulp.task('sassy', function () {
    return gulp.src('./scss/ionic.app.scss')
        .pipe(plumber({
            errorHandler: onError
        }))
        .pipe(sass({
            errLogToConsole: true
        }))
        .pipe(gulp.dest('./www/css/'))
        .pipe(minifyCss({
            keepSpecialComments: 0
        }))
        .pipe(rename({extname: '.min.css'}))
        .pipe(gulp.dest('./www/css/'));
});

gulp.task('watchSass', function () {

    gulp.watch('./scss/**/*.scss').on('change', function (file) {
        console.log('watchSass', file.path);
    });
    gulp.watch('./scss/**/*.scss', ['sassy']);
});

gulp.task('install', ['git-check'], function () {
    return bower.commands.install()
        .on('log', function (data) {
            gutil.log('bower', gutil.colors.cyan(data.id), data.message);
        });
});

gulp.task('git-check', function (done) {
    if (!sh.which('git')) {
        console.log(
            '  ' + gutil.colors.red('Git is not installed.'),
            '\n  Git, the version control system, is required to download Ionic.',
            '\n  Download git here:', gutil.colors.cyan('http://git-scm.com/downloads') + '.',
            '\n  Once git is installed, run \'' + gutil.colors.cyan('gulp install') + '\' again.'
        );
        process.exit(1);
    }
    done();
});
