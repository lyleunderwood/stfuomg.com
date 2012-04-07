(function() {
  var App, EntryForm, FilterPane, ImageMedia, Media, Message, MessageList, Node, Upload, YoutubeMedia, global;
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; }, __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

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
      this.message.set_media(this);
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
      return !!url.match(/\/[^\/]+\.(png|jpg|jpeg|gif)(\?.*)?$/i);
    };

    return ImageMedia;

  })();

  Media.add_type(ImageMedia);

  Upload = (function() {

    function Upload(drop_target, socket) {
      this.socket = socket;
      this.drop_target = drop_target;
      this.build();
      this.attach_events();
      this.windowUrl = window.URL || window.webkitURL;
    }

    Upload.prototype.build = function() {
      this.node = document.createElement('div');
      this.node.className = 'uploader';
      this.name_node = document.createElement('p');
      this.name_node.className = 'name';
      this.size_node = document.createElement('p');
      this.size_node.className = 'size';
      this.preview_icon = new Image();
      this.preview_icon.className = 'preview_icon';
      this.node.appendChild(this.preview_icon);
      this.cancel_btn = document.createElement('button');
      this.cancel_btn.innerHTML = 'X';
      this.file_input = document.createElement('input');
      this.file_input.type = 'file';
      this.file_input.accept = 'image/*';
      this.file_input.multiple = '';
      this.select_button = document.createElement('div');
      this.select_button.id = 'upload_select_button';
      this.select_button_node = document.createElement('button');
      this.select_button_node.innerHTML = '...';
      this.select_button.appendChild(this.file_input);
      this.select_button.appendChild(this.select_button_node);
      this.select_button.className = 'select_file section';
      this.progress_bar = document.createElement('progress');
      this.progress_bar.setAttribute('min', 0);
      this.progress_bar.setAttribute('max', 100);
      this.progress_bar.setAttribute('value', 0);
      this.progress_bar.className = 'upload_progress_bar';
      this.node.appendChild(this.cancel_btn);
      this.node.appendChild(this.name_node);
      return this.node.appendChild(this.size_node);
    };

    Upload.prototype.attach_events = function() {
      var _this = this;
      this.drop_target.addEventListener('dragenter', function(e) {
        e.preventDefault();
        return e.stopPropagation();
      });
      this.drop_target.addEventListener('dragover', function(e) {
        e.preventDefault();
        return e.stopPropagation();
      });
      this.drop_target.addEventListener('drop', function(e) {
        var dt, file, files;
        e.preventDefault();
        e.stopPropagation();
        dt = e.dataTransfer;
        files = dt.files;
        file = files[0];
        return _this.set_selected_file(file);
      });
      this.cancel_btn.addEventListener('click', function(e) {
        return _this.clear();
      });
      this.select_button_node.addEventListener('click', function(e) {
        return _this.file_input.click();
      });
      return this.file_input.addEventListener('change', function(e) {
        var file;
        file = _this.file_input.files[0];
        if (!file) return false;
        return _this.set_selected_file(file);
      });
    };

    Upload.prototype.valid_file = function(file) {
      var valid_types;
      if (!(file != null)) return false;
      valid_types = ["image/jpg", "image/jpeg", "image/png", "image/gif"];
      if (valid_types.indexOf(file.type) === -1) return false;
      return true;
    };

    Upload.prototype.set_selected_file = function(file) {
      if (!this.valid_file(file)) return false;
      if (this.windowUrl) {
        this.preview_icon.src = this.windowUrl.createObjectURL(file);
      }
      this.selected_file = file;
      this.file_selected.dispatch(file);
      this.name_node.innerHTML = file.name;
      return this.size_node.innerHTML = (file.size / 1024).toFixed(2) + 'KB';
    };

    Upload.prototype.set_token = function(token) {
      return this.token = token;
    };

    Upload.prototype.start = function() {
      this.progress_bar.style.display = 'block';
      return this.started.dispatch();
    };

    Upload.prototype.clear = function() {
      this.selected_file = null;
      this.progress_bar.value = 0;
      this.progress_bar.style.display = 'none';
      return this.cleared.dispatch();
    };

    Upload.prototype.upload = function() {
      var fd, xhr;
      var _this = this;
      if (!this.selected_file) return false;
      fd = new FormData;
      fd.append('image', this.selected_file);
      xhr = new XMLHttpRequest;
      xhr.upload.addEventListener('progress', function(e) {
        var percent;
        percent = e.loaded / e.totalSize * 100;
        if (percent === 100) return _this.progress_bar.removeAttribute('value');
        return _this.progress_bar.setAttribute('value', percent);
      });
      xhr.addEventListener('load', function(e) {
        var response;
        _this.progress_bar.removeAttribute('value');
        if (xhr.status === 200) {
          response = JSON.parse(xhr.responseText);
          _this.completed.dispatch(response.path);
          return _this.clear();
        }
      });
      xhr.addEventListener('error', function(e) {
        return console.log('error', e);
      });
      xhr.addEventListener('abort', function(e) {
        return console.log('abort', e);
      });
      xhr.open('POST', '/upload');
      xhr.setRequestHeader('X-Upload-Length', this.selected_file.size);
      xhr.setRequestHeader('X-Token', this.token);
      xhr.send(fd);
      return this.start();
    };

    Upload.prototype.file_selected = new signals.Signal;

    Upload.prototype.cleared = new signals.Signal;

    Upload.prototype.started = new signals.Signal;

    Upload.prototype.progress = new signals.Signal;

    Upload.prototype.completed = new signals.Signal;

    Upload.supported = function() {
      if (!XMLHttpRequest) return false;
      return !!(FileList && FormData && (new XMLHttpRequest).upload);
    };

    return Upload;

  })();

  MessageList = (function() {

    __extends(MessageList, Node);

    MessageList.prototype.window_focused = null;

    function MessageList(socket, options) {
      this.filters_set = __bind(this.filters_set, this);      this.socket = socket;
      this.options = options;
      this.messages = [];
      this.window_focused = true;
      this.filter_pane = new FilterPane();
      this.build();
      this.attach_events();
    }

    MessageList.prototype.build = function() {
      var lost_message;
      this.node = document.createElement('div');
      this.node.id = 'message_list';
      this.scroll_node = document.createElement('div');
      this.scroll_node.className = 'scroller';
      this.list_node = document.createElement('ul');
      this.list_node.className = 'messages';
      this.scroll_node.appendChild(this.list_node);
      this.node.appendChild(this.scroll_node);
      this.node.appendChild(this.filter_pane.node);
      this.resize();
      this.lost_connection_node = document.createElement('li');
      this.lost_connection_node.className = 'lost_connection';
      this.lost_connection_node.appendChild(document.createElement('div'));
      lost_message = document.createElement('div');
      this.lost_connection_node.appendChild(lost_message);
      lost_message.innerHTML = 'Your connection was lost.';
      this.socket.emit('get_messages');
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
      this.socket.on('connect', function() {
        if (_this.lost_connection_node.parentNode) {
          return _this.list_node.removeChild(_this.lost_connection_node);
        }
      });
      this.socket.on('disconnect', function() {
        _this.list_node.appendChild(_this.lost_connection_node);
        return _this.scroll_bottom();
      });
      window.addEventListener('resize', function() {
        return _this.resize();
      });
      Media.item_loaded.add(function() {
        return _this.scroll_bottom();
      });
      this.filter_pane.changed.add(this.filters_set);
      window.addEventListener('focus', function() {
        return _this.window_focused = true;
      });
      window.addEventListener('blur', function() {
        return _this.window_focused = false;
      });
      this.remember_line = document.createElement('div');
      this.remember_line.className = 'remember_line';
      this.remember_line.appendChild(document.createElement('div'));
      this.remember_line.appendChild(document.createElement('div'));
      if (this.is_hidden()) this.place_remember_line();
      return this.on_visibility_changed(function(e) {
        if (_this.is_hidden()) {
          return _this.place_remember_line();
        } else {
          return _this.check_remember_line();
        }
      });
    };

    MessageList.prototype.place_remember_line = function() {
      this.list_node.appendChild(this.remember_line);
      return this.scroll_bottom;
    };

    MessageList.prototype.check_remember_line = function() {
      var gcs, node;
      if (!this.remember_line.parentNode) return null;
      node = this.remember_line;
      while (node = node.nextSibling) {
        gcs = window.getComputedStyle(node);
        if (gcs.display !== 'none') return null;
      }
      return this.list_node.removeChild(this.remember_line);
    };

    MessageList.prototype.is_hidden = function() {
      return ((this.visibility_support() && document[this.visibility_support()]) || !this.window_focused) || (!this.visibility_support() && !this.window_focused);
    };

    MessageList.prototype.visibility_support = function() {
      var impl, impls, _i, _len;
      impls = "hidden msHidden mozHidden webkitHidden".split(' ');
      for (_i = 0, _len = impls.length; _i < _len; _i++) {
        impl = impls[_i];
        if (document[impl] !== void 0) return impl;
      }
    };

    MessageList.prototype.on_visibility_changed = function(cb) {
      var event, event_map, impl;
      impl = this.visibility_support();
      event_map = {
        hidden: 'visibilitychange',
        msHidden: 'msvisibilitychange',
        mozHidden: 'mozvisibilitychange',
        webkitHidden: 'webkitvisibilitychange'
      };
      event = event_map[impl];
      if (event) document.addEventListener(event, cb);
      window.addEventListener('focus', (function() {
        return setTimeout(cb, 1);
      }));
      return window.addEventListener('blur', (function() {
        return setTimeout(cb, 1);
      }));
    };

    MessageList.prototype.add_message = function(message) {
      message.user_name = this.options.name;
      message = new Message(message);
      this.messages[this.messages.length] = message;
      this.list_node.appendChild(message.build());
      message.filter(this.filter_pane.get_filters());
      return this.scroll_bottom();
    };

    MessageList.prototype.resize = function() {
      this.node.style.height = window.innerHeight - 40 + 'px';
      return this.scroll_bottom();
    };

    MessageList.prototype.scroll_bottom = function() {
      return this.scroll_node.scrollTop = this.list_node.scrollHeight;
    };

    MessageList.prototype.filters_set = function(filters) {
      var _this = this;
      return setTimeout((function() {
        var message, _i, _len, _ref;
        if (filters.show_joinpart) {
          _this.add_class('show_joinpart');
        } else {
          _this.remove_class('show_joinpart');
        }
        if (filters.mediaonly) {
          _this.add_class('mediaonly');
        } else {
          _this.remove_class('mediaonly');
        }
        _ref = _this.messages;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          message = _ref[_i];
          message.filter(filters);
        }
        return _this.scroll_bottom();
      }), 1);
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
      this.entry_form.set_color(this.get_options().color);
      return this.entry_form.set_token(this.get_options().token);
    };

    App.prototype.attach_signals = function() {
      var _this = this;
      this.entry_form.message_submitted.add(function(text, extra_params) {
        var message;
        message = Message.build(text, _this.get_options(), _this.socket, extra_params);
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
      if (Upload.supported()) {
        this.upload_section = document.createElement('div');
        this.upload_section.className = 'upload section';
        this.uploader = new Upload(document.body, this.socket);
        this.upload_section.appendChild(this.uploader.node);
        this.message_section.appendChild(this.uploader.progress_bar);
        this.node.insertBefore(this.upload_section, this.message_section);
        this.select_file_section = this.uploader.select_button;
        this.node.insertBefore(this.select_file_section, this.send_section);
      }
      return this.node;
    };

    EntryForm.prototype.attach_events = function() {
      var _this = this;
      this.message_input.addEventListener('keypress', function(e) {
        if (e.keyCode !== 13 || e.shiftKey) return null;
        e.preventDefault();
        return _this.submit_message();
      });
      this.send_button.addEventListener('click', function() {
        return _this.submit_message();
      });
      this.name_input.addEventListener('keypress', function(e) {
        if (e.keyCode === 13) return _this.focus();
        return setTimeout((function() {
          return _this.change_name();
        }), 1);
      });
      this.name_input.addEventListener('change', function(e) {
        return _this.change_name();
      });
      if (this.uploader) {
        this.uploader.file_selected.add(function(file) {
          return _this.upload_section.className += ' selected';
        });
        this.uploader.cleared.add(function() {
          return _this.upload_section.className = _this.upload_section.className.split('selected').join('');
        });
        this.uploader.started.add(function() {
          return _this.disable();
        });
        return this.uploader.completed.add(function() {
          return _this.enable();
        });
      }
    };

    EntryForm.prototype.disable = function() {
      this.disabled = true;
      this.message_input.setAttribute('disabled', 'disabled');
      return this.send_button.setAttribute('disabled', 'disabled');
    };

    EntryForm.prototype.enable = function() {
      this.disabled = false;
      this.message_input.removeAttribute('disabled');
      return this.send_button.removeAttribute('disabled');
    };

    EntryForm.prototype.set_color = function(color) {
      this.color = color;
      return this.name_input.style.backgroundColor = "rgb(" + color[0] + ", " + color[1] + ", " + color[2] + ")";
    };

    EntryForm.prototype.set_token = function(token) {
      this.token = token;
      if (this.uploader) return this.uploader.set_token(token);
    };

    EntryForm.prototype.focus = function() {
      return this.message_input.focus();
    };

    EntryForm.prototype.submit_message = function() {
      var cb, has_upload_file, text, valid;
      var _this = this;
      if (this.disabled) return null;
      text = this.message_input.value;
      has_upload_file = this.uploader && this.uploader.selected_file;
      valid = !!text.match(/[^\s]/);
      if (has_upload_file) {
        this.uploader.upload();
        cb = function(image_path) {
          _this.uploader.completed.remove(cb);
          return _this.perform_submit({
            image: image_path
          });
        };
        return this.uploader.completed.add(cb);
      } else if (valid) {
        return this.perform_submit();
      }
    };

    EntryForm.prototype.perform_submit = function(params) {
      this.message_submitted.dispatch(this.message_input.value, params);
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

  FilterPane = (function() {

    function FilterPane() {
      this.build();
      this.attach_events();
      this.filters = {};
    }

    FilterPane.prototype.build = function() {
      var fieldset, joinpart_field, joinpart_label, keyword_field, keyword_label, legend, mediaonly_field, mediaonly_label;
      this.node = document.createElement('div');
      this.node.id = 'filter_pane';
      fieldset = document.createElement('fieldset');
      this.node.appendChild(fieldset);
      legend = document.createElement('legend');
      legend.innerHTML = 'Filters';
      fieldset.appendChild(legend);
      keyword_field = document.createElement('div');
      keyword_field.className = 'field keyword';
      fieldset.appendChild(keyword_field);
      keyword_label = document.createElement('label');
      keyword_label.innerHTML = 'Keyword';
      keyword_label["for"] = 'keyword';
      keyword_field.appendChild(keyword_label);
      this.keyword = document.createElement('input');
      this.keyword.id = 'keyword';
      this.keyword.type = 'text';
      keyword_field.appendChild(this.keyword);
      joinpart_field = document.createElement('div');
      joinpart_field.className = 'field show_joinpart';
      fieldset.appendChild(joinpart_field);
      joinpart_label = document.createElement('label');
      joinpart_label.innerHTML = 'Show join / part messages';
      joinpart_label["for"] = 'show_joinpart';
      joinpart_field.appendChild(joinpart_label);
      this.show_joinpart = document.createElement('input');
      this.show_joinpart.id = 'show_joinpart';
      this.show_joinpart.value = true;
      this.show_joinpart.checked = false;
      this.show_joinpart.type = 'checkbox';
      joinpart_field.appendChild(this.show_joinpart);
      mediaonly_field = document.createElement('div');
      mediaonly_field.className = 'field mediaonly';
      fieldset.appendChild(mediaonly_field);
      mediaonly_label = document.createElement('label');
      mediaonly_label.innerHTML = 'With Media Only';
      mediaonly_label["for"] = 'mediaonly';
      mediaonly_field.appendChild(mediaonly_label);
      this.mediaonly = document.createElement('input');
      this.mediaonly.id = 'mediaonly';
      this.mediaonly.value = true;
      this.mediaonly.checked = false;
      this.mediaonly.type = 'checkbox';
      return mediaonly_field.appendChild(this.mediaonly);
    };

    FilterPane.prototype.attach_events = function() {
      var _this = this;
      this.show_joinpart.addEventListener('change', function() {
        return _this.set_option('show_joinpart', _this.show_joinpart.checked);
      });
      this.keyword.addEventListener('change', function() {
        var keywords;
        keywords = _this.keyword.value.split(/\s+/);
        if (keywords[0] === '') keywords = [];
        return _this.set_option('keywords', keywords);
      });
      return this.mediaonly.addEventListener('change', function() {
        return _this.set_option('mediaonly', _this.mediaonly.checked);
      });
    };

    FilterPane.prototype.change = function() {
      return this.changed.dispatch(this.get_filters());
    };

    FilterPane.prototype.get_filters = function() {
      return this.filters;
    };

    FilterPane.prototype.set_option = function(name, value) {
      this.filters[name] = value;
      return this.change();
    };

    FilterPane.prototype.changed = new signals.Signal;

    return FilterPane;

  })();

  Message = (function() {

    __extends(Message, Node);

    Message.prototype.url_regex = /(http|ftp|https):\/\/[\w\-_]+(\.[\w\-_]+)+([\w\-\.\(\),@?^=%&amp;:/~\+#]*[\w\-\@?^=%&amp;/~\+#])?/g;

    Message.prototype.reference_regex = /\@(\w+)/;

    function Message(params, socket) {
      this.id = params.id;
      this.content = params.content;
      this.author_name = params.author_name;
      this.color = params.color;
      this.user_name = params.user_name;
      this.image = params.image;
      this.server_event = params.server_event;
      this.socket = socket;
      this.media = null;
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
        color: this.color,
        image: this.image
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
      } else {
        this.content_node.innerHTML = this.content;
      }
      if (this.image) {
        return Media.build(this.image, this);
      } else if (urls) {
        return Media.build(urls[0], this);
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
      if (this.is_joinpart()) this.node.className += ' joinpart';
      if (this.reference) this.node.className += ' reference';
      return this.node;
    };

    Message.prototype.is_filtered = function() {
      return this.node.style.display !== 'none';
    };

    Message.prototype.set_media = function(media) {
      this.media = media;
      if (this.has_media()) return this.node.className += ' media';
    };

    Message.prototype.handle_reference = function(content) {
      if (!(this.user_name != null)) return content;
      if (content.match(this.reference_regex)) this.reference = true;
      return content;
    };

    Message.prototype.hide = function() {
      return this.add_class('filtered');
    };

    Message.prototype.show = function() {
      return this.remove_class('filtered');
    };

    Message.prototype.is_joinpart = function() {
      return this.server_event;
    };

    Message.prototype.has_media = function() {
      return !!this.media;
    };

    Message.prototype.filter = function(filters) {
      var keyword, _i, _len, _ref;
      if (filters.keywords) {
        _ref = filters.keywords;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          keyword = _ref[_i];
          if (this.content.indexOf(keyword) === -1) return this.hide();
        }
      }
      return this.show();
    };

    Message.build = function(content, options, socket, extra_params) {
      var image;
      image = extra_params && extra_params.image ? extra_params.image : null;
      return new Message({
        content: content,
        author_name: options.name,
        color: options.color,
        image: image
      }, socket);
    };

    return Message;

  })();

}).call(this);
