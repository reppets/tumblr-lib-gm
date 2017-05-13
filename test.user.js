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
	console.log ('run');
	var consumerKey = Values.consumerKey;
	var consumerSecret = Values.consumerSecret;
	var accessToken = '';
	var accessTokenSecret = '';

	console.log(typeof window.location.search);
	if (window.location.search.indexOf('oauth_token')>0 && window.location.search.indexOf('oauth_verifier')>0 && window.opener) {
		var params = splitParameter(window.location.search);
		console.log(window.opener);
		//window.opener.oauthCallback(params.oauth_token, params.oauth_verifier);
		window.eval("window.opener.oauthCallback('"+params.oauth_token+"','"+params.oauth_verifier+"');");
		return;
	}


	var root = document.querySelector('body');

	function write(content) {
		root.insertAdjacentHTML('beforeend', content);
	}

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

	var client = new Tumblr(consumerKey, consumerSecret, Tumblr.LOG_DEBUG);
	client.getRequestToken('http://reppets.net/tumblr-lib-gm/test.html', {onload: Tumblr._log('onload',function(res){
		console.log(res);
		console.log(client.getAuthorizeURL(splitParameter(res.responseText).oauth_token));
		window.eval("window.oauthCallback = function(token,verifier) {console.log('callback', token, verifier);};");
		window.open(client.getAuthorizeURL(splitParameter(res.responseText).oauth_token));
	})});
} catch (e) {
	console.log(e);
}