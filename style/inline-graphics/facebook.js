
newFile(16, 16);

var img = new (require('canvas').Image);
img.src = require('fs').readFileSync('facebook-favicon.png');
ctx.clearRect(0, 0, w, h);
ctx.drawImage(img, 0, 0);

var imgd = ctx.getImageData(0, 0, w, h);
for (var i = 0; i < imgd.data.length; i += 4) {
	var x = (imgd.data[i] + imgd.data[i + 1] + imgd.data[i + 2]) / 3;
	var o = ((1 - x / 255) * imgd.data[i + 3] / 255);
	imgd.data[i] = imgd.data[i + 1] = imgd.data[i + 2] = 255;
	o *= 1.2;
	o = Math.min(1, o);
	o = Math.sqrt(o);
	o *= 255;
	imgd.data[i + 3] = o;
}

ctx.clearRect(0, 0, w, h);
ctx.putImageData(imgd, 0, 0);

saveFile('facebook');

