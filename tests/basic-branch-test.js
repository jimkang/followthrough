var test = require('tape');
var walkMachine = require('../index');
var callNextTick = require('call-next-tick');
var assertNoError = require('assert-no-error');
var queue = require('d3-queue').queue;

runBranchTest({
  addImagesToLoadedProblem: false,
  testSubtitle: 'Take no existing images branch.'
});

runBranchTest({
  addImagesToLoadedProblem: true,
  testSubtitle: 'Take "skip-finding-images" branch.'
});


function runBranchTest(opts) {
  var addImagesToLoadedProblem;
  var testSubtitle;

  if (opts) {
    addImagesToLoadedProblem = opts.addImagesToLoadedProblem;
    testSubtitle = opts.testSubtitle;
  }

  test('Branch test: ' + testSubtitle, branchTest);

  function branchTest(t) {
    var loadProblemAsserts = 2;
    var checkDoneAsserts = 2;
    var pickStateAfterLoadAsserts = addImagesToLoadedProblem ? 5 : 8;
    var findImagesAsserts = addImagesToLoadedProblem ? 0 : 4;
    var callRenderAsserts = 5;

    t.plan(loadProblemAsserts + checkDoneAsserts + pickStateAfterLoadAsserts +
      findImagesAsserts + callRenderAsserts);

    var store = {
      loadProblem: function loadProblem(id, done) {
        t.ok(id, 'loadProblem called with id');
        t.equal(typeof done, 'function', 'loadProblem called with done function.');

        // TODO: Error case.
        var problem = {
          id: id,
          text: '<Your problem goes here.>',
          presenterImageURL: '',
          choices: [
            {
              id: 'choice-a',
              text: 'This is choice A.'
            },
            {
              id: 'choice-b',
              text: 'This is choice B.'
            },
            {
              id: 'choice-c',
              text: 'This is choice C.'
            }
          ]
        };

        if (addImagesToLoadedProblem) {
          problem.choices.forEach(addImage);
        }

        function addImage(choice) {
          choice.presenterImageURL = 'http://smidgeo.com/images/smidgeo_on_the_move.png';
        }
        callNextTick(done, null, problem);
      }
    };  

    var stateMap = {
      start: {
        work: store.loadProblem,
        params: ['problem-a'],
        next: pickStateAfterLoad
      },
      loadImages: {
        work: findImages,
        next: 'render'
      },
      render: {
        work: callRender
      }
    };

    walkMachine(stateMap, checkDone);

    function checkDone(error, finalValue) {
      assertNoError(t.ok, error, 'No error from walkMachine.');
      t.equal(finalValue, 'render value', 'Final value is passed to done.');
    }

    function checkProblemHasImages(problem, sourceFnName) {
      t.equal(
        problem.id, 'problem-a', 
        'Problem is passed to ' + sourceFnName +  ' with correct id.'
      );

      t.equal(
        problem.choices[0].presenterImageURL,
        'http://smidgeo.com/images/smidgeo_on_the_move.png',
        'Problem has choice with correct presenterImageURL.'
      );
      t.equal(
        problem.choices[1].presenterImageURL,
        'http://smidgeo.com/images/smidgeo_on_the_move.png',
        'Problem has choice with correct presenterImageURL.'
      );
      t.equal(
        problem.choices[2].presenterImageURL,
        'http://smidgeo.com/images/smidgeo_on_the_move.png',
        'Problem has choice with correct presenterImageURL.'
      );
    }

    function checkProblemHasNoImages(problem) {
      t.ok(
        !problem.choices[0].presenterImageURL,
        'Problem choice does not have presenterImageURL defined yet.'
      );
      t.ok(
        !problem.choices[1].presenterImageURL,
        'Problem choice does not have presenterImageURL defined yet.'
      );
      t.ok(
        !problem.choices[2].presenterImageURL,
        'Problem choice does not have presenterImageURL defined yet.'
      );      
    }

    function pickStateAfterLoad(problem, done) {      
      t.equal(problem.id, 'problem-a', 'Problem is passed to pickStateAfterLoad with correct id.');

      t.equal(problem.choices[0].text, 'This is choice A.', 'Problem choice has correct text.');
      t.equal(problem.choices[1].text, 'This is choice B.', 'Problem choice has correct text.');
      t.equal(problem.choices[2].text, 'This is choice C.', 'Problem choice has correct text.');

      if (!addImagesToLoadedProblem) {
        checkProblemHasNoImages(problem);
      }

      t.equal(typeof done, 'function', 'pickStateAfterLoad called with done function.');

      var nextState = 'loadImages';
      if (problem.choices.every((choice) => choice.presenterImageURL)) {
        nextState = 'render';
      }
      done(null, nextState);
    }

    function findImages(problem, done) {
      if (addImagesToLoadedProblem) {
        t.fail('Does not call findImages if images are already loaded.');
        callNextTick(passProblem);
        return;
      }
      checkProblemHasNoImages(problem);
      t.equal(typeof done, 'function', 'findImages called with done function.');

      var q = queue();
      problem.choices.forEach(queueGetImage);
      q.awaitAll(passProblem);

      function passProblem(error) {
        if (error) {
          done(error);
        }
        else {
          done(null, problem);
        }
      }
      
      function queueGetImage(choice) {
        q.defer(setImage, choice);

        function setImage(choice, done) {
          choice.presenterImageURL = 'http://smidgeo.com/images/smidgeo_on_the_move.png';
          done(null, choice);
        }
      }
    }

    function callRender(problem, done) {
      checkProblemHasImages(problem, 'callRender');
      t.equal(typeof done, 'function', 'callRender called with done function.');
      callNextTick(done, null, 'render value');
    }
  }
}
