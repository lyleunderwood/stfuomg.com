(function() {
  var FileReceiver, Message, app, connect, create_color, create_session_token, fs, gzip, pruning, sio, token_to_socket, two_days, upload_middleware, util;

  connect = require('connect');

  gzip = require('gzippo');

  sio = require('socket.io');

  Message = require('./message').Message;

  FileReceiver = require('./file_receiver');

  util = require('util');

  fs = require('fs');

  token_to_socket = {};

  pruning = false;

  upload_middleware = function(req, res, next) {
    var receiver, socket;
    if (req.url === '/upload' && req.method.toLowerCase() === 'post') {
      receiver = new FileReceiver(req);
      socket = token_to_socket[receiver.get_token()];
      receiver.on('end', function(image_url) {
        res.writeHead(200, {
          'Content-Type': 'application/json'
        });
        res.write(JSON.stringify({
          path: image_url
        }));
        return res.end();
      });
      return receiver.on('error', function(error) {
        res.writeHead(error.code || 406, {
          'Content-Type': 'application/json'
        });
        return res.write(JSON.stringify(error));
      });
    } else {
      return next();
    }
  };

  two_days = 2 * 24 * 60 * 60 * 1000;

  app = connect().use(gzip.compress()).use(connect.logger('dev')).use(upload_middleware).use(connect.static(__dirname + '/../client', {
    maxAge: two_days
  })).listen(process.env['app_port'] || 3001, function() {
    var io;
    io = sio.listen(this);
    return io.sockets.on('connection', function(socket) {
      socket.on('get_messages', function(params) {
        return Message.all(params, function(error, messages) {
          return socket.emit('messages', messages);
        });
      });
      socket.on('message', function(data) {
        var message;
        data.author_ip = socket.handshake.address.address;
        if (!(data.content != null) || data.content.match(/^\s*$/ !== null)) {
          return;
        }
        message = new Message(data);
        message.save(function(error, id) {
          console.log("New message ID: " + id);
          return process.nextTick(function() {
            if (pruning) return null;
            pruning = true;
            return Message.prune(function(error, images_to_delete) {
              var image, _i, _len, _results;
              pruning = false;
              if (error) return console.log('failed to prune', error);
              if (!images_to_delete) return null;
              _results = [];
              for (_i = 0, _len = images_to_delete.length; _i < _len; _i++) {
                image = images_to_delete[_i];
                _results.push(FileReceiver["delete"](image, function(error, result) {
                  if (error) {
                    console.log("failed to delete " + image + ", " + error.statusCode);
                  }
                  return console.log('successfully deleted', image);
                }));
              }
              return _results;
            });
          });
        });
        return io.sockets.emit('messages', [message]);
      });
      socket.on('create_session', function(data, cb) {
        var connection_message, token;
        token = data.token || create_session_token();
        cb({
          token: token,
          color: data.color || create_color()
        });
        token_to_socket[token] = socket;
        socket.set('options', data);
        connection_message = new Message({
          content: (data.name || 'Anonymous') + " connected.",
          author_name: "Server",
          server_event: true
        });
        socket.broadcast.emit('messages', [connection_message]);
        return connection_message.save(function() {});
      });
      return socket.on('disconnect', function() {
        return socket.get('options', function(error, data) {
          var disconnect_message, name;
          name = (data != null) && (data.name != null) ? data.name : 'Anonymous';
          disconnect_message = new Message({
            content: "" + name + " disconnected.",
            author_name: 'Server',
            server_event: true
          });
          socket.broadcast.emit('messages', [disconnect_message]);
          return disconnect_message.save(function() {});
        });
      });
    });
  });

  create_color = function() {
    var i, parts;
    parts = [];
    for (i = 0; i <= 2; i++) {
      parts.push(Math.round(Math.random() * 155) + 100);
    }
    return parts;
  };

  create_session_token = function() {
    var bit, chars, ret;
    chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    ret = '';
    for (bit = 24; bit > 0; bit--) {
      ret += chars[0x3F & (Math.floor(Math.random() * 0x100000000))];
    }
    return ret;
  };

}).call(this);
