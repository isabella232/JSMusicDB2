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
