var RTMClient = require('@slack/client').RTMClient;
var MemoryDataStore = require('@slack/client').MemoryDataStore;
var RTM_EVENTS = require('@slack/client').RTM_EVENTS;
var RTM_CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;
var WebClient = require('@slack/client').WebClient;
var querystring = require("querystring");
var fs = require('fs');
var path = require('path');
var sys = require('sys')

var bot_name = process.env.BOT_NAME || '';

const config = require('./config.json');

global.gConfig = config[bot_name];

//only speaker when these words are in the text
var matches = global.gConfig.matches;

// server port
var port = global.gConfig.port;

//default channel (only used if no recent messages)
var channel = global.gConfig.channel;

//other params
// % chance of saying something spontaneous
var spontaneous_speech_percent = global.gConfig.spontaneous_speech_percent;

//and interval when you check
var decide_whether_to_speak_interval_secs = global.gConfig.decide_whether_to_speak_interval_secs;

// these two specify max and min in secs to wait before blurtiung something out
var spontaneous_wait_time_max_secs = global.gConfig.spontaneous_wait_time_max_secs;
var spontaneous_wait_time_min_secs = global.gConfig.spontaneous_wait_time_min_secs;

// % chance of  @ing someone
var percent_reply_to = global.gConfig.percent_reply_to;

// % chance of replying to any given message in the channel
var percent_reply_randomly = global.gConfig.percent_reply_randomly;

// prompts
var prompts_file = global.gConfig.prompts_file;


var exec = require('child_process').exec;
var child;


var token = process.env.SLACK_API_TOKEN || '';
var bot;

var slack = new RTMClient(token);
var web = new WebClient(token);

var fs = require('fs');

// prompts for messages that are not triggered by activcity

var prompts = [];
var content = fs.readFileSync(path.resolve(__dirname, prompts_file),"UTF-8");
var arr = content.split("\n");
for(var i=0; i< arr.length; i++){
  if(arr[i].trim()!=""){
    prompts.push(arr[i]);
  }
}

// last message object, just use the channel if it's not populated
var last_message = {channel: channel};

// time of last message, defaulting to now
var last_message_time = 0;
// (new Date).getTime()/1000;


// not sure this is the best way
// this does a test for the number of seconds since the last message
// if it's above a certain length of time, then there's a 25% chance I will respond
// if I do, I'll use one of the prompts

function decide_whether_to_speak(){
  var lm = last_message_time/60000;
  var which_prompt = getRandomIntInclusive(0,prompts.length -1);
  var shall_I = n_percent(spontaneous_speech_percent);

  var milliseconds = (new Date).getTime();
  var seconds_since_last_message = parseInt(milliseconds/1000) - parseInt(last_message_time);

  console.log("shall I speak? using max secs wait "+spontaneous_wait_time_max_secs+" and min "+spontaneous_wait_time_min_secs+" "+seconds_since_last_message+" secs since last message");

// in seconds, should be bigger than the setInterval below
// needs to be random or all bots will speak at the same time if started up at a similar time
  var wait_time = getRandomIntInclusive(spontaneous_wait_time_min_secs,spontaneous_wait_time_max_secs);

  if(seconds_since_last_message > wait_time){ // seconds 
    console.log("enough seconds have elapsed since specified random wait time "+wait_time);
    console.log("shall I speak randomly? "+shall_I);
    if(shall_I == true){
      var m = prompts[which_prompt];
      console.log("prompt is "+m);
      respond_to_message(last_message, m)
    }
  }
}

// decide whether to speak every n minutes

setInterval(function() {
   decide_whether_to_speak();
}, parseInt(decide_whether_to_speak_interval_secs)*1000); 


// random int utility method

function getRandomIntInclusive(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// utility method for a percentage

function n_percent(percent){
  var r = getRandomIntInclusive(1,100);
  if (r <= percent){
    return true;
  }
  return false;
}

// slack stuff

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
      console.log("Responding to message "+message_text);
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
               console.log("results are \n"+to_send);

               // pick one at random
               to_send.sort(() => Math.random() - 0.5);

               var ts = "";
               for(var i=0; i< to_send.length; i++){
                 ts = to_send[i].trim();
                 // if needed 
                 // ts = test_exclude(ts);
                 if(ts!=""){
                     break;
                 }
               }

               console.log("to_send randomly picked is: "+ts);

               var shall_I = n_percent(percent_reply_to);
               console.log("Shall I respond with @? "+shall_I+" (from % "+percent_reply_to+")");

               if(shall_I == true && message.user){ // sometimes if no-one has spoken recently, user may be empty; channel won't
                  slack.sendMessage("<@"+message.user+"> "+ts, message.channel);
               }else{
                  slack.sendMessage(ts, message.channel);
               }
             }
         });

      }, typing_timeout); // random millisecs
}


slack.on('message', (message) => {
  console.log("Got a message!");
  // Structure of `event`: <https://api.slack.com/events/message>
  //console.log(message);

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
           console.log("Got a match for my keywords "+matches[j]);
           got_a_match = true;
           n_text = n_text.replace(matches[j],"");// if you don't filter it out it affects the output!
        }
      }
      if(got_a_match == true){
        console.log("got_a_match is "+got_a_match+" so responding to message "+n_text);
        respond_to_message(message, n_text)
      }else{
      // every random nth message, chip in
        console.log("no match for me "+got_a_match);
        var shall_I = n_percent(percent_reply_randomly);
        console.log("shall_I respond randomly? "+shall_I+" with % "+percent_reply_randomly);
        if(shall_I == true){
          console.log("responding!");
          respond_to_message(message, message.text)
        }
      }
    }//else no message text

 } catch (err){
    console.log(err);
 }

})



