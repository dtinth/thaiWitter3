
describe 'T.text', ->

  it 'should scan for hashtags, user, urls and lists', ->
    str = 'hello #hashtag #another @thaiWitter @dtinth/ske09 #thaiWitter http://dt.in.th/'
    text = T.text(str)
    countOf = _.countBy(text.entities, 'type')
    expect(countOf.hashtag).to.equal(3)
    expect(countOf.user).to.equal(1)
    expect(countOf.list).to.equal(1)
    expect(countOf.url).to.equal(1)

  it 'should report correct text for each matched entity', ->
    str = 'hello #hashtag #another @thaiWitter! @dtinth/ske09 #thaiWitter http://dt.in.th/ก'
    text = T.text(str)
    texts = _.pluck(text.entities, 'text')
    expect(texts).to.deep.equal(['hello ', '#hashtag', ' ', '#another', ' ', '@thaiWitter', '! ', '@dtinth/ske09', ' ', '#thaiWitter', ' ', 'http://dt.in.th/', 'ก'])

  it 'should not mistake URL with hash in it...', ->
    str = 'test http://tw.dt.in.th/test?z#download haha'
    text = T.text(str)
    expect(_.where(text.entities, type: 'url').length).to.equal(1)
    expect(_.where(text.entities, type: 'hashtag').length).to.equal(0)

  it 'should detect Thai text in hash tags', ->
    str = 'สวัสดี #ทดสอบ ห้าห้า'
    text = T.text(str)
    expect(text.entities[1].text).to.equal('#ทดสอบ')



  describe '.matchAll', ->
    str = 'abc defg hijkl'
    matches = null
    
    before -> matches = T.text.matchAll(/([aei])([a-z]+)/g, str)

    it 'should find all matches in a string', ->
      expect(matches.length).to.equal(3)

    it 'should have all text match in sub array index 0', ->
      expect(matches[0][0]).to.equal('abc')
      expect(matches[1][0]).to.equal('efg')
      expect(matches[2][0]).to.equal('ijkl')

    it 'should have capturing subpattern in the subarray', ->
      expect(matches[0][2]).to.equal('bc')
      expect(matches[1][2]).to.equal('fg')
      expect(matches[2][2]).to.equal('jkl')

    it 'should have the index property', ->
      expect(matches[0].index).to.equal(0)
      expect(matches[1].index).to.equal(5)
      expect(matches[2].index).to.equal(10)



  describe '.Text', ->

    describe '#stringify', ->

      stringifier =
        text:    (e) -> e.text
        hashtag: (e) -> '[hashtag]'
        url:     (e) -> '[url]'
        user:    (e) -> '[user]'
        list:    (e) -> '[list]'

      it 'should stringify the tweet text', ->
        str = 'hello #hashtag #another @thaiWitter! @dtinth/ske09 #thaiWitter http://dt.in.th/ก'
        text = T.text(str)
        stringified = text.stringify(stringifier)
        expect(stringified).to.equal('hello [hashtag] [hashtag] [user]! [list] [hashtag] [url]ก')


  LONG_URL = "http://123.123.123.123/123/123/123/123/123/123/123/123/123/"

  expander = (url) ->
    return {
      "http://test/": LONG_URL
    }[url] || url

  describe '.shouldExpand', ->

    it 'should not expand URL if the resulting text will be longer than 180 characters', ->
      expect(T.text.shouldExpand(expander, T.text('hello http://test/ hello'))).to.be.true
      expect(T.text.shouldExpand(expander, T.text('hello http://test/ http://test/ hello'))).to.be.true
      expect(T.text.shouldExpand(expander, T.text('hello http://test/ http://test/ http://test/ hello'))).to.be.false






