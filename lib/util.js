var githuburl = require('githuburl');
var request = require('request');
var spawn = require('child_process').spawn;
var async = require('async');
var semver = require('semver');
var colors = require('colors');

function _fetchPackageFrom(host){
  return function(name, version, callback){
    var url = "http://" + host + "/" + name + '/' + version;
    console.log("GET".green, url);
    request(url, function(err, resp, body){
      var code = resp.statusCode;
      var color = code == 200 ? "green" : "red";
      console.log( ("" + code)[color], url);
      callback(null, JSON.parse(body));
    });
  }
}

function spawnCommand(command, callback){
  console.log("run".grey,command);
  var commands = command.split(" ");
  var proc = spawn(commands[0],commands.slice(1),{
    stdio: "inherit"
  });
  proc.on('exit',function(code){
    console.log('exit with code', code);
    if(code == 0){
      callback(null);
    }else{
      callback(new Error('fail to clone repository ' + repo));
    }
  });
}

exports.getNpmPackage = _fetchPackageFrom("registry.npmjs.org");

exports.getCortexPackage = _fetchPackageFrom('r.ctx.io');

exports.getRepositoryFromPackage = function(pkg, callback){
    if(pkg.repository && pkg.repository.url){
      callback(null, githuburl(pkg.repository.url).https_clone_url);
    }else{
      callback(null, "repository.url not specified, package: " + pkg.name);
    }
}

exports.clone = function(repo, dir, callback){
  spawnCommand(["git","clone",repo,dir].join(" "), callback);
}

exports.cortexInstall = function(dependencies, callback){
  dependencies = Object.keys(dependencies).map(function(name){
    return name + "@" + dependencies[name]
  });
  spawnCommand((["cortex","install"].concat(dependencies)).join(" "), callback);
}

exports.cortexBuild = function(callback){
  spawnCommand("cortex build",callback);
}

exports.cortexPublish = function(callback){
  spawnCommand("cortex publish",callback);
}