# real_libby

Scripts and code to make a slack bot that's almost, but not quite entirely unlike Libby.

This code is a couple of hours' work and therefore adapts others' code and may in places be shit. All the shit parts are 
mine. It uses python for the ML parts, node for the slackbot and ruby and bash for scripting.

see https://planb.nicecupoftea.org/2019/07/20/real_libby-a-gpt-2-based-slackbot/ for more detail.


# For a Pi 4

Burn a 16GB+ SD card using Etcher

then, on a laptop

```
touch /Volumes/boot/ssh
nano /Volumes/boot/wpa_supplicant.conf
```

set wifi contents
```
country=GB
ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
update_config=1

network={
   ssid="foo"
   psk="bar"
}
```

Boot up the pi and log in.

## Use virtualenv

```
sudo apt-get install python3-venv
python3 -m venv env
cd env/
source bin/activate
```

## Download the gpt-2 model

Not actually sure if this is needed if you've built your own model, but anyway

```
git clone https://github.com/nshepperd/gpt-2.git
cd gpt-2/
git checkout finetuning
pip3 install -r requirements.txt 
python3 src/download_model.py 117M
```

## Add the fine-tuned model

'libby' is the name of my pre-built fine-tuned model - see the blog post or https://github.com/nshepperd/gpt-2/blob/finetuning/README.md for more detail on how

```
mv ~/libby models/
mv ~/real_libby_server.py src/
pip3 install flask
pip3 install numpy
sudo apt-get install libatlas-base-dev
curl -O https://www.piwheels.org/simple/tensorflow/tensorflow-1.13.1-cp37-none-linux_armv7l.whl
pip3 install tensorflow-1.13.1-cp37-none-linux_armv7l.whl
python3 src/real_libby_server.py
```

## Add the slackbot

```
sudo apt-get install npm
npm install
SLACK_API_TOKEN="xxx" node real_libby_slackbot.js
```

`real_libby_multi_slackbot.js` is a special version for when there are several bots and you want them to communicate.

## Add systemd scripts

```
sudo cp systemd/*.service /lib/systemd/system/
sudo systemctl enable /lib/systemd/system/real_libby_server.service
sudo systemctl start real_libby_server.service
sudo systemctl enable /lib/systemd/system/real_libby_slack.service
sudo systemctl start real_libby_slack.service

sudo tail -f /var/log/syslog 
```

## Running more than one

use 

```BOT_NAME="real_tim" SLACK_API_TOKEN="xxxx" /usr/bin/node slackbots/real_libby_multi_slackbot.js```

with a config file (see example)
