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
