signals = require 'signals'

class Upload
  constructor: (drop_target, socket) ->
    @socket = socket
    @drop_target = drop_target
    @build()
    @attach_events()
    @windowUrl = window.URL || window.webkitURL

  build: ->
    @node = document.createElement 'div'
    @node.className = 'uploader'

    @name_node = document.createElement 'p'
    @name_node.className = 'name'

    @size_node = document.createElement 'p'
    @size_node.className = 'size'

    @preview_icon = new Image()
    @preview_icon.className = 'preview_icon'
    @node.appendChild @preview_icon

    @cancel_btn = document.createElement 'button'
    @cancel_btn.innerHTML = 'X'

    @file_input = document.createElement 'input'
    @file_input.type = 'file'
    @file_input.accept = 'image/*'
    @file_input.multiple = ''

    @select_button = document.createElement 'div'
    @select_button.id = 'upload_select_button'

    @select_button_node = document.createElement 'button'
    @select_button_node.innerHTML = '...'

    @select_button.appendChild @file_input
    @select_button.appendChild @select_button_node
    @select_button.className = 'select_file section'

    @progress_bar = document.createElement 'progress'
    @progress_bar.setAttribute 'min', 0
    @progress_bar.setAttribute 'max', 100
    @progress_bar.setAttribute 'value', 0
    @progress_bar.className = 'upload_progress_bar'

    @node.appendChild @cancel_btn
    @node.appendChild @name_node
    @node.appendChild @size_node

  attach_events: ->
    @drop_target.addEventListener 'dragenter', (e) =>
      e.preventDefault()
      e.stopPropagation()

    @drop_target.addEventListener 'dragover', (e) =>
      e.preventDefault()
      e.stopPropagation()

    @drop_target.addEventListener 'drop', (e) =>
      e.preventDefault()
      e.stopPropagation()

      dt = e.dataTransfer
      files = dt.files

      file = files[0]

      if file
        @set_selected_file file
      else if (uri = dt.getData('text/uri-list')) and typeof uri == 'string'
        @add_selected_uri uri

    @cancel_btn.addEventListener 'click', (e) =>
      @clear()

    @select_button_node.addEventListener 'click', (e) =>
      @file_input.click()

    @file_input.addEventListener 'change', (e) =>
      file = @file_input.files[0]
      return false unless file
      @set_selected_file file

  valid_file: (file) ->
    return false if !file?

    valid_types = [
      "image/jpg",
      "image/jpeg",
      "image/png",
      "image/gif"
    ]

    return false if valid_types.indexOf(file.type) is -1

    true

  set_selected_file: (file) ->
    return false unless @valid_file file

    @preview_icon.src = @windowUrl.createObjectURL file if @windowUrl

    @selected_file = file
    @file_selected.dispatch(file)

    @name_node.innerHTML = file.name
    @size_node.innerHTML = (file.size / 1024).toFixed(2) + 'KB'

  add_selected_uri: (uri) ->
    @uri_added.dispatch(uri)

  set_token: (token) ->
    @token = token

  start: ->
    @progress_bar.style.display = 'block'
    @started.dispatch()

  clear: ->
    @selected_file = null
    @progress_bar.value = 0
    @progress_bar.style.display = 'none'
    @cleared.dispatch()

  upload: ->
    return false unless @selected_file

    fd = new FormData

    fd.append 'image', @selected_file

    xhr = new XMLHttpRequest

    xhr.upload.addEventListener 'progress', (e) =>
      percent = e.loaded / e.totalSize * 100

      return @progress_bar.removeAttribute 'value' if percent is 100

      @progress_bar.setAttribute 'value', percent

    xhr.addEventListener 'load', (e) =>
      @progress_bar.removeAttribute 'value'

      if xhr.status == 200
        response = JSON.parse xhr.responseText
        @completed.dispatch response.path
        @clear()

    xhr.addEventListener 'error', (e) ->
      console.log 'error', e

    xhr.addEventListener 'abort', (e) ->
      console.log 'abort', e

    xhr.open 'POST', '/upload'
    xhr.setRequestHeader 'X-Upload-Length', @selected_file.size
    xhr.setRequestHeader 'X-Token', @token

    xhr.send fd

    @start()


  file_selected: new signals.Signal

  uri_added: new signals.Signal

  cleared: new signals.Signal

  started: new signals.Signal

  progress: new signals.Signal

  completed: new signals.Signal

  @supported: ->
    return false unless XMLHttpRequest
    !!(FileList? && FormData? && (new XMLHttpRequest).upload?)
