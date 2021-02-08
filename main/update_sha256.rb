require 'json'
require 'digest'
file = File.read('main.json')
data_hash = JSON.parse(file)

data_hash["sites"].each do |h|
    if !h["templates"].nil?
      h["templates"].each do |template|
        sha1 = Digest::SHA256.hexdigest(template["image"])
        template["checksum"] = sha1
      end
    end
end

File.open('main.json', "w") do |f|
  f.write(JSON.pretty_generate(data_hash))
end


