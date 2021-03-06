class TwitterMedia extends Media
  @regex: /http:\/\/\w{0,3}.?twitter+\.\w{2,3}\/.+\/status\/(\d{18})/

  start: ->
    @build()

  build_media: ->
    @node.className += ' twitter'

    matches = @url.match YoutubeMedia.regex

    @iframe = document.createElement 'iframe'
    return @iframe if !matches

    @video_id = matches[1]

    @iframe.type = 'text/html'
    @iframe.src = "http://www.youtube.com/embed/#{@video_id}?wmode=opaque"
    @iframe

  zoom: ->

  unzoom: ->

  @is_match: (url)->
    !!url.match @regex


Media.add_type TwitterMedia