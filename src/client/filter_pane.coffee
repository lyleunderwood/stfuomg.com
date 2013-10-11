signals = require 'signals'

class FilterPane
  constructor: ->
    @build()
    @attach_events()
    @filters = {}

  build: ->
    @node = document.createElement 'div'
    @node.id = 'filter_pane'

    fieldset = document.createElement 'fieldset'
    @node.appendChild fieldset

    legend = document.createElement 'legend'
    legend.innerHTML = 'Filters'
    fieldset.appendChild legend

    keyword_field = document.createElement 'div'
    keyword_field.className = 'field keyword'
    fieldset.appendChild keyword_field

    keyword_label = document.createElement 'label'
    keyword_label.innerHTML = 'Keyword'
    keyword_label.for = 'keyword'
    keyword_field.appendChild keyword_label

    @keyword = document.createElement 'input'
    @keyword.id = 'keyword'
    @keyword.type = 'text'
    keyword_field.appendChild @keyword

    joinpart_field = document.createElement 'div'
    joinpart_field.className = 'field show_joinpart'
    fieldset.appendChild joinpart_field

    joinpart_label = document.createElement 'label'
    joinpart_label.innerHTML = 'Show join / part messages'
    joinpart_label.for = 'show_joinpart'
    joinpart_field.appendChild joinpart_label

    @show_joinpart = document.createElement 'input'
    @show_joinpart.id = 'show_joinpart'
    @show_joinpart.value = true
    @show_joinpart.checked = false
    @show_joinpart.type = 'checkbox'
    joinpart_field.appendChild @show_joinpart

    mediaonly_field = document.createElement 'div'
    mediaonly_field.className = 'field mediaonly'
    fieldset.appendChild mediaonly_field

    mediaonly_label = document.createElement 'label'
    mediaonly_label.innerHTML = 'With Media Only'
    mediaonly_label.for = 'mediaonly'
    mediaonly_field.appendChild mediaonly_label

    @mediaonly = document.createElement 'input'
    @mediaonly.id = 'mediaonly'
    @mediaonly.value = true
    @mediaonly.checked = false
    @mediaonly.type = 'checkbox'
    mediaonly_field.appendChild @mediaonly

    hidemedia_field = document.createElement 'div'
    hidemedia_field.className = 'field hidemedia'
    fieldset.appendChild hidemedia_field

    hidemedia_label = document.createElement 'label'
    hidemedia_label.innerHTML = 'Hide Media'
    hidemedia_label.for = 'hidemedia'
    hidemedia_field.appendChild hidemedia_label

    @hidemedia = document.createElement 'input'
    @hidemedia.id = 'hidemedia'
    @hidemedia.value = true
    @hidemedia.checked = false
    @hidemedia.type = 'checkbox'
    hidemedia_field.appendChild @hidemedia

  attach_events: ->
    @show_joinpart.addEventListener 'change', =>
      @set_option 'show_joinpart', @show_joinpart.checked

    @keyword.addEventListener 'change', =>
      keywords = @keyword.value.split /\s+/
      keywords = [] if keywords[0] is ''
      @set_option 'keywords', keywords

    @mediaonly.addEventListener 'change', =>
      @set_option 'mediaonly', @mediaonly.checked

    @hidemedia.addEventListener 'change', =>
      @set_option 'hidemedia', @hidemedia.checked

  change: ->
    @changed.dispatch @get_filters()

  get_filters: ->
    @filters

  set_option: (name, value) ->
    @filters[name] = value
    @change()

  changed: new signals.Signal
