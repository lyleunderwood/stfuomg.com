class AudioPlayer
  src: null
  node: null
  play_btn: null
  sound: null

  @sound_counter: 0

  constructor: (src) ->
    @set_src src

    @build()

  set_src: (src) ->
    @src = src
    @build_sound() if src

  build: ->
    @node = document.createElement 'div'
    @node.className = 'audio_player stop'

    @play_btn = document.createElement 'button'
    @play_btn.innerHTML = 'play'
    @play_btn.className = 'play_btn'
    @node.appendChild @play_btn

    @play_btn.addEventListener 'click', =>
      @play()

    @stop_btn = document.createElement 'button'
    @stop_btn.innerHTML = 'stop'
    @stop_btn.className = 'stop_btn'
    @node.appendChild @stop_btn

    @stop_btn.addEventListener 'click', =>
      @stop()

    @progress_bar = document.createElement 'progress'
    @progress_bar.setAttribute 'max', 1
    @progress_bar.setAttribute 'value', 0
    @node.appendChild @progress_bar

    @node

  build_sound: ->
    if !soundManager.enabled
      return soundManager.onready =>
        @build_sound()

    @sound = soundManager.createSound
      id: 'sound-' + AudioPlayer.sound_counter++
      url: @src
      whileplaying: =>
        @progress()
      onload: =>

  play: ->
    @sound.play() if @sound

  stop: ->
    @sound.stop() if @sound
    @progress_bar.setAttribute 'value', 0

  progress: ->
    @progress_bar.setAttribute 'max', @sound.durationEstimate
    @progress_bar.setAttribute 'value', @sound.position