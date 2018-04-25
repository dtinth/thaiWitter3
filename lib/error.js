
module.exports = function error(message, status) {
	var err = new Error(message)
	if (status) err.status = status
	return err
}
