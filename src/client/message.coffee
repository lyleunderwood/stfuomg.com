class Message extends Node
  url_regex: /(http|ftp|https):\/\/[\w\-_]+(\.[\w\-_]+)+([\w\-\.\(\),@?^=%&amp;:\/~\+#\!]*[\w\-\@?^=%&amp;\/~\+#\!])?/g

  reference_regex: /\@(\w+)/

  @stripper_node: null

  constructor: (params, socket) ->
    @id           = params.id
    @content      = params.content
    @author_name  = params.author_name
    @color        = params.color
    @user_name    = params.user_name
    @image        = params.image
    @server_event = params.server_event
    @sent_at      = if params.sent_at then new Date(params.sent_at) else new Date()
    @socket       = socket

    @media = null

    @reference_regex = new RegExp("\@(#{@user_name})") if @user_name?

    @reference = false

    return @

  attributes: ->
    return {
      id:          @id
      content:     @content
      author_name: @author_name
      color:       @color
      image:       @image
      sent_at:     @sent_at
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
    else
      @content_node.innerHTML = @content

    if @image
      Media.build @strip_html(@image), @
    else if urls
      Media.build @strip_html(urls[0]), @

  strip_html: (html) ->
    if !@stripper_node
      @stripper_node = document.createElement('div')
      @stripper_node.style.display= 'none';

    @stripper_node.innerHTML = html
    @stripper_node.innerText

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

    @time_node = document.createElement 'div'
    @time_node.className = 'time'
    @time_wrapper = document.createElement 'span'
    @time_wrapper.className = 'time_wrapper'
    @time_wrapper.appendChild @time_node
    @node.appendChild @time_wrapper
    @time_node.innerHTML = @format_date @sent_at if @sent_at

    @node.className += ' joinpart' if @is_joinpart()

    @node.className += ' reference' if @reference

    return @node

  format_date: (dt) ->
    dt = new Date(Date.parse(dt.toString())).toLocaleTimeString()

  is_filtered: ->
    @node.style.display isnt 'none'

  set_media: (media) ->
    @media = media
    @node.className += ' media' if @has_media()

  handle_reference: (content) ->
    return content if !@user_name?

    if content.match @reference_regex
      @reference = true

    content

  hide: ->
    @add_class 'filtered'

  show: ->
    @remove_class 'filtered'

  is_joinpart: ->
    @server_event

  has_media: ->
    !!@media

  filter: (filters) ->
    #return @hide() if !filters.show_joinpart and @is_joinpart()

    #return @hide() if filters.mediaonly and !@has_media()

    if filters.keywords
      return @hide() for keyword in filters.keywords when @content.indexOf(keyword) is -1

    @show()

  @build: (content, options, socket, extra_params) ->
    image = if extra_params && extra_params.image then extra_params.image else null

    return new Message({
      content:     content
      author_name: options.name
      color:       options.color
      image:       image
      }, socket)
