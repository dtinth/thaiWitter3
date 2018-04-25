
var Y = {}

Y.get = function(name) {
	return function(subject) {
		return subject[name]
	}
}

Y.isNull = function(f) {
	return function(subject) {
		return f(subject) == null
	}
}

Y.not = function(f) {
	return function(subject) {
		return !f(subject)
	}
}

Y.notNull = function(f) {
	return Y.not(Y.isNull(f))
}


