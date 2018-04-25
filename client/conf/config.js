TWCONFIG = {
	api: {
		relogin: 'api/relogin',
		stream: 'api/stream',
		fave: 'api/fave',
		user: 'api/user',
		show: 'api/show',
		follow: 'api/follow',
		get: 'api/get',
		post: 'api/post',
		token: 'api/token',
		geo: 'api/address',
		echo: 'api/echo',
		auto: 'api/autologin',
		fbcheck: 'api/fbcheck',
		fbpost: 'api/fbpost',
		imgecho: 'api/imgecho',
		connections: 'api/connections',
		completedb: 'api/completedb',
		mt: 'api/mt',
		upload: 'https://tw3.herokuapp.com/upload',
		rmtweet: 'api/rmtweet'
	},
	autologinCheck: function(cookie) {
		return cookie.match(/tw3et=ernity/) && cookie.match(/tw3tk=[\w+]/);
	}
};
APP_NAME='- thaiWitter3';
TWITTER_CONFIG={};
