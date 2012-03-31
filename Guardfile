# A sample Guardfile
# More info at https://github.com/guard/guard#readme

group :server do
  guard 'coffeescript', :input => 'src/server', :output => 'lib/server'
end

group :client do
  guard :shell do
    watch(%r{^src/client/.+\.(coffee)}) do |path|
      `mkdir -p lib/client/js`
      `coffee -c -j lib/client/js/client.js src/client/`
    end
  end

  guard :shell do
    watch(%r{^src/client/.+\.(?!coffee)}) do |path|
      `mkdir -p lib/client/js`
      `cp -R src/client/* lib/client/`
    end
  end
end
