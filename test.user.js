// ==UserScript==
// @name        tumblr-lib-gm-test
// @namespace   reppets.net
// @version     1.0.0
// @require     tumblr.user.js
// @require     testvalues.user.js
// @require     https://cdn.rawgit.com/ddo/oauth-1.0a/2.1.0/oauth-1.0a.js
// @include     http://reppets.net/tumblr-lib-gm/test.html*
// @grant       GM_xmlhttpRequest
// ==/UserScript==

try {
	function splitParameter(str) {
		if (str.length > 0 && str.charAt(0) == '?') {
			str = str.substr(1);
		}
		
		var result = {};
		str.split('&').forEach(
			function(e, i, array) {
				var param = e.split('=');
				result[param[0]] = param[1];
			});
		return result;
	}

	function write(content) {
		document.querySelector('body').insertAdjacentHTML('beforeend', content);
	}

	function log(func) {
		return function() {
			try {
				return func.apply(this, arguments);
			} catch (e) {
				console.log(e);
				throw e;
			}
		};
	}

	function testWithToken(client) {
		client.getBlogInfo(Values.blogID,{onload: (response)=> {
			console.log(response);
			write('<hr><h3>getBlogInfo</h3><div>Status '+response.status+'</div>');
		}}, {synchronous: true});

		client.getAvatar(Values.blogID,30,{onload: (response)=> {
			console.log(response);
			write('<hr><h3>getAvatar</h3><div>Status '+response.status+'</div>');
		}}, {synchronous: true});

		write('<hr><h3>getAvatarURL</h3><div><img src="'+client.getAvatarURL(Values.blogID,30)+'"></div>');

		client.getLikes(Values.blogIDgetLikes, {}, {onload: (response)=> {
			console.log(response);
			write('<hr><h3>getLikes</h3><div>Status '+response.status+'</div>');
		}}, {synchronous: true});
		
		client.getFollowers(Values.blogIdAuthorized, {}, {onload: (response)=> {
			console.log(response);
			write('<hr><h3>getFollowers</h3><div>Status '+response.status+'</div>');
		}}, {synchronous: true});

		client.getPosts(Values.blogID, '' , {}, {onload: (response)=> {
			console.log(response);
			write('<hr><h3>getPosts</h3><div>Status '+response.status+'</div>');
		}}, {synchronous: true});
		
		client.getQueue(Values.blogID , {}, {onload: (response)=> {
			console.log(response);
			write('<hr><h3>getQueue</h3><div>Status '+response.status+'</div>');
		}}, {synchronous: true});
		
		client.getDrafts(Values.blogID , {}, {onload: (response)=> {
			console.log(response);
			write('<hr><h3>getDrafts</h3><div>Status '+response.status+'</div>');
		}}, {synchronous: true});
		
		client.getSubmissions(Values.blogID , {}, {onload: (response)=> {
			console.log(response);
			write('<hr><h3>getSubmissions</h3><div>Status '+response.status+'</div>');
		}}, {synchronous: true});
	}

	(function() {
		if (window.location.search.indexOf('oauth_token')>0 && window.location.search.indexOf('oauth_verifier')>0 && window.opener) {
			var search=splitParameter(window.location.search);
			window.eval("window.opener.oauthCallback('"+search.oauth_token+"','"+search.oauth_verifier+"');");
			window.close();
			return;
		}

		var client = new Tumblr(Values.consumerKey, Values.consumerSecret, Tumblr.LOG_DEBUG);
		client.getRequestToken(Values.callbackURL, {onload: log(function(response) {
			console.log(response);
			write('<hr><h3>getRequestToken</h3><div>Status '+response.status+'</div>');
			if (response.status!==200) {
				return;
			}
			var params = splitParameter(response.responseText);
			var oauthToken=params.oauth_token;
			var oauthTokenSecret=params.oauth_token_secret;
			write('<div style="display:none;" id="tokens"></div>');
			window.eval('window.oauthCallback=function(token,verifier){console.log("callback");document.querySelector("#tokens").insertAdjacentHTML("beforeend", "<input type=\\"hidden\\"name=\\""+token+"\\" value=\\""+verifier+"\\">")}');
			var observer = new MutationObserver((mut) => {
				mut.forEach((mr) => {
					for (var node of mr.addedNodes) {
						try {
							if (node.attributes.getNamedItem('name').value === oauthToken) {
								var oauthVerifier=node.attributes.getNamedItem('value').value;
								client.getAccessToken(oauthToken, oauthTokenSecret, oauthVerifier, {onload: (response) => {
									write('<hr><h3>getAccessToken</h3><div>Status '+response.status+'</div>');
									console.log(response);
									var params=splitParameter(response.responseText);
									client.setToken(params.oauth_token, params.oauth_token_secret);
									testWithToken(client);
								}});
							}
						} catch (e) {console.log(e);}
					}
				});
			});
			observer.observe(document.querySelector('#tokens'), {childList:true});
			window.open(client.getAuthorizeURL(splitParameter(response.responseText).oauth_token));
		})});

	})();
} catch (e) {
	console.log(e);
}

// oauth_token=7Eo48sFctWy1HbKBisD8CVHiv85zfRp88uXggCs395eEDqMlER&oauth_token_secret=X9Y0MaIpss8Z7SywJ7v6kIrNDZ8buxFIm8ouMltuBUKcIZ23pc