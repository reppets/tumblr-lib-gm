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
		var response;
		response = client.getBlogInfo(Values.blogID,{}, {synchronous: true});
		console.log(response);
		write('<hr><h3>getBlogInfo</h3><div>Status '+response.status+'</div>');

		response = client.getAvatar(Values.blogID,30,{}, {synchronous: true});
		console.log(response);
		write('<hr><h3>getAvatar</h3><div>Status '+response.status+'</div>');

		write('<hr><h3>getAvatarURL</h3><div><img src="'+client.getAvatarURL(Values.blogID,30)+'"></div>');

		response=client.getLikes(Values.blogIDgetLikes, {}, {}, {synchronous: true});
		console.log(response);
		write('<hr><h3>getLikes</h3><div>Status '+response.status+'</div>');

		response=client.getFollowers(Values.blogIdAuthorized, {}, {}, {synchronous: true});
		console.log(response);
		write('<hr><h3>getFollowers</h3><div>Status '+response.status+'</div>');

		response=client.getPosts(Values.blogID, '' , {}, {}, {synchronous: true});
		console.log(response);
		write('<hr><h3>getPosts</h3><div>Status '+response.status+'</div>');

		response=client.getQueue(Values.blogID , {}, {}, {synchronous: true});
		console.log(response);
		write('<hr><h3>getQueue</h3><div>Status '+response.status+'</div>');

		response=client.getDrafts(Values.blogID , {}, {}, {synchronous: true});
		console.log(response);
		write('<hr><h3>getDrafts</h3><div>Status '+response.status+'</div>');
		
		response=client.getSubmissions(Values.blogID , {}, {}, {synchronous: true});
		console.log(response);
		write('<hr><h3>getSubmissions</h3><div>Status '+response.status+'</div>');

		response=client.post(Values.blogIdUpdate, {
			type: 'text', 
			title: 'Test Post',
			body: '<p>This is a test post.</p>'
		}, {}, {
			synchronous: true
		});
		console.log(response);
		write('<hr><h3>post</h3><div>Status '+response.status+'</div>');
		var postId=JSON.parse(response.responseText).response.id;
			

		response=client.edit(Values.blogIdUpdate, {
			id: postId,
			title: 'Test Post Edited',
			body: '<p>This is a test post edited.</p>'
		}, {}, {
			synchronous: true
		});
		console.log(response);
		write('<hr><h3>edit</h3><div>Status '+response.status+'</div>');

		response=client.reblog(Values.blogIdUpdate, {
			id: Values.reblogPostId,
			reblog_key: Values.reblogKey,
			comment: 'Testing reblog.'
		}, {}, {
			synchronous: true
		});
		console.log(response);
		write('<hr><h3>reblog</h3><div>Status '+response.status+'</div>');
		postId=JSON.parse(response.responseText).response.id;

		response=client.delete(Values.blogIdUpdate, postId, {}, {
			synchronous: true
		});
		console.log(response);
		write('<hr><h3>delete</h3><div>Status '+response.status+'</div>');
		
		response=client.getUserInfo({}, {
			synchronous: true
		});
		console.log(response);
		write('<hr><h3>getUserInfo</h3><div>Status '+response.status+'</div>');
		
		response=client.getUserDashboard({}, {}, {
			synchronous: true
		});
		console.log(response);
		write('<hr><h3>getUserDashboard</h3><div>Status '+response.status+'</div>');
		
		response=client.getUserLikes({}, {}, {
			synchronous: true
		});
		console.log(response);
		write('<hr><h3>getUserLikes</h3><div>Status '+response.status+'</div>');
		
		response=client.getUserFollowing({}, {}, {
			synchronous: true
		});
		console.log(response);
		write('<hr><h3>getUserFollowing</h3><div>Status '+response.status+'</div>');
		
		response=client.follow(Values.blogUrlToFollow, {}, {
			synchronous: true
		});
		console.log(response);
		write('<hr><h3>follow</h3><div>Status '+response.status+'</div>');
		
		response=client.unfollow(Values.blogUrlToFollow, {}, {
			synchronous: true
		});
		console.log(response);
		write('<hr><h3>unfollow</h3><div>Status '+response.status+'</div>');
		
		response=client.like(Values.reblogPostId, Values.reblogKey, {}, {
			synchronous: true
		});
		console.log(response);
		write('<hr><h3>like</h3><div>Status '+response.status+'</div>');

		response=client.unlike(Values.reblogPostId, Values.reblogKey, {}, {
			synchronous: true
		});
		console.log(response);
		write('<hr><h3>unlike</h3><div>Status '+response.status+'</div>');
		
		response=client.getTagged(Values.tag, {}, {}, {
			synchronous: true
		});
		console.log(response);
		write('<hr><h3>getTagged</h3><div>Status '+response.status+'</div>');

	}

	(function() {
		if (window.location.search.indexOf('callback')>0) {
			if (window.location.search.indexOf('oauth_token')>0 && window.location.search.indexOf('oauth_verifier')>0 && window.opener) {
				var search=splitParameter(window.location.search);
				window.eval("window.opener.oauthCallback('"+search.oauth_token+"','"+search.oauth_verifier+"');");
				window.close();
				return;
			} else {
				window.close();
				return;
			}
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