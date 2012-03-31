class Node

  add_class: (class_name) ->
    @node.className += class_name

  remove_class: (class_name) ->
    @node.className = @node.className.split(class_name).join('')

  has_class: (class_name) ->
    !!(@node.indexOf(class_name) isnt -1)