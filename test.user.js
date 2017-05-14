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
								console.log('go!');
								var oauthVerifier=node.attributes.getNamedItem('value').value;
								console.log(oauthVerifier);
								client.getAccessToken(oauthToken, oauthTokenSecret, oauthVerifier, {onload: (response) => {
									write('<hr><h3>getAccessToken</h3><div>Status '+response.status+'</div>');
									console.log(response);
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
