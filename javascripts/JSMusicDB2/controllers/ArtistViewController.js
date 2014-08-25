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
