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
