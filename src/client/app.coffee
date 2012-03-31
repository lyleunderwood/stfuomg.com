class App
  constructor: ->
    @node = document.body
    @socket = io.connect()

    @socket.on 'connect', =>
      if !@started
        @started = true

        @start()

  start: ->
    @message_list = new MessageList(@socket, @get_options())
    @entry_form   = new EntryForm(@socket, @get_options().name)

    @socket.emit 'create_session', @get_options(), (session) =>
      @set_option 'token', session.token
      @set_option 'color', session.color

      @build()
      @attach_signals()

  build: ->
    @node.appendChild @message_list.node
    @node.appendChild @entry_form.node
    @focus()
    @entry_form.set_color @get_options().color

  attach_signals: ->
    @entry_form.message_submitted.add (text, extra_params) =>
      message = Message.build text, @get_options(), @socket, extra_params
      message.send()

    @entry_form.name_changed.add (name) =>
      @set_option 'name', name

  focus: ->
    @entry_form.focus()

  get_options: ->
    return @options if @options

    @options = {
      name: store.get 'name'
      color: store.get 'color'
      token: store.get 'token'
    }

  set_option: (name, value) ->
    store.set name, value
    @get_options()[name] = value

  @start: ->
    global.app = new App

global = @

if window.addEventListener
  addEventListener 'DOMContentLoaded', App.start
else
  attachEvent 'onload', App.start