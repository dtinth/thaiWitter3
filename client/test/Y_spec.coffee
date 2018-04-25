

describe 'Y', ->


  describe '.get', ->
    it 'should get a property from an object', ->
      expect(Y.get('a')(a: 123)).to.equal(123)
      expect(Y.get('z')(a: 123)).to.equal(undefined)


  describe '.isNull', ->
    it 'should return true when yield not null', ->
      expect(Y.isNull(-> true)()).to.equal(false)
      expect(Y.isNull(-> false)()).to.equal(false)
      expect(Y.isNull(-> undefined)()).to.equal(true)
      expect(Y.isNull(-> null)()).to.equal(true)


  describe '.not', ->
    it 'should return true when yield falsy value, vice versa', ->
      expect(Y.not(-> true)()).to.equal(false)
      expect(Y.not(-> false)()).to.equal(true)
      expect(Y.not(-> undefined)()).to.equal(true)
      expect(Y.not(-> '')()).to.equal(true)
      expect(Y.not(-> 0)()).to.equal(true)
      expect(Y.not(-> '0')()).to.equal(false)
      expect(Y.not(-> 'zz')()).to.equal(false)

  describe '.notNull', ->
    it 'should return true when the subject is not null', ->
      expect(Y.notNull(-> true)()).to.equal(true)
      expect(Y.notNull(-> false)()).to.equal(true)
      expect(Y.notNull(-> undefined)()).to.equal(false)
      expect(Y.notNull(-> null)()).to.equal(false)









