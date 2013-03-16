class YoutubeMedia extends Media
  @regex: /https?:\/\/\w{0,3}.?youtube+\.\w{2,3}\/watch\?.*v=([\w-]{11})(\&.*)?/

  start: ->
    @build()

  build_media: ->
    @node.className += ' youtube'

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


#Media.add_type YoutubeMedia