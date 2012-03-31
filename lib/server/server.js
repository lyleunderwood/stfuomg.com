(function() {
  var Message, app, connect, create_color, create_session_token, io, redis, redis_client, sio;

  connect = require('connect');

  sio = require('socket.io');

  redis = require('redis');

  Message = require('./message').Message;

  redis_client = redis.createClient();

  app = connect().use(connect.logger('dev')).use(connect.static('lib/client')).listen(3001);

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
