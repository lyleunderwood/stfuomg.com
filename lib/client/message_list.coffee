class MessageList
  constructor: (socket, options) ->
    @socket = socket
    @options = options
    @messages = []

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

    return @node

  attach_events: ->
    @socket.on 'messages', (messages) =>
      @add_message message for message in messages.reverse()

    window.addEventListener 'resize', => @resize()

    Media.item_loaded.add => @scroll_bottom()

    @filter_pane.changed.add @filters_set

  add_message: (message) ->
    message.user_name = @options.name
    message = new Message(message)
    @messages.push message
    @list_node.appendChild message.build()
    message.filter @filter_pane.get_filters()
    @scroll_bottom()

  resize: ->
    @node.style.height = window.innerHeight - 40 + 'px'

    @scroll_bottom()

  scroll_bottom: ->
    gcs = global.getComputedStyle @list_node
    @scroll_node.scrollTop = parseInt gcs.height

  filters_set: (filters) =>
    setTimeout (=>
      message.filter filters for message in @messages
      @scroll_bottom()
    ), 1