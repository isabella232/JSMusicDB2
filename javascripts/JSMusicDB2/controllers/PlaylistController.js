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
