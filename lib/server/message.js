(function() {
  var Message, redis, sanitizer;

  redis = require('redis').createClient();

  sanitizer = require('sanitizer');

  module.exports.Message = Message = (function() {

    function Message(params) {
      var filter_author, filter_content;
      filter_content = function(content) {
        if (!(content != null) || content === '') return '';
        content = sanitizer.escape(content);
        return content.substr(0, 200);
      };
      filter_author = function(author) {
        if (!(author != null) || author === '') return 'Anonymous';
        return author.substr(0, 16);
      };
      this.id;
      this.content = filter_content(params.content);
      this.author_name = filter_author(params.author_name);
      this.author_ip = params.author_ip;
      this.color = params.color || null;
      this.image = params.image || '';
      this.server_event = params.server_event || '';
      return this;
    }

    Message.prototype.save = function(cb) {
      var _this = this;
      redis.incr('next_post_id', function(error, id) {
        if (error) throw error;
        _this.id = id;
        return redis.multi().set("Message:" + _this.id + ":content", _this.content).set("Message:" + _this.id + ":author_name", _this.author_name).set("Message:" + _this.id + ":author_ip", _this.author_ip).set("Message:" + _this.id + ":server_event", _this.server_event).set("Message:" + _this.id + ":image", _this.image).set("Message:" + _this.id + ":color", JSON.stringify(_this.color)).lpush('messages', _this.id).exec(function(error) {
          if (error) throw error;
          return cb(error, _this.id);
        });
      });
      return this;
    };

    Message.get = function(id, cb) {
      var message;
      message = new Message({
        id: id
      });
      redis.multi().get("Message:" + id + ":content", function(error, result) {
        return message.content = result;
      }).get("Message:" + id + ":author_name", function(error, result) {
        return message.author_name = result;
      }).get("Message:" + id + ":author_ip", function(error, result) {
        return message.author_ip = result;
      }).get("Message:" + id + ":server_event", function(error, result) {
        return message.server_event = result;
      }).get("Message:" + id + ":image", function(error, result) {
        return message.image = result;
      }).get("Message:" + id + ":color", function(error, result) {
        return message.color = JSON.parse(result);
      }).exec(function(error) {
        if (error) throw error;
        return cb(error, message);
      });
      return null;
    };

    Message.all = function(cb) {
      var messages,
        _this = this;
      messages = [];
      redis.lrange('messages', 0, 50, function(error, results) {
        var completed, expected, id, _i, _len, _results;
        if (error) throw error;
        expected = results.length;
        completed = 0;
        _results = [];
        for (_i = 0, _len = results.length; _i < _len; _i++) {
          id = results[_i];
          _results.push(_this.get(id, function(error, message) {
            completed++;
            if (error) throw error;
            messages.push(message);
            if (completed >= expected) return cb(null, messages);
          }));
        }
        return _results;
      });
      return null;
    };

    return Message;

  })();

}).call(this);
