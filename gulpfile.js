'use strict';

const gulp = require('gulp');
const plumber = require('gulp-plumber');
const stylus = require('gulp-stylus');
const cssnano = require('gulp-cssnano');
const gcmq = require('gulp-group-css-media-queries');
const sourcemaps = require('gulp-sourcemaps');
const jeet = require('jeet');
const rupture = require('rupture');
const koutoSwiss = require('kouto-swiss');
const prefixer = require('autoprefixer-stylus');
const rollup = require('gulp-rollup');
const uglify = require('gulp-uglify');
const pug = require('gulp-pug');
const data = require('gulp-data');
const yaml = require('js-yaml');
const imagemin = require('gulp-imagemin');
const browserSync = require('browser-sync');
const ghPages = require('gulp-gh-pages');
const sitespeedio = require('gulp-sitespeedio');
const plato = require('gulp-plato');
const rollupConfig = require('./rollup.config');
const eslintConfig = require('./.eslintrc');
const fs = require('fs');

const srcPaths = {
    js: 'src/js/main.js',
    css: 'src/styl/**/*.styl',
    mainStyl: 'src/styl/main.styl',
    pug: 'src/templates/**/!(_)*.pug',
    img: 'src/img/**/*',
    data: 'src/data/'
};

const buildPaths = {
    build: 'build/**/*',
    js: 'build/js/',
    css: 'build/css/',
    pug: 'build/',
    img: 'build/img',
    tests: {
        perf: 'tests/perf',
        complexity: 'tests/complexity'
    }
};

let dataJson = {}
let files = []

gulp.task('read:data', () => {
    fs.readdir(srcPaths.data, (err, items) => {
        for (var i = 0; i < items.length; i++) {
            files.push(items[i].split('.')[0]);
        }
        for (var i = 0; i < files.length; i++) {
            dataJson[files[i]] = yaml.safeLoad(fs.readFileSync(srcPaths.data + '/' + files[i] + '.yml', 'utf-8'));
        }
    });
});

gulp.task('css', () => {
    gulp.src(srcPaths.mainStyl)
        .pipe(plumber())
        .pipe(sourcemaps.init())
        .pipe(stylus({
            use: [koutoSwiss(), prefixer(), jeet(), rupture()],
            compress: true
        }))
        .pipe(gcmq())
        .pipe(cssnano())
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest(buildPaths.css));
});

gulp.task('js', () => {
    gulp.src(srcPaths.js)
        .pipe(plumber())
        .pipe(rollup(rollupConfig))
        .pipe(uglify())
        .pipe(gulp.dest(buildPaths.js));
});

gulp.task('pug', () => {
    gulp.src(srcPaths.pug)
        .pipe(plumber())
        .pipe(data(dataJson))
        .pipe(pug({
            pretty: false
        }))
        .pipe(gulp.dest(buildPaths.pug));
});

gulp.task('images', () => {
    gulp.src(srcPaths.img)
        .pipe(plumber())
        .pipe(imagemin({
            optimizationLevel: 3,
            progressive: true,
            interlaced: true
        }))
        .pipe(gulp.dest(buildPaths.img));
});

gulp.task('watch', () => {
    gulp.watch(srcPaths.pug, { debounceDelay: 300 }, ['pug']);
    gulp.watch(srcPaths.data + '**/*', { debounceDelay: 300 }, ['read:data', 'pug']);
    gulp.watch(srcPaths.css, ['css']);
    gulp.watch(srcPaths.js, ['js']);
    gulp.watch(srcPaths.img, ['images']);
});

gulp.task('browser-sync', () => {
    let files = [
        buildPaths.build
    ];

    browserSync.init(files, {
        server: {
            baseDir: './build/'
        },
    });
});

gulp.task('pages', () => {
    gulp.src([buildPaths.build, `!${buildPaths.build}.map`])
        .pipe(ghPages());
});

gulp.task('test:perf', sitespeedio({
    url: 'http://localhost:3000',
    resultBaseDir: buildPaths.tests.perf,
    suppressDomainFolder: true,
    html: true
}));

gulp.task('test:complexity', () => gulp.src(srcPaths.js)
    .pipe(plato(buildPaths.tests.complexity, {
        eslint: eslintConfig,
        complexity: {
            errorsOnly : false,
            cyclomatic : 3,
            halstead : 10,
            maintainability : 90,
            trycatch : true
        }
})));

gulp.task('default', ['css', 'pug', 'read:data', 'js', 'images', 'watch', 'browser-sync']);
gulp.task('test', ['browser-sync', 'test:perf', 'test:complexity']);
gulp.task('deploy', ['css', 'pug', 'read:data', 'js', 'images', 'pages']);
