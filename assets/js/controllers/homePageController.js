angular.module('brushfire').controller('homePageController', [
  '$scope',
  '$http',
  '$timeout',

  function($scope, $http, $timeout) {

    $scope.syncingGlobally = true;

    // REMOVE THIS TIMEOUT LATER
    $timeout(function() {
      $http.get({
        method: 'GET',
        url: ''/* TODO */
      }).then(function gotUserInfo(res) {
        // Set the user info.
        $scope.me = res.data;
      }).catch(function handleError(err) {
        // Leave the user info undefined.
        $scope.me = undefined;
      }).finally(function stopLoadingState() {
        // Remove the loading state.
        $scope.syncingGlobally = false;
      });
    },750);


  }
]);
