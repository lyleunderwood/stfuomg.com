(function() {
  var EventEmitter, FileReceiver, IncomingForm, aws_client, knox, max_upload_size,
    __hasProp = Object.prototype.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

  EventEmitter = require('events').EventEmitter;

  IncomingForm = require('formidable').IncomingForm;

  knox = require('knox');

  aws_client = knox.createClient({
    key: process.env.AWS_KEY,
    secret: process.env.AWS_SECRET,
    bucket: process.env.AWS_BUCKET
  });

  max_upload_size = 7 * 1024 * 1024;

  module.exports = FileReceiver = (function(_super) {

    __extends(FileReceiver, _super);

    function FileReceiver(request) {
      var _this = this;
      this.form = new IncomingForm();
      this.upload_length = request.headers['x-upload-length'];
      this.token = request.headers['x-token'];
      this.bytes_completed = 0;
      this.form.onPart = function(part) {
        var filename;
        if (!_this.valid_mime(part.mime)) {
          _this.stop_upload();
          return _this.emit('error', {
            message: "Bad file type: " + part.mime,
            code: 406
          });
        }
        if (new Number(_this.upload_length) > max_upload_size) {
          _this.stop_upload();
          return _this.emit('error', {
            message: "Upload larger than 7MB maximum",
            code: 413
          });
        }
        _this.emit('start');
        filename = part.filename.replace(/\s+/g, '-');
        _this.aws_req = aws_client.put(filename, {
          'Content-Type': part.mime,
          'Content-Length': _this.upload_length
        });
        _this.aws_req.on('response', function(response) {
          _this.result_url = 'https://s3-us-west-1.amazonaws.com/omfgstfu-uploads/' + filename;
          return _this.emit('end', _this.result_url);
        });
        part.on('data', function(chunk) {
          _this.bytes_completed += chunk.length;
          if (_this.bytes_completed > max_upload_size) {
            _this.stop_upload();
            return _this.emit('error', {
              message: "Upload larger than 2MB maximum",
              code: 413
            });
          }
          return _this.aws_req.write(chunk);
        });
        return part.on('end', function() {
          return _this.aws_req.end();
        });
      };
      this.form.parse(request, function(error, fields, files) {
        if (error) return _this.emit('error', error);
      });
    }

    FileReceiver.prototype.valid_mime = function(mime) {
      return mime.match(/(image)|(audio)\//) !== null;
    };

    FileReceiver.prototype.get_token = function() {
      return this.token;
    };

    FileReceiver.prototype.stop_upload = function() {
      console.log('stopping upload');
      try {
        throw new Error("Stopping file upload...");
      } catch (e) {
        return console.log(e);
      }
    };

    FileReceiver["delete"] = function(url, cb) {
      var parts;
      parts = url.split('/');
      url = '/' + parts[parts.length - 1];
      return aws_client.deleteFile(url, function(error, response) {
        if (error) return cb(error);
        if (response.statusCode !== 204) return cb(response);
        return cb(null, response);
      });
    };

    return FileReceiver;

  })(EventEmitter);

}).call(this);
