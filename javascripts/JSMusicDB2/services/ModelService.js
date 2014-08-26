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