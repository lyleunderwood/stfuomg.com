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

    setTimeout (=>
      gcs = window.getComputedStyle @img
      @small_width = parseInt gcs.width
      @unzoom()
    ), 1

    @link_node

  zoom: ->
    #@zoomer.style.left = @original_width - 20 + 'px'
    #@zoomer.style.right = 'auto'

  unzoom: ->
    #target_width = if @small_width > 20 then @small_width else 20
    #@zoomer.style.left = @small_width - 20 + 'px'
    #@zoomer.style.right = 'auto'

  @is_match: (url)->
    !!url.match /\/[^\/]+\.(png|jpg|jpeg|gif)(\?.*)?$/i


Media.add_type ImageMedia
