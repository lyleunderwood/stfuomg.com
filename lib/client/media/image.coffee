class ImageMedia extends Media

  start: ->
    @img = new Image()
    @img.src = @url

    return @build() if @img.loaded

    @img.addEventListener 'load', =>
      @build()

  build_media: ->
    @original_width = @img.width
    @node.className += ' image'

    @link_node = document.createElement 'a'
    @link_node.href = @url
    @link_node.target = '_blank'

    @link_node.appendChild @img

    @link_node

  zoom: ->
    @zoomer.style.left = @original_width - 20 + 'px'
    @zoomer.style.right = 'auto'

  unzoom: ->
    @zoomer.style.left = 'auto'
    @zoomer.style.right = 0

  @is_match: (url)->
    !!url.match /\/[^\/]+\.(png|jpg|jpeg|gif)(\?.*)?$/


Media.add_type ImageMedia
