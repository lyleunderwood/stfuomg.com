EventEmitter = require('events').EventEmitter
IncomingForm = require('formidable').IncomingForm
knox = require 'knox'

aws_client = knox.createClient
  key: process.env.AWS_KEY
  secret: process.env.AWS_SECRET
  bucket: process.env.AWS_BUCKET

max_upload_size = 7 * 1024 * 1024

module.exports = class FileReceiver extends EventEmitter
  constructor: (request) ->
    @form = new IncomingForm()
    @upload_length = request.headers['x-upload-length']
    @token = request.headers['x-token']

    @bytes_completed = 0

    @form.onPart = (part) =>
      if !@valid_mime part.mime
        @stop_upload()
        return @emit 'error', message: "Bad file type: #{part.mime}", code: 406

      if new Number(@upload_length) > max_upload_size
        @stop_upload()
        return @emit 'error', message: "Upload larger than 7MB maximum", code: 413

      @emit 'start'

      filename = part.filename.replace /\s+/g, '-'

      @aws_req = aws_client.put filename,
        'Content-Type': part.mime
        'Content-Length': @upload_length

      @aws_req.on 'response', (response) =>
        @result_url = 'https://s3-us-west-1.amazonaws.com/omfgstfu-uploads/' + filename
        @emit 'end', @result_url

      part.on 'data', (chunk) =>
        @bytes_completed += chunk.length

        if @bytes_completed > max_upload_size
          @stop_upload()
          return @emit 'error', message: "Upload larger than 2MB maximum", code: 413

        @aws_req.write chunk

      part.on 'end', () =>
        @aws_req.end()

    @form.parse request, (error, fields, files) =>
      if error
        @emit 'error', error

  valid_mime: (mime) ->
    mime.match(/(image)|(audio)\//) != null

  get_token: ->
    @token

  stop_upload: ->
    console.log 'stopping upload'
    try
      throw new Error "Stopping file upload..."
    catch e
      console.log e

  @delete: (url, cb) ->
    parts = url.split '/'
    url = '/' + parts[parts.length - 1]

    aws_client.deleteFile url, (error, response) ->
      return cb error if error

      return cb response if response.statusCode isnt 204

      cb null, response
