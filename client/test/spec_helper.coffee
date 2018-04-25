

expectFuture = (future) ->

  expector = {
    resolve: (fn) ->
      future.then(
        (val) -> fn(val); val
        (val) -> throw new Error('future is rejected with ' + val + (if typeof val == 'object' then " @ #{val.stack}" else ''))
      )
    reject: (fn) ->
      future.then(
        (val) -> throw new Error('future is resolved')
        (val) -> fn(val); val
      )
  }

  expector.to = expector
  return expector


testFuture = (fn) -> (resume) ->
  fn().then(
    (val) -> resume()
    (val) -> resume(val)
  )
