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
