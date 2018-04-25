var oauth = require('oauth')
var crypto = require('crypto')
var stats = require('./../stats')
var defer = require('q').defer
var Q = require('q')
var request = require('request')
var Levenshtein = require('levenshtein')

var CK = {
	SESSION: 'tw3ss',
	TOKENS: 'tw3tk',
	USERINFO: 'tw3ui',
	AUTOLOGIN: 'tw3et',
	AUTOVALUE: 'ernity',
	FACEBOOK: 'tw3fb'
}

// Edited on 2018: Moved hardcoded credentials to environment variables.
var getEnv = function(name, description, defaultValue) {
	if (!process.env[name] && !defaultValue) {
		throw new Error('Missing environment variable: "' + name + '" (' + description + ')');
	}
	return process.env[name] || defaultValue;
}
var CSK = getEnv('THAIWITTER_CONSUMER_KEY', 'Consumer key for Twitter API');
var CSS = getEnv('THAIWITTER_CONSUMER_SECRET', 'Consumer secret for Twittet API');
var CPK = getEnv('THAIWITTER_CIPHER_KEY', 'A secret string for encrypting data. Just make one up!', process.env.NODE_ENV !== 'production' ? 'dev' : null);

// Since Facebook has deprecated publish_stream permission, this no longer works.
var FBK = getEnv('FACEBOOK_APP_ID', 'Facebook App ID', '108037652642511');
var FBS = getEnv('FACEBOOK_APP_SECRET', 'Facebook app secret', '...');
// End edit

function TwitterAPIWrapper(api) {
	this.api = api
}

TwitterAPIWrapper.prototype = {
	_callback: function(d) {
		var that = this
		return function(err, data, resp) {
			try {
				if (err) {
					if (String(err.data).indexOf('<h2>Twitter is over capacity.</h2>') > -1) {
						console.log('Twitter Overcapacity! D:');
						d.reject(new Error('Twitter is Over Capacity'))
						return
					}
					var c = resp.req
					console.log('Twitter API Error!', c.method, c.url, resp.statusCode, err);
					d.reject(new Error(err))
					return
				}
				d.resolve(data)
			} catch(e) {
				d.reject(e)
			}
		}
	},
	get: function(url, token) {
		var d = defer()
		this.api.get(url, token.token, token.secret, this._callback(d))
		return d.promise
	},
	post: function(url, token, params) {
		var d = defer()
		this.api.post(url, token.token, token.secret, params, this._callback(d))
		return d.promise
	}
}

function ReqHandler(req, res) {
	this.req = req;
	this.res = res;
	this.api = new oauth.OAuth(
		"https://api.twitter.com/oauth/request_token",
		"https://api.twitter.com/oauth/access_token",
		CSK, CSS, "1.0", this.getCallbackURL(), 'HMAC-SHA1', 64
	);
	this.twitter = new TwitterAPIWrapper(this.api)
}

var md5 = function(x) {
	var hash = crypto.createHash('md5');
	hash.update(x);
	return hash.digest('hex');
};

var sign = function(x) {
	return md5(md5(x + 'thaiWitter 3 is powered by....') + md5('node.js!!' + x)).substr(1, 30);
};

ReqHandler.prototype = {
	getCallbackURL: function() {
		return this.getBase() + '/thaiWitter/api/callback' + (this.isHTTPS() ? '?https=YAH' : '');
	},
	getFacebookCallbackURL: function() {
		var after = this.getBase() + '/thaiWitter/api/fbcallback' + (this.isHTTPS() ? '?https=YAH' : '');
		return 'http://beta.tw.dt.in.th/thaiWitter/api/fbbounce?redir=' + encodeURIComponent(after) + '&sig=' + encodeURIComponent(sign(after));
	},
	isHTTPS: function() {
		return this.req.param('https') == 'YAH';
	},
	getBase: function() {
		return (this.isHTTPS() ? 'https' : 'http') + '://' + this.req.header('Host', 'beta.tw.dt.in.th');
	},
	getCookie: function(name) {
		return this.req.cookies[name];
	},
	setCookie: function(name, value, forever) {
		var options = {};
		options.path = '/thaiWitter/';
		if (forever) options.maxAge = 86400 * 365 * 1000;
		this.res.cookie(name, this.req.cookies[name] = value, options);
	},
	getSignedCookie: function(name) {
		var cookie = this.getCookie(name);
		if (cookie != null && cookie.length >= 30) {
			if (cookie.substr(0, 30) == sign(name + '@@' + cookie.substr(30))) return cookie.substr(30);
		}
		return null;
	},
	setSignedCookie: function(name, value, forever) {
		this.setCookie(name, sign(name + '@@' + value) + value, forever);
	},
	setEncryptedCookie: function(name, value, forever) {
		var ciph = crypto.createCipher('bf', CPK);
		var d = ciph.update(value, 'utf8', 'hex');
		this.setSignedCookie(name, d + ciph.final('hex'), forever);
	},
	getEncryptedCookie: function(name) {
		var cookie = this.getSignedCookie(name);
		if (cookie == null) return null;
		var deci = crypto.createDecipher('bf', CPK);
		var d = deci.update(cookie, 'hex', 'utf8');
		return d + deci.final('utf8');
	},
	getSession: function() {
		if (this._session) {
			return this._session;
		}
		var data = this.getSignedCookie(CK.SESSION);
		if (data != null) {
			if (data.match(/^([0-9a-f]{32})$/i)) {
				return this._session = data;
			}
		}
		this._session = data = md5(new Date().getTime() + '^_^');
		this.setSignedCookie(CK.SESSION, this._session);
		return this._session;
	},
	getToken: function() {
		var sid = this.getSession();
		return md5('HELLOWORLD' + sid) + md5(sid + 'thaiWitter :) :) :)~');
	},
	getTokenFromCookie: function() {
		var data = this.getSignedCookie(CK.TOKENS);
		if (data == null) return null;
		data = data.split(';;');
		if (data.length != 3) return null;
		if (data[0] != 'access' && data[0] != 'request') return null;
		if (data[0] == 'access') stats.users.log(data[1]);
		return {
			type: data[0],
			token: data[1],
			secret: data[2]
		};
	},
	saveTokenToCookie: function(token, forever) {
		this.setSignedCookie(CK.TOKENS, [token.type, token.token, token.secret].join(';;'), forever);
	},
	requireAuth: function(cont, success) {
		var that = this, token;
		if (!(token = this.getTokenFromCookie())) {
			return this.requestRequestToken(cont);
		}
		if (token.type == 'request') {
			return this.requestRequestToken(cont);
		}
		if (this.getCookie(CK.AUTOLOGIN) == CK.AUTOVALUE) {
			this.setCookie(CK.AUTOLOGIN, CK.AUTOVALUE, true);
			this.saveTokenToCookie(token, true);
		}
		success.call(this, token);
	},
	requestRequestToken: function(cont) {
		var that = this;
		this.api.getOAuthRequestToken(function(err, rt, rts, data) {
			try {
				if (err) return cont(err);
				that.saveTokenToCookie({
					type: 'request',
					token: rt,
					secret: rts
				});
				return cont({
					redirect: 'https://api.twitter.com/oauth/authorize?oauth_token=' + rt,
					message: 'Please authenticate!'
				});
			} catch(e) { return cont(e); }
		});
	},
	callApi: function(cont, c, token) {
		c.original_url = c.url;
		for (var i in c.params) {
			c.url += (c.url.indexOf('?') > -1 ? '&' : '?') + encodeURIComponent(i) + '=' + encodeURIComponent(c.params[i]);
		}
		var res = this.res
		if (this.req.param('doecho') == 'yes') {
			var echo = {
				endpoint: this.api.signUrl(c.url, token.token, token.secret, c.method),
				data: null
			};
			if (c.method == 'POST') {
				var question = echo.endpoint.indexOf('?')
				if (question > -1) {
					echo.data = echo.endpoint.substr(question + 1);
					echo.endpoint = echo.endpoint.substr(0, question);
				} else {
					echo.data = '';
				}
			}
			return cont('echo:' + JSON.stringify(echo));
		}
		var apiHandler = function(err, data, resp) {
			if (process.env.LOG_RESP) console.log(resp);
			if (resp) {
				res.header('X-Rate-Limit-Limit', resp.headers['x-rate-limit-limit'])
				res.header('X-Rate-Limit-Remaining', resp.headers['x-rate-limit-remaining'])
				res.header('X-Rate-Limit-Reset', resp.headers['x-rate-limit-reset'])
			}
			try {
				if (err) {
					if (resp.statusCode == '429') {
						var info = {
							twitter: new Date(resp.headers['date']).getTime(),
							reset: resp.headers['x-rate-limit-reset'] * 1000,
							now: new Date().getTime()
						};
						return cont({ "error": 'ratelimit', 'ratelimit': info });
					}
					if (String(err.data).indexOf('<h2>Twitter is over capacity.</h2>') > -1) {
						console.log('Overcapacity! D:');
						return cont({ "error": 'overcapacity', 'overcapacity': 'OVERCAPACITY!!!111' });
					}
					console.log('Twitter API Error!', c.method, c.url, resp.statusCode, err);
					return cont({ "error": JSON.stringify(err) });
				}
				return cont(data);
			} catch(e) { return cont(e); }
		};
		if (c.method == 'GET') {
			this.api.get(c.url, token.token, token.secret, apiHandler);
		} else if (c.method == 'POST') {
			this.api.post(c.original_url, token.token, token.secret, c.params, apiHandler);
		} else {
			cont(new Error('YA REQ METHOD IZNT GOOD!!'));
		}
	},
	getFacebookUser: function() {
		var ck = this.getEncryptedCookie(CK.FACEBOOK);
		if (ck == null) return null;
		try {
			return JSON.parse(ck);
		} catch(e) { return null; }
	},
	jsonp: function(obj) {
		var cb = this.req.param('callback');
		var data = JSON.stringify(obj, null, 4);
		if (cb != null) data = cb + '(' + data + ');';
		return data;
	}
};

function router(figurer) {
	return function(cont) {
		var that = this;
		this.requireAuth(cont, function(token) {
			try {
				that.twitterToken = token
				var c = figurer.call(that,
					function(x) { return that.req.param(x); },
					{ method: 'GET', url: null, params: {} },
					cont);
				if (c == 'off my way') {
					return;
				}
				if (!c || c.url == null) {
					throw new Error('NAHHH URL >>_<<!!');
				}
				return that.callApi(cont, c, token);
			} catch (e) { return cont(e); }
		});
	}
}

function socket_handler(callback) {
	return function(res) {
		res.setEncoding('utf8');
		var buffer = '';
		res.on('data', function(chunk) {
			buffer += chunk;
		});
		res.on('end', function() {
			callback(buffer, res);
		});
	};
}

function get(url) {
	var d = defer()
	request.get({ url: url }, d.makeNodeResolver())
	return d.promise
}

function post(url, form) {
	var d = defer()
	request.post({ url: url, form: form }, d.makeNodeResolver())
	return d.promise
}


var base = 'https://api.twitter.com';

// return a timeline of latest list
var latestList = function(user, slug, cont) {

	var that = this

	function getList(cursor, result) {
		console.log('getting cursor', cursor)
		return that.twitter.get(base + '/1.1/lists/members.json?' +
			'owner_screen_name=' + encodeURIComponent(user) + '&' +
			'slug=' + encodeURIComponent(slug) + '&' +
			'cursor=' + encodeURIComponent(cursor) + '&' +
			'include_entities=true', that.twitterToken
		)
		.then(JSON.parse)
		.then(function(response) {
			if (!response.users) {
				throw new Error('NO USEASSHH ROUNDDD')
			}
			result.push.apply(result, response.users)
			if (response.next_cursor_str == '0') {
				return result
			} else {
				return getList(response.next_cursor_str, result)
			}
		})
	}

	getList('-1', [])
	.then(function(users) {
		var statuses = users.map(function(user) {
			var status = user.status
			if (!status) return null
			delete user.status
			status.user = user
			delete status.retweeted_status
			return status
		}).filter(function(status) {
			return status != null
		})
		statuses.sort(function(a, b) {
			return b.id - a.id
		})
		cont(statuses)
	})
	.fail(cont)

}

var get_router = router(function(p, r, cont) {
	if (p('sid')) r.params.since_id = p('sid');
	r.params.include_entities = '1';
	r.url = base + '/1.1/statuses/home_timeline';
	var tl = p('timeline');
	if (tl == 'mentions') {
		r.url = base + '/1.1/statuses/mentions_timeline';
		this.res.header('X-thaiWitter-Announcement', '#thaiWitter switched to the new Twitter API, because Twitter\'s shutting down the old one.' +
			' Because of this, in <b>home and mentions</b> timeline you can refresh only 15 times in 15 minutes or you\'ll hit the rate limit.' +
			' Please consider using user stream, using list timeline, or make the refresh rate at least 75 seconds.');
	} else if (tl == 'faves') {
		r.url = base + '/1.1/favorites/list';
	} else if (tl == 'dms') {
		r.url = base + '/1.1/direct_messages';
	} else if (tl == 'user') {
		var u = ('' + p('u')).split('/');
		if (u.length == 2) {
			r.params.include_rts = "true";
			if (u[1].charAt(u[1].length - 1) == '+') {
				u[1] = u[1].substr(0, u[1].length - 1);
			}
			if (u[1].charAt(u[1].length - 1) == '!') {
				u[1] = u[1].substr(0, u[1].length - 1);
				latestList.call(this, u[0], u[1], cont)
				return 'off my way'
			}
			r.params.owner_screen_name = u[0];
			r.params.slug = u[1];
			r.url = base + '/1.1/lists/statuses';
		} else {
			r.url = base + '/1.1/statuses/user_timeline';
			r.params.screen_name = u[0];
			r.params.include_rts = "true";
		}
	} else if (tl == 'search') {
		r.url = base + '/1.1/search/tweets';
		r.params.include_entities = true;
		r.params.q = p('q');
	} else {
		this.res.header('X-thaiWitter-Announcement', '#thaiWitter switched to the new Twitter API, because Twitter\'s shutting down the old one.' +
			' Because of this, in <b>home and mentions</b> timeline you can refresh only 15 times in 15 minutes or you\'ll hit the rate limit.' +
			' Please consider using user stream, using list timeline, or make the refresh rate at least 75 seconds.');
	}
	r.url += '.json';
	return r;
});

function protector(next) {
	return function(cont) {
		if (!this.req.body) {
			return cont(new Error('SRY POST NLY'));
		}
		if (this.getToken() != this.req.body.tk) {
			return cont(new Error('Y U NO SESSION TOKEN!?'));
		}
		return next.call(this, cont);
	};
}

function responseText(x) {
	return x[1]
}
function parseJSON(x) {
	return JSON.parse(x)
}

function authFilter(next) {
	return function(cont) {
		var that = this;
		this.requireAuth(cont, function(token) {
			return next.call(that, cont, token);
		});
	};
}

var actions = {
	'get': function(cont) {
		var that = this;
		var userinfo = this.getSignedCookie(CK.USERINFO);
		var token = this.getTokenFromCookie();
		var announcements = ''; // 'You are using a preview version of thaiWitter. Report bugs to @dtinth kthxbye.';
		this.res.header('X-thaiWitter-Announcement', announcements);
		if (token) {
			if (userinfo) {
				userinfo = userinfo.split(';;');
				if (userinfo[0] == token.token) {
					this.res.header('X-Twitter-Username', userinfo[2]);
					return get_router.call(this, cont);
				}
			}
			return this.api.get(base + '/1.1/account/verify_credentials.json', token.token, token.secret, function(err, data, resp) {
				try {
					var d = JSON.parse(data);
					if (d.id_str != null) {
						userinfo = [token.token, d.id_str, d.screen_name];
						that.res.header('X-Twitter-Username', userinfo[2]);
						that.setSignedCookie(CK.USERINFO, userinfo.join(';;'));
					}
				} catch(e) {};
				return get_router.call(that, cont);
			});
		}
		return get_router.call(this, cont);
	},
	'rmtweet': protector(router(function(p, r) {
		var id = p('id');
		if (id != null && typeof id == 'string' && id.match(/^\d+$/)) {
			r.url = base + '/1.1/statuses/destroy/' + id + '.json';
			r.method = 'POST';
		}
		return r;
	})),
	'post': protector(router(function(p, r) {
		var irp = p('irp');
		var rtto = p('rtto');
		if (rtto != null && typeof rtto == 'string' && rtto.match(/^\d+$/)) {
			r.url = base + '/1.1/statuses/retweet/' + rtto + '.json';
			r.method = 'POST';
			return r;
		}
		r.url = base + '/1.1/statuses/update.json';
		r.method = 'POST';
		if (irp != null) r.params.in_reply_to_status_id = irp;
		r.params.status = p('value');
		var lat = p('lat'), lng = p('lng');
		if (lat != null && lng != null) {
			r.params.lat = 1 * lat;
			r.params['long'] = 1 * lng;
			r.params.display_coordinates = "true";
		}
		return r;
	})),
	'fave': protector(router(function(p, r) {
		var id = p('id');
		if (typeof id == "string" && id.match(/^\d+$/)) {
			var mode = p('mode') == 'destroy' ? 'destroy' : 'create';
			if (mode == 'create') {
				r.url = base + '/1.1/favorites/create.json';
				r.method = 'POST';
			} else {
				r.url = base + '/1.1/favorites/destroy.json';
				r.method = 'POST';
			}
			r.params['id'] = id;
			return r;
		}
	})),
	'connections': protector(router(function(p, r) {
		var u = ('' + p('u')).split('/');
		var mode = p('mode') == 'destroy' ? 'destroy' : 'create';
		if (u.length == 2) {
			r.url = base + '/1.1/lists/subscribers/' + mode + '.json';
			r.params.owner_screen_name = u[0];
			r.params.slug = u[1].replace(/\+$/, '');
			r.method = 'POST';
		} else {
			r.url = base + '/1.1/friendships/' + mode + '.json';
			r.params.screen_name = u[0];
			r.method = 'POST';
		}
		return r;
	})),
	'user': router(function(p, r) {
		var u = ('' + p('u')).split('/');
		if (u.length == 2) {
			r.url = base + '/1.1/lists/show.json';
			if (p('members') == 'listlistlist') {
				r.url = base + '/1.1/lists/members.json';
			}
			r.params.owner_screen_name = u[0];
			r.params.slug = u[1].replace(/\+$/, '');
		} else {
			r.url = base + '/1.1/users/show.json';
			r.params.screen_name = u[0];
		}
		return r;
	}),
	'show': router(function(p, r) {
		var id = '' + p('id');
		if (id.match(/^\d+$/)) {
			r.url = base + '/1.1/statuses/show/' + id + '.json';
			return r;
		}
	}),
	'rate': router(function(p, r) {
		r.url = base + '/1.1/application/rate_limit_status.json';
		return r;
	}),
	'echo': authFilter(function(cont, token) {
		cont('Authorization: ' + this.api.authHeader(base + '/1.1/account/verify_credentials.json', token.token, token.secret, 'GET'));
	}),
	'imgecho': authFilter(function(cont, token) {
		cont('Authorization: ' + this.api.authHeader('https://api.twitter.com/1.1/statuses/update_with_media.json', token.token, token.secret, 'POST'));
	}),
	'stream': authFilter(function(cont, token) {
		cont(this.api.signUrl('https://userstream.twitter.com/1.1/user.json', token.token, token.secret, 'GET'));
	}),
	'follow': authFilter(function(cont, token) {
		var that = this, resp1, resp2
		Q.all([
			this.twitter.get(base + '/1.1/lists/list.json', token)
				.then(function(resp) { resp1 = resp; }),
			this.twitter.get(base + '/1.1/saved_searches/list.json', token)
				.then(function(resp) { resp2 = resp; }),
		])
			.then(function() {
				cont('{"lists":' + resp1 + ',"searches":' + resp2 + '}');
			})
			.fail(cont)
	}),
	'mt': authFilter(function(cont, token) {
		Q.all([
			this.twitter.get(base + '/1/statuses/show.json'
				+ '?id=' + encodeURIComponent(this.req.param('id'))
				, token)
				.then(parseJSON),
			this.twitter.get(base + '/1/statuses/user_timeline.json'
				+ '?screen_name=' + encodeURIComponent(this.req.param('u'))
				+ '&max_id=' + encodeURIComponent(this.req.param('id'))
				, token)
				.then(parseJSON)
		])
			.spread(function(me, timeline) {
				var text = me.text
				var min
				for (var i = 0; i < timeline.length; i ++) {
					var c = timeline[i]
					var dist = new Levenshtein(c.text, text).distance
					if (me.id_str == c.id_str) continue
					if (min == null || dist < min.distance) {
						min = { status: c, distance: dist }
					}
				}
				cont(min.status)
			})
			.fail(cont)
	}),
	'completedb': authFilter(function(cont, token) {
		var that = this
		var data1, data2
		this.twitter.get(base + '/1.1/statuses/user_timeline.json?count=100&include_entities=true', token)
			.then(parseJSON)
			.then(function(data) {
				data1 = data
				return that.twitter.get(base + '/1.1/statuses/mentions_timeline.json?count=100', token)
			})
			.then(parseJSON)
			.then(function(data) {
				data2 = data
			})
			.then(function() {
				var obj = {};
				function process(what, date, type) {
					var id = what.id_str || what.id;
					var time = new Date(date).getTime();
					var o = obj[id];
					if (!o) o = obj[id] = { id: id, id_str: String(id), count: 0, lastInteracted: -1 };
					o.count ++;
					if (time > o.lastInteracted) {
						o.screen_name = what.screen_name;
						o.name = what.name;
						o.lastInteracted = time;
					}
					if (o[type] == null || time > o[type]) {
						o[type] = time;
					}
				}
				for (var i = 0; i < data1.length; i ++) {
					var c = data1[i];
					if (c.entities && c.entities.user_mentions) {
						var l = c.entities.user_mentions;
						for (var j = 0; j < l.length; j ++) {
							process(l[j], c.created_at, 'outgoing');
						}
					}
				}
				for (var i = 0; i < data2.length; i ++) {
					var c = data2[i];
					process(c.user, c.created_at, 'incoming');
				}
				var list = [];
				for (var i in obj) list.push(obj[i]);
				cont(list);
			})
			.fail(cont)
	}),
	'relogin': protector(function(cont) {
		this.requestRequestToken(cont);
	}),
	'token': function(cont) {
		var token = this.getToken();
		return cont('#S#' + token + '#E#');
	},
	'autologin': protector(function(cont) {
		var cookie = this.getSignedCookie(CK.TOKENS);
		var fbcookie = this.getEncryptedCookie(CK.FACEBOOK);
		var flag = false;
		if (this.req.body.enable == '1') {
			this.setCookie(CK.AUTOLOGIN, CK.AUTOVALUE, true);
			flag = true;
		} else {
			this.setCookie(CK.AUTOLOGIN, 'session');
		}
		if (cookie   != null) this.setSignedCookie(CK.TOKENS, cookie, flag);
		if (fbcookie != null) this.setEncryptedCookie(CK.FACEBOOK, fbcookie, flag);
		cont({ scs: "success! yeah!" });
	}),
	'callback': function(cont) {
		var that = this, token;
		if (!(token = this.getTokenFromCookie())) {
			return cont(new Error('I CAN HAZ TOKEN?'));
		}
		if (token.type != 'request') {
			return cont(new Error('I CAN HAZ REQUEST TOKEN?'));
		}
		if (token.token != this.req.param('oauth_token')) {
			return cont(new Error('UR TOKEN IZ WRONG'));
		}
		this.api.getOAuthAccessToken(token.token, token.secret, this.req.param('oauth_verifier'), function(err, rt, rts, data) {
			try {
				if (err) return cont(new Error(err.data));
				that.saveTokenToCookie({
					type: 'access',
					token: rt,
					secret: rts
				});
				that.setSignedCookie(CK.USERINFO, [rt, data.user_id, data.screen_name].join(';;'));
				return that.res.redirect(that.getBase() + '/thaiWitter/');
			} catch(e) { return cont(e); }
		});
	},
	'address': function(cont) {
		var lat = this.req.param('lat') * 1, lng = this.req.param('lng') * 1, latlng = lat + ',' + lng;
		get('http://maps.googleapis.com/maps/api/geocode/json'
				+ '?sensor=' + encodeURIComponent(this.req.param('sensor') || 'false')
				+ '&latlng=' + encodeURIComponent(latlng))
			.then(responseText)
			.then(parseJSON)
			.then(function(json) {
				return cont(json.results[0].formatted_address ? lat + ', ' + lng + '<br>' + json.results[0].formatted_address : lat + ', ' + lng);
			})
			.fail(cont)
	},
	'fbcheck': function(cont) {
		var data = {}, user;
		if (this.req.body && this.getToken() == this.req.body.tk && this.req.param('signout') == 'outtahere') {
			this.setEncryptedCookie(CK.FACEBOOK, 'null', this.getCookie(CK.AUTOLOGIN) == CK.AUTOVALUE);
			data.loggedIn = false;
		} else if ((user = this.getFacebookUser()) != null) {
			data.loggedIn = true;
			data.name = user.name;
			data.id   = user.id;
		} else {
			data.loggedIn = false;
		}
		var ruri = this.getFacebookCallbackURL();
		data.redirect = 'https://www.facebook.com/dialog/oauth?client_id=' + encodeURIComponent(FBK) + '&redirect_uri=' + encodeURIComponent(ruri) + '&scope=user_about_me,publish_stream,offline_access';
		cont(data);
	},
	'fbpost': protector(function(cont) {
		var data = {}, user;
		if ((user = this.getFacebookUser()) != null) {

			var form = {}

			var picture = this.req.param('picture');
			var link = this.req.param('link');
			var linkParam = '';
			if (picture != null) form.picture = picture
			if (link != null) form.link = link
			form.access_token = user.token
			form.message = this.req.param('value')

			post('https://graph.facebook.com/me/feed', form)
				.spread(function(res, data) {
					cont({ success: res.statusCode == 200 });
				})
				.fail(cont)

		} else {
			cont({success: false});
		}
	}),
	'fbbounce': function(cont) {
		var url = this.req.param('redir');
		if (!url) return cont(new Error('Y U NO SPEZIFI URL'));
		if (sign(url) != this.req.param('sig')) return cont(new Error('OOPS SIGNACHUR IZ INVALID'));
		return this.res.redirect(url + (url.indexOf('?') == -1 ? '?' : '&') + 'code=' + encodeURIComponent(this.req.param('code')));
	},
	'fbcallback': function(cont) {
		var code = this.req.param('code');
		if (code == null) return cont(new Error('Y U NO CODE??!!'));
		var that = this;
		var info = {};
		get('https://graph.facebook.com/oauth/access_token'
				+ '?client_id=' + encodeURIComponent(FBK)
				+ '&redirect_uri=' + encodeURIComponent(this.getFacebookCallbackURL())
				+ '&client_secret=' + encodeURIComponent(FBS)
				+ '&code=' + encodeURIComponent(code))
			.then(responseText)
			.then(function(data) {
				var token, match;
				console.log(arguments)
				if ((match = data.match(/access_token=([^&]+)/))) {
					token = decodeURIComponent(match[1]);
				}
				if (!token) throw new Error('VERYFICISHUN COED IZZNT VALUD');
				info.token = token;
				return get('https://graph.facebook.com/me?access_token=' + encodeURIComponent(token))
			})
			.then(responseText)
			.then(parseJSON)
			.then(function(userInfo) {
				info.name = userInfo.name;
				info.id = userInfo.id;
				that.setEncryptedCookie(CK.FACEBOOK, JSON.stringify(info), that.getCookie(CK.AUTOLOGIN) == CK.AUTOVALUE);
				that.res.redirect(that.getBase() + '/thaiWitter/fb-page.html')
				console.log('redirected')
			})
			.fail(cont)
	},
	'twenv': function(cont) {
		cont(process.env);
	},
	'twheaders': function(cont) {
		cont(JSON.stringify({
			headers: this.req.headers
		}, null, 4));
	},
	'twfbdebug': function(cont) {
		cont(JSON.stringify({
			facebookCookie: this.getCookie(CK.FACEBOOK),
			facebookCookieUnsigned: this.getSignedCookie(CK.FACEBOOK),
			facebookCookieDecrypted: this.getEncryptedCookie(CK.FACEBOOK),
			facebookUser: this.getFacebookUser()
		}, null, 4));
	},
	'twstats': function(cont) {
		cont(this.jsonp({
			activeUsersLastHour:   stats.users.getCount(),
			requestsLastHour:      stats.requests.getCount(),
			maxActiveUsersPerHour: stats.users.getMax(),
			maxRequestsPerHour:    stats.requests.getMax()
		}));
	},
	'twmem': function(cont) {
		cont(this.jsonp(process.memoryUsage()));
	},
	'twstatus': function(cont) {
		cont(this.jsonp({
			version: global.thaiWitterVersion,
			deployed: stats.getDeployedDiff(),
			stats: {
				users: stats.users.getCount(),
				requests: stats.requests.getCount(),
				uptime: stats.getUptime()
			},
			memory: process.memoryUsage().rss
		}));
	}
};

module.exports = function thaiWitterMiddleware() {

	return function(req, res, next) {
		var m, action;
		stats.requests.log();
		if (!(m = req.url.match(/^\/thaiWitter\/api\/(\w+)/i))) {
			return next(new Error('Y U NO USE CORREKT ROUET?'));
		}
		action = m[1];
		if (actions[action] == null) {
			return next(new Error('Y U NO USE KORRECT ACSHUN?!'));
		}
		try {
			actions[action].call(new ReqHandler(req, res), function(data) {
				if (data instanceof Error) {
					return next(data);
				}
				res.set('Content-Type', 'application/json; charset=utf-8')
				res.send(data);
			});
		} catch (e) {
			return next(e);
		}
	};

};







