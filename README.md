followthrough
==================

Control callback flow through a finite state machine with functions that do just one thing each.

Installation
------------

    npm install followthrough

Usage
-----

    var followThrough = require('followthrough');

    followThrough({
      start: {
        worker: loadEntries,
        params: ['/somewhere/entries', true],
        checkError: checkLoadError,
        next: getStateAfterLoadEntries
      },
      loadImages: {
        worker: addImagesToEntries,
        next: 'renderEntries'
      },
      renderEntries: {
        worker: callRender
      },
      // Skip here if there is an error and no 'checkError' function.
      end: handleError
    });

    function handleError(error) {
      if (error) {
        console.log(error, error.stack);
      }
    }

    function loadEntries(location, ignoreTemporaryEntries, done) {
      db.get({location: location, ignoreTemporaryEntries: ignoreTemporaryEntries}, done);
    }

    function checkLoadError(error) {
      if (error.type === 'NotFoundError') {
        // No, we can ignore this.
        done();
      }
      else {
        // Yes, it's a real error.
        done(error);
      }
    }

    function getStateAfterLoadEntries(error, entries, done) {
      if (entries.every((entry) => entry.image)) {
        done(null, 'renderEntries');
      }
      else {
        done(null, 'loadImages');
      }
    }

    function addImagesToEntries(entries, done) {
      var q = queue();
      ...
      q.awaitAll(done);
    }

    function callRender(entries, done) {
      render({
        entries: entries,
        parentElement: document.getElementById('root')
      });
      callNextTick(done);
    }

Why
---

You can do something like this in async.waterfall:

Or with promises:

The problems there are:

- Functions are doing more than one thing – the work, plus deciding control flow.

Tests
-----

Run tests with `make test`.

License
-------

The MIT License (MIT)

Copyright (c) 2016 Jim Kang

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
