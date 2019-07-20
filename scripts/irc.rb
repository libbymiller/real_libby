mydir = "/Users/[me]/Documents/textual_logs/irc.example.net/Queries/xxxxxx"

str = ""

Dir.foreach(mydir) do |item|
  next if item == '.' or item == '..'
  puts item
  File.open(mydir+"/"+item, "r") do |f|
    f.each_line do |line|
       line = line.gsub(/(\[.*?\] )/, '')
       line = line.gsub(/(\<notme\>)/, '')
       if(line.match('the query') || line.match('Disconnected') || line.match('---------'))
       else
         line = line.strip
         if(line!="")
           str = str + line.gsub(/(\<libby.*?\>) /, '') + "\n"
         end
       end
    end
  end
end

File.write('data/irc.txt', str)
