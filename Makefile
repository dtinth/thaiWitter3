

all : config deploy

config :
	echo 'TWITTER_CONFIG=' > client/twitter-config.js
	curl https://api.twitter.com/1/help/configuration.json >> client/twitter-config.js

deploy :
	date '+%s000' > deployed.json


