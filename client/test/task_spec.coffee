

describe 'T.task', ->

  it 'should call the init function synchronously', ->
    ok = false
    T.task('task', -> ok = true)
    expect(ok).to.be.ok

  it 'should have a title', ->
    task = T.task('test', (r) -> r.accept('123'))
    expect(task.title).to.equal('test')

  it 'should be a future', ->
    task = T.task('test', (r) -> r.accept('123'))
    expect(task.then).to.be.a('function')

  it 'should be an event emitter', ->
    task = T.task('test', (r) -> r.accept('123'))
    expect(task.on).to.be.a('function')

  it 'should have a status with text and progress', ->
    task = T.task('test', (r) -> r.accept('123'))
    expect(task.status).to.be.an('object')
    expect(task.status.text).to.be.a('string')
    expect(task.status.progress).to.be.a('number')

  it 'should accept when accept is called on the task resolver', testFuture ->
    task = T.task('test', (r) -> r.accept('123'))
    expectFuture(task).to.resolve((v) -> expect(v).to.equal('123'))

  it 'should reject when accept is called on the task resolver', testFuture ->
    task = T.task('test', (r) -> r.reject('123'))
    expectFuture(task).to.reject((v) -> expect(v).to.equal('123'))


  describe 'resolver', ->

    describe '#text', ->

      it 'should set task.status.text', (done) ->
        task = T.task('test', (r) -> r.text('some text'); r.accept())
        task.then -> expect(task.status.text).to.equal('some text'); done()

      it 'should fire "text" event', (done) ->
        task = T.task('test', (r) -> r.text('some text'); r.accept())
        task.on 'text', (text) -> expect(text).to.equal('some text'); done()


    describe '#progress', ->

      it 'should set task.status.progress', (done) ->
        task = T.task('test', (r) -> r.progress(1); r.accept())
        task.then -> expect(task.status.progress).to.equal(1); done()

      it 'should fire "text" event', (done) ->
        task = T.task('test', (r) -> r.progress(1); r.accept())
        task.on 'progress', (progress) -> expect(progress).to.equal(1); done()
    

  describe '#abort', ->

    it 'should call the onabort function', (done) ->
      task = T.task('test', (r) -> r.onabort = -> done())
      task.abort()

    it 'should not throw when onabort not set', ->
      task = T.task('test', (r) ->)
      task.abort()






