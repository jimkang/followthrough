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

Let's say you have a few async tasks to coordinate:

- Load some "entries". Getting them from the db may result in a NotFoundError, but we want to ignore that, while bailing for all other errors.
- If those entries all have images, then render the entries.
- If any of the entries are missing images, find images for them and add them to the entries. Then, render the entries.

This is what it'd look like if implemented with [async.waterfall](http://caolan.github.io/async/docs.html#.waterfall):

    async.waterfall(
      [
        start,
        branch,
        callRender
      ],
      handleError
    );

    function start(done) {
      var getOpts = {
        location: location,
        ignoreTemporaryEntries: ignoreTemporaryEntries
      };
      db.get(getOpts, checkEntries);

      function checkEntries(error, entries) {
        if (error.type === 'NotFoundError') {
          // We can ignore this.
          done(null, entries);
        }
        else {
          // Yes, it's a real error.
          done(error);
        }
      }
    }

    function branch(entries, done) {
      if (entries.every((entry) => entry.image)) {
        callNextTick(null, entries);
      }
      else {
        addImages(entries, done);
      }
    }

    function callRender(entries, done) {
      render({
        entries: entries,
        parentElement: document.getElementById('root')
      });
      callNextTick(done);
    }

    function addImages(entries, done) {
      var q = queue(1);
      entries.forEach((entry) => q.defer(addImage, entry));
      q.awaitAll(done);
    }

    function addImage(entry, addDone) {
      async.waterfall(
        [
          findImageForEntry, // Async function defined externally.
          addImageToEntry
        ],
        addDone
      );

      function addImageToEntry(image, entry, addToEntryDone) {
        entry.image = image;
        callNextTick(addToEntryDone, null, entry);
      }
    }

There's a few problems here:
- The call to `waterfall` implies that the control flow is all right there, but some of it is also out in `branch` and there's a sub-waterfall over in `addImage`.
- `start` has to do some awkward error-checking. Normally, we let `waterfall` handle the error checking, but we don't want NotFound errors to interrupt the flow. So, task functions handle errors in two different ways.

This is what this program looks like implemented with promises:

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
