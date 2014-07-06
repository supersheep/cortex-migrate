var request = require('request');
var spawn = require('child_process').spawn;
var async = require('async');
var semver = require('semver');
var colors = require('colors');
var temp = require('temp');
var mkdirp = require('mkdirp');
var path = require('path');
var fs = require('fs');
var nativeModules = ["http","util","net","buffer","stream","vm","tty"];
temp.track();

function _fetchPackageFrom(host){
  return function(name, version, callback){
    var url = "http://" + host + "/" + name + '/' + version;
    console.log("    GET".green, url);
    request(url, function(err, resp, body){
      var code = resp.statusCode;
      callback(null, JSON.parse(body));
    });
  }
}

function spawnCommand(command, callback){
  console.log("run".grey,command);
  var commands = command.split(" ");
  var options = {
    stdio: "inherit"
  };
  var proc = spawn(commands[0],commands.slice(1),options);
  proc.on('exit',function(code){
    if(code == 0){
      callback(null);
    }else{
      console.log("cwd:",process.cwd());
      callback(new Error('Error: Fail to run command \`' + command + '\`'));
    }
  });
}

exports.getNpmPackage = _fetchPackageFrom("registry.npmjs.org");

exports.getCortexPackage = _fetchPackageFrom('r.ctx.io');


exports.isNative = function(name){
  return nativeModules.indexOf(name) !== -1;
}

exports.nativeName = function(name){
  if(name.match("-browserify")){
    name = name.split("-browserify")[0];
  }

  if(exports.isNative(name)){
    return name
  }else{
    return false;
  }
}

exports.isTarball = function(version){
  return !!version.match(/\.tar\.gz$/);
}

exports.resolveVersion = function(version){
  if(version.match("github.com")){
    return version.match(/\/v(.*)\.tar\.gz$/)[1];
  }else{
    return version;
  }
}

exports.downloadNpmTarball = function(pkg, dir, callback){
  var tarball = require('tarball-extract');
  // if(fs.existsSync(dir)){
  //   return callback(null);
  // }
  mkdirp(dir, function(err){
    if(err){return callback(err);}
    var tempfile = temp.path({suffix: pkg.name + ".tar.gz"});
    tarball.extractTarballDownload(pkg.dist.tarball , tempfile, dir, {}, function(err, result) {
      if(err){return callback(err);}

      var nativeName = exports.nativeName(pkg.name);

      if(nativeName){
        var pkgpath = path.join(dir,"package","package.json");
        var pkgcontent = fs.readFileSync(pkgpath,'utf8');
        var pkgjson = JSON.parse(pkgcontent);
        pkgjson.name = nativeName;
        fs.writeFileSync(pkgpath, JSON.stringify(pkgjson,null,4));
      }
      temp.cleanup(callback);
    });
  });
}

exports.cortexInstall = function(dependencies, callback){
  dependencies = Object.keys(dependencies).map(function(name){
    return name + "@" + dependencies[name]
  });
  spawnCommand((["cortex","install"].concat(dependencies).concat(["--save"]).join(" ")), callback);
}

exports.cortexBuild = function(callback){
  spawnCommand("cortex build",callback);
}

exports.cortexPublish = function(callback){
  spawnCommand("cortex publish",callback);
}