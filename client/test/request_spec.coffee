


describe 'T.request', ->

  describe '.send', ->

    it 'should send an XMLHttpRequest and get the response', testFuture ->
      expectFuture(T.request.send({ method: 'GET', url: 'lol.txt' }))
        .to.resolve((response) -> expect(response.responseText.replace(/\s*$/, '')).to.equal('lol!!!'))

    it 'should reject with invalid url', testFuture ->
      expectFuture(T.request.send({ method: 'GET', url: 'wtf.txt' }))
        .to.reject(->)

  describe '#send', ->
    it 'should perform a request', testFuture ->
      expectFuture(T.request('lol.txt').send())
        .to.resolve((response) -> expect(response.responseText.replace(/\s*$/, '')).to.equal('lol!!!'))



