
describe 'T.date', ->

  describe '.format', ->

    now = new Date(2013, 1, 9, 12, 34, 56)
    check = (i, o) -> expect(T.date.format(i, now)).to.equal(o)

    describe 'when only time differs', ->
      it 'should just show the time', ->
        check(new Date(2013, 1, 9, 12, 34, 56), '12:34:56')
        check(new Date(2013, 1, 9, 20, 34, 56), '20:34:56')

    describe 'when either date or month differ', ->
      it 'show both the month and date', ->
        check(new Date(2013, 1, 8, 20, 34, 56), '02-08 20:34:56')
        check(new Date(2013, 1, 10, 20, 34, 56), '02-10 20:34:56') # future
        check(new Date(2013, 2, 8, 20, 34, 56), '03-08 20:34:56')
        check(new Date(2013, 0, 1, 1, 2, 3), '01-01 1:02:03')

    describe 'when year differ', ->
      it 'should also show year', ->
        check(new Date(2012, 0, 1, 1, 2, 3), '2012-01-01 1:02:03')
        check(new Date(2014, 0, 1, 1, 2, 3), '2014-01-01 1:02:03')

      describe 'even when only year differ', ->
        it 'should still show the year', ->
          check(new Date(2010, 1, 9, 20, 34, 56), '2010-02-09 20:34:56')


  describe '.parseMonth', ->

    it 'should parse month name and return month index', ->
      for c, i in 'Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec'.split('|')
        expect(T.date.parseMonth(c)).to.equal(i)


  describe '.parse', ->

    it 'should parse the date according to Twitter API\'s return result', ->
      str = 'Sat Feb 09 04:50:56 +0000 2013'
      date = T.date.parse(str)
      expect(date.getUTCDate()).to.equal(9)
      expect(date.getUTCMonth()).to.equal(1)
      expect(date.getUTCFullYear()).to.equal(2013)
      expect(date.getUTCHours()).to.equal(4)
      expect(date.getUTCMinutes()).to.equal(50)
      expect(date.getUTCSeconds()).to.equal(56)

