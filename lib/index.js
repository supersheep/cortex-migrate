var util = require('./util');
var async = require('async');
var semver = require('semver');
var path = require('path');

module.exports = Migrator;

function Migrator(workspace){
  this.workspace = workspace;
}

Migrator.prototype.decide = function(name, version, callback) {
  var self = this;
  async.parallel([
    function(done){
      util.getNpmPackage(name, version, done);
    },
    function(done){
      util.getCortexPackage(name, version, done);
    }
  ],function(err, results){
    var npmpkg = self.npmpkg = results[0];
    var ctxpkg = self.ctxpkg = results[1];

    if(npmpkg.error){
      console.log("npm package not exists, are you kidding?");
      return callback(false);
    }

    if(ctxpkg.error){
      return callback(true);
    }

    return callback(false);
  });
};

Migrator.prototype.migrate = function(name, version, done){
  var self = this;
  this.decide(name, version, function(shouldMigrate){
    if(!shouldMigrate){
      return done();
    }
    var npmpkg = self.npmpkg;
    var cloneDir = path.join(self.workspace, name);
    async.waterfall([
      function(done){
        util.getRepositoryFromPackage(npmpkg, done);
      },function(giturl){
        util.clone(giturl, cloneDir, done);
      }
    ], function(err){
      if(err){return done(err);}
      var dependencies = npmpkg.dependencies || {};
      var packageNotMigrated = [];
      async.map( Object.keys(dependencies), function(module_name, done){
        var version = dependencies[module_name];
        migrate(module_name, version, done);
      }, function(err){
        if(err){return done(err);}

        async.series([
          function(done){
            cortexInstall(dependencies, done);
          },
          function(done){
            util.cortexBuild();
          },
          function(done){
            util.cortexPublish(done);
          }
        ], done);
      });
    });
  });
}