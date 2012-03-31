connect = require 'connect'
sio = require 'socket.io'
redis = require 'redis'
Message = require('./message').Message

redis_client = redis.createClient()

app = connect()
  .use(connect.logger 'dev')
  .use(connect.static 'lib/client')
  .listen 3001

io = sio.listen app

io.sockets.on 'connection', (socket) ->
  Message.all (error, messages) ->
    socket.emit 'messages', messages

  socket.on 'message', (data) ->
    data.author_ip = socket.handshake.address.address

    return if !data.content? || data.content.match /^\s*$/ != null

    message = new Message data

    message.save (error, id) ->
      console.log "New message ID: #{id}"

    io.sockets.emit 'messages', [message]

  socket.on 'create_session', (data, cb) ->
    cb
      token: data.token || create_session_token()
      color: data.color || create_color()

    socket.set 'options', data

    connection_message = new Message
      content:      data.name + " connected."
      author_name:  "Server"
      server_event: true

    io.sockets.emit 'messages', [connection_message]

    connection_message.save ->

  socket.on 'disconnect', ->
    socket.get 'options', (error, data) ->
      name = if data? and data.name? then data.name else 'Anonymous'

      disconnect_message = new Message
        content: "#{name} disconnected."
        author_name: 'Server'
        server_event: true

      io.sockets.emit 'messages', [disconnect_message]

      disconnect_message.save ->

create_color = ->
  parts = []
  for i in [0..2]
    parts.push Math.round(Math.random() * 155) + 100

  parts

create_session_token = ->
  chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  ret = ''

  for bit in [24...0]
    ret += chars[0x3F & (Math.floor(Math.random() * 0x100000000))]

  ret