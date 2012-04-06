EventEmitter = require('events').EventEmitter
IncomingForm = require('formidable').IncomingForm
knox = require 'knox'

aws_client = knox.createClient
  key: process.env.AWS_KEY
  secret: process.env.AWS_SECRET
  bucket: process.env.AWS_BUCKET

module.exports = class FileReceiver extends EventEmitter
  constructor: (request) ->
    @form = new IncomingForm()
    @upload_length = request.headers['x-upload-length']
    @token = request.headers['x-token']

    @bytes_completed = 0

    @form.onPart = (part) =>
      @emit 'start'

      @aws_req = aws_client.put part.filename,
        'Content-Type': part.mime
        'Content-Length': @upload_length

      @aws_req.on 'response', (response) =>
        @result_url = 'https://s3-us-west-1.amazonaws.com/omfgstfu-uploads/' + part.filename
        @emit 'end', @result_url

      part.on 'data', (chunk) =>
        @bytes_completed += chunk.length
        @aws_req.write chunk

      part.on 'end', () =>
        @aws_req.end()

    @form.parse request, (error, fields, files) =>
      if error
        @emit 'error', error

  get_token: ->
    @token

  @delete: (url, cb) ->
    parts = url.split '/'
    url = '/' + parts[parts.length - 1]

    aws_client.deleteFile url, (error, response) ->
      return cb error if error

      return cb response if response.statusCode isnt 204

      cb null, response
