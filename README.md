# real_libby

Scripts and code to make a slack bot that's almost, but not quite entirely unlike Libby.

This code is a couple of hours' work and therefore adapts others' code and may in places be shit. All the shit parts are 
mine. It uses python for the ML parts, node for the slackbot and ruby and bash for scripting.

see http://planb.nicecupoftea.org for more detail.


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

## use virtualenv

```
virtualenv -p python3 env
cd env/
source bin/activate
```

## download the gpt-2 model

Not actually sure if this is needed if you've built your own model, but anyway

```
git clone https://github.com/nshepperd/gpt-2.git
git checkout finetuning
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
SLACK_API_TOKEN="xxx" node robo_libby.js
```

## Add systemd scripts

```
sudo cp systemd/*.service /lib/systemd/system/
sudo systemctl enable /lib/systemd/system/real_libby_server.service
sudo systemctl start real_libby_server.service
systemctl enable /lib/systemd/system/real_libby_slack.service
sudo systemctl start real_libby_slack.service
```


