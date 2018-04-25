
describe('T.supportEvent', function() {

it('should return the same object', function() {
	var object = {}
	var result = T.supportEvent(object)
	expect(result).to.equal(object)
})

describe('#on()', function() {

  it('should emit on listeners', function() {
	var o = T.supportEvent({})
	  , called = false
	o.on('test', function() { called = true })
	o.emit('test')
	expect(called).to.be.true
  })

  it('should emit with right arguments', function() {
	var o = T.supportEvent({})
	  , arg
	o.on('test', function(v) { arg = v })
	o.emit('test')
	expect(arg).to.equal(undefined)
	o.emit('test', 1)
	expect(arg).to.equal(1)
	o.emit('test', 'hello')
	expect(arg).to.equal('hello')
  })

  it('should fire newly-added handler when sticky flag is set', function() {
	var o = T.supportEvent({})
	  , arg
	o.emit('test', 'haha', true)
	o.on('test', function(v) { arg = v })
	expect(arg).to.equal('haha')
	o.emit('test', 'lol', true)
	expect(arg).to.equal('lol')
  })

})

describe('#removeListener', function() {
  it('should no longer call the listener', function() {

	var o = T.supportEvent({})
	  , result
	function a() { result.a = true }
	function b() { result.b = true }

	o.on('test', a)
	o.on('test', b)

	result = {}
	o.emit('test')
	expect(result).to.deep.equal({a: true, b: true})

	o.removeListener('test', a)
	result = {}
	o.emit('test')
	expect(result).to.deep.equal({b: true})

	o.removeListener('test', b)
	result = {}
	o.emit('test')
	expect(result).to.deep.equal({})

  })
})

describe('#removeAllListeners', function() {
  it('should remove all listeners', function() {

	var o = T.supportEvent({})
	  , result
	function a() { result.a = true }
	function b() { result.b = true }

	o.on('test', a)
	o.on('test', b)

	result = {}
	o.emit('test')
	expect(result).to.deep.equal({a: true, b: true})

	o.removeAllListeners('test')

	result = {}
	o.emit('test')
	expect(result).to.deep.equal({})

  })
})

})

