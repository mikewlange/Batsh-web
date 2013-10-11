var fs = require('fs');
var child_process = require('child_process');
var net = require('net');
var path = require('path');

var batsh_srv_running = false;
var batshSrvPort = 8765;
var ensureBatshSrv = function(callback) {
  if (batsh_srv_running) {
    callback();
  } else {
    // FIXME not working
    callback();
    return;

    var callbackCalled = false;
    var cmd = path.join(__dirname, '..', 'backend', 'batsh_srv.native');
    console.log(cmd);
    var batshSrv = child_process.spawn(cmd);
    batshSrv.on('close', function(code) {
      batsh_srv_running = false;
    });
    batshSrv.stdout.setEncoding('utf8');
    batshSrv.stdout.on('data', function(data) {
      console.log(data);
      batsh_srv_running = true;
      if (!callbackCalled) {
        callbackCalled = true;
        callback();
      }
    });
    batshSrv.stderr.setEncoding('utf8');
    batshSrv.stderr.on('data', function(data) {
      console.error(data);
      if (!callbackCalled) {
        callbackCalled = true;
        callback();
      }
    });
  }
};
ensureBatshSrv(function(){});

exports.index = function(req, res) {
  res.render('index');
};

exports.compile = function(req, res) {
  var reportError = function(err) {
    res.json({
      err: err
    });
  };
  ensureBatshSrv(function(err) {
    if (err) return reportError(err);
    var request = JSON.stringify({
      target: req.body.target,
      code: req.body.code,
    });
    var client = new net.Socket();
    client.connect(batshSrvPort, function() {
      client.end(request);
    });
    client.on('error', function(err) {
      reportError(err.toString());
    });
    client.on('data', function(data) {
      client.destroy();
      res.json(JSON.parse(data.toString()));
    });
  });
};
