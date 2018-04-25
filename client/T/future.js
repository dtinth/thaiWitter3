
;(function() {
	function makeResolve(d) {
		return function(what) {
			Q.when(what).then(d.accept, d.reject)
		}
	}
	T.future = function(callback) {
		var I = Q.defer();
		var resolver = {
			accept: I.resolve,
			reject: I.reject
		}
		resolver.resolve = makeResolve(resolver)
		try {
			callback(resolver);
		} catch (e) {
			resolver.reject(e);
		}
		var promise = I.promise;
		return {
			then: promise.then.bind(promise)
		}
	};
	T.future.accept = function(value) {
		return T.future(function(resolver) { resolver.accept(value); });
	};
	T.future.reject = function(value) {
		return T.future(function(resolver) { resolver.reject(value); });
	};
})()

