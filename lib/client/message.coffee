class Message
  url_regex: /(http|ftp|https):\/\/[\w\-_]+(\.[\w\-_]+)+([\w\-\.\(\),@?^=%&amp;:/~\+#]*[\w\-\@?^=%&amp;/~\+#])?/g

  reference_regex: /\@(\w+)/

  constructor: (params, socket) ->
    @id          = params.id
    @content     = params.content
    @author_name = params.author_name
    @color       = params.color
    @user_name   = params.user_name
    @socket      = socket

    @reference_regex = new RegExp("\@(#{@user_name})") if @user_name?

    @reference = false

    return @

  attributes: ->
    return {
      id:          @id
      content:     @content
      author_name: @author_name
      color:       @color
    }

  send: ->
    @socket.emit 'message', @.attributes()
    return @

  build_content: ->
    urls = @content.match @url_regex

    content = @handle_reference @content

    if urls
      content = @content.replace @url_regex, "<a href='$&' target='_blank'>$&</a>", 'g'
      @content_node.innerHTML = content
      Media.build urls[0], @
    else
      @content_node.innerHTML = @content

  build: ->
    @node = document.createElement 'li'
    @node.className = 'message'

    @author_node = document.createElement 'p'
    @author_node.className = 'author'
    @author_node.innerHTML = @author_name

    if @color?
      style = "rgb(#{@color[0]}, #{@color[1]}, #{@color[2]})"
      @author_node.style.backgroundColor = style

    @node.appendChild @author_node

    @content_node = document.createElement 'div'
    @content_node.className = 'content'
    @node.appendChild @content_node

    @build_content()

    @node.className += ' reference' if @reference

    return @node

  handle_reference: (content) ->
    return content if !@user_name?

    if content.match @reference_regex
      @reference = true

    content

  @build: (content, options, socket, extra_params) ->
    image = extra_params && extra_params.image ? extra_params.image : null
    return new Message({
      content:     content
      author_name: options.name
      color:       options.color
      image:       image
      }, socket)
