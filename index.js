#!/usr/bin/env node
var fs = require('fs');
var spawn = require('child_process').spawn;
var Migrator = require('./lib/');

var migrator = new Migrator("/Users/spud/Product/neurons/temp-neurons");
migrator.migrate("socket.io-client","latest", function(){
  console.log("wulala!",arguments);
});