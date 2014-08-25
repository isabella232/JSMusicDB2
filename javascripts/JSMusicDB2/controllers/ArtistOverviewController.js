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
