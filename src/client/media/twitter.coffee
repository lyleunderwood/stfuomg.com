jsonp = require 'dlite-jsonp'

class TwitterMedia extends Media
  @regex: /https?:\/\/\w{0,3}.?twitter+\.\w{2,3}\/.+\/status\/(\d{18})/

  has_zoomer: false

  start: ->
    @build()

  build_media: ->
    @node.className += ' twitter not_zoomable'

    matches = @url.match TwitterMedia.regex

    @container = document.createElement 'div'
    return @container if !matches

    @tweet_id = matches[1]

    jsonp "//api.twitter.com/1/statuses/oembed.json?id=#{@tweet_id}&include_entities=true&omit_script=true&callback=%3F", (res) =>
      @container.innerHTML = res.html
      Media.item_loaded.dispatch @

    @container

  zoom: ->

  unzoom: ->

  @is_match: (url)->
    !!url.match @regex


Media.add_type TwitterMedia