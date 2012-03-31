class EntryForm
  constructor: (socket, name) ->
    @name = name || "Anonymous"
    @socket = socket
    @build()
    @attach_events()

  build: ->
    @node = document.createElement 'div'
    @node.id = 'entry_form'

    @name_section = document.createElement 'div'
    @name_section.className = 'name section'

    @node.appendChild @name_section

    @name_input = document.createElement 'input'
    @name_input.type = 'text'
    @name_input.value = @name

    @name_section.appendChild @name_input

    @message_section = document.createElement 'div'
    @message_section.className = 'message section'

    @node.appendChild @message_section

    @message_input = document.createElement 'textarea'

    @message_section.appendChild @message_input

    @send_section = document.createElement 'div'
    @send_section.className = 'send section'

    @node.appendChild @send_section

    @send_button = document.createElement 'button'
    @send_button.innerHTML = 'Send'

    @send_section.appendChild @send_button

    return @node

  attach_events: ->
    @message_input.addEventListener 'keypress', (e) =>
      return null if e.charCode != 13 || e.shiftKey
      e.preventDefault()

      @submit_message()

    @send_button.addEventListener 'click', =>
      @submit_message()

    @name_input.addEventListener 'keypress', (e) =>
      return @focus() if e.charCode is 13
      setTimeout (=> @change_name()), 1

    @name_input.addEventListener 'change', (e) =>
      @change_name()

  set_color: (color) ->
    @color = color
    @name_input.style.backgroundColor = "rgb(#{color[0]}, #{color[1]}, #{color[2]})"

  focus: ->
    @message_input.focus()

  submit_message: ->
    text = @message_input.value
    valid = !!text.match /[^\s]/
    @message_submitted.dispatch(@message_input.value) if valid

    @message_input.value = ''
    @focus()

  change_name: ->
    text = @name_input.value
    valid = !!text.match /[^\s]/
    @name_changed.dispatch(@name_input.value) if valid

  message_submitted: new signals.Signal

  name_changed: new signals.Signal