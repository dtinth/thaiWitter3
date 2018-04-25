
T.module('date')

// formats date - cdate is date to check, now is the current time
T.date.format = function dateFormat(cdate, now) {
	var fdate = '';
	var sameDay = cdate.getDate() == now.getDate()
				&& cdate.getMonth() == now.getMonth()
				&& cdate.getFullYear() == now.getFullYear();
	if (!sameDay) {
		fdate = (cdate.getFullYear() != now.getFullYear() ? cdate.getFullYear() + '-' : '')
				+ T.twoDigits(cdate.getMonth() + 1) + '-'
				+ T.twoDigits(cdate.getDate()) + ' ';
	}
	return fdate + cdate.getHours() + ':' + T.twoDigits(cdate.getMinutes()) + ':' + T.twoDigits(cdate.getSeconds());
}

// create date object from date string in Twitter's API
T.date.parse = function dateParse(str) {

	// hack for internet explorer
	var pattern = /\w+ (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d+) (\d+):(\d+):(\d+) \+0000 (\d+)/
	  , m = (str + '').match(pattern)
	if (m) {
		return new Date(Date.UTC(parseInt(m[6], 10), T.date.parseMonth(m[1]), parseInt(m[2], 10)
			, parseInt(m[3], 10), parseInt(m[4], 10), parseInt(m[5])))
	}

	// this code works in all version of Firefox and Chrome I tested so far
	// but never worked on internet explorer
	return new Date(str);
	
}

T.date.months = 'Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec'.split('|')
T.date.parseMonth = function parseMonths(str) {
	var months = T.date.months
	for (var i = 0; i < 12; i ++) if (months[i] === str) return i
}






