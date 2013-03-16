class AudioMedia extends Media
  has_zoomer: false

  start: ->
    @build()

  build_media: ->
    @node.className += ' audio'

    @player = new AudioPlayer @url
    @node.appendChild @player.node

    #@audio_node = document.createElement 'audio'
    #@audio_node.src = @url
    #@fallback_node = document.createElement 'p'
    #@audio_node.appendChild @fallback_node
    #@audio_node.preload = 'metadata'

    @player.node

  @is_match: (url)->
    !!url.match /\/[^\/]+\.(mp3|aac|wav|mp2|ogg)(\?.*)?$/i


#Media.add_type AudioMedia
