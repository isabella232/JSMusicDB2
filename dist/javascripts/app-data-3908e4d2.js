var jsmusicdb = angular.module('jsmusicdb', ['ngRoute', 'ngSanitize', 'ngAnimate', 'ngTouch', 'ui.bootstrap', 'JSMusicDB.RestService', 'JSMusicDB.ModelService', 'TimeFilters', 'tmh.dynamicLocale', 'pascalprecht.translate']).config(['$routeProvider', '$translateProvider',
function($routeProvider, $translateProvider) {
	$routeProvider.when('/letter/:letter', {
		templateUrl : 'templates/artistoverview.html',
		needsLogin: true
	}).when('/year/:year', {
		templateUrl : 'templates/yearoverview.html',
		needsLogin: true
	}).when('/letter/:letter/artist/:artist', {
		templateUrl : 'templates/artistview.html',
		needsLogin: true
	}).when("/letter/:letter/artist/:artist/album/:album*", {
		templateUrl : 'templates/albumview.html',
		needsLogin: true
	}).when("/playlist/:id?", {
		templateUrl : 'templates/playlist.html',
		needsLogin: true
	}).when("/settings", {
		templateUrl : 'templates/settings.html',
		needsLogin: true
	}).when("/about", {
		templateUrl : 'templates/about.html',
		needsLogin: false
	}).when("/search/:filter?/:query?", {
		templateUrl : "templates/searchResults.html",
		needsLogin: true
	}).when("/login", {
		templateUrl : "templates/isLoggingIn.html",
		needsLogin: true
	}).otherwise({
		templateUrl : 'templates/overview.html',
		needsLogin: true
	});

	// setup translations
	$translateProvider.useStaticFilesLoader({
		prefix: 'translations/',
		suffix: '.json'
	});
	$translateProvider.preferredLanguage('en');
	$translateProvider.fallbackLanguage(['en']);
}]);

jsmusicdb.run(['$rootScope', '$location',
function($rootScope, $location) {
	$rootScope.$on("$routeChangeStart", function(event, next, current) {
		var user = localStorage.getItem("user");
		if (user) {
			$rootScope.user = JSON.parse(user);
			if (!$rootScope.user.account && next.needsLogin) {
				$rootScope.$broadcast("login");
				event.preventDefault();
			} else {
				$rootScope.$broadcast("authenticate", $rootScope.user);
				if (!$rootScope.parsed) {
					$rootScope.$broadcast("music.get");
				}
			}
		} else if (next.needsLogin) {
			$rootScope.$broadcast("login");
			event.preventDefault();
		}
	});
}]);

var setResponsive = function () {
	if ($(window).width() < 768) {
		$("body").addClass("mobile").removeClass("desktop");
	} else {
		$("body").removeClass("mobile").addClass("desktop");
	}
};
$(window).on("resize", function () {
	setResponsive();
});
setResponsive();

jsmusicdb.controller('AppController', ['$scope', '$http', '$rootScope', '$location', '$routeParams', '$modal', 'RestService', 'ModelService', 'tmhDynamicLocale', '$translate',
function($scope, $http, $rootScope, $location, $routeParams, $modal, RestService, ModelService, tmhDynamicLocale, $translate) {

	// show popup if we need to login first
	$scope.$on("login", function() {
		var modalInstance = $modal.open({
			templateUrl : 'templates/login.html',
			controller : 'LoginController',
			backdrop : 'static'
		});

		modalInstance.result.then(function(login) {
			RestService.Login.doLogin(login, function(json) {
				$scope.login = login;
				if (login.remember) {
					localStorage.setItem("user", JSON.stringify(login));
				} else {
					localStorage.deleteItem("user");
				}
				$rootScope.$broadcast("music.get");
			});
		});
	});

	$scope.$on("authenticate", function(e, login) {
		RestService.Login.doLogin(login, function(json) {
			$scope.login = login;
		});
	});

	$rootScope.path = 'JSMusicDB';

	Notify.requestPermission();

	$scope.letters = {};
	$scope.artists = {};
	$scope.albums = {};
	$scope.tracks = {};
	$scope.trackByPath = {};
	$scope.years = {};
	$scope.playing = {};
	$scope.playlist = {};

	$scope.rescan = function () {
		RestService.Music.rescan(function () {
			// TODO: implement poll if possible
		});
	};

	$scope.sync = function () {
		// initiate a rescan
		$rootScope.$broadcast("music.get");
	};

	var cb = document.location.href;
	if (cb.indexOf("#") !== -1) {
		cb = cb.substring(0, cb.indexOf("#"));
	}
	if (cb.indexOf("index.html") === -1) {
		cb = cb + "index.html";
	}
	$scope.lastfmLink = 'http://www.last.fm/api/auth/?api_key=956c1818ded606576d6941de5ff793a5&cb=' + cb;
	$scope.hasLastFm = false;

	var lastfmkey = localStorage.getItem("key");
	if (lastfmkey) {
		$scope.hasLastFm = lastfmkey;
	}

	$scope.language = window.navigator.userLanguage || window.navigator.language;
	if ($scope.language.indexOf("-") !== -1) {
		$scope.language = $scope.language.substring(0, $scope.language.indexOf("-"));
	}
	tmhDynamicLocale.set($scope.language);
	$translate.use($scope.language);

	String.prototype.capitalize = function(){
   return this.replace( /(^|\s)([a-z])/g , function(m,p1,p2){ return p1+p2.toUpperCase(); } );
  };


	$scope.$on("music.get", function() {
		$scope.debug = $scope.debug || {};
		var start = new Date().getTime();
		$scope.parsing = true;
		RestService.Music.get(function(json) {
			$scope.debug.getJSON = new Date().getTime() - start;
			ModelService.parse(json, $scope, $rootScope);
		});
	});
}]);

jsmusicdb.controller('LoginController', ['$scope', '$modalInstance',
function($scope, $modalInstance) {'use strict';

	$scope.hasError = false;

	$scope.login = $scope.login || {
		account: null,
		passwd: null,
		serverport: null,
		lastfmuser: null,
		remember: false
	};

	$scope.doLogin = function () {
		if ($scope.login.account !== null && $scope.login.passwd !== null && $scope.login.serverport !== null ) {
			// TODO: check credentials on server
    		$modalInstance.close($scope.login);
    	} else {
    		$scope.hasError = true;
    	}
  	};
}]);

jsmusicdb.controller('ArtistOverviewController', ['$scope', '$routeParams', '$log', '$rootScope',
function($scope, $routeParams, $log, $rootScope) {'use strict';

	window.scrollTo(0,0);

	if ($routeParams.letter) {
		$rootScope.$watch(function () {
			return $rootScope.parsed;
		}, function (n,o) {
			if (n) {
				var letter = $routeParams.letter;

				for (var letterObject in $scope.letters) {
					$scope.letters[letterObject].active = false;
				}
				$scope.letters[letter].active = true;
				$scope.viewArtists = $scope.letters[letter].artists;

				$rootScope.path = "JSMusicDB: " + letter;
			}
		});
	}
	
	$scope.back = function () {
		// go to overview
		var letter = $routeParams.letter;
		document.location = "#/";
	};

}]);

jsmusicdb.controller('ArtistViewController', ['$scope', '$routeParams', '$log', '$rootScope',
function($scope, $routeParams, $log, $rootScope) {'use strict';

	window.scrollTo(0,0);

	if ($routeParams.letter) {
		$rootScope.$watch(function () {
			return $rootScope.parsed;
		}, function (n,o) {
			if (n) {
				var letter = $routeParams.letter,
						artist = $scope.artists[$routeParams.artist.toUpperCase()];

				for (var letterObject in $scope.letters) {
					$scope.letters[letterObject].active = false;
				}
				$scope.letters[letter].active = true;
				$scope.viewAlbums = artist.albums;

				$rootScope.path = artist.name;
			}
		});
	}
	
	$scope.back = function () {
		// go to artist overview
		var letter = $routeParams.letter;
		document.location = "#/letter/" + letter;
	};

}]);

jsmusicdb.controller('AlbumViewController', ['$scope', '$routeParams', '$log', '$rootScope', 'RestService', '$modal',
function($scope, $routeParams, $log, $rootScope, RestService, $modal) {
	'use strict';

	window.scrollTo(0, 0);

	$scope.loading = {};

	if ($routeParams.letter) {
		$rootScope.$watch(function() {
			return $rootScope.parsed;
		}, function(n, o) {
			if (n) {
				var letter = $routeParams.letter, artist = $scope.artists[$routeParams.artist.toUpperCase()], album = $scope.albums[$routeParams.artist.toUpperCase() + "-" + $routeParams.album];
				for (var letterObject in $scope.letters) {
					$scope.letters[letterObject].active = false;
				}
				$scope.letters[letter].active = true;
				album.tracks.sort(function(a, b) {
					var totalNumberA = 0, totalNumberB = 0;
					if (a.disc) {
						totalNumberA = a.disc * 100 + a.number;
					} else {
						totalNumberA = 100 + a.number;
					}
					if (b.disc) {
						totalNumberB = b.disc * 100 + b.number;
					} else {
						totalNumberB = 100 + b.number;
					}
					if (totalNumberA < totalNumberB) {
						return -1;
					} else {
						return 1;
					}
				});
				$scope.viewAlbum = album;
				$rootScope.path = artist.name + " - " + album.album;

				// get current playlists
				RestService.Playlists.getPlaylists(function(json) {
					$scope.playlists = json;
				});
			}
		});
	}

	$scope.back = function() {
		// go to album overview
		var letter = $routeParams.letter, artist = $routeParams.artist;
		document.location = "#/letter/" + letter + "/artist/" + artist;
	};

	$scope.playTrack = function(track) {
		if (track.state !== 'secondary') {
			if ($scope.playing.track) {
				$scope.playing.track.isPlaying = false;
				$scope.playing.track = null;
			}
			$scope.playing.track = track;
			$rootScope.$broadcast('play.track', track);
		}
	};

	$scope.addToPlaylist = function(playlist, track, callback) {
		$scope.loading.addToPlaylist = true;
		RestService.Playlists.addTrackToPlaylist(playlist, track, callback ||
		function(json) {
			track.state = 'primary';
			$scope.loading.addToPlaylist = false;
		});
	};
	$scope.addAlbumToPlaylist = function(playlist, album) {
		var index = 0;
		$scope.loading.addAlbumToPlaylist = true;

		var submitNext = function(track) {
			$scope.addToPlaylist(playlist, track, function() {
				if (album.tracks[index + 1]) {
					submitNext(album.tracks[index + 1]);
					index++;
				} else {
					$scope.loading.addAlbumToPlaylist = false;
					album.state = 'primary';
				}
			});
		};
		submitNext(album.tracks[index]);
	};

	$scope.addToNewPlaylist = function(track) {
		// create playlist
		var modalInstance = $modal.open({
			templateUrl : 'templates/addPlaylist.html',
			controller : 'AddPlaylistController',
			resolve : {
				playlistName : function() {
					return null;
				}
			}
		});

		modalInstance.result.then(function(playlistName) {
			if (playlistName) {
				RestService.Playlists.addPlaylist(playlistName, function(json) {
					RestService.Playlists.getPlaylists(function(json) {
						$scope.playlists = json;

						// and add the track to the newly created playlist
						angular.forEach(json.items, function(playlist) {
							if (playlist.title === playlistName) {
								$scope.addToPlaylist(playlist, track);
							}
						});
					});
				});
			}
		});
	};

	$scope.addAlbumToNewPlaylist = function(album) {
		// create playlist
		var modalInstance = $modal.open({
			templateUrl : 'templates/addPlaylist.html',
			controller : 'AddPlaylistController',
			resolve : {
				playlistName : function() {
					return null;
				}
			}
		});

		modalInstance.result.then(function(playlistName) {
			if (playlistName) {
				RestService.Playlists.addPlaylist(playlistName, function(json) {
					RestService.Playlists.getPlaylists(function(json) {
						$scope.playlists = json;

						// and add the track to the newly created playlist
						angular.forEach(json.items, function(playlist) {
							if (playlist.title === playlistName) {
								$scope.addAlbumToPlaylist(playlist, album);
							}
						});
					});
				});
			}
		});
	};

	$scope.shuffleState = 'shuffle';
	$scope.shuffle = function() {
		function shuffle(array) {
			var currentIndex = array.length, temporaryValue, randomIndex;

			// While there remain elements to shuffle...
			while (0 !== currentIndex) {

				// Pick a remaining element...
				randomIndex = Math.floor(Math.random() * currentIndex);
				currentIndex -= 1;

				// And swap it with the current element.
				temporaryValue = array[currentIndex];
				array[currentIndex] = array[randomIndex];
				array[randomIndex] = temporaryValue;
			}

			return array;
		}

		if ($scope.shuffleState === 'shuffle') {
			shuffle($scope.viewAlbum.tracks);
			$scope.shuffleState = 'in order';
		} else {
			$scope.viewAlbum.tracks.sort(function(a, b) {
				var totalNumberA = 0, totalNumberB = 0;
				if (a.disc) {
					totalNumberA = a.disc * 100 + a.number;
				} else {
					totalNumberA = 100 + a.number;
				}
				if (b.disc) {
					totalNumberB = b.disc * 100 + b.number;
				} else {
					totalNumberB = 100 + b.number;
				}
				if (totalNumberA < totalNumberB) {
					return -1;
				} else {
					return 1;
				}
			});
			$scope.shuffleState = 'shuffle';
		}
	};
}]);

jsmusicdb.controller('PlayerController', ['$scope', '$rootScope', '$log', 'RestService',
function($scope, $rootScope, $log, RestService) {'use strict';

	// set up audiotags
	var audiotags = [$("#player1").get(0), $("#player2").get(0)];
	// default player
	var audiotag = audiotags[0];

	// other player management
	var otherPlayerIdentifier = 1;

	var canUsePrebuffer = true;

	var busyScrobbling = false;

	var playedTrackArt = null;

	$scope.isPlaying = "ios7-play";
	$scope.isRandom = "shuffle";
	$scope.isMuted = "volume-high";
	$scope.inPartyMode = false;
	$scope.prebufferPath = '';

	$scope.volume = 100;

	$scope.$watch(function() {
		return $scope.volume;
	}, function(n, o) {
		angular.forEach(audiotags, function(value) {
			value.volume = n / 100;
		});
		if (n < 25) {
			$scope.volumeIcon = "mute";
		} else if (n < 50) {
			$scope.volumeIcon = "low";
		} else if (n < 75) {
			$scope.volumeIcon = "medium";
		} else {
			$scope.volumeIcon = "high";
		}
	});

	$scope.hasLastFM = localStorage.getItem("key");

	// private functions
	var scrobble = function() {
		if (localStorage.getItem("key") && !busyScrobbling) {
			busyScrobbling = true;
			var now = new Date(), ts = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes() + now.getTimezoneOffset(), now.getSeconds()) / 1000, url = 'http://ws.audioscrobbler.com/2.0/', data = {
				method : 'track.scrobble',
				api_key : '956c1818ded606576d6941de5ff793a5',
				artist : $scope.playing.track.artist,
				album : $scope.playing.track.album,
				track : $scope.playing.track.title,
				timestamp : ts,
				sk : localStorage.getItem("key"),
				api_sig : lastfm.signscrobble($scope.playing.track.artist, $scope.playing.track.album, $scope.playing.track.title, ts)
			};
			$.post(url, data, function() {
				busyScrobbling = false;
				$scope.$emit("refresh.recent");
			});
			$scope.scrobbeld = true;
		}
	};

	var scrobbleNowPlaying = function() {
		if (localStorage.getItem("key") && !busyScrobbling) {
			busyScrobbling = true;
			var url = 'http://ws.audioscrobbler.com/2.0/', data = {
				method : 'track.updateNowPlaying',
				api_key : '956c1818ded606576d6941de5ff793a5',
				artist : $scope.playing.track.artist,
				album : $scope.playing.track.album,
				track : $scope.playing.track.title,
				sk : localStorage.getItem("key"),
				api_sig : lastfm.signplayinglove($scope.playing.track.artist, $scope.playing.track.album, $scope.playing.track.title, 'track.updateNowPlaying')
			};
			$.post(url, data, function() {
				busyScrobbling = false;
			});
		}
	};

	var toggleLoved = function() {
		if (localStorage.getItem("key") && !busyScrobbling) {
			busyScrobbling = true;
			var url = 'http://ws.audioscrobbler.com/2.0/', data = {};
			if ($scope.playing.track.isLoved) {
				data = {
					method : 'track.unlove',
					api_key : '956c1818ded606576d6941de5ff793a5',
					artist : $scope.playing.track.artist,
					track : $scope.playing.track.title,
					sk : localStorage.getItem("key"),
					api_sig : lastfm.signplayinglove($scope.playing.track.artist, null, $scope.playing.track.title, 'track.unlove')
				};
			} else {
				data = {
					method : 'track.love',
					api_key : '956c1818ded606576d6941de5ff793a5',
					artist : $scope.playing.track.artist,
					track : $scope.playing.track.title,
					sk : localStorage.getItem("key"),
					api_sig : lastfm.signplayinglove($scope.playing.track.artist, null, $scope.playing.track.title, 'track.love')
				};
			}
			$.post(url, data, function() {
				busyScrobbling = false;
				$scope.playing.track.isLoved = !$scope.playing.track.isLoved;
			});
		}
	};

	$scope.$on('play.track', function(e, track, playlist) {
		if (playlist) {
			$scope.playingList = playlist;
		} else {
			$scope.playingList = null;
		}
		$scope.prebufferdTrack = null;
		$scope.play(track);
	});

	$scope.toggle = function(toggleType) {
		if (toggleType === 'partyMode') {
			$scope.inPartyMode = !$scope.inPartyMode;
		}
		if (toggleType == 'isPlaying') {
			$scope.playpause();
		}
		if (toggleType === 'isLoved') {
			toggleLoved();
		}
	};

	$scope.toggleRandom = function() {
		function shuffle(array) {
			var currentIndex = array.length, temporaryValue, randomIndex;

			// While there remain elements to shuffle...
			while (0 !== currentIndex) {

				// Pick a remaining element...
				randomIndex = Math.floor(Math.random() * currentIndex);
				currentIndex -= 1;

				// And swap it with the current element.
				temporaryValue = array[currentIndex];
				array[currentIndex] = array[randomIndex];
				array[randomIndex] = temporaryValue;
			}

			return array;
		}

		if ($scope.isRandom === 'shuffle') {
			$scope.isRandom = 'arrow-right-a';
			if (!$scope.playingList) {
				shuffle($scope.playing.track.albumNode.tracks);
			} else {
				shuffle($scope.playingList.items);
			}
		} else {
			$scope.isRandom = "shuffle";
		}
	};

	$scope.stop = function() {
		$scope.playing.track.isPlaying = false;
		angular.forEach(audiotags, function(value) {
			value.pause();
			value.src = null;
		});
		$scope.playing = {};
		canUsePrebuffer = false;
	};

	$scope.play = function(track) {
		$scope.scrobbeld = false;
		canUsePrebuffer = true;
		if ($scope.playing.track) {
			$scope.playing.track.isPlaying = false;
		}
		$scope.playing.track = track;
		$scope.playing.nextTrack = $scope.upNext();
		$scope.playing.track.isPlaying = true;
		$scope.isPlaying = 'ios7-pause';
		scrobbleNowPlaying();

		setTimeout(function() {
			$(".previousAlbumArt").addClass("animated");
		}, 2000);
		RestService.Music.getTrackInfo($scope.playing.track, $rootScope.user.lastfmuser, function(json) {
			if (json.track.userloved && json.track.userloved === "1") {
				$scope.playing.track.isLoved = true;
			} else {
				$scope.playing.track.isLoved = false;
			}
		});
		if ($scope.prebufferdTrack) {
			// play track; it's already buffered
			audiotag.play();
			$scope.prebufferdTrack = null;
		} else {
			// load new track
			RestService.Music.play(track, function(playerURL) {
				audiotag.src = playerURL;
				audiotag.load();
				audiotag.play();
			});
		}
		RestService.Music.getAlbumArt($scope.playing.track, function (url) {
			var myNotification = new Notify('playing: ' + $scope.playing.track.title.capitalize(), {
		    body: "'" + $scope.playing.track.albumNode.album.capitalize() + "' by '" + $scope.playing.track.artist.capitalize() + "'",
		    timeout: 5,
		    tag: 'JSMusicDB-nowPlaying',
		    icon: url
			});
			myNotification.show();
		});
	};

	$scope.playpause = function() {
		if ($scope.isPlaying === 'ios7-pause') {
			$scope.isPlaying = 'ios7-play';
			$scope.playing.track.isPlaying = false;
			angular.forEach(audiotags, function(value) {
				value.pause();
			});
		} else {
			$scope.isPlaying = 'ios7-pause';
			$scope.playing.track.isPlaying = true;
			audiotag.play();
			RestService.Music.getAlbumArt($scope.playing.track, function (url) {
				var myNotification = new Notify('resuming: ' + $scope.playing.track.title.capitalize(), {
			    body: "'" + $scope.playing.track.albumNode.album.capitalize() + "' by '" + $scope.playing.track.artist.capitalize() + "'",
			    timeout: 5,
			    tag: 'JSMusicDB-nowPlaying',
			    icon: url
				});
				myNotification.show();
			});
		}
	};

	$scope.pause = function() {
		$scope.isPlaying = 'ios7-play';
		$scope.playing.track.isPlaying = false;
		angular.forEach(audiotags, function(value) {
			value.pause();
		});
	};

	$scope.upNext = function() {
		if (!$scope.playingList) {
			var index = $scope.playing.track.albumNode.tracks.indexOf($scope.playing.track);
			if (index > -1 && index < $scope.playing.track.albumNode.tracks.length - 1) {
				return ($scope.playing.track.albumNode.tracks[index + 1]);
			}
		} else {
			var index = $scope.playingList.items.indexOf($scope.playing.track);
			if (index > -1 && index < $scope.playingList.items.length - 1) {
				return ($scope.playingList.items[index + 1]);
			}
		}
	};

	$scope.next = function(prebuffer) {
		if ($scope.playing.track) {
			$scope.playing.track.animate = false;
		}
		$(".previousAlbumArt").attr("src", $(".currentAlbumArt").attr("src")).removeClass('animate').removeClass('animated').removeClass('animateBack');
		if (!prebuffer) {
			$scope.prebufferdTrack = null;
			if (!$scope.playingList) {
				var index = $scope.playing.track.albumNode.tracks.indexOf($scope.playing.track);
				if (index > -1 && index < $scope.playing.track.albumNode.tracks.length - 1) {
					$scope.play($scope.playing.track.albumNode.tracks[index + 1]);
				} else {
					$scope.stop();
				}
			} else {
				var index = $scope.playingList.items.indexOf($scope.playing.track);
				if (index > -1 && index < $scope.playingList.items.length - 1) {
					$scope.play($scope.playingList.items[index + 1]);
				} else {
					$scope.stop();
				}
			}
		} else {
			// switch player tag
			if (otherPlayerIdentifier === 1) {
				audiotag = audiotags[1];
				otherPlayerIdentifier = 0;
			} else {
				audiotag = audiotags[0];
				otherPlayerIdentifier = 1;
			}
			$log.info('prestart', $scope.prebufferdTrack);
			if ($scope.prebufferdTrack) {
				$scope.play($scope.prebufferdTrack);
			} else {
				// next track is not prebuffered; prob. the currect track is a very small one or the prebuffer is too strong; load the next track without prebuffering
				$scope.prebufferdTrack = null;
				if (!$scope.playingList) {
					var index = $scope.playing.track.albumNode.tracks.indexOf($scope.playing.track);
					if (index > -1 && index < $scope.playing.track.albumNode.tracks.length - 1) {
						$scope.play($scope.playing.track.albumNode.tracks[index + 1]);
					} else {
						$scope.stop();
					}
				} else {
					var index = $scope.playingList.items.indexOf($scope.playing.track);
					if (index > -1 && index < $scope.playingList.items.length - 1) {
						$scope.play($scope.playingList.items[index + 1]);
					} else {
						$scope.stop();
					}
				}
			}
		}
	};

	$scope.back = function(prebuffer) {
		if ($scope.playing.track) {
			$scope.playing.track.animate = false;
		}
		$(".previousAlbumArt").attr("src", $(".currentAlbumArt").attr("src")).removeClass('animate').removeClass('animated').removeClass('animateBack').addClass('temp-back');
		$scope.prebufferdTrack = null;
		if (!$scope.playingList) {
			var index = $scope.playing.track.albumNode.tracks.indexOf($scope.playing.track);
			if (index > 0 && index < $scope.playing.track.albumNode.tracks.length) {
				if (!prebuffer) {
					$scope.play($scope.playing.track.albumNode.tracks[index - 1]);
				}
			} else {
				$scope.stop();
			}
		} else {
			var index = $scope.playingList.items.indexOf($scope.playing.track);
			if (index > 0 && index < $scope.playingList.items.length) {
				if (!prebuffer) {
					$scope.play($scope.playingList.items[index - 1]);
				}
			} else {
				$scope.stop();
			}
		}
	};

	$scope.prebuffer = function() {
		var doPrebuffer = null;
		if (!$scope.playingList) {
			var index = $scope.playing.track.albumNode.tracks.indexOf($scope.playing.track), track = $scope.playing.track.albumNode.tracks[index + 1];
			doPrebuffer = track;
		} else {
			var index = $scope.playingList.items.indexOf($scope.playing.track), track = $scope.playingList.items[index + 1];
			doPrebuffer = track;
		}
		if (doPrebuffer && $scope.prebufferdTrack !== doPrebuffer) {
			$log.info('prebuffer', doPrebuffer);
			$scope.prebufferdTrack = doPrebuffer;
			// fill otherplayer with this content
			RestService.Music.play(doPrebuffer, function(playerURL) {
				audiotags[otherPlayerIdentifier].src = playerURL;
				audiotags[otherPlayerIdentifier].load();
			});
		}
	};

	$scope.updatePosition = function($event) {
		if ($scope.len) {
			var clientX = $event.clientX, left = clientX - $($event.target).parent().offset().left, perc = (left / $($event.target).parent().width()), time = perc * $scope.len;
			if ($scope.ratio) {
				audiotag.currentTime = parseInt(time / $scope.ratio);
			} else {
				audiotag.currentTime = parseInt(time);
			}
			canUsePrebuffer = false;
		}
	};

	$scope.pos = function() {
		var percentage = ($scope.position / $scope.len) * 100;
		return (percentage) ? percentage + '%' : '0%';
	};
	$scope.bufferpos = function() {
		var percentage = ($scope.buffpos / $scope.len) * 100;
		return (percentage) ? percentage + '%' : '0%';
	};

	angular.forEach(audiotags, function(value) {
		value.addEventListener('timeupdate', function() {
			$scope.$apply(function() {
				$scope.position = audiotag.currentTime;
				if ($scope.playing.track) {
					$scope.len = audiotag.duration;
					if (!isFinite(audiotag.duration)) {
						$scope.len = $scope.playing.track.seconds;
					}
					$scope.ratio = 1;
					// @work 0.3 seems to be ok (in firefox) for small tracks
					if (canUsePrebuffer && $scope.len - $scope.position < 0.3) {
						$scope.next(true);
					}
					if ($scope.position / $scope.len > 0.5 && !$scope.scrobbeld) {
						scrobble();
					}
				}

			});
		});
		value.addEventListener('ended', function() {
			if (!canUsePrebuffer) {
				$scope.next();
			}
		});
		value.addEventListener('progress', function() {

			$scope.$apply(function() {
				try {
					$scope.buffpos = audiotag.buffered.end(0);
					if ($scope.ratio) {
						$scope.buffpos = audiotag.buffered.end(0) * $scope.ratio;
					}
					if ($scope.len && $scope.buffpos && $scope.len - $scope.buffpos < 0.8) {
						// buffpos and len are not always 100% identical when buffering is done
						$scope.prebuffer();
					} else if (isNaN($scope.len)) {
						// if the song is really small the len is NaN in Chrome sometimes, so work around this quirck
						$scope.prebuffer();
					}
				} catch (e) {
					// console.warn(e);
				};
			});

		});
	});
	$scope.hasAnalyser = false;
}]);

jsmusicdb.controller('PlaylistController', ['$scope', '$routeParams', '$log', 'RestService', '$rootScope', 'ModelService', '$modal', '$translate',
function($scope, $routeParams, $log, RestService, $rootScope, ModelService, $modal, $translate) {
	'use strict';
	window.scrollTo(0, 0);
	// get Playlists
	$rootScope.$watch(function() {
		return $rootScope.parsed;
	}, function(n, o) {
		if (n) {
			$scope.loading.playlists = true;
			RestService.Playlists.getPlaylists(function(json) {
				$scope.playlists = json;
				$scope.loading.playlists = false;
			});
		}
	});

	$scope.loading = {};

	$scope.addPlaylist = function() {
		var modalInstance = $modal.open({
			templateUrl : 'templates/addPlaylist.html',
			controller : 'AddPlaylistController',
			resolve : {
				playlistName : function() {
					return null;
				}
			}
		});

		modalInstance.result.then(function(playlistName) {
			if (playlistName) {
				RestService.Playlists.addPlaylist(playlistName, function(json) {
					$scope.loading.playlists = true;
					RestService.Playlists.getPlaylists(function(json) {
						$scope.playlists = json;
						$scope.loading.playlists = false;
					});
				});
			}
		});
	};

	$scope.renamePlaylist = function(playlistID, playlistName) {
		var modalInstance = $modal.open({
			templateUrl : 'templates/addPlaylist.html',
			controller : 'AddPlaylistController',
			backdrop : 'static',
			resolve : {
				playlistName : function() {
					return playlistName;
				}
			}
		});

		modalInstance.result.then(function(playlistName) {
			if (playlistName) {
				RestService.Playlists.renamePlaylist(playlistID, playlistName, function(json) {
					$scope.loading.playlists = true;
					RestService.Playlists.getPlaylists(function(json) {
						$scope.playlists = json;
						$scope.loading.playlists = false;

						if ($scope.viewPlaylist.id == playlistID) {
							$scope.viewPlaylist.title = playlistName;
						}
					});
				});
			}
		});
	};

	$scope.removePlaylist = function(playlistName) {
		RestService.Playlists.removePlaylist(playlistName, function(json) {
			$scope.loading.playlists = true;
			RestService.Playlists.getPlaylists(function(json) {
				$scope.playlists = json;
				$scope.loading.playlists = false;
				if ($scope.viewPlaylist.id === playlistName) {
					$scope.viewPlaylist = null;
				}
			});
		});
	};
	$scope.removeFromPlaylist = function(playlist, track, $index) {
		$scope.loading.removeFromPlaylist = true;
		if (playlist.item_id) {
			RestService.Playlists.removeFromPlaylist(playlist, track, $index, function(json) {
				$scope.loading.removeFromPlaylist = false;
				playlist.items.splice($index, 1);
				// remove the item from the view
			});
		} else {
			// last.fm
			var url = 'http://ws.audioscrobbler.com/2.0/', data = {
				method : 'track.unlove',
				api_key : '956c1818ded606576d6941de5ff793a5',
				artist : track.artist,
				track : track.title,
				sk : localStorage.getItem("key"),
				api_sig : lastfm.signplayinglove(track.artist, null, track.title, 'track.unlove')
			};
			$.post(url, data, function() {
				$scope.$apply(function() {
					$scope.loading.removeFromPlaylist = false;
					playlist.items.splice($index, 1);
					// remove the item from the view
				});
			});

		}
	};

	$scope.setPlaylist = function(playlist) {
		$scope.loading.playlist = true;
		$scope.viewPlaylist = {};
		if (playlist.title) {
			// server based playlist
			$rootScope.path = playlist.title;
			RestService.Playlists.getPlaylist(playlist.item_id, function(json) {
				var tmplist = [];
				angular.forEach(json.items, function(t) {
					var resource = t.res;
					var track = $scope.trackByPath[resource];
					if (track) {
						tmplist.push(track);
					} else {
						$log.warn("resource not found", resource);
						var dummy = {
							name : 'unavailable',
							artist : 'unavailable',
							album : 'unavailable',
							title : 'unavailable',
							number : 0,
							path : resource,
							disc : 1,
							time : "00:00"
						};
						tmplist.push(track);
					}
				});
				$scope.viewPlaylist = {
					title : playlist.title,
					items : tmplist,
					id : playlist.item_id,
					item_id : playlist.item_id
				};
				$scope.loading.playlist = false;
			});
		} else if (playlist === 'last.fm') {
			// last.fm loved playlist
			$translate('playlists.lists.lastfmName').then(function(translation) {
				$rootScope.path = translation + " " + $rootScope.user.lastfmuser;
				RestService.Playlists.getLastFMLovedPlaylist($rootScope.user.lastfmuser, function(json) {
					var tmplist = [], tracksAdded = [], duplicates = [];
					angular.forEach(json.lovedtracks.track, function(fmtrack) {
						var artistName = fmtrack.artist.name, title = fmtrack.name, artistName = ModelService.stripThe(artistName.toUpperCase()), mbid = fmtrack.mbid;
						if (RestService.Playlists.getTrackIdByKey(artistName + (title.toLowerCase()))) {
							var track = $scope.tracks[RestService.Playlists.getTrackIdByKey(artistName + (title.toLowerCase()))];
							tmplist.push(track);
						} else {
							var artist = $scope.artists[artistName];
							if (artist) {
								var uniqueTrack = null, duplicate = false;
								// TODO: use mbid in fmtrack to get the album from lastfm and store that data in the cache
								angular.forEach(artist.albums, function(album) {
									angular.forEach(album.tracks, function(track) {
										if (track.title.toLowerCase() === title.toLowerCase()) {
											if (tracksAdded[artistName + title]) {
												// duplicate
												duplicate = true;
											} else {
												// unique
												uniqueTrack = track;
											}
											tracksAdded[artistName + title] = track;
										}
									});
								});
								if (uniqueTrack && !duplicate) {
									RestService.Playlists.storeIdByKey(artistName + (title.toLowerCase()), uniqueTrack);
									tmplist.push(uniqueTrack);
								} else {
									// get data from last.fm using the mbid
									RestService.Playlists.getLastFMTrackInfo(mbid, function(mbidtrack) {
										if (mbidtrack.track && mbidtrack.track.album) {
											var albumName = mbidtrack.track.album.title;
											// do we have this album in the collection?
											angular.forEach(artist.albums, function(album) {
												if (album.album === albumName.toLowerCase()) {
													// we do!
													tracksAdded[artistName + title] = null;
													// reset the duplicate counter for this track
													duplicate = false;
													angular.forEach(album.tracks, function(track) {
														if (track.title.toLowerCase() === title.toLowerCase()) {
															if (tracksAdded[artistName + title]) {
																// duplicate
																duplicate = true;
															} else {
																// unique
																uniqueTrack = track;
															}
															tracksAdded[artistName + title] = track;
														}
													});
													if (uniqueTrack && !duplicate) {
														RestService.Playlists.storeIdByKey(artistName + (title.toLowerCase()), uniqueTrack);
														tmplist.push(uniqueTrack);
													}
												}
											});
										}
									});
								}
							} else {
								$log.debug("artist not found", artistName);
							}
						}
					});
					$scope.viewPlaylist = {
						title : translation + " " + $rootScope.user.lastfmuser,
						items : tmplist,
						duplicates : duplicates
					};
					$scope.loading.playlist = false;
				});
			});
		}
	};

	$scope.setPreferredTrack = function(track) {
		RestService.Playlists.storeIdByKey(track.artistID + (track.title.toLowerCase()), track);
	};

	$scope.playTrack = function(track, playlist) {
		if ($scope.playing.track) {
			$scope.playing.track.isPlaying = false;
		}
		$scope.playing.track = track;
		$rootScope.$broadcast('play.track', $scope.playing.track, playlist);
	};

	$scope.shuffleState = 'shuffle';
	$scope.shuffle = function() {
		function shuffle(array) {
			var currentIndex = array.length, temporaryValue, randomIndex;

			// While there remain elements to shuffle...
			while (0 !== currentIndex) {

				// Pick a remaining element...
				randomIndex = Math.floor(Math.random() * currentIndex);
				currentIndex -= 1;

				// And swap it with the current element.
				temporaryValue = array[currentIndex];
				array[currentIndex] = array[randomIndex];
				array[randomIndex] = temporaryValue;
			}

			return array;
		}

		if ($scope.shuffleState === 'shuffle') {
			shuffle($scope.viewPlaylist.items);
		}
	};
}]);

jsmusicdb.controller('OverviewController', ['$scope', 'RestService', '$rootScope', 'ModelService', '$translate',
function($scope, RestService, $rootScope, ModelService, $translate) {
	'use strict';

	$scope.upcommingAlbums = [];

	$scope.loading = {};

	$rootScope.path = "JSMusicDB";

	var getFirstLetter = function(name) {
		name = $.trim(name);
		name = (name.indexOf('THE ') === 0) ? name.substring(4) : name;
		var specialChars = [' ', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '-'], firstLetter = name.charAt(0);
		if ($.inArray(firstLetter, specialChars) > -1) {
			firstLetter = '1';
		}
		return "" + firstLetter;
	};

	$scope.recentTracks = $rootScope.recentTracks;
	$scope.recentlyAdded = $rootScope.recentlyAdded;
	$scope.upcommingAlbums = $rootScope.upcommingAlbums;

	$scope.loadRecent = function(n) {
		if (!n) n = $rootScope.user.lastfmuser;
		RestService.Overview.recent(n, function(json) {
			$scope.loading.recent = false;
			if (json.recenttracks) {
				var tmplist = [], tracksAdded = [], duplicates = [];
				angular.forEach(json.recenttracks.track, function(fmtrack) {
					var artistName = fmtrack.artist["#text"], title = fmtrack.name, albumName = fmtrack.album["#text"];
					artistName = ModelService.stripThe(artistName.toUpperCase());
					if (RestService.Playlists.getTrackIdByKey(artistName + (title.toLowerCase()))) {
						var track = $scope.tracks[RestService.Playlists.getTrackIdByKey(artistName + (title.toLowerCase()))];
						if (track) {
							if (fmtrack.date) {
								track.lastPlayed = parseInt(fmtrack.date.uts) * 1000;
							} else {
								$translate('overview.listening').then(function(translation) {
									track.lastPlayed = translation;
								});
							}
							tmplist.push(track);
						}
					} else {
						var album = $scope.albums[artistName + "-" + albumName.toLowerCase()];
						if (album && track) {
							angular.forEach(album.tracks, function(track) {
								if (track.title.toLowerCase() === title.toLowerCase()) {
									RestService.Playlists.storeIdByKey(artistName + (title.toLowerCase()), track);
									if (fmtrack.date) {
										track.lastPlayed = parseInt(fmtrack.date.uts) * 1000;
									} else {
										$translate('overview.listening').then(function(translation) {
											track.lastPlayed = translation;
										});
									}
									tmplist.push(track);
								}
							});
						} else {
							var track = {
								artist : artistName.toLowerCase(),
								title : title,
							};
							if (fmtrack.date) {
								track.lastPlayed = parseInt(fmtrack.date.uts) * 1000;
							} else {
								$translate('overview.listening').then(function(translation) {
									track.lastPlayed = translation;
								});
							}
							tmplist.push(track);
						}
					}
				});
				$scope.recentTracks = tmplist;
				$rootScope.recentTracks = tmplist;
			}
		});
	};

	$rootScope.$watch(function() {
		return $rootScope.parsed;
	}, function(n, o) {
		if (n) {
			for (var letterObject in $scope.letters) {
				$scope.letters[letterObject].active = false;
			}
			var tmplist = [];
			if (!$rootScope.recentlyAdded) {
				$scope.loading.recentAdded = true;
			}
			RestService.Overview.recentlyAdded(function(json) {
				$scope.loading.recentAdded = false;
				if (json.items) {
					angular.forEach(json.items, function(album) {
						var exists = false;
						angular.forEach(tmplist, function(tmpalbum) {
							if ((tmpalbum.artist === (album.artist || album.album_artist).toLowerCase()) && (tmpalbum.album === (album.album_name || album.title).toLowerCase())) {
								// already in the list; skip
								exists = true;
							}
						});
						if (!exists) {
							var recentAlbum = {
								artist : (album.artist || album.album_artist).toLowerCase(),
								album : (album.album_name || album.title).toLowerCase(),
								letter : getFirstLetter(album.artist || album.album_artist)
							};
							tmplist.push(recentAlbum);
						}
					});
					$scope.recentlyAdded = tmplist;
					$rootScope.recentlyAdded = $scope.recentlyAdded;
				}
			});
			$scope.$watch(function() {
				return $rootScope.user && $rootScope.user.lastfmuser;
			}, function(n, o) {
				if (n) {
					var tmplist = [];
					if (!$rootScope.upcommingAlbums) {
						$scope.loading.upcomming = true;
					}
					RestService.Overview.upcomming(n, function(json) {
						$scope.loading.upcomming = false;
						if (json.albums) {
							angular.forEach(json.albums.album, function(album) {
								var upcommingAlbum = {
									artist : album.artist.name,
									album : album.name,
									image : album.image[album.image.length -1]["#text"],
									releaseDate : album["@attr"].releasedate.substring(0, album["@attr"].releasedate.indexOf(' 00:'))
								};
								tmplist.push(upcommingAlbum);
							});
						}
						$scope.upcommingAlbums = tmplist;
						$rootScope.upcommingAlbums = $scope.upcommingAlbums;
					});
					if (!$rootScope.recentTracks) {
						$scope.loading.recent = true;
					}
					$scope.loadRecent(n);
				}
			});
		}
	});
}]);

jsmusicdb.controller('AddPlaylistController', ['$scope', '$modalInstance', 'playlistName',
function($scope, $modalInstance, playlistName) {'use strict';

	$scope.hasError = false;
	
	$scope.addPlaylist = $scope.addPlaylist || {};
	$scope.addPlaylist.playlistName = playlistName || '';
	
	if (playlistName) {
		$scope.inEdit = true;
	}

	$scope.doAddPlaylist = function () {
		$scope.hasError = false;
		if ($scope.addPlaylist.playlistName !== null && $scope.addPlaylist.playlistName !== "") {
    		$modalInstance.close($scope.addPlaylist.playlistName);
    	} else {
    		$scope.hasError = true;
    	}
  	};
}]);

/*!
 * angular-translate - v2.2.0 - 2014-06-03
 * http://github.com/PascalPrecht/angular-translate
 * Copyright (c) 2014 ; Licensed MIT
 */
angular.module("pascalprecht.translate",["ng"]).run(["$translate",function(a){var b=a.storageKey(),c=a.storage();c?c.get(b)?a.use(c.get(b)):angular.isString(a.preferredLanguage())?a.use(a.preferredLanguage()):c.set(b,a.use()):angular.isString(a.preferredLanguage())&&a.use(a.preferredLanguage())}]),angular.module("pascalprecht.translate").provider("$translate",["$STORAGE_KEY",function(a){var b,c,d,e,f,g,h,i,j,k,l,m,n,o,p={},q=[],r=a,s=[],t=!1,u="translate-cloak",v=!1,w=".",x=function(){var a=window.navigator;return(a.language||a.browserLanguage||a.systemLanguage||a.userLanguage||"").split("-").join("_")},y=function(a){for(var b=[],d=angular.lowercase(a),e=0,f=q.length;f>e;e++)b.push(angular.lowercase(q[e]));if(b.indexOf(d)>-1)return a;if(c){var g;for(var h in c){var i=!1,j=c.hasOwnProperty(h)&&angular.lowercase(h)===angular.lowercase(a);if("*"===h.slice(-1)&&(i=h.slice(0,-1)===a.slice(0,h.length-1)),(j||i)&&(g=c[h],b.indexOf(angular.lowercase(g))>-1))return g}}var k=a.split("_");return k.length>1&&b.indexOf(angular.lowercase(k[0]))>-1?k[0]:a},z=function(a,b){if(!a&&!b)return p;if(a&&!b){if(angular.isString(a))return p[a]}else angular.isObject(p[a])||(p[a]={}),angular.extend(p[a],A(b));return this};this.translations=z,this.cloakClassName=function(a){return a?(u=a,this):u};var A=function(a,b,c,d){var e,f,g,h;b||(b=[]),c||(c={});for(e in a)a.hasOwnProperty(e)&&(h=a[e],angular.isObject(h)?A(h,b.concat(e),c,e):(f=b.length?""+b.join(w)+w+e:e,b.length&&e===d&&(g=""+b.join(w),c[g]="@:"+f),c[f]=h));return c};this.addInterpolation=function(a){return s.push(a),this},this.useMessageFormatInterpolation=function(){return this.useInterpolation("$translateMessageFormatInterpolation")},this.useInterpolation=function(a){return k=a,this},this.useSanitizeValueStrategy=function(a){return t=a,this},this.preferredLanguage=function(a){return a?(b=a,this):b},this.translationNotFoundIndicator=function(a){return this.translationNotFoundIndicatorLeft(a),this.translationNotFoundIndicatorRight(a),this},this.translationNotFoundIndicatorLeft=function(a){return a?(n=a,this):n},this.translationNotFoundIndicatorRight=function(a){return a?(o=a,this):o},this.fallbackLanguage=function(a){return B(a),this};var B=function(a){return a?(angular.isString(a)?(e=!0,d=[a]):angular.isArray(a)&&(e=!1,d=a),angular.isString(b)&&d.push(b),this):e?d[0]:d};this.use=function(a){if(a){if(!p[a]&&!l)throw new Error("$translateProvider couldn't find translationTable for langKey: '"+a+"'");return f=a,this}return f};var C=function(a){return a?(r=a,void 0):i?i+r:r};this.storageKey=C,this.useUrlLoader=function(a){return this.useLoader("$translateUrlLoader",{url:a})},this.useStaticFilesLoader=function(a){return this.useLoader("$translateStaticFilesLoader",a)},this.useLoader=function(a,b){return l=a,m=b||{},this},this.useLocalStorage=function(){return this.useStorage("$translateLocalStorage")},this.useCookieStorage=function(){return this.useStorage("$translateCookieStorage")},this.useStorage=function(a){return h=a,this},this.storagePrefix=function(a){return a?(i=a,this):a},this.useMissingTranslationHandlerLog=function(){return this.useMissingTranslationHandler("$translateMissingTranslationHandlerLog")},this.useMissingTranslationHandler=function(a){return j=a,this},this.usePostCompiling=function(a){return v=!!a,this},this.determinePreferredLanguage=function(a){var c=a&&angular.isFunction(a)?a():x();return b=q.length?y(c):c,this},this.registerAvailableLanguageKeys=function(a,b){return a?(q=a,b&&(c=b),this):q},this.$get=["$log","$injector","$rootScope","$q",function(a,c,i,q){var w,x,D,E=c.get(k||"$translateDefaultInterpolation"),F=!1,G={},H={},I=function(a,c,e){if(angular.isArray(a)){var g=function(a){for(var b={},d=[],f=function(a){var d=q.defer(),f=function(c){b[a]=c,d.resolve([a,c])};return I(a,c,e).then(f,f),d.promise},g=0,h=a.length;h>g;g++)d.push(f(a[g]));return q.all(d).then(function(){return b})};return g(a)}var i=q.defer();a&&(a=a.trim());var j=function(){var a=b?H[b]:H[f];if(x=0,h&&!a){var c=w.get(r);if(a=H[c],d&&d.length){var e=J(d,c);x=e>-1?e+=1:0,d.push(b)}}return a}();return j?j.then(function(){U(a,c,e).then(i.resolve,i.reject)},i.reject):U(a,c,e).then(i.resolve,i.reject),i.promise},J=function(a,b){for(var c=0,d=a.length;d>c;c++)if(a[c]===b)return c;return-1},K=function(a){return n&&(a=[n,a].join(" ")),o&&(a=[a,o].join(" ")),a},L=function(a){f=a,i.$emit("$translateChangeSuccess"),h&&w.set(I.storageKey(),f),E.setLocale(f),angular.forEach(G,function(a,b){G[b].setLocale(f)}),i.$emit("$translateChangeEnd")},M=function(a){if(!a)throw"No language key specified for loading.";var b=q.defer();return i.$emit("$translateLoadingStart"),F=!0,c.get(l)(angular.extend(m,{key:a})).then(function(c){var d={};i.$emit("$translateLoadingSuccess"),angular.isArray(c)?angular.forEach(c,function(a){angular.extend(d,A(a))}):angular.extend(d,A(c)),F=!1,b.resolve({key:a,table:d}),i.$emit("$translateLoadingEnd")},function(a){i.$emit("$translateLoadingError"),b.reject(a),i.$emit("$translateLoadingEnd")}),b.promise};if(h&&(w=c.get(h),!w.get||!w.set))throw new Error("Couldn't use storage '"+h+"', missing get() or set() method!");angular.isFunction(E.useSanitizeValueStrategy)&&E.useSanitizeValueStrategy(t),s.length&&angular.forEach(s,function(a){var d=c.get(a);d.setLocale(b||f),angular.isFunction(d.useSanitizeValueStrategy)&&d.useSanitizeValueStrategy(t),G[d.getInterpolationIdentifier()]=d});var N=function(a){var b=q.defer();return p.hasOwnProperty(a)?(b.resolve(p[a]),b.promise):(H[a].then(function(a){z(a.key,a.table),b.resolve(a.table)},b.reject),b.promise)},O=function(a,b,c,d){var e=q.defer();return N(a).then(function(g){g.hasOwnProperty(b)?(d.setLocale(a),e.resolve(d.interpolate(g[b],c)),d.setLocale(f)):e.reject()},e.reject),e.promise},P=function(a,b,c,d){var e,g=p[a];return g.hasOwnProperty(b)&&(d.setLocale(a),e=d.interpolate(g[b],c),d.setLocale(f)),e},Q=function(a,b,e,g){var h=q.defer();if(a<d.length){var i=d[a];O(i,b,e,g).then(function(a){h.resolve(a)},function(){var c=Q(a+1,b,e,g);h.resolve(c)})}else if(j){var k=c.get(j)(b,f);void 0!==k?h.resolve(k):h.resolve(b)}else h.resolve(b);return h.promise},R=function(a,b,c,e){var f;if(a<d.length){var g=d[a];f=P(g,b,c,e),f||(f=R(a+1,b,c,e))}return f},S=function(a,b,c){return Q(D>0?D:x,a,b,c)},T=function(a,b,c){return R(D>0?D:x,a,b,c)},U=function(a,b,e){var g=q.defer(),h=f?p[f]:p,i=e?G[e]:E;if(h&&h.hasOwnProperty(a)){var k=h[a];"@:"===k.substr(0,2)?I(k.substr(2),b,e).then(g.resolve,g.reject):g.resolve(i.interpolate(k,b))}else j&&!F&&c.get(j)(a,f),f&&d&&d.length?S(a,b,i).then(function(a){g.resolve(a)},function(a){g.reject(K(a))}):g.reject(K(a));return g.promise},V=function(a,b,e){var g,h=f?p[f]:p,i=e?G[e]:E;if(h&&h.hasOwnProperty(a)){var k=h[a];g="@:"===k.substr(0,2)?V(k.substr(2),b,e):i.interpolate(k,b)}else j&&!F&&c.get(j)(a,f),f&&d&&d.length?(x=0,g=T(a,b,i)):g=K(a);return g};if(I.preferredLanguage=function(){return b},I.cloakClassName=function(){return u},I.fallbackLanguage=function(a){if(void 0!==a&&null!==a){if(B(a),l&&d&&d.length)for(var b=0,c=d.length;c>b;b++)H[d[b]]||(H[d[b]]=M(d[b]));I.use(I.use())}return e?d[0]:d},I.useFallbackLanguage=function(a){if(void 0!==a&&null!==a)if(a){var b=J(d,a);b>-1&&(D=b)}else D=0},I.proposedLanguage=function(){return g},I.storage=function(){return w},I.use=function(a){if(!a)return f;var b=q.defer();i.$emit("$translateChangeStart");var c=y(a);return c&&(a=c),!p[a]&&l?(g=a,H[a]=M(a).then(function(c){z(c.key,c.table),b.resolve(c.key),g===a&&(L(c.key),g=void 0)},function(a){g=void 0,i.$emit("$translateChangeError"),b.reject(a),i.$emit("$translateChangeEnd")})):(b.resolve(a),L(a)),b.promise},I.storageKey=function(){return C()},I.isPostCompilingEnabled=function(){return v},I.refresh=function(a){function b(){e.resolve(),i.$emit("$translateRefreshEnd")}function c(){e.reject(),i.$emit("$translateRefreshEnd")}if(!l)throw new Error("Couldn't refresh translation table, no loader registered!");var e=q.defer();if(i.$emit("$translateRefreshStart"),a)p[a]?M(a).then(function(c){z(c.key,c.table),a===f&&L(f),b()},c):c();else{var g=[];if(d&&d.length)for(var h=0,j=d.length;j>h;h++)g.push(M(d[h]));f&&g.push(M(f)),q.all(g).then(function(a){angular.forEach(a,function(a){p[a.key]&&delete p[a.key],z(a.key,a.table)}),f&&L(f),b()})}return e.promise},I.instant=function(a,e,g){if(null===a||angular.isUndefined(a))return a;if(angular.isArray(a)){for(var h={},i=0,k=a.length;k>i;i++)h[a[i]]=I.instant(a[i],e,g);return h}if(angular.isString(a)&&a.length<1)return a;a&&(a=a.trim());var l,m=[];b&&m.push(b),f&&m.push(f),d&&d.length&&(m=m.concat(d));for(var n=0,o=m.length;o>n;n++){var q=m[n];if(p[q]&&"undefined"!=typeof p[q][a]&&(l=V(a,e,g)),"undefined"!=typeof l)break}return l||""===l||(l=a,j&&!F&&c.get(j)(a,f)),l},l&&(angular.equals(p,{})&&I.use(I.use()),d&&d.length))for(var W=0,X=d.length;X>W;W++)H[d[W]]=M(d[W]);return I}]}]),angular.module("pascalprecht.translate").factory("$translateDefaultInterpolation",["$interpolate",function(a){var b,c={},d="default",e=null,f={escaped:function(a){var b={};for(var c in a)a.hasOwnProperty(c)&&(b[c]=angular.element("<div></div>").text(a[c]).html());return b}},g=function(a){var b;return b=angular.isFunction(f[e])?f[e](a):a};return c.setLocale=function(a){b=a},c.getInterpolationIdentifier=function(){return d},c.useSanitizeValueStrategy=function(a){return e=a,this},c.interpolate=function(b,c){return e&&(c=g(c)),a(b)(c||{})},c}]),angular.module("pascalprecht.translate").constant("$STORAGE_KEY","NG_TRANSLATE_LANG_KEY"),angular.module("pascalprecht.translate").directive("translate",["$translate","$q","$interpolate","$compile","$parse","$rootScope",function(a,b,c,d,e,f){return{restrict:"AE",scope:!0,compile:function(b,g){var h=g.translateValues?g.translateValues:void 0,i=g.translateInterpolation?g.translateInterpolation:void 0,j=b[0].outerHTML.match(/translate-value-+/i);return function(b,k,l){if(b.interpolateParams={},l.$observe("translate",function(a){b.translationId=angular.equals(a,"")||!angular.isDefined(a)?c(k.text().replace(/^\s+|\s+$/g,""))(b.$parent):a}),l.$observe("translateDefault",function(a){b.defaultText=a}),h&&l.$observe("translateValues",function(a){a&&b.$parent.$watch(function(){angular.extend(b.interpolateParams,e(a)(b.$parent))})}),j){var m=function(a){l.$observe(a,function(c){b.interpolateParams[angular.lowercase(a.substr(14,1))+a.substr(15)]=c})};for(var n in l)l.hasOwnProperty(n)&&"translateValue"===n.substr(0,14)&&"translateValues"!==n&&m(n)}var o=function(b,c,e){e||"undefined"==typeof c.defaultText||(b=c.defaultText),k.html(b);var f=a.isPostCompilingEnabled(),h="undefined"!=typeof g.translateCompile,i=h&&"false"!==g.translateCompile;(f&&!h||i)&&d(k.contents())(c)},p=function(){return h||j?function(){var c=function(){b.translationId&&b.interpolateParams&&a(b.translationId,b.interpolateParams,i).then(function(a){o(a,b,!0)},function(a){o(a,b,!1)})};b.$watch("interpolateParams",c,!0),b.$watch("translationId",c)}:function(){var c=b.$watch("translationId",function(d){b.translationId&&d&&a(d,{},i).then(function(a){o(a,b,!0),c()},function(a){o(a,b,!1),c()})},!0)}}(),q=f.$on("$translateChangeSuccess",p);p(),b.$on("$destroy",q)}}}}]),angular.module("pascalprecht.translate").directive("translateCloak",["$rootScope","$translate",function(a,b){return{compile:function(c){a.$on("$translateLoadingSuccess",function(){c.removeClass(b.cloakClassName())}),c.addClass(b.cloakClassName())}}}]),angular.module("pascalprecht.translate").filter("translate",["$parse","$translate",function(a,b){return function(c,d,e){return angular.isObject(d)||(d=a(d)(this)),b.instant(c,d,e)}}]);
angular.module('pascalprecht.translate')
/**
 * @ngdoc object
 * @name pascalprecht.translate.$translateStaticFilesLoader
 * @requires $q
 * @requires $http
 *
 * @description
 * Creates a loading function for a typical static file url pattern:
 * "lang-en_US.json", "lang-de_DE.json", etc. Using this builder,
 * the response of these urls must be an object of key-value pairs.
 *
 * @param {object} options Options object, which gets prefix, suffix and key.
 */
.factory('$translateStaticFilesLoader', ['$q', '$http', function ($q, $http) {

  return function (options) {

    if (!options || (!angular.isString(options.prefix) || !angular.isString(options.suffix))) {
      throw new Error('Couldn\'t load static files, no prefix or suffix specified!');
    }

    var deferred = $q.defer();

    $http({
      url: [
        options.prefix,
        options.key,
        options.suffix
      ].join(''),
      method: 'GET',
      params: ''
    }).success(function (data) {
      deferred.resolve(data);
    }).error(function (data) {
      deferred.reject(options.key);
    });

    return deferred.promise;
  };
}]);

( function(window) {
'use strict';
angular.module('tmh.dynamicLocale', []).provider('tmhDynamicLocale', function() {

  var defaultLocale,
    localeLocationPattern = 'javascripts/angular/i18n/angular-locale_{{locale}}.js',
    storageFactory = 'tmhDynamicLocaleStorageCache',
    storage,
    storeKey = 'tmhDynamicLocale.locale',
    promiseCache = {},
    activeLocale;

  /**
   * Loads a script asynchronously
   *
   * @param {string} url The url for the script
   @ @param {function) callback A function to be called once the script is loaded
   */
  function loadScript(url, callback, errorCallback, $timeout) {
    var script = document.createElement('script'),
      body = document.getElementsByTagName('body')[0],
      removed = false;

    script.type = 'text/javascript';
    if (script.readyState) { // IE
      script.onreadystatechange = function () {
        if (script.readyState === 'complete' ||
            script.readyState === 'loaded') {
          script.onreadystatechange = null;
          $timeout(
            function () {
              if (removed) return;
              removed = true;
              body.removeChild(script);
              callback();
            }, 30, false);
        }
      };
    } else { // Others
      script.onload = function () {
        if (removed) return;
        removed = true;
        body.removeChild(script);
        callback();
      };
      script.onerror = function () {
        if (removed) return;
        removed = true;
        body.removeChild(script);
        errorCallback();
      };
    }
    script.src = url;
    script.async = false;
    body.appendChild(script);
  }

  /**
   * Loads a locale and replaces the properties from the current locale with the new locale information
   *
   * @param localeUrl The path to the new locale
   * @param $locale The locale at the curent scope
   */
  function loadLocale(localeUrl, $locale, localeId, $rootScope, $q, localeCache, $timeout) {

    function overrideValues(oldObject, newObject) {
      if (activeLocale !== localeId) {
        return;
      }
      angular.forEach(oldObject, function(value, key) {
        if (!newObject[key]) {
          delete oldObject[key];
        } else if (angular.isArray(newObject[key])) {
          oldObject[key].length = newObject[key].length;
        }
      });
      angular.forEach(newObject, function(value, key) {
        if (angular.isArray(newObject[key]) || angular.isObject(newObject[key])) {
          if (!oldObject[key]) {
            oldObject[key] = angular.isArray(newObject[key]) ? [] : {};
          }
          overrideValues(oldObject[key], newObject[key]);
        } else {
          oldObject[key] = newObject[key];
        }
      });
    }


    if (promiseCache[localeId]) return promiseCache[localeId];

    var cachedLocale,
      deferred = $q.defer();
    if (localeId === activeLocale) {
      deferred.resolve($locale);
    } else if ((cachedLocale = localeCache.get(localeId))) {
      activeLocale = localeId;
      $rootScope.$evalAsync(function() {
        overrideValues($locale, cachedLocale);
        $rootScope.$broadcast('$localeChangeSuccess', localeId, $locale);
        storage.put(storeKey, localeId);
        deferred.resolve($locale);
      });
    } else {
      activeLocale = localeId;
      promiseCache[localeId] = deferred.promise;
      loadScript(localeUrl, function () {
        // Create a new injector with the new locale
        var localInjector = angular.injector(['ngLocale']),
          externalLocale = localInjector.get('$locale');

        overrideValues($locale, externalLocale);
        localeCache.put(localeId, externalLocale);
        delete promiseCache[localeId];

        $rootScope.$apply(function () {
          $rootScope.$broadcast('$localeChangeSuccess', localeId, $locale);
          storage.put(storeKey, localeId);
          deferred.resolve($locale);
        });
      }, function () {
        delete promiseCache[localeId];

        $rootScope.$apply(function () {
          $rootScope.$broadcast('$localeChangeError', localeId);
          deferred.reject(localeId);
        });
      }, $timeout);
    }
    return deferred.promise;
  }

  this.localeLocationPattern = function(value) {
    if (value) {
      localeLocationPattern = value;
      return this;
    } else {
      return localeLocationPattern;
    }
  };

  this.useStorage = function(storageName) {
    storageFactory = storageName;
  };

  this.useCookieStorage = function() {
    this.useStorage('$cookieStore');
  };

  this.defaultLocale = function (value) {
    defaultLocale = value;
  };

  this.$get = ['$rootScope', '$injector', '$interpolate', '$locale', '$q', 'tmhDynamicLocaleCache', '$timeout', function($rootScope, $injector, interpolate, locale, $q, tmhDynamicLocaleCache, $timeout) {
    var localeLocation = interpolate(localeLocationPattern);

    storage = $injector.get(storageFactory);
    $rootScope.$evalAsync(function () {
      var initialLocale;
      if ((initialLocale = (storage.get(storeKey) || defaultLocale))) {
        loadLocale(localeLocation({locale: initialLocale}), locale, initialLocale, $rootScope, $q, tmhDynamicLocaleCache, $timeout);
      }
    });
    return {
      /**
       * @ngdoc method
       * @description
       * @param {string=} value Sets the locale to the new locale. Changing the locale will trigger
       *    a background task that will retrieve the new locale and configure the current $locale
       *    instance with the information from the new locale
       */
      set: function(value) {
        return loadLocale(localeLocation({locale: value}), locale, value, $rootScope, $q, tmhDynamicLocaleCache, $timeout);
      }
    };
  }];
}).provider('tmhDynamicLocaleCache', function() {
  this.$get = ['$cacheFactory', function($cacheFactory) {
    return $cacheFactory('tmh.dynamicLocales');
  }];
}).provider('tmhDynamicLocaleStorageCache', function() {
  this.$get = ['$cacheFactory', function($cacheFactory) {
    return $cacheFactory('tmh.dynamicLocales.store');
  }];
}).run(['tmhDynamicLocale', angular.noop]);
}(window) );

jsmusicdb.directive("bnLazyBg", function($window, $document, $http) {

	// I manage all the images that are currently being
	// monitored on the page for lazy loading.
	var lazyLoader = (function() {
		// I maintain a list of images that lazy-loading
		// and have yet to be rendered.
		var images = [];

		// I define the render timer for the lazy loading
		// images to that the DOM-querying (for offsets)
		// is chunked in groups.
		var renderTimer = null;
		var renderDelay = 100;

		// I cache the window element as a jQuery reference.
		var win = $($window);

		// I cache the document document height so that
		// we can respond to changes in the height due to
		// dynamic content.
		var doc = $document;
		var documentHeight = doc.height();
		var documentTimer = null;
		var documentDelay = 2000;

		// I determine if the window dimension events
		// (ie. resize, scroll) are currenlty being
		// monitored for changes.
		var isWatchingWindow = false;

		// ---
		// PUBLIC METHODS.
		// ---

		// I start monitoring the given image for visibility
		// and then render it when necessary.
		function addImage(image) {

			images.push(image);

			if (!renderTimer) {

				startRenderTimer();

			}

			if (!isWatchingWindow) {

				startWatchingWindow();

			}

		}

		// I remove the given image from the render queue.
		function removeImage(image) {
			// Remove the given image from the render queue.
			for (var i = 0; i < images.length; i++) {

				if (images[i] === image) {

					images.splice(i, 1);
					break;

				}

			}

			// If removing the given image has cleared the
			// render queue, then we can stop monitoring
			// the window and the image queue.
			if (!images.length) {

				clearRenderTimer();

				stopWatchingWindow();

			}

		}

		// ---
		// PRIVATE METHODS.
		// ---

		// I check the document height to see if it's changed.
		function checkDocumentHeight() {

			// If the render time is currently active, then
			// don't bother getting the document height -
			// it won't actually do anything.
			if (renderTimer) {

				return;

			}

			var currentDocumentHeight = doc.height();

			// If the height has not changed, then ignore -
			// no more images could have come into view.
			if (currentDocumentHeight === documentHeight) {

				return;

			}

			// Cache the new document height.
			documentHeight = currentDocumentHeight;

			startRenderTimer();

		}

		// I check the lazy-load images that have yet to
		// be rendered.
		function lazyBgCheckImages() {

			// Log here so we can see how often this
			// gets called during page activity.
			// console.log("Checking for visible images...");

			var visible = [];
			var hidden = [];

			// Determine the window dimensions.
			var windowHeight = win.height();
			var scrollTop = win.scrollTop();

			// Calculate the viewport offsets.
			var topFoldOffset = scrollTop;
			var bottomFoldOffset = (topFoldOffset + windowHeight );

			// Query the DOM for layout and seperate the
			// images into two different categories: those
			// that are now in the viewport and those that
			// still remain hidden.
			for (var i = 0; i < images.length; i++) {

				var image = images[i];
				if (image.isVisible(topFoldOffset, bottomFoldOffset)) {
					visible.push(image);

				} else {
					hidden.push(image);

				}
			}

			// Update the DOM with new image source values.
			for (var i = 0; i < visible.length; i++) {
				visible[i].render();

			}

			// Keep the still-hidden images as the new
			// image queue to be monitored.
			images = hidden;

			// Clear the render timer so that it can be set
			// again in response to window changes.
			clearRenderTimer();

			// If we've rendered all the images, then stop
			// monitoring the window for changes.
			if (!images.length) {

				stopWatchingWindow();

			}

		}

		// I clear the render timer so that we can easily
		// check to see if the timer is running.
		function clearRenderTimer() {

			clearTimeout(renderTimer);

			renderTimer = null;

		}

		// I start the render time, allowing more images to
		// be added to the images queue before the render
		// action is executed.
		function startRenderTimer() {
			renderTimer = setTimeout(lazyBgCheckImages, 100);
		}

		// I start watching the window for changes in dimension.
		function startWatchingWindow() {
			isWatchingWindow = true;

			// Listen for window changes.
			win.on("resize.bnLazySrc", windowChanged);
			win.on("scroll.bnLazySrc", windowChanged);

			// Set up a timer to watch for document-height changes.
			documentTimer = setInterval(checkDocumentHeight, documentDelay);

		}

		// I stop watching the window for changes in dimension.
		function stopWatchingWindow() {

			isWatchingWindow = false;

			// Stop watching for window changes.
			win.off("resize.bnLazySrc");
			win.off("scroll.bnLazySrc");

			// Stop watching for document changes.
			clearInterval(documentTimer);

		}

		// I start the render time if the window changes.
		function windowChanged() {
			if (!renderTimer) {

				startRenderTimer();

			}

		}

		// Return the public API.
		return ( {
			addImage : addImage,
			removeImage : removeImage
		});

	})();

	// ------------------------------------------ //
	// ------------------------------------------ //

	// I represent a single lazy-load image.
	function LazyImage(element, scope, name) {

		// I am the interpolated LAZY SRC attribute of
		// the image as reported by AngularJS.
		var source = null;

		// I determine if the image has already been
		// rendered (ie, that it has been exposed to the
		// viewport and the source had been loaded).
		var isRendered = false;

		// I am the cached height of the element. We are
		// going to assume that the image doesn't change
		// height over time.
		var height = element.height();
		var scope = scope, rootScope = scope.$root;

		var cachedResult = null;

		// ---
		// PUBLIC METHODS.
		// ---

		// I determine if the element is above the given
		// fold of the page.
		function isVisible(topFoldOffset, bottomFoldOffset) {

			// If the element is not visible because it
			// is hidden, don't bother testing it.
			if (! element.is(":visible")) {

				//return (false );

			}

			// If the height has not yet been calculated,
			// the cache it for the duration of the page.
			if (height === null) {

				height = element.height();

			}
			// Update the dimensions of the element.
			var top = element.offset().top;
			var bottom = (top + height );
			// Return true if the element is:
			// 1. The top offset is in view.
			// 2. The bottom offset is in view.
			// 3. The element is overlapping the viewport.
			return (((top <= bottomFoldOffset ) && (top >= topFoldOffset )
			) || ((bottom <= bottomFoldOffset ) && (bottom >= topFoldOffset )
			) || ((top <= topFoldOffset ) && (bottom >= bottomFoldOffset )
			)
			);

		}

		// I move the cached source into the live source.
		function render() {

			isRendered = true;

			renderSource();

		}

		// I set the interpolated source value reported
		// by the directive / AngularJS.
		function setSource(newSource) {
			source = newSource;

			// TODO: fix lazy loading!
			if (isRendered) {
				renderSource();
			}
			// renderSource();
		}

		// ---
		// PRIVATE METHODS.
		// ---

		// I load the lazy source value into the actual
		// source value of the image element.
		function renderSource() {
			if (!rootScope.cachedImages) {
				rootScope.cachedImages = [];
			}
			if (scope.album) {
				var cachedResult = rootScope.cachedImages[name];
			} else {
				var cachedResult = rootScope.cachedImages[name];
			}
			if (cachedResult) {
				element[0].style.backgroundImage = 'url(' + cachedResult + ')';
			} else {
				if (source.indexOf("|") === -1) {
					$http.get('http://ws.audioscrobbler.com/2.0/', {
						params : {
							method : 'artist.getinfo',
							api_key : '956c1818ded606576d6941de5ff793a5',
							artist : source,
							format : 'json',
							autoCorrect : true
						}
					}).success(function(json) {
						if (json.artist) {
							var artlist = json.artist.image;
							$.each(artlist, function() {
								if (this.size === 'extralarge') {
									var url = this["#text"];
									cachedResult = url || "images/nocover.png";
									element[0].style.backgroundImage = 'url(' + cachedResult + ')';
								}
								if ($(".desktop").length === 1) {
			                        if (this.size === 'mega') {
			                            var url = this["#text"];
			                            cachedResult = url || "images/nocover.png";
			                            element[0].style.backgroundImage = 'url(' + cachedResult + ')';
			                        }
			                    } else {
			                    	if (this.size === 'extralarge') {
			                            var url = this["#text"];
			                            cachedResult = url || "images/nocover.png";
			                            element[0].style.backgroundImage = 'url(' + cachedResult + ')';
			                        }
			                    }
							});
						} else {
							cachedResult = "images/nocover.png";
							element[0].style.backgroundImage = 'url(' + cachedResult + ')';
						}
						rootScope.cachedImages[name] = cachedResult;
					});
				} else {
					var splitted = source.split("|");
					$http.get('http://ws.audioscrobbler.com/2.0/', {
						params : {
							method : 'album.getinfo',
							api_key : '956c1818ded606576d6941de5ff793a5',
							artist : splitted[0],
							album : splitted[1],
							format : 'json',
							autoCorrect : true
						}
					}).success(function(json) {
						if (json.album) {
							var artlist = json.album.image;
							$.each(artlist, function() {
								if (this.size === 'extralarge') {
									var url = this["#text"];
									cachedResult = url || "images/nocover.png";
									element[0].style.backgroundImage = 'url(' + cachedResult + ')';
								}
								if ($(".desktop").length === 1) {
			                        if (this.size === 'mega') {
			                            var url = this["#text"];
			                            cachedResult = url || "images/nocover.png";
			                            element[0].style.backgroundImage = 'url(' + cachedResult + ')';
			                        }
			                    } else {
			                    	if (this.size === 'extralarge') {
			                            var url = this["#text"];
			                            cachedResult = url || "images/nocover.png";
			                            element[0].style.backgroundImage = 'url(' + cachedResult + ')';
			                        }
			                    }
							});
						} else {
							cachedResult = "images/nocover.png";
							element[0].style.backgroundImage = 'url(' + cachedResult + ')';
						}
						rootScope.cachedImages[name] = cachedResult;
					});
				}
			}
		}

		// Return the public API.
		return ( {
			isVisible : isVisible,
			render : render,
			setSource : setSource
		});

	}

	// ------------------------------------------ //
	// ------------------------------------------ //

	// I bind the UI events to the scope.
	function link($scope, element, attributes) {
		var scope = $scope;
		var lazyImage = new LazyImage(element, scope, attributes.bnLazyBg);

		// Start watching the image for changes in its
		// visibility.
		lazyLoader.addImage(lazyImage);

		// Since the lazy-src will likely need some sort
		// of string interpolation, we don't want to
		attributes.$observe("bnLazyBg", function(newSource) {
			lazyImage.setSource(newSource);

		});

		// When the scope is destroyed, we need to remove
		// the image from the render queue.
		$scope.$on("$destroy", function() {

			lazyLoader.removeImage(lazyImage);

		});

	}

	// Return the directive configuration.
	return ( {
		link : link,
		restrict : "A"
	});

});

jsmusicdb.directive("bnLazySrc", function($window, $document, $http) {

    // I manage all the images that are currently being
    // monitored on the page for lazy loading.
    var lazyLoader = (function() {

        // I maintain a list of images that lazy-loading
        // and have yet to be rendered.
        var images = [];

        // I define the render timer for the lazy loading
        // images to that the DOM-querying (for offsets)
        // is chunked in groups.
        var renderTimer = null;
        var renderDelay = 100;

        // I cache the window element as a jQuery reference.
        var win = $($window);

        // I cache the document document height so that
        // we can respond to changes in the height due to
        // dynamic content.
        var doc = $document;
        var documentHeight = doc.height();
        var documentTimer = null;
        var documentDelay = 2000;

        // I determine if the window dimension events
        // (ie. resize, scroll) are currenlty being
        // monitored for changes.
        var isWatchingWindow = false;

        // ---
        // PUBLIC METHODS.
        // ---

        // I start monitoring the given image for visibility
        // and then render it when necessary.
        function addImage(image) {

            images.push(image);

            if (!renderTimer) {

                startRenderTimer();

            }

            if (!isWatchingWindow) {

                startWatchingWindow();

            }

        }

        // I remove the given image from the render queue.
        function removeImage(image) {
            // Remove the given image from the render queue.
            for (var i = 0; i < images.length; i++) {

                if (images[i] === image) {

                    images.splice(i, 1);
                    break;

                }

            }

            // If removing the given image has cleared the
            // render queue, then we can stop monitoring
            // the window and the image queue.
            if (!images.length) {

                clearRenderTimer();

                stopWatchingWindow();

            }

        }

        // ---
        // PRIVATE METHODS.
        // ---

        // I check the document height to see if it's changed.
        function checkDocumentHeight() {

            // If the render time is currently active, then
            // don't bother getting the document height -
            // it won't actually do anything.
            if (renderTimer) {

                return;

            }

            var currentDocumentHeight = doc.height();

            // Cache the new document height.
            documentHeight = currentDocumentHeight;

            startRenderTimer();

        }

        // I check the lazy-load images that have yet to
        // be rendered.
        function checkImages() {

            // Log here so we can see how often this
            // gets called during page activity.
            // console.log("Checking for visible images...");

            var visible = [];
            var hidden = [];

            // Determine the window dimensions.
            var windowHeight = win.height();
            var scrollTop = win.scrollTop();

            // Calculate the viewport offsets.
            var topFoldOffset = scrollTop;
            var bottomFoldOffset = (topFoldOffset + windowHeight );

            // Query the DOM for layout and seperate the
            // images into two different categories: those
            // that are now in the viewport and those that
            // still remain hidden.
            for (var i = 0; i < images.length; i++) {

                var image = images[i];
                if (image.isVisible(topFoldOffset, bottomFoldOffset)) {
                    visible.push(image);

                } else {
                    hidden.push(image);

                }

            }

            // Update the DOM with new image source values.
            for (var i = 0; i < visible.length; i++) {

                visible[i].render();

            }

            // Keep the still-hidden images as the new
            // image queue to be monitored.
            images = hidden;

            // Clear the render timer so that it can be set
            // again in response to window changes.
            clearRenderTimer();

            // If we've rendered all the images, then stop
            // monitoring the window for changes.
            if (!images.length) {

                stopWatchingWindow();

            }

        }

        // I clear the render timer so that we can easily
        // check to see if the timer is running.
        function clearRenderTimer() {

            clearTimeout(renderTimer);

            renderTimer = null;

        }

        // I start the render time, allowing more images to
        // be added to the images queue before the render
        // action is executed.
        function startRenderTimer() {

            renderTimer = setTimeout(checkImages, renderDelay);

        }

        // I start watching the window for changes in dimension.
        function startWatchingWindow() {

            isWatchingWindow = true;

            // Listen for window changes.
            win.on("resize.bnLazySrc", windowChanged);
            win.on("scroll", windowChanged);

            // Set up a timer to watch for document-height changes.
            documentTimer = setInterval(checkDocumentHeight, documentDelay);

        }

        // I stop watching the window for changes in dimension.
        function stopWatchingWindow() {

            isWatchingWindow = false;

            // Stop watching for window changes.
            win.off("resize.bnLazySrc");
            win.off("scroll.bnLazySrc");

            // Stop watching for document changes.
            clearInterval(documentTimer);

        }

        // I start the render time if the window changes.
        function windowChanged() {
            if (!renderTimer) {

                startRenderTimer();

            }

        }

        // Return the public API.
        return ( {
            addImage : addImage,
            removeImage : removeImage
        });

    })();

    // ------------------------------------------ //
    // ------------------------------------------ //

    // I represent a single lazy-load image.
    function LazyImage(element, scope) {

        // I am the interpolated LAZY SRC attribute of
        // the image as reported by AngularJS.
        var source = null;

        // I determine if the image has already been
        // rendered (ie, that it has been exposed to the
        // viewport and the source had been loaded).
        var isRendered = false;

        // I am the cached height of the element. We are
        // going to assume that the image doesn't change
        // height over time.
        var height = null;
        var scope = scope,
			rootScope = scope.$root;

        var cachedResult = null;

        var cachedResult = null;

        // ---
        // PUBLIC METHODS.
        // ---

        // I determine if the element is above the given
        // fold of the page.
        function isVisible(topFoldOffset, bottomFoldOffset) {

            // If the element is not visible because it
            // is hidden, don't bother testing it.
            if (! element.is(":visible")) {

                return (false );

            }

            // If the height has not yet been calculated,
            // the cache it for the duration of the page.
            if (height === null) {

                height = element.height() || 215;

            }
            // Update the dimensions of the element.
            var top = element.offset().top;
            var bottom = (top + height );
            // Return true if the element is:
            // 1. The top offset is in view.
            // 2. The bottom offset is in view.
            // 3. The element is overlapping the viewport.
            return (((top <= bottomFoldOffset ) && (top >= topFoldOffset )
            ) || ((bottom <= bottomFoldOffset ) && (bottom >= topFoldOffset )
            ) || ((top <= topFoldOffset ) && (bottom >= bottomFoldOffset )
            )
            );
        }

        // I move the cached source into the live source.
        function render() {

            isRendered = true;

            renderSource();

        }

        // I set the interpolated source value reported
        // by the directive / AngularJS.
        function setSource(newSource) {

            source = newSource;

            // TODO: fix lazy loading!
            //if (isRendered) {
            //    renderSource();
            //}
            renderSource();

        }

        // ---
        // PRIVATE METHODS.
        // ---

        // I load the lazy source value into the actual
        // source value of the image element.
        function renderSource() {
            if (!rootScope.cachedImages) {
        		rootScope.cachedImages = [];
        	}
        	var cachedResult = null;
        	if (scope.artist) {
        		cachedResult = rootScope.cachedImages[scope.artist.Naam + '-' + scope.album.Album];
        	} else if (scope.track) {
        		cachedResult = rootScope.cachedImages[scope.track.Artiest + '-' + scope.track.Album];
        	} else if (scope.album) {
        		cachedResult = rootScope.cachedImages[scope.album.Artiest + '-' + scope.album.Album];
        	}
            if (cachedResult) {
                element[0].src = cachedResult;
            } else {
	            var splitted = source.split("|");

	            $http.get('http://ws.audioscrobbler.com/2.0/', {
	                params : {
	                    method : 'album.getinfo',
	                    api_key : '956c1818ded606576d6941de5ff793a5',
	                    artist : splitted[0],
	                    album : splitted[1],
	                    format : 'json',
	                    autoCorrect : true
	                }
	            }).success(function(json) {
	                if (json.album) {
	                    var artlist = json.album.image;
	                    $.each(artlist, function() {
	                    	if ($(".desktop").length === 1) {
		                        if (this.size === 'mega') {
		                            var url = this["#text"];
		                            cachedResult = url || "images/nocover.png";
		                            element[0].src = cachedResult;
		                        }
		                    } else {
		                    	if (this.size === 'extralarge') {
		                            var url = this["#text"];
		                            cachedResult = url || "images/nocover.png";
		                            element[0].src = cachedResult;
		                        }
		                    }
	                    });
	                } else {
	                    cachedResult = "images/nocover.png";
	                    element[0].src = cachedResult;
	                }
	                if (scope.album) {
	                	rootScope.cachedImages[scope.album.Artiest + '-' + scope.album.Album] = cachedResult;
	                }
	            });
            }
            $(element[0]).on("load", function () {
            	if ($(this).hasClass('currentAlbumArt')) {
            		if ($(".previousAlbumArt").hasClass("temp-back")) {
            			$(".previousAlbumArt").addClass('animateBack');
            		} else {
            			$(".previousAlbumArt").addClass('animate');
            		}
								$(".previousAlbumArt").removeClass("temp-back");
            		if ($(".desktop").length === 1) {
            			$(".imageWrapper").width(element[0].width);
            		} else {
            			$(".imageWrapper").width('');
            		}
            	}
            });
            $(window).on("resize", function () {
            	if ($(".desktop").length === 1) {
        			$(".imageWrapper").width(element[0].width);
        		} else {
        			$(".imageWrapper").width('');
        		}
            });
        }

        // Return the public API.
        return ( {
            isVisible : isVisible,
            render : render,
            setSource : setSource
        });

    }

    // ------------------------------------------ //
    // ------------------------------------------ //

    // I bind the UI events to the scope.
    function link($scope, element, attributes) {
		var scope = $scope;
        var lazyImage = new LazyImage(element, scope);

        // Start watching the image for changes in its
        // visibility.
        lazyLoader.addImage(lazyImage);

        // Since the lazy-src will likely need some sort
        // of string interpolation, we don't want to
        attributes.$observe("bnLazySrc", function(newSource) {

            lazyImage.setSource(newSource);

        });

        // When the scope is destroyed, we need to remove
        // the image from the render queue.
        $scope.$on("$destroy", function() {

            lazyLoader.removeImage(lazyImage);

        });

    }

    // Return the directive configuration.
    return ( {
        link : link,
        restrict : "A"
    });

});

angular.module('TimeFilters', []).filter('timeFilter', function($translate) {
	var prefixZero = function(n) {
		if (n < 10) {
			return "0" + n;
		}
		return n;
	};
	var daysString = 'days';
	$translate("about.days").then(function (translation) {
		daysString = translation;
	});
	return function(total) {
		if (isNaN(total) || total < 1 || total === Infinity) {
			return null;
		};
		var days = parseInt(total / (3600 * 24)), rest = parseInt(total % (3600 * 24)), hours = parseInt(rest / 3600), rest = parseInt(total % 3600), minutes = parseInt(rest / 60), seconds = parseInt(rest % 60);
		if (days === 0) {
			days = "";
		} else {
			/*
			$translate("about.days").then(function (translation) {
				days = days + " " + translation + ", ";
			});
			*/
			days = days + " " + daysString + ", ";
		}
		if (hours < 10) {
			hours = "0" + hours + ":";
		} else {
			hours = hours + ":";
		}
		if (days == "" && hours == "00:") {
			hours = "";
		}
		if (minutes < 10) {
			minutes = "0" + minutes;
		}
		if (seconds < 10) {
			seconds = "0" + seconds;
		}
		return days + hours + minutes + ":" + seconds;
	};
});

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
			},
			getAlbumArt: function (track, callback) {
				$http.get('http://ws.audioscrobbler.com/2.0/', {
						params : {
							method : 'album.getinfo',
							api_key : '956c1818ded606576d6941de5ff793a5',
							artist : track.artist,
							album : track.albumNode.album,
							format : 'json',
							autoCorrect : true
						}
					}).success(function(json) {
						if (json.album) {
							var artlist = json.album.image;
							$.each(artlist, function() {
								if (this.size === 'extralarge') {
									var url = this["#text"];
									var imgUrl = url || "images/nocover.png";
									callback(imgUrl);
								}
							});
						}
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
angular.module('JSMusicDB.ModelService', []).factory('ModelService', ['$log',
function($log) {
	var factory = {};

	factory.parse = function(json, $scope, $rootScope) {
		var start = new Date().getTime();
		if (json[0] !== "<") {
			angular.forEach(json, function(value) {
				factory.parseLine(value, $scope);
			});
			$scope.debug.parseJSON = new Date().getTime() - start;
			$rootScope.parsed = true;
			$scope.parsing = false;
		}
	};

	factory.parseLine = function(line, $scope) {
		switch(line.Type) {
			case 'totals': {
				// $log.debug(line.totals);
				$scope.totals = line.totals;
				break;
			}
			case 'artist' : {
				if (line.Naam) {
					var firstLetter = factory.getFirstLetter(line.Naam), artistName = factory.stripThe(line.Naam);
					// add letter
					if (!$scope.letters[firstLetter]) {
						var letter = {
							letter : firstLetter,
							artists : [],
							artistsLocal : [],
							isActive : false,
							isVisible : true
						};
						$scope.letters[letter.letter] = letter;
					}
					// add artist
					if (!$scope.artists[artistName]) {
						var artist = {
							name : line.Naam,
							sortName : artistName,
							albums : [],
							albumsLocal : [],
							url : 'http://ws.audioscrobbler.com/2.0/',
							data : {
								method : 'artist.getinfo',
								api_key : '956c1818ded606576d6941de5ff793a5',
								artist : line.Naam,
								format : 'json',
								autoCorrect : true
							},
							isVisible : true,
							artistURL : function() {
								return "letter/" + firstLetter + "/artist/" + artistName.toLowerCase();
							}
						};
						$scope.artists[artistName] = artist;
						$scope.letters[firstLetter].artists.push(artist);
						artist.letterNode = $scope.letters[firstLetter];
					}
				}
				break;
			}
			case 'album': {
				if (line.Album && line.Artiest) {
					var firstLetter = factory.getFirstLetter(line.Artiest), artistName = factory.stripThe(line.Artiest);
					// add album
					if (!$scope.albums[artistName + "-" + line.Album.toLowerCase()]) {
						var album = {
							album : line.Album,
							year : (line.Jaar !== 'null') ? line.Jaar : null,
							artist : artistName,
							tracks : [],
							url : 'http://ws.audioscrobbler.com/2.0/',
							data : {
								method : 'album.getinfo',
								api_key : '956c1818ded606576d6941de5ff793a5',
								artist : line.Artiest,
								album : line.Album,
								format : 'json',
								autoCorrect : true
							},
							isVisible : true,
							albumURL : function() {
								return "letter/" + firstLetter + "/artist/" + artistName.toLowerCase() + "/album/" + line.Album;
							}
						};
						$scope.albums[artistName + "-" + line.Album.toLowerCase()] = album;
						$scope.artists[artistName].albums.push(album);
						album.artistNode = $scope.artists[artistName];
					}
				}
				break;
			}
			case 'track': {
				var firstLetter = factory.getFirstLetter(line.Artiest), artistName = factory.stripThe(line.Artiest);
				if (!$scope.tracks[line.id]) {
					if ($scope.albums[artistName + "-" + line.Album]) {
						// part of an album
						var track = {
							id : line.id,
							file : line.Naam,
							artist : line.Artiest,
							artistID : artistName,
							album : line.album,
							time : line.Duur,
							title : line.Titel,
							number : Number(line.Track || ''),
							path : line.Pad,
							disc : Number(line.Disk),
							isPlaying : false,
							filename : function() {
								var name = line.path.split('/');
								return name[name.length - 1];
							},
							seconds : line.seconds
						};
						$scope.albums[artistName + "-" + line.Album].tracks.push(track);
						track.albumNode = $scope.albums[artistName + "-" + line.Album];
						$scope.tracks[track.id] = track;
						$scope.trackByPath[track.path] = track;
					}
				}
				break;
			}
		}
	};
	factory.getFirstLetter = function(name) {
		name = factory.stripThe(name);
		var specialChars = [' ', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '-'], firstLetter = name.charAt(0);
		if ($.inArray(firstLetter, specialChars) > -1) {
			firstLetter = '1';
		}
		return "" + firstLetter;
	};
	factory.stripThe = function(name) {
		name = $.trim(name.toUpperCase());
		name = (name.indexOf('THE ') === 0) ? name.substring(4) : name;
		return name;
	};

	return factory;
}]);