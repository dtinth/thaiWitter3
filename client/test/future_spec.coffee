

describe 'T.future', ->


  it 'should call the init function synchronously', ->
    ok = false
    T.future(-> ok = true)
    expect(ok).to.be.ok


  it 'should be able to accept', testFuture ->

    expectFuture(T.future((r) -> r.accept('123')))
      .to.resolve((value) -> expect(value).to.equal('123'))


  it 'should be able to resolve', testFuture ->

    expectFuture(T.future((r) -> r.resolve(T.future((s) -> s.resolve('555')))))
      .to.resolve((value) -> expect(value).to.equal('555'))


  it 'should be able to reject', testFuture ->

    expectFuture(T.future((r) -> r.reject('456')))
      .to.reject((value) -> expect(value).to.equal('456'))

  
  it 'should reject when init throws', testFuture ->

    expectFuture(T.future((r) -> throw new Error('wtf')))
      .to.reject((e) -> expect(e.message).to.equal('wtf'))


  describe '.accept', ->
    it 'should create an accepted future', testFuture ->
      expectFuture(T.future.accept('hello'))
        .to.resolve((value) -> expect(value).to.equal('hello'))


  describe '.reject', ->
    it 'should create a rejected future', testFuture ->
      expectFuture(T.future.reject('wtf'))
        .to.reject((value) -> expect(value).to.equal('wtf'))

