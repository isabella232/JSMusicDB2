angular.module('JSMusicDB.RestService', []).factory('RestService', ['$http', '$log', '$location',
function($http, $log, $location) {

	var serverType = {
		type: 'synology',
		extension: 'php'
	};
	if (useStubs) {
		serverType.type = 'local';
		serverType.extension = 'json';
	}

	var cache = {
		sid : null,
		server : null
	};

	var playerpath = 'proxy/$s/stream.php?path=';

	var sanitize = function(name) {
		name = name.replace(/\+/g, '%2B');
		name = name.replace(/\&/g, '%26');
		name = name.replace(/#/g, '%23');
		return name;
	};
	if (navigator.userAgent.indexOf('Mobi') !== -1) {
		playerpath = 'proxy/$s/mobile.php?path=';
	}

	var getPlaySrc = function(path) {
		var src = '';
		if (cache.clientSID) {
			src = cache.server + "/webman/3rdparty/AudioStation/webUI/audio_stream.cgi/0.mp3?sid=" + cache.sid + "&action=streaming&songpath=" + sanitize(path);
		} else {
			src = playerpath.replace('$s', serverType.type) + sanitize(path) + '&sid=' + cache.sid + '&server=' + encodeURIComponent(cache.server);
		}
		return src;
	};

	return {
		Login : {
			doLogin : function(user, callback) {
				cache.server = document.location.protocol + "//" + document.location.hostname + ":" + user.serverport;
				$http.get('proxy/'+serverType.type+'/login.'+serverType.extension, {
					params : {
						account : user.account,
						passwd : user.passwd,
						server : cache.server
					}
				}).success(function(json) {
					if (json) {
						cache.sid = json.data.sid;
					}
					callback(json);
				});

				// hack for lack of CORS and jsonp
				document.domain = document.domain;
				$("body").append("<iframe src='"+cache.server + "/proxy.html?account=" + user.account + "&passwd=" + user.passwd + "' id='htmlproxy' style='display: none;'></iframe>");
				$("#htmlproxy").on("load", function () {
					var $content = $("#htmlproxy").contents();
					$("html").on("sid.loaded", function (e, json) {
						cache.clientSID = json.data.sid;
						// remove iframe; we got the data
						$("body iframe").remove();
					});
				});
			}
		},
		Overview: {
			upcomming: function (username, callback) {
				$http.get('http://ws.audioscrobbler.com/2.0/?method=user.getnewreleases&user='+username+'&api_key='+lastfm.api_key+'&format=json').success(function (json) {
					callback(json);
				});
			},
			recent: function (username, callback) {
				$http.get('http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user='+username+'&api_key='+lastfm.api_key+'&format=json').success(function (json) {
					callback(json);
				});
			},
			recentlyAdded: function (callback) {
				$http.get('proxy/'+serverType.type+'/getRecentlyAdded.'+serverType.extension, {
					params: {
						sid: cache.sid,
						server: cache.server
					}
				}).success(function (json) {
					callback(json);
				});
			}
		},
		Music: {
			get: function (callback) {
				$http.get('proxy/'+serverType.type+'/getJSON.'+serverType.extension, {
					params: {
						sid: cache.sid,
						server: cache.server
					}
				}).success(function (json) {
					callback(json);
				});
			},
			play: function (track, callback) {
				if (track) {
					var playerURL = getPlaySrc(track.path);
					callback(playerURL);
				}
			},
			getTrackInfo: function (track, username, callback) {
				$http.get('http://ws.audioscrobbler.com/2.0/?method=track.getInfo&username='+username+'&api_key='+lastfm.api_key+'&format=json&artist=' + track.artist + '&track=' + track.title).success(function (json) {
					callback(json);
				});
			},
			rescan: function (callback) {
				$http.get('proxy/' + serverType.type + '/rescan.' + serverType.extension, {
					params: {
						sid: cache.sid,
						server: cache.server
					}
				}).success(function () {
					callback();
				});
			}
		},
		Playlists: {
			getPlaylists: function (callback) {
				$http.get('proxy/' + serverType.type + '/getPlaylists.' + serverType.extension, {
					params: {
						sid: cache.sid,
						server: cache.server,
						ts: new Date().getTime()
					}
				}).success(function (json) {
					callback(json);
				});
			},
			getPlaylist: function (playlistID, callback) {
				$http.get('proxy/' + serverType.type + '/getPlaylist.' + serverType.extension, {
					params: {
						sid: cache.sid,
						server: cache.server,
						playlist: playlistID
					}
				}).success(function (json) {
					callback(json);
				});
			},
			getLastFMLovedPlaylist: function (username, callback) {
				$http.get('http://ws.audioscrobbler.com/2.0/?method=user.getlovedtracks&user='+username+'&api_key='+lastfm.api_key+'&format=json&limit=-1').success(function (json) {
					callback(json);
				});
			},
			getLastFMTrackInfo: function (mbid, callback) {
				$http.get('http://ws.audioscrobbler.com/2.0/?method=track.getInfo&api_key='+lastfm.api_key+'&format=json&mbid=' + mbid).success(function (json) {
					callback(json);
				});
			},
			storeIdByKey: function (key, track) {
				localStorage.setItem(key, track.id);
			},
			getTrackIdByKey: function (key) {
				return localStorage.getItem(key);
			},
			addPlaylist: function (playlistName, callback) {
				$http.get('proxy/' + serverType.type + '/addPlaylist.' + serverType.extension, {
					params: {
						sid: cache.sid,
						server: cache.server,
						playlist: playlistName
					}
				}).success(function (json) {
					callback(json);
				});
			},
			renamePlaylist: function (playlistID, playlistName, callback) {
				$http.get('proxy/' + serverType.type + '/renamePlaylist.' + serverType.extension, {
					params: {
						sid: cache.sid,
						server: cache.server,
						playlist: playlistID,
						name: playlistName
					}
				}).success(function (json) {
					callback(json);
				});
			},
			removePlaylist: function (playlistName, callback) {
				$http.get('proxy/' + serverType.type + '/deletePlaylist.' + serverType.extension, {
					params: {
						sid: cache.sid,
						server: cache.server,
						playlist: playlistName
					}
				}).success(function (json) {
					callback(json);
				});
			},
			removeFromPlaylist: function (playlist, track, $index, callback) {
				$http.get('proxy/' + serverType.type + '/removeFromPlaylist.' + serverType.extension, {
					params: {
						sid: cache.sid,
						server: cache.server,
						playlist: playlist.item_id,
						trackID: track.id,
						index: $index
					}
				}).success(function (json) {
					callback(json);
				});
			},
			addTrackToPlaylist: function(playlist, track, callback) {
				$http.get('proxy/' + serverType.type + '/addToPlaylist.' + serverType.extension, {
					params: {
						sid: cache.sid,
						server: cache.server,
						playlist: playlist.item_id,
						trackID: track.id
					}
				}).success(function (json) {
					callback(json);
				});
			}
		}
	};
}]);

jsmusicdb.factory('myHttpInterceptor', function($rootScope, $q, $location) {
	return function(promise) {
		return promise.then(function(response) {
			return response;
		}, function(response) {
			var status = response.status;
			switch(status) {
				case 403:
					$rootScope.$broadcast("login.logout");
					break;
				case 404:
					// redirect to the 404 page; overwriting the entry in the history
					$location.path('404').replace();
					break;
				default:
					return $q.reject(response);
			}
			return $q.reject(response);
		});
	};
});
jsmusicdb.config(function($httpProvider) {
	$httpProvider.responseInterceptors.push('myHttpInterceptor');
});