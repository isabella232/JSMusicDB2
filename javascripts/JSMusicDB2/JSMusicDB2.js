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
