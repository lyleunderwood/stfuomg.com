class MessageList extends Node
  window_focused: null

  constructor: (socket, options) ->
    @socket = socket
    @options = options
    @messages = []

    @window_focused = true

    @filter_pane = new FilterPane()

    @build()
    @attach_events()

  build: ->
    @node = document.createElement 'div'
    @node.id = 'message_list'

    @scroll_node = document.createElement 'div'
    @scroll_node.className = 'scroller'

    @list_node = document.createElement 'ul'
    @list_node.className = 'messages'

    @scroll_node.appendChild @list_node
    @node.appendChild @scroll_node

    @node.appendChild @filter_pane.node

    @resize()

    @lost_connection_node = document.createElement 'li'
    @lost_connection_node.className = 'lost_connection'
    @lost_connection_node.appendChild document.createElement 'div'
    lost_message = document.createElement 'div'
    @lost_connection_node.appendChild lost_message
    lost_message.innerHTML = 'Your connection was lost.'

    @socket.emit 'get_messages'

    return @node

  attach_events: ->
    @socket.on 'messages', (messages) =>
      console.log messages
      @add_message message for message in messages.reverse()

    @socket.on 'connect', =>
      @list_node.removeChild @lost_connection_node if @lost_connection_node.parentNode

    @socket.on 'disconnect', =>
      @list_node.appendChild @lost_connection_node
      @scroll_bottom()

    window.addEventListener 'resize', => @resize()

    Media.item_loaded.add => @scroll_bottom()

    @filter_pane.changed.add @filters_set

    window.addEventListener 'focus', =>
      @window_focused = true

    window.addEventListener 'blur', =>
      @window_focused = false

    @remember_line = document.createElement 'div'
    @remember_line.className = 'remember_line'

    @remember_line.appendChild document.createElement 'div'
    @remember_line.appendChild document.createElement 'div'

    @place_remember_line() if @is_hidden()

    @on_visibility_changed (e) =>
      if @is_hidden()
        @place_remember_line()
      else
        @check_remember_line()

  place_remember_line: ->
    @list_node.appendChild @remember_line
    @scroll_bottom

  check_remember_line: ->
    return null unless @remember_line.parentNode
    # this is kind of crazy. if any of @remember_lines next siblings are
    # displayed then it means there are new unfiltered messages since the last
    # time the page was viewed.
    node = @remember_line
    while node = node.nextSibling
      gcs = window.getComputedStyle node
      return null if gcs.display isnt 'none'

    @list_node.removeChild @remember_line

  is_hidden: ->
    ((@visibility_support() and document[@visibility_support()]) or !@window_focused) or (!@visibility_support() and !@window_focused)

  visibility_support: ->
    impls = "hidden msHidden mozHidden webkitHidden".split ' '
    return impl for impl in impls when document[impl] isnt undefined

  on_visibility_changed: (cb) ->
    impl = @visibility_support()
    event_map =
      hidden: 'visibilitychange'
      msHidden: 'msvisibilitychange'
      mozHidden: 'mozvisibilitychange'
      webkitHidden: 'webkitvisibilitychange'

    event = event_map[impl]

    document.addEventListener event, cb if event

    window.addEventListener 'focus', (-> setTimeout cb, 1)
    window.addEventListener 'blur', (-> setTimeout cb, 1)

  add_message: (message) ->
    message.user_name = @options.name
    message = new Message(message)
    @messages[@messages.length] = message
    @list_node.appendChild message.build()
    message.filter @filter_pane.get_filters()
    @scroll_bottom()

  resize: ->
    @node.style.height = window.innerHeight - 40 + 'px'

    @scroll_bottom()

  scroll_bottom: ->
    @scroll_node.scrollTop = @list_node.scrollHeight

  filters_set: (filters) =>
    setTimeout (=>

      if filters.show_joinpart
        @add_class 'show_joinpart'
      else
        @remove_class 'show_joinpart'

      if filters.mediaonly
        @add_class 'mediaonly'
      else
        @remove_class 'mediaonly'

      message.filter filters for message in @messages
      @scroll_bottom()
    ), 1