angular.module('msr-change-clone', ['ngRoute', 'ui.bootstrap', 'anguFixedHeaderTable'])
    .config(function($routeProvider, $locationProvider) {
        $routeProvider
            .when('/patch/:project/:id', {
                controller: 'patchController'
            })
            .when('/', {
                controller: 'mainController'
            });
        // configure html5 to get links working on jsfiddle
        $locationProvider.html5Mode(false);
    })
    .directive('keypressEvents', [
        '$document',
        '$rootScope',
        function($document, $rootScope) {
            return {
                restrict: 'A',
                link: function() {
                    $document.bind('keydown', function(e) {
                        $rootScope.$broadcast('keypress', e);
                        $rootScope.$broadcast('keypress:' + e.which, e);
                    });
                }
            };
        }
    ])
    .directive('diff', ['$http', function($http) {
        return {
            restrict: 'A',
            scope: {
                patch: '=diff'
            },
            link: function(scope, elem, attrs) {
                function printDiff(patch) {
                    $(elem).text('')
                    var diff = patch;
                    if (diff != null) {
                        var diff2htmlUi = new Diff2HtmlUI({ diff: diff });
                        diff2htmlUi.draw($(elem), { inputFormat: 'java', showFiles: false, matching: 'none' });
                        diff2htmlUi.highlightCode($(elem));
                    }
                }
                scope.$watch('patch', function() {
                    printDiff(scope.patch);
                })
                printDiff(scope.patch);
            }
        }
    }])
    .controller('welcomeController', function($uibModalInstance) {
        this.ok = function() {
            $uibModalInstance.close();
        };
    })
    .controller('patchModal', function($rootScope, $uibModalInstance, patch, classifications, $http) {
        var $ctrl = this;
        $ctrl.patch = patch;
        $ctrl.index = -1;
        $ctrl.colors = ['blue', 'red', 'yellow', 'purple', 'green', 'pink', 'black', 'brown', 'blueviolet', 'coral', 'orange', 'cyan', 'tan'];
        $ctrl.clone = { changes: {}, cloneType: '' };
        $ctrl.classifications = classifications;

        $rootScope.$on('new_index', function(e, index) {
            $ctrl.index = index;
        });
        $rootScope.$on('new_patch', function(e, patch) {
            $ctrl.patch = patch;
        });
        $ctrl.ok = function() {
            $uibModalInstance.close();
        };
        $ctrl.nextPatch = function() {
            $rootScope.$emit('next_patch', 'next');
        };
        $ctrl.previousPatch = function() {
            $rootScope.$emit('previous_patch', 'next');
        };

        $ctrl.getName = function(key) {
            for (var topLevelGroup in $ctrl.classifications) {
                for (var secondLevelGroup in $ctrl.classifications[topLevelGroup]) {
                    for (var thirdLevelGroup in $ctrl.classifications[topLevelGroup][secondLevelGroup]) {
                        if (thirdLevelGroup == key) {
                            if ($ctrl.classifications[topLevelGroup][secondLevelGroup][thirdLevelGroup].fullname) {
                                return $ctrl.classifications[topLevelGroup][secondLevelGroup][thirdLevelGroup].fullname;
                            } else {
                                return $ctrl.classifications[topLevelGroup][secondLevelGroup][thirdLevelGroup].name;
                            }
                        }
                    }
                }
            }
            return null
        };

        $ctrl.changeColors = function(change) {
            const output = []
            let index = 0
            for (let clone of $ctrl.patch.clones) {
                for (let cChange of clone.changes) {
                    if (cChange.sourceAfterFix == change.sourceAfterFix &&
                        cChange.patchFilePath == change.patchFilePath &&
                        cChange.patchNodeStartChar == change.patchNodeStartChar) {
                        output.push($ctrl.colors[index % $ctrl.colors.length])
                    }
                }
                index++
            }
            return output
        }
    })
    .controller('patchController', function($scope, $location, $rootScope, $routeParams, $uibModal) {
        var $ctrl = $scope;
        $ctrl.classifications = $scope.$parent.classifications;
        $ctrl.patches = $scope.$parent.filteredPatch;
        $ctrl.index = -1;
        $ctrl.patch = null;

        $scope.$watch("$parent.filteredPatch", function() {
            $ctrl.patches = $scope.$parent.filteredPatch;
            $ctrl.index = getIndex($routeParams.project, $routeParams.id);
        });
        $scope.$watch("$parent.classifications", function() {
            $ctrl.classifications = $scope.$parent.classifications;
        });

        var getIndex = function(project, patchId) {
            if ($ctrl.patches == null) {
                return -1;
            }
            for (var i = 0; i < $ctrl.patches.length; i++) {
                if ($ctrl.patches[i].projectName == project && $ctrl.patches[i].patchId == patchId) {
                    return i;
                }
            }
            return -1;
        };

        $scope.$on('$routeChangeStart', function(next, current) {
            $ctrl.index = getIndex(current.params.project, current.params.id);
        });

        var modalInstance = null;
        $scope.$watch("index", function() {
            if ($scope.index != -1) {
                if (modalInstance == null) {
                    modalInstance = $uibModal.open({
                        animation: true,
                        ariaLabelledBy: 'modal-title',
                        ariaDescribedBy: 'modal-body',
                        templateUrl: 'modelPatch.html',
                        controller: 'patchModal',
                        controllerAs: '$ctrl',
                        size: "lg",
                        resolve: {
                            patch: function() {
                                return $scope.patches[$scope.index];
                            },
                            classifications: $scope.classifications
                        }
                    });
                    modalInstance.result.then(function() {
                        $scope.index = -1;
                        modalInstance = null;
                        $location.path("/");
                    }, function() {
                        $scope.index = -1;
                        modalInstance = null;
                        $location.path("/");
                    })
                }
                $rootScope.$emit('new_patch', $scope.patches[$scope.index]);
                $rootScope.$emit('new_index', $scope.index);
            }
        });

        var nextPatch = function() {
            var index = $scope.index + 1;
            if (index == $ctrl.patches.length) {
                index = 0;
            }

            $location.path("/patch/" + $ctrl.patches[index].projectName + "/" + $ctrl.patches[index].patchId);
            return false;
        };
        var previousPatch = function() {
            var index = $scope.index - 1;
            if (index < 0) {
                index = $ctrl.patches.length - 1;
            }

            $location.path("/patch/" + $ctrl.patches[index].projectName + "/" + $ctrl.patches[index].patchId);
            return false;
        };

        $scope.$on('keypress:39', function() {
            $scope.$apply(function() {
                nextPatch();
            });
        });
        $scope.$on('keypress:37', function() {
            $scope.$apply(function() {
                previousPatch();
            });
        });
        $rootScope.$on('next_patch', nextPatch);
        $rootScope.$on('previous_patch', previousPatch);
    })
    .controller('mainController', function($scope, $rootScope, $location, $window, $rootScope, $http, $uibModal) {
        $scope.sortType = ['patchId']; // set the default sort type
        $scope.sortReverse = false;
        $scope.match = "all";
        $scope.filter = {};
        $scope.pageTitle = "The ManySStuBs4J patches";

        // create the list of sushi rolls 
        $scope.patches = [];
        $scope.clones = [];
        $scope.classifications = [];

        $http.get("data/manual_analysis.json").then(function(response) {
            $scope.clones = response.data;
        });

        $http.get("data/classification.json").then(function(response) {
            $scope.classifications = response.data;
        });

        $http.get("data/patches.json").then(function(response) {
            $scope.patches = response.data;

            var projects = {};
            var nbProjects = 0;

            var SStuBpatterns = {};
            var nbSStuBpatterns = 0;

            for (var i = 0; i < $scope.patches.length; i++) {
                var project = $scope.patches[i].projectName;
                if (projects[project] == null) {
                    projects[project] = {
                        "name": project,
                        "fullname": project
                    }
                    nbProjects++;
                }
                $scope.patches[i][project] = true;

                $scope.patches[i]["singleChunk"] = $scope.patches[i].nbChanges == 1;
                $scope.patches[i]["multiChunks"] = $scope.patches[i].nbChanges > 1;

                $scope.patches[i].clones = []
                if ($scope.clones[$scope.patches[i].fixCommitSHA1]) {
                    for (let clone of $scope.clones[$scope.patches[i].fixCommitSHA1]) {
                        $scope.patches[i][clone.cloneType] = true;
                    }
                    $scope.patches[i].clones = $scope.clones[$scope.patches[i].fixCommitSHA1];
                }
                $scope.patches[i].nbClones = $scope.patches[i].clones.length;

                if ($scope.patches[i].nbChanges > 1 && $scope.patches[i].clones.length == 0) {
                    $scope.patches[i]["notAnalyzed"] = true;
                }

                for (let file of $scope.patches[i].files) {
                    for (let change of file.changes) {
                        change.patchFilePath = file.patchFilePath;
                    }
                }

                for (var j = 0; j < $scope.patches[i].SStuBpatterns.length; j++) {
                    var SStuBpattern = $scope.patches[i].SStuBpatterns[j];
                    if (SStuBpatterns[SStuBpattern] == null) {
                        SStuBpatterns[SStuBpattern] = {
                            "name": SStuBpattern
                        }
                        nbSStuBpatterns++;
                    }
                    $scope.patches[i][SStuBpattern] = true;
                }
            }

            projectLabel = "Projects (" + nbProjects + ")";
            $scope.classifications["Project"][projectLabel] = projects;

            var SStuBpatternLabel = "SStuB patterns (" + nbSStuBpatterns + ")";
            $scope.classifications["Changes"][SStuBpatternLabel] = $scope.classifications["Changes"]["SStuB patterns"];
            delete $scope.classifications["Changes"]["SStuB patterns"];

            var element = angular.element(document.querySelector('#menu'));
            var height = element[0].offsetHeight;

            angular.element(document.querySelector('#mainTable')).css('height', (height - 160) + 'px');
        });

        $scope.filterName = function(filterKey) {
            for (var j in $scope.classifications) {
                for (var i in $scope.classifications[j]) {
                    if ($scope.classifications[j][i][filterKey] != null) {
                        if ($scope.classifications[j][i][filterKey].fullname) {
                            return $scope.classifications[j][i][filterKey].fullname;
                        }
                        return $scope.classifications[j][i][filterKey].name;
                    }
                }
            }
            return filterKey;
        }

        $scope.openPatch = function(patch) {
            $location.path("/patch/" + patch.projectName + "/" + patch.patchId);
        };

        $scope.sort = function(sort) {
            if (sort == $scope.sortType) {
                $scope.sortReverse = !$scope.sortReverse;
            } else {
                $scope.sortType = sort;
                $scope.sortReverse = false;
            }
            return false;
        }

        $scope.countPatches = function(key, filter) {
            if (filter.count) {
                return filter.count;
            }
            var count = 0;
            for (var i = 0; i < $scope.patches.length; i++) {
                if ($scope.patches[i][key] === true) {
                    count++;
                }
            }
            filter.count = count;
            return count;
        };

        $scope.clickFilter = function(vKey) {}

        $scope.patchesFilter = function(patch) {
            var allFalse = true;
            for (var i in $scope.filter) {
                if ($scope.filter[i] === true) {
                    allFalse = false;
                    break;
                }
            }
            if (allFalse) {
                return true;
            }

            for (var i in $scope.filter) {
                if ($scope.filter[i] === true) {
                    if (patch[i] === true) {
                        if ($scope.match == "any") {
                            return true;
                        }
                    } else if ($scope.match == "all") {
                        return false;
                    }
                }
            }
            if ($scope.match == "any") {
                return false;
            } else {
                return true;
            }
        };

        $rootScope.$on('new_patch', function(e, patch) {
            var title = "Dissection of " + patch.projectName + " " + patch.patchId;
            $scope.pageTitle = title;
        });
    });