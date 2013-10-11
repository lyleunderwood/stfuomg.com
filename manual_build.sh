#!/bin/bash
coffee -c -o lib/server \
  src/server/* && \
coffee -c -j lib/client/js/client.js \
  src/client/node.coffee  \
  src/client/media.coffee \
  src/client/media/*.coffee \
  src/client/app.coffee \
  src/client/filter_pane.coffee \
  src/client/upload.coffee \
  src/client/entry_form.coffee \
  src/client/audio_player.coffee \
  src/client/message_list.coffee \
  src/client/message.coffee && \
  \
cp src/client/css/app.css lib/client/css/app.css && \
./node_modules/.bin/browserify lib/client/js/client.js -o lib/client/js/bundle.js && \
./node_modules/.bin/uglifyjs -b lib/client/js/bundle.js >lib/client/js/bundle.min.js &&\
\
node lib/server/server.js
