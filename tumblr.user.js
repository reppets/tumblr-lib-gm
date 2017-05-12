// ==UserScript==
// @name        tumblr-lib-gm
// @description Tumblr api(v2) library for Grease Monkey scripts.
// @licence     https://raw.githubusercontent.com/reppets/tumblr-lib-gm/master/LICENSE
// @namespace   reppets.net
// @version     1.0.0
// @require     https://cdn.rawgit.com/ddo/oauth-1.0a/2.1.0/oauth-1.0a.js
// @grant       GM_xmlhttpRequest
// ==/UserScript==

/** constructs the client.
 * 
 * @constructor
 * @param {string} consumerKey 
 * @param {string} consumerSecret 
 * @param {number} [logLevel]
 */
var Tumblr = function(consumerKey, consumerSecret, logLevel) {
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
				words[j]=rotateLeft((words[j-3] ^ words[j-8] ^ words[j-14] ^ words[j-16]) >>> 0, 1)
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
		return sha1(key.map((v)=> v^0x5c).concat(sha1(key.map((v) => v^0x36).concat(data))))
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
		consumer: {
			key: consumerKey,
			secret: consumerSecret
		},
		signature_method: 'HMAC-SHA1',
		hash_function: function(baseString, key) {
			baseString = typeof baseString === 'string' ? utf8ToBytes(baseString) : baseString;
			key = typeof key === 'string' ? utf8ToBytes(key) : key;
			return base64encode(hmacSha1(baseString, key));
		}
	})
	this.logLevel = (typeof logLevel === 'number') ? logLevel : Tumblr.LOG_NONE;
	this.token = null;
}

/** Tumblr authorization URL. */
Tumblr.AUTHORIZE_URL = 'https://www.tumblr.com/oauth/authorize';
/** A constant for logLevel. */
Tumblr.LOG_NONE=0;
/** A constant for logLevel. */
Tumblr.LOG_ERROR=1;
/** A constant for logLevel. */
Tumblr.LOG_DEBUG=2;

/** returns a function decorated with logging. (and is intended for internal use). */
Tumblr._log = function(functionName, f) {
	return function() {
		if (this.logLevel >= Tumblr.LOG_DEBUG) { console.log(functionName, arguments); }
		try {
			return f.apply(this, arguments);
		} catch(e) {
			if (this.logLevel >= Tumblr.LOG_ERROR) { console.log(e); }
			throw e;
		}
	};
}

/** builds a url parser. (and is intended for internal use).
 * @param {string} url
 * @return `a' element which represents the passed url.
 */
Tumblr._parseURL = function(url) {
	var parser = document.createElement('a');
	parser.href = url;
	return parser;
};

/**
 * @param {Object} map - key-value pairs to be parameterized.
 * @param {boolean} addQuestion - adds heading '?' if true.
 */
Tumblr._buildQuery = function(map, withQuestion) {
	var ar = [];
	for (var key in map) {
		if (! map[key]) {
			continue;
		}
		ar.push(encodeURIComponent(key)+'='+encodeURIComponent(map[key]));
	}
	if (ar.length === 0) {
		return '';
	}
	return (withQuestion ? '?' : '') +ar.join('&');
}

/** sets access token.
 * 
 * @param {string} accessKey - OAuth access token.
 * @param {string} accessSecret - OAuth access token secret.
 */
Tumblr.prototype.setToken = function(accessKey, accessSecret) {
	this.token = {key:accessKey, secret:accessSecret};
}

/** makes a request with OAuth tokens.
 * 
 * @param {string} method - method for an HTTP request.
 * @param {string} url - URL for the request.
 * @param {Object} data - key-value map for the request body.
 * @param {Object} opts - key-value map of options which is passed to GM_xmlHttpRequest. Acceptable keys are 'context', 'synchronous' and 'timeout'.
 * @param {Object} callbacks - key-value map of callback functions. Acceptable  keys are 'onabort', 'onerror', 'onload', 'onprogress', 'onreadystatechange' and 'ontimeout'.
 * @param {Object} t - request token to override the one was set before.
 * 
 * @return returened object from GM_xmlhttpRequest.
 */
Tumblr.prototype._oauthRequest = Tumblr._log('_oauthRequest()', function(method, url, data, callbacks, opts, t) {
	var token = t ? t : this.token;

	var args=this._buildArgs(callbacks, opts);
	args.method=method;
	args.url=url;
	if (method==='POST') {
		args.headers = {'Content-Type': 'application/x-www-form-urlencoded'};
	}
	args.headers = this.oauthClient.mergeObject(
		args.headers ? args.headers : {},
		this.oauthClient.toHeader(this.oauthClient.authorize(args, token)));
	args.data = Tumblr._buildQuery(args.data, false);
	return GM_xmlhttpRequest(args);
});

Tumblr.prototype._apiKeyRequest = function(method, url, data, callbacks, opts) {
	return this._simpleRequest(method, url, Object.assign({'api_key': this.oauthClient.consumer.key}, data), callbacks, opts);
};

Tumblr.prototype._simpleRequest = function(method, url, data, callbacks, opts) {
	var args=this._buildArgs(callbacks, opts);
	args.method=method;
	var parser=Tumblr._parseURL(url);
	parser.search=Tumblr._buildQuery(data, true);
	args.url=parser.href;
	return GM_xmlhttpRequest(args);
};


Tumblr.prototype._buildArgs = function(callbacks, opts) {
	var args={};
	if(opts) {
		args.context=opts.context;
		args.synchronous=opts.synchronous;
		args.timeout=opts.timeout;
	}

	if(callbacks) {
		args.onabort=callbacks.onabort;
		args.onerror=callbacks.onerror;
		args.onload=callbacks.onload;
		args.onprogress=callbacks.onprogress;
		args.onreadystatechange=callbacks.onreadystatechange;
		args.ontimeout=callbacks.ontimeout;
	}
	return args;
};


Tumblr.prototype.getRequestToken = Tumblr._log('getRequestToken()', function(callbackURL, callbacks, opts) {
	return this._oauthRequest('POST', 'https://www.tumblr.com/oauth/request_token', {oauth_callback: callbackURL}, callbacks, opts, null);
});

Tumblr.prototype.getAuthorizeURL = function(requestToken) {
	return Tumblr.AUTHORIZE_URL+Tumblr._buildQuery({oauth_token: requestToken}, true);
}

/**
 * @param {Object} callbacks
 * @param {Object} opts
 * @param {Object} [token]
 */
Tumblr.prototype.getAccessToken = Tumblr._log('getAccessToken', function(callbacks, opts, token) {
	return this._oauthRequest('POST', 'https://www.tumblr.com/oauth/access_token', null, callbacks, opts, token);
});

/**
 * @param {string} blogName - specifies blog ID such as 'example.tumblr.com'
 * @param {Object} callbacks
 * @param {Object} opts
 * @param {Object} token
 */
Tumblr.prototype.getBlogInfo = Tumblr._log('getBlogInfo()', function(blogName, callbacks, opts) {
	return this._apiKeyRequest('GET', 'https://api.tumblr.com/v2/blog/' + blogID + '/info', null, callbacks, opts);
});

/**
 * @param {string} blogName - specifies blog ID such as 'example.tumblr.com'
 * @param {number} size - size of the avatar. It must be one of (16, 24, 30, 40, 48, 64, 96, 128, 512). The default value is 64.
 * @param {Object} callbacks
 * @param {Object} opts
 * @param {Object} token
 */
Tumblr.prototype.getAvatar = Tumblr._log('getAvatar()', function(blogID, size, callbacks, opts) {
	size = size ? size : '';
	return this._simpleRequest('GET', 'https://api.tumblr.com/v2/blog/' + blogID + '/avatar/' + size, null, callbacks, opts);
});

/**
 * @param {string} blogName - specifies blog ID such as 'example.tumblr.com'
 * @param {Object} [params] - map of parameters. Valid parameters are 'limit', 'offset', 'before' and 'after'.
 * @param {Object} [callbacks]
 * @param {Object} [opts]
 */
Tumblr.prototype.getLikes = Tumblr._log('getLikes()', function(blogID, params, callbacks, opts) {
	return this._apiKeyRequest('GET', 'https://api.tumblr.com/v2/blog/' + blogID + '/likes', null, callbacks, opts);
});

/**
 * @param {string} blogName - specifies blog ID such as 'example.tumblr.com'
 * @param {Object} [params] - map of parameters. Valid parameters are 'limit', 'offset' and 'query'.
 * @param {Object} [callbacks]
 * @param {Object} [opts]
 * @param {Object} [token]
 */
Tumblr.prototype.getFollowing = Tumblr._log('getFollowing()', function(blogID, params, callbacks, opts, token) {
	return this._oauthRequest('GET', 'https://api.tumblr.com/v2/blog/'+blogID+'/followers', params, callbacks, opts, token);
});

/**
 * @param {string} blogName - specifies blog ID such as 'example.tumblr.com'
 * @param {Object} [params] - map of parameters. Valid parameters are 'limit' and 'offset'.
 * @param {Object} [callbacks]
 * @param {Object} [opts]
 * @param {Object} [token]
 */
Tumblr.prototype.getFollowers = Tumblr._log('getFollowers()', function(blogID, params, callbacks, opts, token) {
	return this._oauthRequest('GET', 'https://api.tumblr.com/v2/blog/'+blogID+'/following', params, callbacks, opts, token);
});

/**
 * @param {string} blogName - specifies blog ID such as 'example.tumblr.com'
 * @param {string} [type] - The type of post to return. Specify one of the following:  'text', 'quote', 'link', 'answer', 'video', 'audio', 'photo', 'chat'.
 * @param {Object} [params] - map of parameters. Valid parameters are 'id', 'tag', 'limit', 'offset', 'reblog_info', 'notes_info' and 'filter'.
 * @param {Object} [callbacks]
 * @param {Object} [opts]
 */
Tumblr.prototype.getPosts = Tumblr._log('getPosts()', function(blogID, type, params, callbacks, opts) {
	return this._apiKeyRequest('GET', 'https://api.tumblr.com/v2/blog/' + blogID + '/posts' + (type ? '/'+type : ''), params, callbacks, opts);
});

/**
 * @param {string} blogName - specifies blog ID such as 'example.tumblr.com'
 * @param {Object} [params] - map of parameters. Valid parameters are 'offset', 'limit' and 'filter'.
 * @param {Object} [callbacks]
 * @param {Object} [opts]
 * @param {Object} [token]
 */
Tumblr.prototype.getQueue = Tumblr._log('getQueue()', function(blogID, params, callbacks, opts, token) {
	return this._oauthRequest('GET', 'https://api.tumblr.com/v2/blog/' + blogID + '/posts/queue', params, callbacks, opts, token);
});

/**
 * @param {string} blogName - specifies blog ID such as 'example.tumblr.com'
 * @param {Object} [params] - map of parameters. Valid parameters are 'before_id' and 'filter'.
 * @param {Object} [callbacks]
 * @param {Object} [opts]
 * @param {Object} [token]
 */
Tumblr.prototype.getDrafts = Tumblr._log('getDrafts()', function(blogID, params, callbacks, opts, token) {
	return this._oauthRequest('GET', 'https://api.tumblr.com/v2/blog/'+blogID+'/posts/draft', params, callbacks, opts, token)
});


/**
 * @param {string} blogName - specifies blog ID such as 'example.tumblr.com'
 * @param {Object} [params] - map of parameters. Valid parameters are 'offset' and 'filter'.
 * @param {Object} [callbacks]
 * @param {Object} [opts]
 * @param {Object} [token]
 */
Tumblr.prototype.getSubmissions = Tumblr._log('getSubmissions()', function(blogID, params, callbacks, opts, token) {
	return this._oauthRequest('GET', 'https://api.tumblr.com/v2/blog/' + blogID + '/posts/submission', params, callbacks, opts, token);
});

/**
 * @param {string} blogName - specifies blog ID such as 'example.tumblr.com'
 * @param {Object} params - map of parameters. See https://www.tumblr.com/docs/en/api/v2#posting .
 * @param {Object} [callbacks]
 * @param {Object} [opts]
 * @param {Object} [token]
 */
Tumblr.prototype.post = Tumblr._log('post()', function(blogID, params, callbacks, opts, token) {
	return this._oauthRequest('POST', 'https://api.tumblr.com/v2/blog/' + blogID +'/post', params, callbacks, opts, token);
});

/**
 * @param {string} blogName - specifies blog ID such as 'example.tumblr.com'
 * @param {Object} params - map of parameters. See https://www.tumblr.com/docs/en/api/v2#posting .
 * @param {Object} [callbacks]
 * @param {Object} [opts]
 * @param {Object} [token]
 */
Tumblr.prototype.edit = Tumblr._log('edit()', function(blogID, params, callbacks, opts, token) {
	return this._oauthRequest('POST', 'https://api.tumblr.com/v2/blog/' + blogID +'/post/edit', params, callbacks, opts, token);
});

/**
 * @param {string} blogName - specifies blog ID such as 'example.tumblr.com'
 * @param {Object} params - map of parameters. Valid parameters are 'id', 'reblog_key', 'comment' and 'native_inline_images'.
 * @param {Object} [callbacks]
 * @param {Object} [opts]
 * @param {Object} [token]
 */
Tumblr.prototype.reblog = Tumblr._log('reblog()', function(blogID, params, callbacks, opts, token) {
	return this._oauthRequest('POST', 'https://api.tumblr.com/v2/blog/' + blogID + '/post/reblog', params, callbacks, opts, token);
});

/**
 * @param {string} blogName - specifies blog ID such as 'example.tumblr.com'
 * @param {Object} id - The ID of the post to delete.
 * @param {Object} [callbacks]
 * @param {Object} [opts]
 * @param {Object} [token]
 */
Tumblr.prototype.delete = Tumblr._log('delete()', function(blogID, id, callbacks, opts, token) {
	return this._oauthRequest('POST', 'https://api.tumblr.com/v2/blog/' + blogID + '/post/delete', {id: id}, callbacks, opts, token);
});

/**
 * @param {Object} [callbacks]
 * @param {Object} [opts]
 * @param {Object} [token]
 */
Tumblr.prototype.getUserInfo = Tumblr._log('getUserInfo()', function(callbacks, opts, token) {
	return this._oauthRequest('GET', 'https://api.tumblr.com/v2/user/info', null, callbacks, opts, token);
});

/**
 * @param {Object} [params] - map of parameters. Valid parameters are 'limit', 'offset', 'type', 'since_id', 'reblog_info' and 'notes_info'.
 * @param {Object} [callbacks]
 * @param {Object} [opts]
 * @param {Object} [token]
 */
Tumblr.prototype.getUserDashboard = Tumblr._log('getUserDashboard()', function(params, callbacks, opts, token) {
	return this._oauthRequest('GET', 'https://api.tumblr.com/v2/user/dashboard', params, callbacks, opts, token);
});

/**
 * @param {Object} [params] - map of parameters. Valid parameters are 'limit', 'offset', 'before' and 'after'.
 * @param {Object} [callbacks]
 * @param {Object} [opts]
 * @param {Object} [token]
 */
Tumblr.prototype.getUserLikes = Tumblr._log('getUserLikes()', function(params, callbacks, opts, token) {
	return this._oauthRequest('GET', 'https://api.tumblr.com/v2/user/likes', params, callbacks, opts, token);
});


/**
 * @param {Object} [params] - map of parameters. Valid parameters are 'limit' and 'offset'.
 * @param {Object} [callbacks]
 * @param {Object} [opts]
 * @param {Object} [token]
 */
Tumblr.prototype.getUserFollowing = Tumblr._log('getUserFollowing()', function(params, callbacks, opts, token) {
	return this._oauthRequest('GET', 'https://api.tumblr.com/v2/user/following', params, callbacks, opts, token);
});

/**
 * @param {Object} [params] - map of parameters. Valid parameters are 'limit' and 'offset'.
 * @param {Object} [callbacks]
 * @param {Object} [opts]
 * @param {Object} [token]
 */
Tumblr.prototype.getUserFollowing = Tumblr._log('getUserFollowing()', function(params, callbacks, opts, token) {
	return this._oauthRequest('GET', 'https://api.tumblr.com/v2/user/following', params, callbacks, opts, token);
});

/**
 * @param {Object} url - The URL of the blog to follow.
 * @param {Object} [callbacks]
 * @param {Object} [opts]
 * @param {Object} [token]
 */
Tumblr.prototype.follow = Tumblr._log('follow()', function(url, callbacks, opts, token) {
	return this._oauthRequest('POST', 'https://api.tumblr.com/v2/user/follow', {url: url}, callbacks, opts, token);
});

/**
 * @param {string} url - The URL of the blog to unfollow.
 * @param {Object} [callbacks]
 * @param {Object} [opts]
 * @param {Object} [token]
 */
Tumblr.prototype.unfollow = Tumblr._log('unfollow()', function(url, callbacks, opts, token) {
	return this._oauthRequest('POST', 'https://api.tumblr.com/v2/user/unfollow', {url: url}, callbacks, opts, token);
});

/**
 * @param {string} id - The ID of the post to like.
 * @param {string} reblogKey - The reblog key for the post id.
 * @param {Object} [callbacks]
 * @param {Object} [opts]
 * @param {Object} [token]
 */
Tumblr.prototype.like = Tumblr._log('like()', function(id, reblogKey, callbacks, opts, token) {
	return this._oauthRequest('POST', 'https://api.tumblr.com/v2/user/like', {id: id, reblog_key: reblogKey}, callbacks, opts, token);
});

/**
 * @param {string} id - The ID of the post to unlike.
 * @param {string} reblogKey - The reblog key for the post id.
 * @param {Object} [callbacks]
 * @param {Object} [opts]
 * @param {Object} [token]
 */
Tumblr.prototype.unlike = Tumblr._log('unlike()', function(id, reblogKey, callbacks, opts, token) {
	return this._oauthRequest('POST', 'https://api.tumblr.com/v2/user/unlike', {id: id, reblog_key: reblogKey}, callbacks, opts, token);
});

/**
 * @param {string} tag - The tag on the posts you'd like to retrieve
 * @param {Object} [params] - map of parameters. Valid parameters are 'before', 'limit' and 'filter'.
 * @param {Object} [callbacks]
 * @param {Object} [opts]
 * @param {Object} [token]
 */
Tumblr.prototype.getTagged = Tumblr._log('getTagged()', function(tag, params, callbacks, opts, token) {
	return this._oauthRequest('GET', 'https://api.tumblr.com/v2/tagged', Object.assign({tag: tag}, params), callbacks, opts, token);
});
