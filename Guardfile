# A sample Guardfile
# More info at https://github.com/guard/guard#readme

group :server do
  guard 'coffeescript', :input => 'src/server', :output => 'lib/server'
end

group :client do
  guard :shell do
    watch(%r{^src/client/.+\.(coffee)}) do |path|
      `mkdir -p lib/client/js`

      files = []
      Dir.glob 'src/client/**/*.coffee' do |file|
        files << file
      end

      media_file = files.delete "src/client/media.coffee"
      files.unshift(media_file) if media_file

      node_file = files.delete "src/client/node.coffee"
      files.unshift(node_file) if node_file

      file_list = files.join ' '

      `coffee -c -j lib/client/js/client.js #{file_list}`
    end
  end

  guard :shell do
    watch(%r{^src/client/.+\.(?!coffee)}) do |path|
      `mkdir -p lib/client/js`
      `cp -R src/client/* lib/client/`
    end
  end
end
