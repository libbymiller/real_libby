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

var fs = require('fs');

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

var exclude = []; // text as a list here

function test_exclude(ts){

   for (var i=0; i< exclude.length; i++){
     var regex = new RegExp( exclude[i], 'gi' );
     ts = ts.replace(regex," ")

   }
   return ts.trim();
}


function respond_to_message(message, message_text){

      var new_text = "http://0.0.0.0:8080/?text="+encodeURIComponent(message_text);
      console.log(new_text);
      // get the data from the server
      var command = 'curl "'+new_text+'"';

      console.log(command);

      slack.sendTyping(message.channel);

      child = exec(command, function (error, stdout, stderr) {
             if (error !== null) {
               console.log('exec error: ' + error);
             }else{
               var to_send = stdout.split("\n")
               var ts = "";
               console.log("stdout "+stdout);
               console.log("to_send "+ts);
               for(var i=0; i< to_send.length; i++){
                 ts = to_send[i];
                 ts = test_exclude(ts);
                 if(ts!=""){
                     break;
                 }
               }
               slack.sendMessage(ts, message.channel);                  

             }
      });

}


slack.on('message', (message) => {
  console.log("message!");
  // Structure of `event`: <https://api.slack.com/events/message>
  //console.log(message);
  try{
    if (message.user == bot.id) return; // Ignore bot's own messages
 
    var channel = message.channel;
    var user = message.user;

    // don't answer messages that don't include the name - you may need to get the underlying name. e.g. @U1HYTPHW3

    if(message.text && message.text.match("real_libby") ){

      var n_text = message.text;
      n_text = n_text.replace("real_libby",""); // if you don't filter it out it affects the output!
      respond_to_message(message, n_text)

    }else{
      // every random 7th message, chip in
      var shall_I = getRandomIntInclusive(0,7);
      console.log("shall_I "+shall_I);
      if(shall_I == 3){
        console.log("responding!");
        respond_to_message(message, message.text)
      }
    }
 } catch (err){
    console.log(err);
 }

})



