// var callNextTick = require('call-next-tick');

function walkMachine(stateMap, walkMachineDone) {
  run(stateMap.start);

  function run(opts) {
    var work;
    var params;
    var next;
    var checkError;
    var incoming;

    if (opts) {
      work = opts.work;
      params = opts.params;
      next = opts.next;
      checkError = opts.checkError;
      incoming = opts.incoming;
    }

    if (!work) {
      walkMachineDone(new Error('No work for state.'));
      return;
    }

    var args = [];
    if (incoming) {
      args = args.concat(incoming);
    }
    if (params) {
      args = args.concat(params);
    }
    args.push(routeFromError);
    work.apply(work, args);

    function routeFromError(error) {
      var argumentsFromWorkCallback = arguments;
      if (checkError) {
        checkError(error, useErrorDecision);
      }
      else if (error) {
        walkMachineDone(error);
      }
      else {
        routeToNext.apply(routeToNext, argumentsFromWorkCallback);
      }

      function useErrorDecision(decidedError) {
        if (decidedError) {
          walkMachineDone(decidedError);
        }
        else {
          routeToNext.apply(routeToNext, argumentsFromWorkCallback);
        }
      }
    }

    function routeToNext() {
      var args = Array.prototype.slice.apply(arguments).slice(1);
      if (next) {
        if (typeof next === 'function') {
          next.apply(next, args.concat([followNext]));
        }
        else if (typeof next === 'string') {
          followNext(null, next);
        }
        else {
          walkMachineDone(new Error('Invalid `next` in state.'));
        }
      }
      else {
        // Make sure error argument at position 0 gets passed to walkMachineDone.
        walkMachineDone.apply(walkMachineDone, arguments);
      }

      function followNext(error, nextStateName) {
        if (error) {
          // callNextTick(walkMachineDone, error);
          setTimeout(callDoneWithError, 0);
        }
        else {
          var nextState = stateMap[nextStateName];
          if (nextState) {
            nextState.incoming = args;
            // callNextTick(run, nextState);
            setTimeout(callRun, 0);
          }
          else {
            setTimeout(callDone, 0);
          }
        }

        function callDoneWithError() {
          walkMachineDone(error);
        }

        function callDone() {
          walkMachineDone.apply(walkMachineDone, args);
        }

        function callRun() {
          run(nextState);
        }
            // callNextTick.apply([callNextTick, walkMachineDone].concat(args));
      }
    }
  }
}

module.exports = walkMachine;
