#!/usr/bin/env node
var fs = require('fs');
var Migrator = require('./lib/');

var migrator = new Migrator("/Users/spud/Product/neurons/temp-neurons");

var module = process.argv[2].split("@");

migrator.migrate(module[0], module[1] || "latest", function(err){
  if(err){
    console.log("ERR!".red, err.message);
  }else{
    console.log("\ndone!".green);
  }
});