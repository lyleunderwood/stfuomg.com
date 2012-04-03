class Node

  add_class: (class_name) ->
    @node.className += ' ' + class_name

  remove_class: (class_name) ->
    @node.className = @node.className.split(class_name).join('')

  has_class: (class_name) ->
    !!(@node.className.indexOf(class_name) isnt -1)

  toggle_class: (class_name) ->
    if @has_class class_name
      @remove_class class_name
    else
      @add_class class_name

class Media extends Node
  constructor: (url, message) ->
    @url = Media.html_decode url
    @message = message

  build: ->
    @node = document.createElement 'div'
    @node.className = 'media'
    @message.content_node.appendChild @node
    @message.media = @

    media_node = @build_media()
    @node.appendChild media_node

    @build_zoomer()

    Media.item_loaded.dispatch @

    @node

  build_zoomer: ->
    @zoomer = document.createElement 'button'
    @zoomer.className = 'zoomer'
    @zoomer.innerHTML = '+'

    @node.appendChild @zoomer

    @zoomer.addEventListener 'click', =>
      if @has_class 'zoomed'
        @unzoom()
      else
        @zoom()

      @toggle_class 'zoomed'

  @types: []

  @add_type: (type) ->
    @types.push type

  @match: (url) ->
    url = @html_decode url
    type for type in @types when (type.is_match(url))

  @build: (url, message) ->
    medias = @match url
    return null if medias.length is 0

    media = medias[0]

    media = new media(url, message)

    media.start()

  @item_loaded: new signals.Signal

  @decode_node: document.createElement 'div'

  @html_decode: (html) ->
    @decode_node.innerHTML = html
    @decode_node.innerHTML