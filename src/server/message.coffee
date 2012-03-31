redis = require('redis').createClient()
sanitizer = require 'sanitizer'

module.exports.Message = class Message
  constructor: (params) ->

    filter_content = (content) ->
      return '' if !content? || content == ''

      content = sanitizer.escape content
      content.substr 0, 200

    filter_author = (author) ->
      return 'Anonymous' if !author? or author == ''

      author.substr 0, 16

    @id
    @content      = filter_content params.content
    @author_name  = filter_author params.author_name
    @author_ip    = params.author_ip
    @color        = params.color || null
    @image        = params.image || null
    @server_event = params.server_event || false

    return @

  save: (cb) ->
    redis.incr 'next_post_id', (error, id) =>
      throw error if error

      @id = id

      redis.multi()
        .set("Message:#{@id}:content",      @content)
        .set("Message:#{@id}:author_name",  @author_name)
        .set("Message:#{@id}:author_ip",    @author_ip)
        .set("Message:#{@id}:server_event", @server_event)
        .set("Message:#{@id}:image",        @image)
        .set("Message:#{@id}:color",        JSON.stringify @color)
        .lpush('messages', @id)
        .exec (error) =>
          throw error if error

          cb error, @id

    return @

  @get: (id, cb) ->
    message = new Message id: id

    redis.multi()
      .get "Message:#{id}:content",      (error, result) ->
        message.content = result
      .get "Message:#{id}:author_name",  (error, result) ->
        message.author_name = result
      .get "Message:#{id}:author_ip",    (error, result) ->
        message.author_ip = result
      .get "Message:#{id}:server_event", (error, result) ->
        message.server_event = result
      .get "Message:#{id}:image", (error, result) ->
        message.image = result
      .get "Message:#{id}:color",        (error, result) ->
        message.color = JSON.parse result
      .exec (error) ->
        throw error if error
        cb error, message

    null

  @all: (cb) ->
    messages = []

    redis.lrange 'messages', 0, 50, (error, results) =>
      throw error if error

      expected = results.length
      completed = 0

      for id in results
        @get id, (error, message) =>
          completed++

          throw error if error

          messages.push message

          cb(null, messages) if completed >= expected

    null