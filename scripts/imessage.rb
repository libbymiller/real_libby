fn = "/Users/[me]/gpt-2/scripts/baskup-master/backup/chatxxxxxx/iMessage\;+\;chatxxxxxx.txt"

str = ''

File.open(fn, "r") do |f|
    f.each_line do |line|
       if(line.match('Friend'))
       else
         line = line.gsub(/Me\: /, '')
         line = line.gsub(/\|/,'')
         line = line.strip

         if(line=="")
         else

            if(line.match(/\W/))
              str = str + line + "\n"
            end
         end
       end
    end
end
File.write('data/imessage.txt', str)
