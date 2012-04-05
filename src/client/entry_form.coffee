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

    if Upload.supported()
      @upload_section = document.createElement 'div'
      @upload_section.className = 'upload section'

      @uploader = new Upload(document.body, @socket)
      @upload_section.appendChild @uploader.node

      @message_section.appendChild @uploader.progress_bar

      @node.insertBefore @upload_section, @message_section

    return @node

  attach_events: ->
    @message_input.addEventListener 'keypress', (e) =>
      return null if e.keyCode != 13 || e.shiftKey
      e.preventDefault()

      @submit_message()

    @send_button.addEventListener 'click', =>
      @submit_message()

    @name_input.addEventListener 'keypress', (e) =>
      return @focus() if e.keyCode is 13
      setTimeout (=> @change_name()), 1

    @name_input.addEventListener 'change', (e) =>
      @change_name()

    if @uploader
      @uploader.file_selected.add (file) =>
        @upload_section.className += ' selected'

      @uploader.cleared.add =>
        @upload_section.className = @upload_section.className.split('selected').join('')

      @uploader.started.add =>
        @disable()

      @uploader.completed.add =>
        @enable()

  disable: ->
    @disabled = true
    @message_input.setAttribute 'disabled', 'disabled'
    @send_button.setAttribute 'disabled', 'disabled'

  enable: ->
    @disabled = false
    @message_input.removeAttribute 'disabled'
    @send_button.removeAttribute 'disabled'

  set_color: (color) ->
    @color = color
    @name_input.style.backgroundColor = "rgb(#{color[0]}, #{color[1]}, #{color[2]})"

  set_token: (token) ->
    @token = token
    @uploader.set_token token if @uploader

  focus: ->
    @message_input.focus()

  submit_message: ->
    return null if @disabled

    text = @message_input.value

    has_upload_file = @uploader and @uploader.selected_file

    valid = !!text.match /[^\s]/

    if has_upload_file
      @uploader.upload()
      cb = (image_path) =>
        @uploader.completed.remove cb
        @perform_submit(image: image_path)

      @uploader.completed.add cb

    else if valid
      @perform_submit()

  perform_submit: (params) ->
    @message_submitted.dispatch(@message_input.value, params)

    @message_input.value = ''
    @focus()

  change_name: ->
    text = @name_input.value
    valid = !!text.match /[^\s]/
    @name_changed.dispatch(@name_input.value) if valid

  message_submitted: new signals.Signal

  name_changed: new signals.Signal