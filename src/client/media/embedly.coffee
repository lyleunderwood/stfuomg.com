request = require 'jsonp'

class EmbedlyMedia extends Media
  key: '5a26fc5f9b7545aaae79a11b6dce7d88'
  endpoint: 'http://api.embed.ly/1/preview'
  maxwidth: '300'
  maxheight: '150'

  has_zoomer: false

  start: ->
    @build()

  build_media: ->
    @node.className += ' embedly'

    @div = document.createElement 'div'

    @perform_request (data) =>
      @handle_type @div, data

    @div

  build_url: ->
    "#{@endpoint}?key=#{@key}&url=#{encodeURIComponent(@url)}" +
    "&maxwidth=#{@maxwidth}&maxheight=#{@maxheight}"

  perform_request: (cb) ->
    request @build_url(), {}, (nothing, data) =>
      cb(data)

  handle_type: (node, data) ->
    if data.object
      if data.object.html
        node.innerHTML = data.object.html
      else if data.object.type == 'photo'
        img_node = @build_thumb data
        link_node = document.createElement 'a'
        link_node.href = @url
        link_node.target = '_blank'
        link_node.appendChild img_node
        node.appendChild link_node
      else if data.type == 'html'
        if data.images
          thumb_node = @build_thumb data
          thumb_node.className = 'thumbnail'
          node.appendChild thumb_node

        title_node = document.createElement 'span'
        title_node.className = 'title'
        title_node.innerHTML = data.title

        description_node = document.createElement 'span'
        description_node.className = 'description'
        description_node.innerHTML = data.description

        node.appendChild title_node
        node.appendChild description_node

    Media.item_loaded.dispatch @

  build_thumb: (data) ->
    image = data.images[0]

    aspect_ratio = image.height / image.width
    if image.height > @maxheight
      height = @maxheight
      width = @maxheight / aspect_ratio
    else if image.width > @maxwidth
      width = @maxwidth
      height = @maxwidth * aspect_ratio
    else
      width = image.width
      height = image.height

    img = document.createElement 'img'
    img.src = image.url
    img.width = width
    img.height = height
    img.alt = data.title
    img.title = data.title

    img


  zoom: ->

  unzoom: ->

  @is_match: (url)->
    true


Media.add_type EmbedlyMedia