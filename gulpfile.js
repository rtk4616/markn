var gulp = require('gulp');
var gutil = require('gulp-util');
var plumber = require('gulp-plumber');
var webpack = require('webpack');
ref = require('path'), join = ref.join, dirname = ref.dirname, basename = ref.basename, extname = ref.extname, relative = ref.relative, resolve = ref.resolve;
ref1 = require('fs'), readFileSync = ref1.readFileSync, writeFileSync = ref1.writeFileSync, mkdir = ref1.mkdir;
var packager = require('electron-packager');
var GitHub = require('github');
var spawn = require('child_process').spawn;
var Q = require('q');
var argv = require('yargs').argv;
var semver = require('semver');

var pkg = JSON.parse(readFileSync('package.json'));
var url = pkg.repository.url;
var owner = basename(dirname(url));
var repo = basename(pkg.repository.url, extname(url));
var electron = null;
var isWatch = false;

gulp.task('default', function() {
  return gulp.start('debug');
});

gulp.task('debug', ['build'], function() {
  return gulp.start('electron');
});

gulp.task('electron', function() {
  electron = spawn('../node_modules/electron-prebuilt/dist/Electron.app/Contents/MacOS/Electron', ['.'], {
    cwd: 'dist'
  });
  electron.stdout.on('data', function(data) {
    return console.log(data.toString('utf-8'));
  });
  electron.stderr.on('data', function(data) {
    return console.log(data.toString('utf-8'));
  });
  return electron.on('close', function(code) {
    return console.log('Electron done');
  });
});

gulp.task('build', ['copy', 'webpack']);

gulp.task('copy', function() {
  return gulp.src(['package.json', 'node_modules/chokidar/**/*'], {
    base: '.'
  }).pipe(gulp.dest('dist'));
});

gulp.task('webpack', function() {
  var w;
  w = function(arg, cb) {
    var entry, output;
    entry = arg.entry, output = arg.output;
    return webpack({
      watch: isWatch,
      entry: entry,
      output: {
        filename: output
      },
      module: {
        loaders: [
          {
            test: /\.js$/,
            loader: 'babel'
          }, {
            test: /\.jade$/,
            loader: 'jade'
          }, {
            test: /\.css$/,
            loader: 'css'
          }, {
            test: /\.styl$/,
            loader: 'css!stylus'
          }, {
            test: /\.woff2?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
            loader: 'url?minetype=application/font-woff'
          }, {
            test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
            loader: 'file'
          }, {
            test: /\.md$/,
            loader: 'raw-loader'
          }
        ]
      },
      resolve: {
        extensions: ['', '.js']
      },
      externals: [
        (function() {
          var IGNORE;
          IGNORE = ['fs', 'crash-reporter', 'app', 'menu', 'menu-item', 'browser-window', 'dialog', 'shell', 'ipc', 'chokidar'];
          return function(context, request, callback) {
            if (IGNORE.indexOf(request) >= 0) {
              return callback(null, "require('" + request + "')");
            }
            return callback();
          };
        })()
      ],
      stats: {
        colors: true
      }
    }, function(err, stats) {
      if (err != null) {
        throw new gutil.PluginError('webpack', err);
      }
      gutil.log('[webpack]', stats.toString());
      return typeof cb === "function" ? cb() : void 0;
    });
  };
  return w({
    entry: './src/renderer/index.js',
    output: './tmp/renderer.js'
  }, function(err) {
    return w({
      entry: './src/main/main.js',
      output: './dist/main.js'
    });
  });
});

gulp.task('publish', ['default'], function() {
  return Q.when('').then(function() {
    var d;
    d = Q.defer();
    mkdir('dist', d.resolve);
    return d.promise;
  }).then(function() {
    var json, release, releases, version;
    releases = ['major', 'minor', 'patch'];
    release = argv.r;
    if (releases.indexOf(release) < 0) {
      release = 'patch';
    }
    version = semver.inc(pkg.version, release);
    pkg.version = version;
    json = JSON.stringify(pkg, null, 2);
    return ['package.json', 'dist/package.json'].forEach(function(p) {
      return writeFileSync(p, json);
    });
  }).then(function() {
    return console.log('bump package.json');
  }).then(function() {
    var d, git;
    d = Q.defer();
    console.log("git commit package.json");
    git = spawn('git', ['commit', '-m', "Bump version to v" + pkg.version, 'package.json']);
    git.stdout.on('data', function(data) {
      return console.log(data.toString('utf8'));
    });
    git.stderr.on('data', function(data) {
      return console.log(data.toString('utf8'));
    });
    git.on('close', function(code) {
      return d.resolve();
    });
    return d.promise;
  }).then(function() {
    var d, git;
    d = Q.defer();
    console.log("git push");
    git = spawn('git', ['push']);
    git.stdout.on('data', function(data) {
      return console.log(data.toString('utf8'));
    });
    git.stderr.on('data', function(data) {
      return console.log(data.toString('utf8'));
    });
    git.on('close', function(code) {
      return d.resolve();
    });
    return d.promise;
  }).then(function() {
    var d;
    d = Q.defer();
    packager({
      dir: 'dist',
      name: pkg.name,
      platform: 'all',
      arch: 'all',
      version: '0.29.1',
      overwrite: true
    }, function(err, dirs) {
      if (err != null) {
        d.reject(err);
      }
      return d.resolve(dirs);
    });
    return d.promise;
  }).then(function(dirs) {
    var github;
    dirs = dirs.map(function(dir) {
      var name, zip;
      name = basename(dir);
      zip = name + ".zip";
      return {
        dir: dir,
        name: name,
        zip: zip
      };
    });
    github = new GitHub({
      version: "3.0.0",
      debug: true
    });
    github.authenticate({
      type: 'oauth',
      token: process.env.TOKEN
    });
    return Q.all(dirs.map(function(arg) {
      var d, name, zip;
      name = arg.name, zip = arg.zip;
      d = Q.defer();
      console.log("zip " + name + " to " + zip);
      zip = spawn('zip', [zip, '-r', name]);
      zip.stdout.on('data', function(data) {
        return console.log(data.toString('utf8'));
      });
      zip.stderr.on('data', function(data) {
        return console.log(data.toString('utf8'));
      });
      zip.on('close', function(code) {
        return d.resolve();
      });
      return d.promise;
    })).then(function() {
      var d;
      d = Q.defer();
      console.log('create new release');
      github.releases.createRelease({
        owner: owner,
        repo: repo,
        tag_name: "v" + pkg.version
      }, function(err, res) {
        if (err != null) {
          d.reject(err);
        }
        console.log(JSON.stringify(res, null, 2));
        return d.resolve(res.id);
      });
      return d.promise;
    }).then(function(id) {
      console.log("complete to create new release: " + id);
      return Q.all(dirs.map(function(arg) {
        var d, zip;
        zip = arg.zip;
        d = Q.defer();
        github.releases.uploadAsset({
          owner: owner,
          repo: repo,
          id: id,
          name: zip,
          filePath: zip
        }, function(err, res) {
          if (err != null) {
            d.reject(err);
          }
          console.log(JSON.stringify(res, null, 2));
          return d.resolve();
        });
        return d.promise;
      })).then(function() {
        return console.log('complete to upload');
      });
    });
  });
});
