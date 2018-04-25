

module.exports = function mainServer(resources, powered, version) {
	var locals = Object.create(resources)
	locals.powered = powered
	locals.version = version
	return function(req, res, next) {
		if (req.path == '/thaiWitter') {
			res.redirect('/thaiWitter/')
			return
		}
		if (req.path != '/thaiWitter/') return next()
		res.render('template', locals)
	}
}
