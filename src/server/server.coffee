connect = require 'connect'
sio = require 'socket.io'
redis = require 'redis'
Message = require('./message').Message
formidable = require('formidable')
knox = require 'knox'
util = require 'util'
fs = require 'fs'

redis_client = redis.createClient()

console.log process.env.AWS_KEY

aws_client = knox.createClient
  key: process.env.AWS_KEY
  secret: process.env.AWS_SECRET
  bucket: process.env.AWS_BUCKET

upload_middleware = (req, res, next) ->
  if req.url is '/upload' && req.method.toLowerCase() is 'post'
    upload_file req, res
  else
    next()

app = connect()
  .use(connect.logger 'dev')
  .use(upload_middleware)
  .use(connect.static 'lib/client')
  .use(connect.static 'images')
  .listen process.env.PORT || 3001

upload_file = (req, res) ->
  form = new formidable.IncomingForm()
  upload_length = req.headers['x-upload-length']

  form.onPart = (part) ->
    aws_req = aws_client.put part.filename,
      'Content-Type': part.mime
      'Content-Length': upload_length

    target_url = 'https://s3-us-west-1.amazonaws.com/omfgstfu-uploads/' + part.filename

    aws_req.on 'response', (response) ->
      res.writeHead 200, 'Content-Type': 'application/json'
      res.write JSON.stringify
        path: target_url

      res.end()

    part.addListener 'data', (chunk) ->
      aws_req.write chunk
    part.addListener 'end', () ->
      aws_req.end()

    form.handlePart part

  form.parse req, (error, fields, files) ->

move_uploaded_file = (file, cb) ->
  dir = __dirname + '/../../images'
  fs.stat dir, (error, stats) ->

    fs.mkdir dir, null, (-> move_file file, cb) if error else move_file file, cb

move_file = (file, cb) ->
  path = __dirname + '/../../images/' + file.name
  fs.rename file.path, path
  cb path

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