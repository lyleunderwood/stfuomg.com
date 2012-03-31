(function() {
  var App, EntryForm, ImageMedia, Media, Message, MessageList, Node, YoutubeMedia, global;
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

  MessageList = (function() {

    function MessageList(socket, options) {
      this.socket = socket;
      this.options = options;
      this.messages = [];
      this.build();
      this.attach_events();
    }

    MessageList.prototype.build = function() {
      this.node = document.createElement('div');
      this.node.id = 'message_list';
      this.scroll_node = document.createElement('div');
      this.scroll_node.className = 'scroller';
      this.list_node = document.createElement('ul');
      this.list_node.className = 'messages';
      this.scroll_node.appendChild(this.list_node);
      this.node.appendChild(this.scroll_node);
      this.resize();
      return this.node;
    };

    MessageList.prototype.attach_events = function() {
      var _this = this;
      this.socket.on('messages', function(messages) {
        var message, _i, _len, _ref, _results;
        _ref = messages.reverse();
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          message = _ref[_i];
          _results.push(_this.add_message(message));
        }
        return _results;
      });
      window.addEventListener('resize', (function() {
        return _this.resize();
      }));
      return Media.item_loaded.add(function() {
        return _this.scroll_bottom();
      });
    };

    MessageList.prototype.add_message = function(message) {
      message.user_name = this.options.name;
      message = new Message(message);
      this.messages.push(message);
      this.list_node.appendChild(message.build());
      return this.scroll_bottom();
    };

    MessageList.prototype.resize = function() {
      this.node.style.height = window.innerHeight - 40 + 'px';
      return this.scroll_bottom();
    };

    MessageList.prototype.scroll_bottom = function() {
      var gcs;
      gcs = global.getComputedStyle(this.list_node);
      return this.scroll_node.scrollTop = parseInt(gcs.height);
    };

    return MessageList;

  })();

  App = (function() {

    function App() {
      var _this = this;
      this.node = document.body;
      this.socket = io.connect();
      this.socket.on('connect', function() {
        if (!_this.started) {
          _this.started = true;
          return _this.start();
        }
      });
    }

    App.prototype.start = function() {
      var _this = this;
      this.message_list = new MessageList(this.socket, this.get_options());
      this.entry_form = new EntryForm(this.socket, this.get_options().name);
      return this.socket.emit('create_session', this.get_options(), function(session) {
        _this.set_option('token', session.token);
        _this.set_option('color', session.color);
        _this.build();
        return _this.attach_signals();
      });
    };

    App.prototype.build = function() {
      this.node.appendChild(this.message_list.node);
      this.node.appendChild(this.entry_form.node);
      this.focus();
      return this.entry_form.set_color(this.get_options().color);
    };

    App.prototype.attach_signals = function() {
      var _this = this;
      this.entry_form.message_submitted.add(function(text) {
        var message;
        message = Message.build(text, _this.get_options(), _this.socket);
        return message.send();
      });
      return this.entry_form.name_changed.add(function(name) {
        return _this.set_option('name', name);
      });
    };

    App.prototype.focus = function() {
      return this.entry_form.focus();
    };

    App.prototype.get_options = function() {
      if (this.options) return this.options;
      return this.options = {
        name: store.get('name'),
        color: store.get('color'),
        token: store.get('token')
      };
    };

    App.prototype.set_option = function(name, value) {
      store.set(name, value);
      return this.get_options()[name] = value;
    };

    App.start = function() {
      return global.app = new App;
    };

    return App;

  })();

  global = this;

  if (window.addEventListener) {
    addEventListener('DOMContentLoaded', App.start);
  } else {
    attachEvent('onload', App.start);
  }

  EntryForm = (function() {

    function EntryForm(socket, name) {
      this.name = name || "Anonymous";
      this.socket = socket;
      this.build();
      this.attach_events();
    }

    EntryForm.prototype.build = function() {
      this.node = document.createElement('div');
      this.node.id = 'entry_form';
      this.name_section = document.createElement('div');
      this.name_section.className = 'name section';
      this.node.appendChild(this.name_section);
      this.name_input = document.createElement('input');
      this.name_input.type = 'text';
      this.name_input.value = this.name;
      this.name_section.appendChild(this.name_input);
      this.message_section = document.createElement('div');
      this.message_section.className = 'message section';
      this.node.appendChild(this.message_section);
      this.message_input = document.createElement('textarea');
      this.message_section.appendChild(this.message_input);
      this.send_section = document.createElement('div');
      this.send_section.className = 'send section';
      this.node.appendChild(this.send_section);
      this.send_button = document.createElement('button');
      this.send_button.innerHTML = 'Send';
      this.send_section.appendChild(this.send_button);
      return this.node;
    };

    EntryForm.prototype.attach_events = function() {
      var _this = this;
      this.message_input.addEventListener('keypress', function(e) {
        if (e.charCode !== 13 || e.shiftKey) return null;
        e.preventDefault();
        return _this.submit_message();
      });
      this.send_button.addEventListener('click', function() {
        return _this.submit_message();
      });
      this.name_input.addEventListener('keypress', function(e) {
        if (e.charCode === 13) return _this.focus();
        return setTimeout((function() {
          return _this.change_name();
        }), 1);
      });
      return this.name_input.addEventListener('change', function(e) {
        return _this.change_name();
      });
    };

    EntryForm.prototype.set_color = function(color) {
      this.color = color;
      return this.name_input.style.backgroundColor = "rgb(" + color[0] + ", " + color[1] + ", " + color[2] + ")";
    };

    EntryForm.prototype.focus = function() {
      return this.message_input.focus();
    };

    EntryForm.prototype.submit_message = function() {
      var text, valid;
      text = this.message_input.value;
      valid = !!text.match(/[^\s]/);
      if (valid) this.message_submitted.dispatch(this.message_input.value);
      this.message_input.value = '';
      return this.focus();
    };

    EntryForm.prototype.change_name = function() {
      var text, valid;
      text = this.name_input.value;
      valid = !!text.match(/[^\s]/);
      if (valid) return this.name_changed.dispatch(this.name_input.value);
    };

    EntryForm.prototype.message_submitted = new signals.Signal;

    EntryForm.prototype.name_changed = new signals.Signal;

    return EntryForm;

  })();

  Node = (function() {

    function Node() {}

    Node.prototype.add_class = function(class_name) {
      return this.node.className += ' ' + class_name;
    };

    Node.prototype.remove_class = function(class_name) {
      return this.node.className = this.node.className.split(class_name).join('');
    };

    Node.prototype.has_class = function(class_name) {
      return !!(this.node.className.indexOf(class_name) !== -1);
    };

    Node.prototype.toggle_class = function(class_name) {
      if (this.has_class(class_name)) {
        return this.remove_class(class_name);
      } else {
        return this.add_class(class_name);
      }
    };

    return Node;

  })();

  Media = (function() {

    __extends(Media, Node);

    function Media(url, message) {
      this.url = Media.html_decode(url);
      this.message = message;
    }

    Media.prototype.build = function() {
      var media_node;
      this.node = document.createElement('div');
      this.node.className = 'media';
      this.message.content_node.appendChild(this.node);
      media_node = this.build_media();
      this.node.appendChild(media_node);
      this.build_zoomer();
      Media.item_loaded.dispatch(this);
      return this.node;
    };

    Media.prototype.build_zoomer = function() {
      var _this = this;
      this.zoomer = document.createElement('button');
      this.zoomer.className = 'zoomer';
      this.zoomer.innerHTML = '+';
      this.node.appendChild(this.zoomer);
      return this.zoomer.addEventListener('click', function() {
        if (_this.has_class('zoomed')) {
          _this.unzoom();
        } else {
          _this.zoom();
        }
        return _this.toggle_class('zoomed');
      });
    };

    Media.types = [];

    Media.add_type = function(type) {
      return this.types.push(type);
    };

    Media.match = function(url) {
      var type, _i, _len, _ref, _results;
      url = this.html_decode(url);
      _ref = this.types;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        type = _ref[_i];
        if (type.is_match(url)) _results.push(type);
      }
      return _results;
    };

    Media.build = function(url, message) {
      var media, medias;
      medias = this.match(url);
      if (medias.length === 0) return null;
      media = medias[0];
      media = new media(url, message);
      return media.start();
    };

    Media.item_loaded = new signals.Signal;

    Media.decode_node = document.createElement('div');

    Media.html_decode = function(html) {
      this.decode_node.innerHTML = html;
      return this.decode_node.innerHTML;
    };

    return Media;

  })();

  Message = (function() {

    Message.prototype.url_regex = /(http|ftp|https):\/\/[\w\-_]+(\.[\w\-_]+)+([\w\-\.\(\),@?^=%&amp;:/~\+#]*[\w\-\@?^=%&amp;/~\+#])?/g;

    Message.prototype.reference_regex = /\@(\w+)/;

    function Message(params, socket) {
      this.id = params.id;
      this.content = params.content;
      this.author_name = params.author_name;
      this.color = params.color;
      this.user_name = params.user_name;
      this.socket = socket;
      if (this.user_name != null) {
        this.reference_regex = new RegExp("\@(" + this.user_name + ")");
      }
      this.reference = false;
      return this;
    }

    Message.prototype.attributes = function() {
      return {
        id: this.id,
        content: this.content,
        author_name: this.author_name,
        color: this.color
      };
    };

    Message.prototype.send = function() {
      this.socket.emit('message', this.attributes());
      return this;
    };

    Message.prototype.build_content = function() {
      var content, urls;
      urls = this.content.match(this.url_regex);
      content = this.handle_reference(this.content);
      if (urls) {
        content = this.content.replace(this.url_regex, "<a href='$&' target='_blank'>$&</a>", 'g');
        this.content_node.innerHTML = content;
        return Media.build(urls[0], this);
      } else {
        return this.content_node.innerHTML = this.content;
      }
    };

    Message.prototype.build = function() {
      var style;
      this.node = document.createElement('li');
      this.node.className = 'message';
      this.author_node = document.createElement('p');
      this.author_node.className = 'author';
      this.author_node.innerHTML = this.author_name;
      if (this.color != null) {
        style = "rgb(" + this.color[0] + ", " + this.color[1] + ", " + this.color[2] + ")";
        this.author_node.style.backgroundColor = style;
      }
      this.node.appendChild(this.author_node);
      this.content_node = document.createElement('div');
      this.content_node.className = 'content';
      this.node.appendChild(this.content_node);
      this.build_content();
      if (this.reference) this.node.className += ' reference';
      return this.node;
    };

    Message.prototype.handle_reference = function(content) {
      if (!(this.user_name != null)) return content;
      if (content.match(this.reference_regex)) this.reference = true;
      return content;
    };

    Message.build = function(content, options, socket) {
      return new Message({
        content: content,
        author_name: options.name,
        color: options.color
      }, socket);
    };

    return Message;

  })();

  YoutubeMedia = (function() {

    __extends(YoutubeMedia, Media);

    function YoutubeMedia() {
      YoutubeMedia.__super__.constructor.apply(this, arguments);
    }

    YoutubeMedia.regex = /http:\/\/\w{0,3}.?youtube+\.\w{2,3}\/watch\?.*v=([\w-]{11})(\&.*)?/;

    YoutubeMedia.prototype.start = function() {
      return this.build();
    };

    YoutubeMedia.prototype.build_media = function() {
      var matches;
      this.node.className += ' youtube';
      matches = this.url.match(YoutubeMedia.regex);
      this.iframe = document.createElement('iframe');
      if (!matches) return this.iframe;
      this.video_id = matches[1];
      this.iframe.type = 'text/html';
      this.iframe.src = "http://www.youtube.com/embed/" + this.video_id + "?wmode=opaque";
      return this.iframe;
    };

    YoutubeMedia.prototype.zoom = function() {};

    YoutubeMedia.prototype.unzoom = function() {};

    YoutubeMedia.is_match = function(url) {
      return !!url.match(this.regex);
    };

    return YoutubeMedia;

  })();

  Media.add_type(YoutubeMedia);

  ImageMedia = (function() {

    __extends(ImageMedia, Media);

    function ImageMedia() {
      ImageMedia.__super__.constructor.apply(this, arguments);
    }

    ImageMedia.prototype.start = function() {
      var _this = this;
      this.img = new Image();
      this.img.src = this.url;
      if (this.img.loaded) return this.build();
      return this.img.addEventListener('load', function() {
        return _this.build();
      });
    };

    ImageMedia.prototype.build_media = function() {
      var _this = this;
      this.original_width = this.img.width;
      this.node.className += ' image';
      this.link_node = document.createElement('a');
      this.link_node.href = this.url;
      this.link_node.target = '_blank';
      this.link_node.appendChild(this.img);
      setTimeout((function() {
        var gcs;
        gcs = window.getComputedStyle(_this.img);
        _this.small_width = parseInt(gcs.width);
        return _this.unzoom();
      }), 1);
      return this.link_node;
    };

    ImageMedia.prototype.zoom = function() {
      this.zoomer.style.left = this.original_width - 20 + 'px';
      return this.zoomer.style.right = 'auto';
    };

    ImageMedia.prototype.unzoom = function() {
      var target_width;
      target_width = this.small_width > 20 ? this.small_width : 20;
      this.zoomer.style.left = this.small_width - 20 + 'px';
      return this.zoomer.style.right = 'auto';
    };

    ImageMedia.is_match = function(url) {
      return !!url.match(/\/[^\/]+\.(png|jpg|jpeg|gif)(\?.*)?$/);
    };

    return ImageMedia;

  })();

  Media.add_type(ImageMedia);

}).call(this);
