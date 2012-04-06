redis = require('redis').createClient(process.env.REDIS_PORT, process.env.REDIS_HOST)
sanitizer = require 'sanitizer'

redis.auth(process.env.REDIS_PASS)

module.exports.Message = class Message
  @max_messages: 50

  constructor: (params) ->

    filter_content = (content) ->
      return '' if !content? || content == ''

      content = sanitizer.escape content
      content.substr 0, 200

    filter_author = (author) ->
      return 'Anonymous' if !author? or author == ''

      author.substr 0, 16

    @id           = params.id if params.id
    @content      = filter_content params.content
    @author_name  = filter_author params.author_name
    @author_ip    = params.author_ip
    @color        = params.color || null
    @image        = params.image || ''
    @server_event = params.server_event || ''

    @persisted = false

    return @

  save: (cb) ->
    redis.incr 'next_post_id', (error, id) =>
      throw error if error

      @id = id unless @id

      operation = redis.multi()
        .set("Message:#{@id}:content",      @content)
        .set("Message:#{@id}:author_name",  @author_name)
        .set("Message:#{@id}:author_ip",    @author_ip)
        .set("Message:#{@id}:server_event", @server_event)
        .set("Message:#{@id}:image",        @image)
        .set("Message:#{@id}:color",        JSON.stringify @color)
        .lpush('messages', @id)

      operation.incr('message_count') unless @persisted

      operation.exec (error) =>
        throw error if error

        @persisted = true
        cb error, @id

    return @

  delete: (cb) ->
    redis.multi()
      .del("Message:#{@id}:content")
      .del("Message:#{@id}:author_name")
      .del("Message:#{@id}:author_ip")
      .del("Message:#{@id}:server_event")
      .del("Message:#{@id}:image")
      .del("Message:#{@id}:color")
      .lrem('messages', 1, @id)
      .decr('message_count')
      .exec (error) =>
        throw error if error

        @persisted = false
        cb error, @

  @delete: (id, cb) ->
    redis.multi()
      .del("Message:#{id}:content")
      .del("Message:#{id}:author_name")
      .del("Message:#{id}:author_ip")
      .del("Message:#{id}:server_event")
      .del("Message:#{id}:image")
      .del("Message:#{id}:color")
      .lrem('messages', 1, id)
      .decr('message_count')
      .exec (error) =>
        throw error if error
        cb null, id


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

        @persisted = true
        cb error, message

    null

  @all: (params, cb) ->
    params = params || {}
    messages = []

    redis.lrange 'messages', 0, Message.max_messages, (error, results) =>
      throw error if error

      if params.since? and (idx = results.indexOf params.since + '') isnt -1
        results.splice idx, results.length - idx + 1

      expected = results.length
      completed = 0

      for id in results
        @get id, (error, message) =>
          completed++

          throw error if error

          messages.push message

          cb(null, messages) if completed >= expected

    null

  @prune: (cb) ->
    redis.get 'message_count', (error, count) ->
      return cb error if error

      return cb null, null if count <= Message.max_messages

      amount_to_remove = count - Message.max_messages

      redis.lrange 'messages', amount_to_remove * -1, -1, (error, results) ->
        return cb error if error

        cb error, null if results.length is 0

        expected = results.length
        completed = 0

        images_to_delete = []
        for id in results
          Message.get id, (error, message) ->
            return cb error if error

            images_to_delete.push message.image if message.image

            message.delete (error, id) ->
              return cb error if error

              completed++

              cb null, images_to_delete if completed >= expected

    null