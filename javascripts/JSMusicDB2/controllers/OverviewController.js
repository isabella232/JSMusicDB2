jsmusicdb.controller('OverviewController', ['$scope', 'RestService', '$rootScope', 'ModelService',
function($scope, RestService, $rootScope, ModelService) {
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
								track.lastPlayed = "playing now";
							}
							tmplist.push(track);
						}
					} else {
						var album = $scope.albums[artistName + "-" + albumName.toLowerCase()];
						if (album) {
							angular.forEach(album.tracks, function(track) {
								if (track.title.toLowerCase() === title.toLowerCase()) {
									RestService.Playlists.storeIdByKey(artistName + (title.toLowerCase()), track);
									if (fmtrack.date) {
										track.lastPlayed = parseInt(fmtrack.date.uts) * 1000;
									} else {
										track.lastPlayed = "Listening now";
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
								track.lastPlayed = "Listening now";
							}
							tmplist.push(track);
						}
					}
				});
				$scope.recentTracks = tmplist;
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
			$scope.loading.recentAdded = true;
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
				}
			});
			$scope.$watch(function() {
				return $rootScope.user && $rootScope.user.lastfmuser;
			}, function(n, o) {
				if (n) {
					var tmplist = [];
					$scope.loading.upcomming = true;
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
					});
					$scope.loading.recent = true;
					$scope.loadRecent(n);
				}
			});
		}
	});
}]);
