var util = require('./util');
var async = require('async');
var semver = require('semver');
var path = require('path');
var walker = require('commonjs-walker');

module.exports = Migrator;

function Migrator(workspace){
  this.workspace = workspace;
}


Migrator.prototype.decide = function(name, version, callback) {
  var self = this;

  if(version.match(/\.tar\.gz$/)){
    callback(callback(true));
  }

  var npm_name = util.isNative(name) ? (name + "-browserify") : name;

  util.getNpmPackage(npm_name, version, function(err, npmpkg){
    if(err){return callback(err);}
    self.npmpkg = npmpkg;

    if(npmpkg.error){
      console.log("    Npm package not exists, are you kidding?");
      return callback(false);
    }

    util.getCortexPackage(name, npmpkg.version, function(err, ctxpkg){
      if(err){return callback(err);}
      self.ctxpkg = ctxpkg;

      if(!ctxpkg.error){
        console.log("    Package found, skip.");
      }
      // if cortex package not exists, means need to migrate
      return callback(!!ctxpkg.error);
    });
  });
};

Migrator.prototype.migrate = function(name, version, done){
  var self = this;
  version = version || "latest";
  console.log(name + "@" + version + "\n");
  this.decide(name, version, function(shouldMigrate){
    if(!shouldMigrate){
      return done();
    }
    var npmpkg = self.npmpkg;
    version = npmpkg.version;
    var moduleDir = path.join(self.workspace, name, version);

    util.downloadNpmTarball(npmpkg, moduleDir, function(err){
      if(err){return done(err);}
      var dependencies = npmpkg.dependencies || {};
      var packageNotMigrated = [];

      var main = typeof npmpkg.browser == "string" ? npmpkg.browser : npmpkg.main ? npmpkg.main : "index.js";
      var main_file = require.resolve(path.join(moduleDir, "package", main));
      walker(main_file, walker.OPTIONS.BROWSER, function (err, nodes) {
        if(err){return done(err);}
        var module_names = Object.keys(nodes).filter(function(name){
          return nodes[name].foreign
        }).filter(function(name){
          return !util.isTarball(dependencies[name]);
        });

        module_names.length && console.log("    dependencies:\n" + module_names.map(function(name){return "        |-- " + name}).join("\n"));
        async.mapSeries(module_names, function(module_name, done){
          var version = dependencies[module_name] || "latest";
          console.log("\n");
          self.migrate(module_name, version, done);
        }, function(err){
          if(err){return done(err);}
          var cwd = process.cwd();

          async.series([
            function(done){
              process.chdir( path.join(moduleDir, "package") );
              done();
            },
            function(done){
              var deps = {};
              module_names.forEach(function(name){
                deps[name] = dependencies[name];
              })
              util.cortexInstall(deps, done);
            },
            function(done){
              util.cortexBuild(done);
            },
            function(done){
              util.cortexPublish(done);
            }
          ], done);
        });
      });
    });
  });
}