// ==UserScript==
// @name        tumblr-lib-gm
// @description Tumblr api(v2) library for Grease Monkey scripts.
// @license     https://raw.githubusercontent.com/reppets/tumblr-lib-gm/master/LICENSE
// @namespace   reppets.net
// @version     1.0.2
// @require     https://cdn.rawgit.com/ddo/oauth-1.0a/91557b7ef8c38dad6a22f9471a5d0dc216a1afd4/oauth-1.0a.js
// @grant       GM_xmlhttpRequest
// ==/UserScript==

/**
 * constructs the client.
 * 
 * @constructor
 * @param {string} consumerKey - OAuth consumer key of the application.
 * @param {string} consumerSecret - OAuth consumer secret of the application.
 * @param {number} [logLevel] - Log level. Select one of {@link Tumblr.LOG_NONE}, {@link Tumblr.LOG_ERROR} or {@link Tumblr.LOG_DEBUG}.
 */
var Tumblr = function(consumerToken, logLevel) {
	function sha1(source) {
		source = source.concat(0x80);

		function rotateLeft(word, nBits) {
			return ((word << nBits) | (word >>> (32-nBits))) >>>0;
		}

		function sha1Block(i) {
			if (source.length <= i*64) {
				return (new Array(56)).fill(0)
						.concat([0,0,0,0,(source.length-1)*8>>24&0xff,(source.length-1)*8>>16&0xff,(source.length-1)*8>>8&0xff,(source.length-1)*8&0xff]);
			} else if (source.length <= (i+1)*64-8) {
				return source
						.slice(i*64,source.length)
						.concat(new Array(56-(source.length-i*64)).fill(0))
						.concat([0,0,0,0,(source.length-1)*8>>24&0xff,(source.length-1)*8>>16&0xff,(source.length-1)*8>>8&0xff,(source.length-1)*8&0xff]);
			} else if (source.length <= (i+1)*64) {
				return source
						.slice(i*64,source.length)
						.concat(new Array(64-(source.length%64)).fill(0));
			} else {
				return source.slice(i*64,(i+1)*64);
			}
		}

		var sha1NumOfBlocks = source.length <= 56 ? 1 : Math.ceil((source.length - 56) / 64) + 1;
		var h = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0];
		for (var i=0; i<sha1NumOfBlocks; i++) {
			var words=[];
			var block = sha1Block(i);
			for (var j=0; j<16; j++) {
				words[j] = (block[j*4]<<24 | block[j*4+1]<<16 | block[j*4+2]<<8 | block[j*4+3]) >>> 0;
			}
			for (;j<80; j++) {
				words[j]=rotateLeft((words[j-3] ^ words[j-8] ^ words[j-14] ^ words[j-16]) >>> 0, 1);
			}

			var v = [h[0], h[1], h[2], h[3], h[4]];
			for (var t=0; t<20; t++) {
				var tmp = (rotateLeft(v[0],5)+((v[1]&v[2] | ~v[1]&v[3]) >>> 0)+v[4]+words[t]+0x5a827999) >>> 0;
				v[4]=v[3]; v[3]=v[2]; v[2]=rotateLeft(v[1], 30); v[1]=v[0]; v[0]=tmp;
			}
			for (; t<40; t++) {
				var tmp = (rotateLeft(v[0],5)+((v[1]^v[2]^v[3]) >>> 0)+v[4]+words[t]+0x6ed9eba1) >>> 0;
				v[4]=v[3]; v[3]=v[2]; v[2]=rotateLeft(v[1], 30); v[1]=v[0]; v[0]=tmp;
			}
			for (; t<60; t++) {
				var tmp = (rotateLeft(v[0],5)+((v[1]&v[2] | v[1]&v[3] | v[2]&v[3]) >>> 0)+v[4]+words[t]+0x8f1bbcdc) >>> 0;
				v[4]=v[3]; v[3]=v[2]; v[2]=rotateLeft(v[1], 30); v[1]=v[0]; v[0]=tmp;
			}
			for (; t<80; t++) {
				var tmp = (rotateLeft(v[0],5)+((v[1]^v[2]^v[3]) >>> 0)+v[4]+words[t]+0xca62c1d6) >>> 0;
				v[4]=v[3]; v[3]=v[2]; v[2]=rotateLeft(v[1], 30); v[1]=v[0]; v[0]=tmp;
			}
			for(var k=0;k<5;k++) {
				h[k]=(h[k]+v[k])>>>0;
			}
		}

		var result=[];
		for(var l=0;l<5;l++) {
			result.push(h[l]>>24&0xff); result.push(h[l]>>16&0xff); result.push(h[l]>>8&0xff); result.push(h[l]&0xff);
		}
		return result;
	}

	function hmacSha1(data, key) {
		var blockLength=64;
		if (key.length > blockLength) {key = sha1(key);}
		key=key.concat(new Array(blockLength-key.length).fill(0));
		return sha1(key.map((v)=> v^0x5c).concat(sha1(key.map((v) => v^0x36).concat(data))));
	}

	function base64encode(bytes) {
		var b64strings = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z','0','1','2','3','4','5','6','7','8','9','+','/'];
		var result=[];
		for (var i=2; i<bytes.length; i+=3) {
			result.push(b64strings[bytes[i-2] >> 2]);
			result.push(b64strings[(bytes[i-2]&0x3) << 4 | bytes[i-1] >> 4]);
			result.push(b64strings[(bytes[i-1]&0xf) <<2 | bytes[i] >> 6]);
			result.push(b64strings[bytes[i]&0x3f]);
		}
		if (i==bytes.length) {
			// 2chars rest
			result.push(b64strings[bytes[i-2] >> 2]);
			result.push(b64strings[(bytes[i-2]&0x3) << 4 | bytes[i-1] >> 4]);
			result.push(b64strings[(bytes[i-1]&0xf) <<2]);
			result.push('=');
		} else if (i==bytes.length+1) {
			// 1char rest
			result.push(b64strings[bytes[i-2] >> 2]);
			result.push(b64strings[(bytes[i-2]&0x3) << 4 ]);
			result.push('=');
			result.push('=');
		}
		return result.join('');
	}

	function utf8ToBytes(string) {
		var s = unescape(encodeURIComponent(string));
		var r = [];
		for (var i=0; i<s.length; i++) {
			r.push(s.charCodeAt(i));
		}
		return r;
	}

	this.oauthClient = OAuth({
		consumer: consumerToken,
		signature_method: 'HMAC-SHA1',
		hash_function: function(baseString, key) {
			baseString = typeof baseString === 'string' ? utf8ToBytes(baseString) : baseString;
			key = typeof key === 'string' ? utf8ToBytes(key) : key;
			return base64encode(hmacSha1(baseString, key));
		}
	});

	/** current log level.
	 * @memberof# Tumblr
	 */
	this.logLevel = (typeof logLevel === 'number') ? logLevel : Tumblr.LOG_NONE;

	/**
	 * current consumer token.
	 * @memberof# Tumblr
	 */
	this.token = null;
};

/** Tumblr authorization URL. */
Tumblr.AUTHORIZE_URL = 'https://www.tumblr.com/oauth/authorize';

/** A constant for logLevel. Nothing will be logged. */
Tumblr.LOG_NONE=0;

/** A constant for logLevel. Only errors will be logged. */
Tumblr.LOG_ERROR=1;

/** A constant for logLevel. Errors and verbose information will be logged. */
Tumblr.LOG_DEBUG=2;

/**
 * returns a function decorated with logging.
 * If current log level is LOG_ERROR or LOG_DEBUG, the returned function logs error which the passed function throws.
 * If current log level is LOG_DEBUG, the returned function also logs argument information.
 * 
 * @protected
 * @param {string} f - a function to be decorated with logging functionality.
 * @return {function} decorated function
 */
Tumblr._log = function(f) {
	return function() {
		if (this.logLevel >= Tumblr.LOG_DEBUG) { console.log(f.name, arguments); }
		try {
			return f.apply(this, arguments);
		} catch(e) {
			if (this.logLevel >= Tumblr.LOG_ERROR) { console.log(f.name, e); }
			throw e;
		}
	};
}

/**
 * builds a url parser.
 * 
 * @protected
 * @param {string} url - url to be parsed
 * @return {Element} &lt;a&gt; (anchor) element which represents the passed url.
 */
Tumblr._parseURL = function(url) {
	var parser = document.createElement('a');
	parser.href = url;
	return parser;
};

/**
 * build a query string.
 * 
 * @protected
 * @param {object} map - key-value pairs to be parameterized.
 * @param {boolean} addQuestion - adds heading '?' if true.
 * @return {string} query string
 */
Tumblr._buildQuery = function(map, withQuestion) {
	var ar = [];
	for (var key in map) {
		if (map[key]===undefined || map[key]===null) {
			continue;
		}
		ar.push(encodeURIComponent(key)+'='+encodeURIComponent(map[key]));
	}
	if (ar.length === 0) {
		return '';
	}
	return (withQuestion ? '?' : '') +ar.join('&');
};

/**
 * sets access token to the client.
 * 
 * @function
 * @param {string} accessKey - OAuth access token.
 * @param {string} accessSecret - OAuth access token secret.
 */
Tumblr.prototype.setToken = function(token) {
	this.token = token;
}

Tumblr.prototype.getToken = function() {
	return Object.assign({}, this.token);
}

/**
 * makes a request with the OAuth tokens.
 * 
 * @function
 * @protected
 * @param {string} method - method for an HTTP request.
 * @param {string} url - URL for the request.
 * @param {object} data - key-value map for the request body.
 * @param {object} callbacks - key-value map of callback functions. Acceptable  keys are 'onabort', 'onerror', 'onload', 'onprogress', 'onreadystatechange' and 'ontimeout'.
 * @param {object} opts - key-value map of options which is passed to GM_xmlHttpRequest. Acceptable keys are 'context', 'synchronous' and 'timeout'.
 * @param {object} t - request token to override the one was set before.
 * @return {object} returened object from GM_xmlhttpRequest.
 */
Tumblr.prototype._oauthRequest = Tumblr._log(function _oauthRequest(method, url, data, args) {
	let token = args.token ? args.token : this.token;
	if (token == null) throw 'no access token is specified';

	args.method=method;
	args.url=url;
	args.data = data;
	if (method==='POST') {
		args.headers = {'Content-Type': 'application/x-www-form-urlencoded'};
	}
	args.headers = this.oauthClient.mergeObject(
		args.headers ? args.headers : {},
		this.oauthClient.toHeader(this.oauthClient.authorize(args, token)));	// authorize function uses only url, method, data properties.
	if (method==='GET') {
		let parser = Tumblr._parseURL(url);
		parser.search = Tumblr._buildQuery(data, true);
		args.url = parser.href;
		args.data = {};
	} else {
		args.data = Tumblr._buildQuery(data, false);
	}
	
	return GM_xmlhttpRequest(args);
});

/**
 * makes a request with the API key.
 * 
 * @function
 * @protected
 * @param {string} method - method for an HTTP request.
 * @param {string} url - URL for the request.
 * @param {object} data - key-value map for the request body.
 * @param {object} callbacks - key-value map of callback functions. Acceptable  keys are 'onabort', 'onerror', 'onload', 'onprogress', 'onreadystatechange' and 'ontimeout'.
 * @param {object} opts - key-value map of options which is passed to GM_xmlHttpRequest. Acceptable keys are 'context', 'synchronous' and 'timeout'.
 * @return {object} returened object from GM_xmlhttpRequest.
 */
Tumblr.prototype._apiKeyRequest = function(method, url, data, args) {
	return this._simpleRequest(method, url, Object.assign({'api_key': this.oauthClient.consumer.key}, data), args);
};

/**
 * makes a request without any authentication key.
 * 
 * @function
 * @protected
 * @param {string} method - method for an HTTP request.
 * @param {string} url - URL for the request.
 * @param {object} data - key-value map for the request body.
 * @param {object} callbacks - key-value map of callback functions. Acceptable  keys are 'onabort', 'onerror', 'onload', 'onprogress', 'onreadystatechange' and 'ontimeout'.
 * @param {object} opts - key-value map of options which is passed to GM_xmlHttpRequest. Acceptable keys are 'context', 'synchronous' and 'timeout'.
 * @return {object} returened object from GM_xmlhttpRequest.
 */
Tumblr.prototype._simpleRequest = Tumblr._log(function _simpleRequest(method, url, data, args) {
	args.method=method;
	if (method==='GET') {
		var parser=Tumblr._parseURL(url);
		parser.search=Tumblr._buildQuery(data, true);
		args.url=parser.href;
	} else {
		args.url=url;
		args.data=Tumblr._buildQuery(data, false);
	}
	return GM_xmlhttpRequest(args);
});

Tumblr.prototype._responseTypeDefault = function(args, defaultValue) {
	if (args != null) {
		if (args.responseType != null && args.synchronous!==true) { // if synchronous is true, setting responseType causes an error.
			args = Object.assign({}, args);
			args['responseType'] = defaultValue;
		}
	} else {
		args={responseType: defaultValue};
	}
	return args;
}

/**
 * retrieves a request token.
 * 
 * @function
 * @param {object} callbackURL - callback url for redirect.
 * @param {object} [callbacks] - key-value map of callback functions. Acceptable  keys are 'onabort', 'onerror', 'onload', 'onprogress', 'onreadystatechange' and 'ontimeout'.
 * @param {object} [opts] - key-value map of options which is passed to GM_xmlHttpRequest. Acceptable keys are 'context', 'synchronous' and 'timeout'.
 * @return {object} returened object from GM_xmlhttpRequest.
 */
Tumblr.prototype.getRequestToken = Tumblr._log(function getRequestToken(params) {
	params = Object.assign({}, params);
	Tumblr._requires(params, ['oauth_callback']);
	let data = Tumblr._sift(params, ['oauth_callback']);
	return this._oauthRequest('POST', 'https://www.tumblr.com/oauth/request_token', data, params);
});

/**
 * builds a url for authorization with a request token.
 * 
 * @function
 * @param {object} requestToken - request token.
 * @return {string} authorization url with query.
 */
Tumblr.prototype.getAuthorizeURL = function(requestToken) {
	return Tumblr.AUTHORIZE_URL+Tumblr._buildQuery({oauth_token: requestToken}, true);
}

/**
 * retrieves a access token.
 * 
 * @function
 * @param {string} oauthToken - request token.
 * @param {string} oauthTokenSecret - request token secret.
 * @param {string} oauthVerifier - oauth verifier.
 * @param {object} [callbacks] - key-value map of callback functions. Acceptable  keys are 'onabort', 'onerror', 'onload', 'onprogress', 'onreadystatechange' and 'ontimeout'.
 * @param {object} [opts] - key-value map of options which is passed to GM_xmlHttpRequest. Acceptable keys are 'context', 'synchronous' and 'timeout'.
 * @return {object} returened object from GM_xmlhttpRequest.
 */
Tumblr.prototype.getAccessToken = Tumblr._log(function getAccessToken(params) {
	params = Object.assign({}, params);
	Tumblr._requires(params, ['token', 'oauth_verifier']);
	let data = Tumblr._sift(params, ['oauth_verifier']);
	return this._oauthRequest('POST', 'https://www.tumblr.com/oauth/access_token', data, params);
});

/**
 * retrieves blog information.
 * 
 * @function
 * @param {string} blogID - specifies blog ID such as 'example.tumblr.com'
 * @param {object} [callbacks] - key-value map of callback functions. Acceptable  keys are 'onabort', 'onerror', 'onload', 'onprogress', 'onreadystatechange' and 'ontimeout'.
 * @param {object} [opts] - key-value map of options which is passed to GM_xmlHttpRequest. Acceptable keys are 'context', 'synchronous' and 'timeout'.
 * @param {object} [token] - access token to override the current token. It must be contains 'key' and 'secret' as keys.
 * @return {object} returened object from GM_xmlhttpRequest.
 */
Tumblr.prototype.getBlogInfo = Tumblr._log(function getBlogInfo(params) {
	params = Object.assign({}, params);
	Tumblr._requires(params, ['blogID']);
	params = this._responseTypeDefault(params, 'json');
	return this._apiKeyRequest('GET', 'https://api.tumblr.com/v2/blog/' + Tumblr._normalizeBlogID(params.blogID) + '/info', null, params);
});

/**
 * retrieves a blog avatar.
 * 
 * @function
 * @param {string} blogID - specifies blog ID such as 'example.tumblr.com'
 * @param {number} size - size of the avatar. It must be one of (16, 24, 30, 40, 48, 64, 96, 128, 512). The default value is 64.
 * @param {object} [callbacks] - key-value map of callback functions. Acceptable  keys are 'onabort', 'onerror', 'onload', 'onprogress', 'onreadystatechange' and 'ontimeout'.
 * @param {object} [opts] - key-value map of options which is passed to GM_xmlHttpRequest. Acceptable keys are 'context', 'synchronous' and 'timeout'.
 * @param {object} [token] - access token to override the current token. It must be contains 'key' and 'secret' as keys.
 * @return {object} returened object from GM_xmlhttpRequest.
 */
Tumblr.prototype.getAvatar = Tumblr._log(function getAvatar(params) {
	params = Object.assign({}, params);
	Tumblr._requires(params, ['blogID']);
	let size = params.size ? params.size : '';
	return this._simpleRequest('GET', 'https://api.tumblr.com/v2/blog/' + Tumblr._normalizeBlogID(params.blogID) + '/avatar/' + size, null, this._responseTypeDefault(params, 'arraybuffer'));
});

/**
 * retrieves a blog avatar url.
 * 
 * @function
 * @param {string} blogID - specifies blog ID such as 'example.tumblr.com'
 * @param {number} size - size of the avatar. It must be one of (16, 24, 30, 40, 48, 64, 96, 128, 512). The default value is 64.
 * @return {string} returened object from GM_xmlhttpRequest.
 */
Tumblr.prototype.getAvatarURL = Tumblr._log(function getAvatarURL(blogID, size) {
	return 'https://api.tumblr.com/v2/blog/' + Tumblr._normalizeBlogID(blogID) + '/avatar/' + (size ? size : '');
});

/**
 * retrieves likes of the blog.
 * 
 * @function
 * @param {string} blogID - specifies blog ID such as 'example.tumblr.com'
 * @param {object} [callbacks] - key-value map of callback functions. Acceptable  keys are 'onabort', 'onerror', 'onload', 'onprogress', 'onreadystatechange' and 'ontimeout'.
 * @param {object} [opts] - key-value map of options which is passed to GM_xmlHttpRequest. Acceptable keys are 'context', 'synchronous' and 'timeout'.
 * @param {object} [token] - access token to override the current token. It must be contains 'key' and 'secret' as keys.
 * @return {object} returened object from GM_xmlhttpRequest.
 */
Tumblr.prototype.getLikes = Tumblr._log(function getLikes(params) {
	params = Object.assign({}, params);
	Tumblr._requires(params, ['blogID']);
	let data = Tumblr._sift(params, ['limit', 'offset', 'before', 'after']);
	return this._apiKeyRequest('GET', 'https://api.tumblr.com/v2/blog/' + Tumblr._normalizeBlogID(params.blogID) + '/likes', data,	this._responseTypeDefault(params, 'json'));
});

/**
 * retrieves followers of the blog.
 * 
 * @function
 * @param {string} blogID - specifies blog ID such as 'example.tumblr.com'
 * @param {object} [params] - map of parameters. Valid parameters are 'limit' and 'offset'.
 * @param {object} [callbacks] - key-value map of callback functions. Acceptable  keys are 'onabort', 'onerror', 'onload', 'onprogress', 'onreadystatechange' and 'ontimeout'.
 * @param {object} [opts] - key-value map of options which is passed to GM_xmlHttpRequest. Acceptable keys are 'context', 'synchronous' and 'timeout'.
 * @param {object} [token] - access token to override the current token. It must be contains 'key' and 'secret' as keys.
 * @return {object} returened object from GM_xmlhttpRequest.
 */
Tumblr.prototype.getFollowers = Tumblr._log(function getFollowers(params) {
	params = Object.assign({}, params);
	Tumblr._requires(params, ['blogID']);
	let data = Tumblr._sift(params, ['limit', 'offset']);
	return this._oauthRequest('GET', 'https://api.tumblr.com/v2/blog/'+Tumblr._normalizeBlogID(params.blogID)+'/followers', data, this._responseTypeDefault(params, 'json'));
});

/**
 * retrieves posts of the blog.
 * 
 * @function
 * @param {string} blogID - specifies blog ID such as 'example.tumblr.com'
 * @param {string} [type] - The type of post to return. Specify one of the following:  'text', 'quote', 'link', 'answer', 'video', 'audio', 'photo', 'chat'. All types will be returned if omitted.
 * @param {object} [params] - map of parameters. Valid parameters are 'id', 'tag', 'limit', 'offset', 'reblog_info', 'notes_info' and 'filter'.
 * @param {object} [callbacks] - key-value map of callback functions. Acceptable  keys are 'onabort', 'onerror', 'onload', 'onprogress', 'onreadystatechange' and 'ontimeout'.
 * @param {object} [opts] - key-value map of options which is passed to GM_xmlHttpRequest. Acceptable keys are 'context', 'synchronous' and 'timeout'.
 * @return {object} returened object from GM_xmlhttpRequest.
 */
Tumblr.prototype.getPosts = Tumblr._log(function getPosts(params) {
	params = Object.assign({}, params);
	Tumblr._requires(params, ['blogID']);
	let data = Tumblr._sift(params, ['id', 'tag', 'limit', 'offset', 'reblog_info', 'notes_info', 'filter', 'before']);
	params = this._responseTypeDefault(params, 'json');
	return this._request('GET', 'https://api.tumblr.com/v2/blog/' + Tumblr._normalizeBlogID(params.blogID) + '/posts' + (params.type ? '/'+params.type : ''), data, params);
});

/**
 * retrieves queued posts of the blog.
 * 
 * @function
 * @param {string} blogID - specifies blog ID such as 'example.tumblr.com'
 * @param {object} [params] - map of parameters. Valid parameters are 'offset', 'limit' and 'filter'.
 * @param {object} [callbacks] - key-value map of callback functions. Acceptable  keys are 'onabort', 'onerror', 'onload', 'onprogress', 'onreadystatechange' and 'ontimeout'.
 * @param {object} [opts] - key-value map of options which is passed to GM_xmlHttpRequest. Acceptable keys are 'context', 'synchronous' and 'timeout'.
 * @param {object} [token] - access token to override the current token. It must be contains 'key' and 'secret' as keys.
 * @return {object} returened object from GM_xmlhttpRequest.
 */
Tumblr.prototype.getQueue = Tumblr._log(function getQueue(params) {
	params = Object.assign({}, params);
	Tumblr._requires(params, ['blogID']);
	let data = Tumblr._sift(params, ['offset', 'limit', 'filter']);
	return this._oauthRequest('GET', 'https://api.tumblr.com/v2/blog/' + Tumblr._normalizeBlogID(params.blogID) + '/posts/queue', data, this._responseTypeDefault(params, 'json'));
});

/**
 * retrieves drafts of the blog.
 * 
 * @function
 * @param {string} blogID - specifies blog ID such as 'example.tumblr.com'
 * @param {object} [params] - map of parameters. Valid parameters are 'before_id' and 'filter'.
 * @param {object} [callbacks] - key-value map of callback functions. Acceptable  keys are 'onabort', 'onerror', 'onload', 'onprogress', 'onreadystatechange' and 'ontimeout'.
 * @param {object} [opts] - key-value map of options which is passed to GM_xmlHttpRequest. Acceptable keys are 'context', 'synchronous' and 'timeout'.
 * @param {object} [token] - access token to override the current token. It must be contains 'key' and 'secret' as keys.
 * @return {object} returened object from GM_xmlhttpRequest.
 */
Tumblr.prototype.getDrafts = Tumblr._log(function getDrafts(params) {
	params = Object.assign({}, params);
	Tumblr._requires(params, ['blogID']);
	let data = Tumblr._sift(params, ['before_id', 'filter']);
	return this._oauthRequest('GET', 'https://api.tumblr.com/v2/blog/'+Tumblr._normalizeBlogID(params.blogID)+'/posts/draft', data, this._responseTypeDefault(params, 'json'));
});


/**
 * retrieves submission posts of the blog.
 * 
 * @function
 * @param {string} blogID - specifies blog ID such as 'example.tumblr.com'
 * @param {object} [params] - map of parameters. Valid parameters are 'offset' and 'filter'.
 * @param {object} [callbacks] - key-value map of callback functions. Acceptable  keys are 'onabort', 'onerror', 'onload', 'onprogress', 'onreadystatechange' and 'ontimeout'.
 * @param {object} [opts] - key-value map of options which is passed to GM_xmlHttpRequest. Acceptable keys are 'context', 'synchronous' and 'timeout'.
 * @param {object} [token] - access token to override the current token. It must be contains 'key' and 'secret' as keys.
 * @return {object} returened object from GM_xmlhttpRequest.
 */
Tumblr.prototype.getSubmissions = Tumblr._log(function getSubmission(params) {
	params = Object.assign({}, params);
	Tumblr._requires(params, ['blogID']);
	let data = Tumblr._sift(params,['offset', 'filter']);
	return this._oauthRequest('GET', 'https://api.tumblr.com/v2/blog/' + Tumblr._normalizeBlogID(params.blogID) + '/posts/submission', data, this._responseTypeDefault(params, 'json'));
});

/**
 * creates a new post of the blog.
 * 
 * @function
 * @param {string} blogID - specifies blog ID such as 'example.tumblr.com'
 * @param {object} params - map of parameters. See {@link https://www.tumblr.com/docs/en/api/v2#posting} .
 * @param {object} [callbacks] - key-value map of callback functions. Acceptable  keys are 'onabort', 'onerror', 'onload', 'onprogress', 'onreadystatechange' and 'ontimeout'.
 * @param {object} [opts] - key-value map of options which is passed to GM_xmlHttpRequest. Acceptable keys are 'context', 'synchronous' and 'timeout'.
 * @param {object} [token] - access token to override the current token. It must be contains 'key' and 'secret' as keys.
 * @return {object} returened object from GM_xmlhttpRequest.
 */
Tumblr.prototype.post = Tumblr._log(function post(params) {
	params = Object.assign({}, params);
	Tumblr._requires(params, ['blogID', 'type']);
	let data = Tumblr._sift(params, ['type', 'state', 'tags', 'tweet', 'date', 'format', 'slug', 'native_inline_images', 'title', 'body', 'caption', 'link', 'source', 'data', 'data64', 'quote', 'url', 'description', 'thumbnail', 'excerpt', 'author', 'conversation', 'external_url', 'embed']);
	return this._oauthRequest('POST', 'https://api.tumblr.com/v2/blog/' + Tumblr._normalizeBlogID(params.blogID) +'/post', data, this._responseTypeDefault(params, 'json'));
});

/**
 * edits a post of the blog.
 * 
 * @function
 * @param {string} blogID - specifies blog ID such as 'example.tumblr.com'
 * @param {object} params - map of parameters. See {@link https://www.tumblr.com/docs/en/api/v2#posting} .
 * @param {object} [callbacks] - key-value map of callback functions. Acceptable  keys are 'onabort', 'onerror', 'onload', 'onprogress', 'onreadystatechange' and 'ontimeout'.
 * @param {object} [opts] - key-value map of options which is passed to GM_xmlHttpRequest. Acceptable keys are 'context', 'synchronous' and 'timeout'.
 * @param {object} [token] - access token to override the current token. It must be contains 'key' and 'secret' as keys.
 * @return {object} returened object from GM_xmlhttpRequest.
 */
Tumblr.prototype.editPost = Tumblr._log(function editPost(params) {
	params = Object.assign({}, params);
	Tumblr._requires(params, ['blogID', 'id']);
	let data = Tumblr._sift(params, ['id', 'type', 'state', 'tags', 'tweet', 'date', 'format', 'slug', 'native_inline_images', 'title', 'body', 'caption', 'link', 'source', 'data', 'data64', 'quote', 'url', 'description', 'thumbnail', 'excerpt', 'author', 'conversation', 'external_url', 'embed']);
	return this._oauthRequest('POST', 'https://api.tumblr.com/v2/blog/' + Tumblr._normalizeBlogID(params.blogID) +'/post/edit', data, this._responseTypeDefault(params, 'json'));
});

/**
 * reblog a post to the blog.
 * 
 * @function
 * @param {string} blogID - specifies blog ID such as 'example.tumblr.com'
 * @param {object} params - map of parameters. See {@link https://www.tumblr.com/docs/en/api/v2#posting} .
 * @param {object} [callbacks] - key-value map of callback functions. Acceptable  keys are 'onabort', 'onerror', 'onload', 'onprogress', 'onreadystatechange' and 'ontimeout'.
 * @param {object} [opts] - key-value map of options which is passed to GM_xmlHttpRequest. Acceptable keys are 'context', 'synchronous' and 'timeout'.
 * @param {object} [token] - access token to override the current token. It must be contains 'key' and 'secret' as keys.
 * @return {object} returened object from GM_xmlhttpRequest.
 */
Tumblr.prototype.reblog = Tumblr._log(function reblog(params) {
	params = Object.assign({}, params);
	Tumblr._requires(params, ['blogID', 'id', 'reblog_key']);
	let data = Tumblr._sift(params, ['id', 'reblog_key', 'comment', 'type', 'state', 'tags', 'tweet', 'date', 'format', 'slug', 'native_inline_images', 'title', 'body', 'caption', 'link', 'source', 'data', 'data64', 'quote', 'url', 'description', 'thumbnail', 'excerpt', 'author', 'conversation', 'external_url', 'embed']);
	return this._oauthRequest('POST', 'https://api.tumblr.com/v2/blog/' + Tumblr._normalizeBlogID(params.blogID) + '/post/reblog', data, this._responseTypeDefault(params, 'json'));
});

/**
 * delete a post of the blog.
 * 
 * @function
 * @param {string} blogID - specifies blog ID such as 'example.tumblr.com'
 * @param {Object} id - The ID of the post to delete.
 * @param {object} [callbacks] - key-value map of callback functions. Acceptable  keys are 'onabort', 'onerror', 'onload', 'onprogress', 'onreadystatechange' and 'ontimeout'.
 * @param {object} [opts] - key-value map of options which is passed to GM_xmlHttpRequest. Acceptable keys are 'context', 'synchronous' and 'timeout'.
 * @param {object} [token] - access token to override the current token. It must be contains 'key' and 'secret' as keys.
 * @return {object} returened object from GM_xmlhttpRequest.
 */
Tumblr.prototype.deletePost = Tumblr._log(function deletePost(params) {
	params = Object.assign({}, params);
	Tumblr._requires(params, ['blogID', 'id']);
	let data = Tumblr._sift(params, ['id']);
	return this._oauthRequest('POST', 'https://api.tumblr.com/v2/blog/' + Tumblr._normalizeBlogID(params.blogID) + '/post/delete', data, callbacks, this._responseTypeDefault(opts, 'json'), token);
});

/**
 * retrieve information of the user.
 * 
 * @function
 * @param {object} [callbacks] - key-value map of callback functions. Acceptable  keys are 'onabort', 'onerror', 'onload', 'onprogress', 'onreadystatechange' and 'ontimeout'.
 * @param {object} [opts] - key-value map of options which is passed to GM_xmlHttpRequest. Acceptable keys are 'context', 'synchronous' and 'timeout'.
 * @param {object} [token] - access token to override the current token. It must be contains 'key' and 'secret' as keys.
 * @return {object} returened object from GM_xmlhttpRequest.
 */
Tumblr.prototype.getUserInfo = Tumblr._log(function getUserInfo(params) {
	params = Object.assign({}, params);
	return this._oauthRequest('GET', 'https://api.tumblr.com/v2/user/info', null, this._responseTypeDefault(params, 'json'));
});

/**
 * retrieve dashboard posts of the user.
 * 
 * @function
 * @param {object} [params] - map of parameters. Valid parameters are 'limit', 'offset', 'type', 'since_id', 'reblog_info' and 'notes_info'.
 * @param {object} [callbacks] - key-value map of callback functions. Acceptable  keys are 'onabort', 'onerror', 'onload', 'onprogress', 'onreadystatechange' and 'ontimeout'.
 * @param {object} [opts] - key-value map of options which is passed to GM_xmlHttpRequest. Acceptable keys are 'context', 'synchronous' and 'timeout'.
 * @param {object} [token] - access token to override the current token. It must be contains 'key' and 'secret' as keys.
 * @return {object} returened object from GM_xmlhttpRequest.
 */
Tumblr.prototype.getUserDashboard = Tumblr._log(function getUserDashboard(params) {
	params = Object.assign({}, params);
	let data = Tumblr._sift(params, ['limit', 'offset', 'type', 'since_id', 'reblog_info', 'notes_info']);
	return this._oauthRequest('GET', 'https://api.tumblr.com/v2/user/dashboard', data, this._responseTypeDefault(params, 'json'));
});

/**
 * retrieve likes of the user.
 * 
 * @function
 * @param {object} [params] - map of parameters. Valid parameters are 'limit', 'offset', 'before' and 'after'.
 * @param {object} [callbacks] - key-value map of callback functions. Acceptable  keys are 'onabort', 'onerror', 'onload', 'onprogress', 'onreadystatechange' and 'ontimeout'.
 * @param {object} [opts] - key-value map of options which is passed to GM_xmlHttpRequest. Acceptable keys are 'context', 'synchronous' and 'timeout'.
 * @param {object} [token] - access token to override the current token. It must be contains 'key' and 'secret' as keys.
 * @return {object} returened object from GM_xmlhttpRequest.
 */
Tumblr.prototype.getUserLikes = Tumblr._log(function getUserLikes(params) {
	params = Object.assign({}, params);
	let data = Tumblr._sift(params, ['limit', 'offset', 'before', 'after']);
	return this._oauthRequest('GET', 'https://api.tumblr.com/v2/user/likes', data, this._responseTypeDefault(params, 'json'));
});


/**
 * retrieve following of the user.
 * 
 * @function
 * @param {object} [params] - map of parameters. Valid parameters are 'limit' and 'offset'.
 * @param {object} [callbacks] - key-value map of callback functions. Acceptable  keys are 'onabort', 'onerror', 'onload', 'onprogress', 'onreadystatechange' and 'ontimeout'.
 * @param {object} [opts] - key-value map of options which is passed to GM_xmlHttpRequest. Acceptable keys are 'context', 'synchronous' and 'timeout'.
 * @param {object} [token] - access token to override the current token. It must be contains 'key' and 'secret' as keys.
 * @return {object} returened object from GM_xmlhttpRequest.
 */
Tumblr.prototype.getUserFollowing = Tumblr._log(function getUserFollowing(params) {
	params = Object.assign({}, params);
	let data = Tumblr._sift(params, ['limit', 'offset']);
	return this._oauthRequest('GET', 'https://api.tumblr.com/v2/user/following', data, this._responseTypeDefault(params, 'json'));
});

/**
 * follows a specified user.
 * 
 * @function
 * @param {object} url - The URL of the blog to follow.
 * @param {object} [callbacks] - key-value map of callback functions. Acceptable  keys are 'onabort', 'onerror', 'onload', 'onprogress', 'onreadystatechange' and 'ontimeout'.
 * @param {object} [opts] - key-value map of options which is passed to GM_xmlHttpRequest. Acceptable keys are 'context', 'synchronous' and 'timeout'.
 * @param {object} [token] - access token to override the current token. It must be contains 'key' and 'secret' as keys.
 * @return {object} returened object from GM_xmlhttpRequest.
 */
Tumblr.prototype.follow = Tumblr._log(function follow(params) {
	params = Object.assign({}, params);
	Tumblr._requires(params, ['url']);
	let data = Tumblr._sift(params, ['url']);
	return this._oauthRequest('POST', 'https://api.tumblr.com/v2/user/follow', data, this._responseTypeDefault(params, 'json'));
});

/**
 * unfollows a specified user.
 * 
 * @function
 * @param {string} url - The URL of the blog to unfollow.
 * @param {object} [callbacks] - key-value map of callback functions. Acceptable  keys are 'onabort', 'onerror', 'onload', 'onprogress', 'onreadystatechange' and 'ontimeout'.
 * @param {object} [opts] - key-value map of options which is passed to GM_xmlHttpRequest. Acceptable keys are 'context', 'synchronous' and 'timeout'.
 * @param {object} [token] - access token to override the current token. It must be contains 'key' and 'secret' as keys.
 * @return {object} returened object from GM_xmlhttpRequest.
 */
Tumblr.prototype.unfollow = Tumblr._log(function unfollow(params) {
	params = Object.assign({}, params);
	Tumblr._requires(params, ['url']);
	let data = Tumblr._sift(params, ['url']);
	return this._oauthRequest('POST', 'https://api.tumblr.com/v2/user/unfollow', data, this._responseTypeDefault(params, 'json'));
});

/**
 * likes a specified post.
 * 
 * @function
 * @param {string} id - The ID of the post to like.
 * @param {string} reblogKey - The reblog key for the post id.
 * @param {object} [callbacks] - key-value map of callback functions. Acceptable  keys are 'onabort', 'onerror', 'onload', 'onprogress', 'onreadystatechange' and 'ontimeout'.
 * @param {object} [opts] - key-value map of options which is passed to GM_xmlHttpRequest. Acceptable keys are 'context', 'synchronous' and 'timeout'.
 * @param {object} [token] - access token to override the current token. It must be contains 'key' and 'secret' as keys.
 * @return {object} returened object from GM_xmlhttpRequest.
 */
Tumblr.prototype.like = Tumblr._log(function like(params) {
	params = Object.assign({}, params);
	Tumblr._requires(params, ['id', 'reblog_key']);
	let data = Tumblr._sift(params, ['id', 'reblog_key']);
	return this._oauthRequest('POST', 'https://api.tumblr.com/v2/user/like', data, this._responseTypeDefault(params, 'json'));
});

/**
 * unlikes a specified post.
 * 
 * @function
 * @param {string} id - The ID of the post to unlike.
 * @param {string} reblogKey - The reblog key for the post id.
 * @param {object} [callbacks] - key-value map of callback functions. Acceptable  keys are 'onabort', 'onerror', 'onload', 'onprogress', 'onreadystatechange' and 'ontimeout'.
 * @param {object} [opts] - key-value map of options which is passed to GM_xmlHttpRequest. Acceptable keys are 'context', 'synchronous' and 'timeout'.
 * @param {object} [token] - access token to override the current token. It must be contains 'key' and 'secret' as keys.
 * @return {object} returened object from GM_xmlhttpRequest.
 */
Tumblr.prototype.unlike = Tumblr._log(function unlike(params) {
	params = Object.assign({}, params);
	Tumblr._requires(params, ['id', 'reblog_key']);
	let data = Tumblr._sift(params, ['id', 'reblog_key']);
	return this._oauthRequest('POST', 'https://api.tumblr.com/v2/user/unlike', data, this._responseTypeDefault(params, 'json'));
});

/**
 * retrieves tagged posts.
 * 
 * @function
 * @param {string} tag - The tag on the posts you'd like to retrieve
 * @param {Object} [params] - map of parameters. Valid parameters are 'before', 'limit' and 'filter'.
 * @param {object} [callbacks] - key-value map of callback functions. Acceptable  keys are 'onabort', 'onerror', 'onload', 'onprogress', 'onreadystatechange' and 'ontimeout'.
 * @param {object} [opts] - key-value map of options which is passed to GM_xmlHttpRequest. Acceptable keys are 'context', 'synchronous' and 'timeout'.
 * @param {object} [token] - access token to override the current token. It must be contains 'key' and 'secret' as keys.
 * @return {object} returened object from GM_xmlhttpRequest.
 */
Tumblr.prototype.getTagged = Tumblr._log(function getTagged(params) {
	params = Object.assign({}, params);
	let data = Tumblr._sift(params, ['tag', 'before', 'limit', 'filter']);
	Tumblr._requires(data, ['tag']);
	params = this._responseTypeDefault(params, 'json');
	return this._apiKeyRequest('GET', 'https://api.tumblr.com/v2/tagged', data, params);
});

Tumblr._sift = function(obj, slot) {
	let data = {};
	slot.forEach(e => {
		if(obj[slot] != null) {
			data[slot] = obj[slot]
			delete obj[slot];
		};
	});
	return data;
}

Tumblr._requires = function(ob, requiredProps) {
	let notProvided = [];
	requiredProps.forEach(e=> {
		if (ob[e] == null) {
			notProvided.push(e);
		}
	});
	if (notProvided.length > 0) {
		throw 'required parameters are not provided: '+notProvided.join(', ');
	}
}

Tumblr._normalizeBlogID = function(blogID) {
	return blogID.endsWith('.tumblr.com') ? blogID : blogID+'.tumblr.com';
}