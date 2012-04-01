(function() {
  var Message, app, aws_client, connect, create_color, create_session_token, formidable, fs, io, knox, move_file, move_uploaded_file, redis, redis_client, sio, upload_file, upload_middleware, util;

  connect = require('connect');

  sio = require('socket.io');

  redis = require('redis');

  Message = require('./message').Message;

  formidable = require('formidable');

  knox = require('knox');

  util = require('util');

  fs = require('fs');

  redis_client = redis.createClient();

  aws_client = knox.createClient({
    key: process.env.AWS_KEY,
    secret: process.env.AWS_SECRET,
    bucket: process.env.AWS_BUCKET
  });

  upload_middleware = function(req, res, next) {
    if (req.url === '/upload' && req.method.toLowerCase() === 'post') {
      return upload_file(req, res);
    } else {
      return next();
    }
  };

  app = connect().use(connect.logger('dev')).use(upload_middleware).use(connect.static('lib/client')).use(connect.static('images')).listen(process.env.PORT || 3001);

  upload_file = function(req, res) {
    var form, upload_length;
    form = new formidable.IncomingForm();
    upload_length = req.headers['x-upload-length'];
    form.onPart = function(part) {
      var aws_req, target_url;
      aws_req = aws_client.put(part.filename, {
        'Content-Type': part.mime,
        'Content-Length': upload_length
      });
      target_url = 'https://s3-us-west-1.amazonaws.com/omfgstfu-uploads/' + part.filename;
      aws_req.on('response', function(response) {
        res.writeHead(200, {
          'Content-Type': 'application/json'
        });
        res.write(JSON.stringify({
          path: target_url
        }));
        return res.end();
      });
      part.addListener('data', function(chunk) {
        return aws_req.write(chunk);
      });
      part.addListener('end', function() {
        return aws_req.end();
      });
      return form.handlePart(part);
    };
    return form.parse(req, function(error, fields, files) {});
  };

  move_uploaded_file = function(file, cb) {
    var dir;
    dir = __dirname + '/../../images';
    return fs.stat(dir, function(error, stats) {
      return fs.mkdir(dir, null, (function() {
        return move_file(file, cb);
      })(error ? void 0 : move_file(file, cb)));
    });
  };

  move_file = function(file, cb) {
    var path;
    path = __dirname + '/../../images/' + file.name;
    fs.rename(file.path, path);
    return cb(path);
  };

  io = sio.listen(app);

  io.sockets.on('connection', function(socket) {
    Message.all(function(error, messages) {
      return socket.emit('messages', messages);
    });
    socket.on('message', function(data) {
      var message;
      data.author_ip = socket.handshake.address.address;
      if (!(data.content != null) || data.content.match(/^\s*$/ !== null)) return;
      message = new Message(data);
      message.save(function(error, id) {
        return console.log("New message ID: " + id);
      });
      return io.sockets.emit('messages', [message]);
    });
    socket.on('create_session', function(data, cb) {
      var connection_message;
      cb({
        token: data.token || create_session_token(),
        color: data.color || create_color()
      });
      socket.set('options', data);
      connection_message = new Message({
        content: data.name + " connected.",
        author_name: "Server",
        server_event: true
      });
      io.sockets.emit('messages', [connection_message]);
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
        io.sockets.emit('messages', [disconnect_message]);
        return disconnect_message.save(function() {});
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
