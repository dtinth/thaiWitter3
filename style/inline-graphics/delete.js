
var w, h;
w = h = 16;

newFile(w, h);
ctx.fillStyle = 'white';
ctx.strokeStyle = 'white';
ctx.lineWidth = 2;

var inset = 4;
ctx.beginPath();
ctx.moveTo(inset, inset);
ctx.lineTo(w - inset, h - inset);
ctx.stroke();

ctx.beginPath();
ctx.moveTo(w - inset, inset);
ctx.lineTo(inset, h - inset);
ctx.stroke();

saveFile('delete');
