

;(function() {

	T.task = function createTask(title, worker) {
		var task, resolver
		task = T.future(function taskFutureWrapper(r) {
			resolver = r
		})
		resolver.text = function setText(text) {
			task.status.text = text
			task.emit('text', text, true)
		}
		resolver.progress = function setProgress(progress) {
			task.status.progress = progress
			task.emit('progress', progress, true)
		}
		resolver.onabort = function defaultOnAbort() {
		}
		T.supportEvent(task)
		task.title = title
		task.status = { text: 'Working...', progress: -1 }
		task.abort = function abort() {
			resolver.onabort()
		}
		worker(resolver)
		return task
	}

})()

