class VimeoMedia extends Media
  @regex: /https?:\/\/\w{0,3}.?vimeo+\.\w{2,3}\/(\d{5,15})(.*)?/

  start: ->
    @build()

  build_media: ->
    @node.className += ' vimeo'

    matches = @url.match VimeoMedia.regex

    @iframe = document.createElement 'iframe'
    return @iframe if !matches

    @video_id = matches[1]

    @iframe.type = 'text/html'
    @iframe.src = "http://player.vimeo.com/video/#{@video_id}"
    @iframe

  zoom: ->

  unzoom: ->

  @is_match: (url)->
    !!url.match @regex


Media.add_type VimeoMedia