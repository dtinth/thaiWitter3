
var w, h;
w = h = 16;

newFile(w, h);

ctx.fillStyle = 'white';
ctx.globalCompositeOperation = 'source-over';
ctx.fillRect (0, 0, w, h);

function circle(x) {
    ctx.beginPath ();
    ctx.arc (w / 2, h / 2, w / 2 * x, 0, Math.PI * 2, false);
    ctx.fill ();
}

function triangle(x) {
    ctx.save ();
    ctx.translate (w / 2, h / 2);
    ctx.rotate (x);
    ctx.beginPath ();
    ctx.moveTo (w * 0, h * -0.25);
    ctx.lineTo (w * -0.14, h * -0.5);
    ctx.lineTo (w * 0.14, h * -0.5);
    ctx.fill ();
    ctx.restore ();
}

ctx.globalCompositeOperation = 'destination-out';
circle (0.8);

ctx.globalCompositeOperation = 'source-over';
triangle (Math.PI * 0);
triangle (Math.PI * 0.5);
triangle (Math.PI * 1);
triangle (Math.PI * 1.5);

ctx.fillStyle = 'rgba(0,0,0,1)';
ctx.globalCompositeOperation = 'destination-in';
circle (1);

saveFile('geolocation');
