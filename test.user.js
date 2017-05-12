// ==UserScript==
// @name        tumblr-lib-gm-test
// @namespace   reppets.net
// @version     1.0.0
// @require     tumblr.user.js
// @require     https://cdn.rawgit.com/ddo/oauth-1.0a/2.1.0/oauth-1.0a.js
// @include     http://reppets.net/github-test/
// @grant       GM_xmlhttpRequest
// ==/UserScript==
try {
	var consumerKey = '';
	var consumerSecret = '';
	var accessToken = '';
	var accessTokenSecret = '';

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
	client.getRequestToken('http://reppets.net/', {onload: Tumblr._log('onload',function(res){
		console.log(res);
		console.log(client.getAuthorizeURL(splitParameter(res.responseText).oauth_token));
		window.open(client.getAuthorizeURL(splitParameter(res.responseText).oauth_token));
	})});
} catch (e) {
	write('<div>Error: '+e+'</div>');
}