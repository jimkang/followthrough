test:
	node tests/basic-branch-test.js

pushall:
	git push origin master && npm publish

lint:
	./node_modules/.bin/eslint .
