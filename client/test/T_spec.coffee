

describe 'T.module', ->

  it 'should create a module', ->
    T.module('wtf1')
    expect(typeof T.wtf1).to.equal('object')

  it 'should not create a module if it already exists', ->
    T.module('wtf2')
    T.wtf2.a = 1
    T.module('wtf2')
    expect(T.wtf2.a).to.equal(1)


describe 'T.parseJSON', ->

  check = (json, obj) -> expect(T.parseJSON(json)).to.deep.equal(obj)

  it 'should convert null value',   -> check 'null', null
  it 'should convert number value', -> check '1', 1
  it 'should convert array',        -> check '[123, 4, "5"]', [123, 4, '5']
  it 'should convert complex data structures', ->
    check '[12, [34, [56], { "x": [78, 90] }, 12, 34]]', [12,[34,[56],{x:[78,90]},12,34]]

  it 'should throw with invalid JSON data', ->
    expect(-> T.parseJSON 'haha').to.throw()
    expect(-> T.parseJSON '[123,4,\'5\']').to.throw()


describe 'T.changer', ->
  it 'should call the passed function only when the value passed to the changer is changed', ->

    ch = T.changer(spy = sinon.spy())

    check = (value) ->
      spy.reset()
      ch(value)
      return spy

    ok = (value) -> expect(value).to.be.ok

    ok check(123).calledWith(123)
    ok !check(123).called
    ok !check(123).called
    ok check("test").calledWith("test")
    ok !check("test").called

    # just making sure it supports null value
    ok check(null).calledWith(null)


describe 'T.digits', ->
  it 'should pad text with zeroes', ->

    expect(T.digits(10, 3)).to.equal('010')
    expect(T.digits(1, 3)).to.equal('001')
    expect(T.digits(1234, 3)).to.equal('1234')
    expect(T.digits(12345, 5)).to.equal('12345')


describe 'T.partialRight', ->

  it 'should return a function appending arguments specified to the original function', ->
    subtract = (a, b) -> a - b
    partial = T.partialRight(subtract, 10)
    expect(partial(5)).to.equal(-5)

  it 'should work with multiple arguments', ->
    add = (a, b, c) -> a + b + c
    expect(T.partialRight(add, '1', '2')('3')).to.equal('312')
    expect(T.partialRight(add, '2')('3', '1')).to.equal('312')
    expect(T.partialRight(add, '2')('1')).to.equal('12undefined')


describe 'T.twoDigits', ->

  check = (i, o) -> expect(T.twoDigits(i)).to.equal(o)

  it 'should convert one digit number to 2 digits', ->
    check 0, '00'
    check 1, '01'
    check 5, '05'
    check 10, '10'
    check 42, '42'
    check 78, '78'
    check -5, '-5'

  it 'should leave numbers with more than 2 digits as-is', ->
    check 125, '125'
    check -38, '-38'


describe 'T.decodeUTF', ->

  check = (i, o) -> expect(T.decodeUTF(i)).to.equal(o)

  it 'should not do anything when there are no escape sequences', ->
    check 'hello world', 'hello world'

  it 'should not decode common characters', ->
    check 'hello%20world', 'hello%20world'
    check 'x%2fx%2Fx', 'x%2fx%2Fx'

  it 'should decode foreign language characters', ->
    check '%E0%B8%AA%E0%B8%A7%E0%B8%B1%E0%B8%AA%E0%B8%94%E0%B8%B5', 'สวัสดี'
    check '%cE%A9', 'Ω'
    check '%E8%A9%A6%E3%81%97', '試し'

  it 'should decode JUST foreign language characters', ->
    check '%cE%A9%20%E8%A9%A6%E3%81%97%2f', 'Ω%20試し%2f'


describe 'T.count', ->

  it 'should count number of values that passes the test in array', ->
    arr = [1, 2, 3, 4, 5, 6, 7]
    expect(T.count(arr, (x) -> x % 2 == 0)).to.equal(3)
    expect(T.count(arr, (x) -> x % 2 == 1)).to.equal(4)
    expect(T.count(arr, (x) -> true)).to.equal(7)
    expect(T.count(arr, (x) -> false)).to.equal(0)


