class Upload
  constructor: (drop_target, socket) ->
    @socket = socket
    @drop_target = drop_target
    @build()
    @attach_events()

  build: ->
    @node = document.createElement 'div'
    @node.className = 'uploader'

    @name_node = document.createElement 'p'
    @name_node.className = 'name'

    @size_node = document.createElement 'p'
    @size_node.className = 'size'

    @cancel_btn = document.createElement 'button'
    @cancel_btn.innerHTML = 'X'

    @progress_bar = document.createElement 'div'
    @progress_bar.className = 'upload_progress_bar'

    @bar = document.createElement 'div'
    @bar.className = 'bar'

    @progress_bar.appendChild @bar

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

      @set_selected_file file

    @cancel_btn.addEventListener 'click', (e) =>
      @clear()

    @socket.on 'upload_started', =>
      @start()

    @socket.on 'upload_progress', (e) =>
      @bar.style.width = e.percent + '%'

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
    @selected_file = file
    @file_selected.dispatch(file)

    @name_node.innerHTML = file.name
    @size_node.innerHTML = file.size

  set_token: (token) ->
    @token = token

  start: ->
    @progress_bar.style.display = 'block'
    @started.dispatch()

  clear: ->
    @selected_file = null
    @bar.style.width = '0%'
    @progress_bar.style.display = 'none'
    @cleared.dispatch()

  upload: ->
    return false unless @selected_file

    fd = new FormData

    fd.append 'image', @selected_file

    xhr = new XMLHttpRequest

    xhr.upload.addEventListener 'progress', (e) ->
      console.log 'progress', e

    xhr.addEventListener 'load', (e) =>
      console.log 'load', e

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


  file_selected: new signals.Signal

  cleared: new signals.Signal

  started: new signals.Signal

  progress: new signals.Signal

  completed: new signals.Signal

  @supported: ->
    return false unless XMLHttpRequest
    !!(FileList && FormData && (new XMLHttpRequest).upload)