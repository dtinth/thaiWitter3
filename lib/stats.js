
var start;
var deployed;
var fs = require('fs');

exports.init = function() {
	start = new Date().getTime();
	deployed = process.env.TW_DEPLOYED;
	if (deployed == null) {
		deployed = JSON.parse(fs.readFileSync(__dirname + '/../deployed.json', 'utf-8'));
	}
	console.log('deployed: ' + new Date(deployed));
};

exports.getUptime = function() {
	return new Date().getTime() - start;
};

exports.getDeployedDiff = function() {
	var d = parseInt(deployed, 10);
	if (d) {
		return new Date().getTime() - d;
	}
	return 0;
};

exports.TimedStatHash = function(thresh) {

	var data = {};
	var max = 0;

	function prune() {
		var min = new Date().getTime() - thresh;
		var count = 0;
		for (var k in data) {
			if (data[k] < min) delete data[k];
			else count++;
		}
		if (count > max) max = count;
		return count;
	}

	return {
		log: function(k) {
			data[k] = new Date().getTime();
			prune();
		},
		getCount: function() {
			return prune();
		},
		getMax: function() {
			return max;
		}
	}

};

exports.TimedStatQueue = function(thresh) {

	var data = [];
	var max = 0;

	function prune() {
		var min = new Date().getTime() - thresh;
		while (data.length > 0 && data[0] < min) {
			data.shift();
		}
		if (data.length > max) max = data.length;
		return data.length;
	}

	return {
		log: function() {
			data.push(new Date().getTime());
		},
		getCount: function() {
			return prune();
		},
		getMax: function() {
			return max;
		}
	};

};

exports.users    = new exports.TimedStatHash(3600000);
exports.requests = new exports.TimedStatQueue(3600000);

