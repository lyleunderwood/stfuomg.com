(function() {
  var EventEmitter, FileReceiver, IncomingForm, aws_client, knox,
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

  module.exports = FileReceiver = (function(_super) {

    __extends(FileReceiver, _super);

    function FileReceiver(request) {
      var _this = this;
      this.form = new IncomingForm();
      this.upload_length = request.headers['x-upload-length'];
      this.token = request.headers['x-token'];
      this.bytes_completed = 0;
      this.form.onPart = function(part) {
        _this.emit('start');
        _this.aws_req = aws_client.put(part.filename, {
          'Content-Type': part.mime,
          'Content-Length': _this.upload_length
        });
        _this.aws_req.on('response', function(response) {
          _this.result_url = 'https://s3-us-west-1.amazonaws.com/omfgstfu-uploads/' + part.filename;
          return _this.emit('end', _this.result_url);
        });
        part.on('data', function(chunk) {
          _this.bytes_completed += chunk.length;
          _this.emit('progress', _this.bytes_completed / _this.upload_length * 100, _this.bytes_completed, _this.upload_length);
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

    FileReceiver.prototype.get_token = function() {
      return this.token;
    };

    return FileReceiver;

  })(EventEmitter);

}).call(this);
