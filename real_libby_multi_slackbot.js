var RTMClient = require('@slack/client').RTMClient;
var MemoryDataStore = require('@slack/client').MemoryDataStore;
var RTM_EVENTS = require('@slack/client').RTM_EVENTS;
var RTM_CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;
var WebClient = require('@slack/client').WebClient;
var querystring = require("querystring");
var fs = require('fs');
var path = require('path');
var sys = require('sys')
var exec = require('child_process').exec;
var child;

var token = process.env.SLACK_API_TOKEN || '';
var bot;

var slack = new RTMClient(token);
var web = new WebClient(token);

//only speak when these words are in the text
var matches = ["real_libby","<@XXXXXX>","<!here>"];

// server port
var port = "8080";

//default channel (only used if no recent messages)
var channel = "XXXXX";

var fs = require('fs');

// prompts for messages that are not triggered by activity
// one per line in prompts.txt

var prompts = [];
var content = fs.readFileSync(path.resolve(__dirname, "prompts.txt"),"UTF-8");
var arr = content.split("\n");
for(var i=0; i< arr.length; i++){
  if(arr[i].trim()!=""){
    prompts.push(arr[i]);
  }
}

// last message object, just use the channel if it's not populated
var last_message = {channel: channel};

// time of last message, is there is one
var last_message_time = 0;

// not sure this is the best way
// this does a test for the number of seconds since the last message
// if it's above a certain length of time, then there's a 50% chance I will respond
// if I do, I'll use one of the prompts to seed it

function decide_whether_to_speak(){
  var lm = last_message_time/60000;
  var which_prompt = getRandomIntInclusive(0,prompts.length -1);
  var shall_I = getRandomIntInclusive(0,1);//50% chance

  console.log("shall I speak?");
  var milliseconds = (new Date).getTime();
  console.log("lmt "+last_message_time);
  console.log("ms  "+parseInt(milliseconds/1000));
  var seconds_since_last_message = parseInt(milliseconds/1000) - parseInt(last_message_time);
  console.log("ms - lmt = "+seconds_since_last_message);

// in seconds, should be bigger than the setInterval below
// needs to be random or all bots will speak at the same time if started up at a similar time
  var wait_time = getRandomIntInclusive(10,350);

  if(seconds_since_last_message > wait_time){ // seconds 
    console.log(">"+wait_time);
    console.log("shall I "+shall_I);
    if(shall_I == 1){
      console.log("shall I - yes!");
      var m = prompts[which_prompt];
      console.log(last_message);
      respond_to_message(last_message, m)
    }
  }
}

// decide whether to speak every 5 minutes

setInterval(function() {
   decide_whether_to_speak();
}, 60000); // 1 min


// random int utility method

function getRandomIntInclusive(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}


slack.start();

slack.on('authenticated', function(data) {
  bot = data.self;
  console.log("Logged in as " + bot.name
        + " of " + data.team.name + ", but not yet connected");
});

slack.on('ready', function() {
    console.log('Connected');
});


// if you want exclude terms returned, e.g. names etc
// this isn't very good! should exclude them as words

var exclude = []; // text as a list here

function test_exclude(ts){

   for (var i=0; i< exclude.length; i++){
     var regex = new RegExp( exclude[i], 'gi' );
     ts = ts.replace(regex," ")

   }
   return ts.trim();
}


function respond_to_message(message, message_text){
      var new_text = "http://0.0.0.0:"+port+"/?text="+encodeURIComponent(message_text);
      console.log(new_text);
      // get the data from the server
      var command = 'curl "'+new_text+'"';

      console.log(command);

      slack.sendTyping(message.channel);

      // just to give a little bit of realism in the typing speed
      var typing_timeout = getRandomIntInclusive(0,3000);
      setTimeout(function() {

         child = exec(command, function (error, stdout, stderr) {
             if (error !== null) {
               console.log('exec error: ' + error);
             }else{
               var to_send = stdout.split("\n")
               var ts = "";
               console.log("stdout "+stdout);
               console.log("to_send "+ts);

               // pick one at random
               to_send.sort(() => Math.random() - 0.5);

               for(var i=0; i< to_send.length; i++){
                 ts = to_send[i];
                 // if needed ts = test_exclude(ts);
                 if(ts!=""){
                     break;
                 }
               }
               var shall_I = getRandomIntInclusive(0,3);
               if(shall_I == 2 && message.user){ // sometimes if no-one has spoken recently, user may be empty; channel won't
                  slack.sendMessage("<@"+message.user+"> "+ts, message.channel);
               }else{
                  slack.sendMessage(ts, message.channel);
               }
             }
         });

      }, typing_timeout); // random millisecs
}


slack.on('message', (message) => {
  console.log("message!");
  // Structure of `event`: <https://api.slack.com/events/message>
  console.log(message);

  last_message_time = parseInt(message.ts);
  last_message = message;

  try{
    if (message.user == bot.id) return; // Ignore bot's own messages

    var channel = message.channel;
    var user = message.user;

    // don't answer messages that don't include the name etc from matches - you may need to get the underlying name. e.g. @U1HYTPHW3

    if(message.text){
      var n_text = message.text;
      var got_a_match = false;
      for(var j =0; j < matches.length; j++){

        if(n_text.match(matches[j])){
           console.log("[1a] "+matches[j]);
           got_a_match = true;
           n_text = n_text.replace(matches[j],"");// if you don't filter it out it affects the output!
        }
      }
      if(got_a_match == true){
        respond_to_message(message, n_text)
      }else{
      // every random 7th message, chip in
        var shall_I = getRandomIntInclusive(0,6);
        console.log("shall_I respond randomly? "+shall_I);
        if(shall_I == 3){
          console.log("responding!");
          respond_to_message(message, message.text)
        }
      }
    }//else no message text

 } catch (err){
    console.log(err);
 }

})



