
AssetProcessor = require('../lib/asset-processor')
ScriptAggregator = require('../lib/processors/script-aggregator')

fixturesPath = __dirname + '/fixtures/asset-processor'

createMockFileProcessor = ->
	pattern: /\.js$/
	extension: '.th'
	process: sinon.spy (content, next) ->
		content.toUpperCase()

createThrowingFileProcessor = ->
	pattern: /\.js$/
	extension: '.er'
	process: sinon.stub().throws(new Error('check check check'))

describe 'asset-processor', ->

	describe 'preprocessing', ->

		processor = new AssetProcessor(fixturesPath, { cache: false })
		processor.use createMockFileProcessor()
		processor.use createThrowingFileProcessor()

		it 'should resolve with file contents on existing file', ->
			processor.process('test.js')
				.then((value) ->
					value.trim().should.equal('hello world')
				)
		
		it 'should reject when file doesn\'t exist', ->
			processor.process('nonexistant.js').should.be.rejected

		it 'should reject with filename when file doesn\'t exist', ->
			processor.process('nonexistant.js').should.be.rejected
				.with(Error, /nonexistant\.js/)

		it 'should reject when the processor rejects', ->
			processor.process('error.js').should.be.rejected
				.with(Error, /check check check/)
		
		it 'should preprocess files', ->
			processor.process('translator.js')
				.then((value) ->
					value.trim().should.equal('HELLO WORLD')
				)


	context 'when cache is turned off', ->

		processor = new AssetProcessor(fixturesPath, { cache: false })
		fileProcessor = createMockFileProcessor()
		processor.use(fileProcessor)
			
		it 'should process files many times', ->
			processor.process('translator.js')
				.then(-> processor.process('translator.js'))
				.then(-> fileProcessor.process.should.have.been.calledTwice)
			

	context 'when cache is turned on', ->

		processor = new AssetProcessor(fixturesPath, { cache: true })
		fileProcessor = createMockFileProcessor()
		throwingProcessor = createThrowingFileProcessor()
		processor.use(new ScriptAggregator({ development: false }))
		processor.use(fileProcessor)
		processor.use(throwingProcessor)
			
		it 'should process files once', ->
			processor.process('translator.js')
				.then(-> processor.process('translator.js'))
				.then(-> processor.process('aggregate2.js'))
				.then(-> fileProcessor.process.should.have.been.calledOnce)

		mustError = sinon.stub().throws(new Error('must error!'))

		beforeEach ->
			throwingProcessor.process.reset()

		it 'should not cache files with error', ->
			processor.process('error.js')
				.then(mustError, -> processor.process('error.js'))
				.then(mustError, -> throwingProcessor.process.should.have.been.calledTwice)
	
		it 'should not cache files with error only in sequence', ->
			Q.all([
				processor.process('error.js').then(mustError, -> true)
				processor.process('error.js').then(mustError, -> true)
			])
				.then(-> throwingProcessor.process.should.have.been.calledOnce)


describe 'processors', ->

	describe 'aggregator', ->

		context 'production mode', ->

			processor = new AssetProcessor(fixturesPath, { cache: false })
			processor.use(new ScriptAggregator({ development: false }))
			fileProcessor = createMockFileProcessor()
			processor.use(fileProcessor)
			
			it 'should aggregate files correctly', ->
				processor.process('aggregate.js')
					.then((content) ->
						content.should.contain('file1')
						content.should.contain('hahaha')
					)

			it 'should aggregate files with translator correctly', ->
				processor.process('aggregate2.js')
					.then((content) ->
						content.should.contain('hahaha')
						content.should.contain('HELLO WORLD')
					)

			it 'should aggregate files with aggregates correctly', ->
				processor.process('aggregate3.js')
					.then((content) ->
						content.should.contain('file1')
						content.should.contain('hahaha')
						content.should.contain('HELLO WORLD')
					)

			it 'should fail when one of the files fail to process', ->
				processor.process('aggregate4.js')
					.should.be.rejected
	
		context 'development mode', ->

			processor = new AssetProcessor(fixturesPath, { cache: true })
			processor.use(new ScriptAggregator({ development: true }))
			fileProcessor = createMockFileProcessor()
			processor.use(fileProcessor)

			it 'should link to aggregated files', ->
				processor.process('aggregate.js')
					.then((content) ->
						content.should.contain('file1.js')
						content.should.contain('file2.js')
					)
			it 'should not output other things', ->
				processor.process('aggregate.js')
					.then((content) ->
						output = ''
						document = {
							write: (text) -> output += text
						}
						eval(content)
						output.replace(/<[^>]+>/g, '')
							.should.equal('')
					)





















