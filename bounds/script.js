
Function.prototype.method = function (name, func) {
  if (!this.prototype[name]) {
    this.prototype[name] = func;
    return this;
  }   
};

Number.method('limit', function (l, r) {
  return Math.min(Math.max(l, this), r);
});

Number.method('torus', function (l, r) {
  return ((this - l) % (r - l) + (r - l)) % (r - l) + l;
});

var randi = function (n) {
  return Math.floor(Math.random() * n);
}

var width = 900, height = 600;
var gravity = 0.8, opacity = 0.1;

var ball = function (paper, x, y, r, c) {
  var that = {
    x: x, y: y,
    vx: 6.0 * Math.random() - 3.0,
    vy: 0
  };
  that.r = r || (randi(10) + 20);
  that.c = c || randi(360);

  that.ent =
    paper.circle(that.x, that.y, that.r)
         .attr('stroke-width', '0')
         .attr('fill', 'hsla(' + that.c + '%,30%,20%,40%)');

  that.fall = function (delta) {
    that.vx *= 0.99;
    that.vy *= 0.99;
    that.x += that.vx;
    that.y += that.vy;

    if (that.y + that.r > height) {
      that.y = height - that.r;
      that.vy *= -0.99;
    }
    else {
      that.vy += gravity;
    }

    if (that.x + that.r > width) {
      that.x = width - that.r;
      that.vx *= -1.0;
    }

    if (that.x - that.r < 0) {
      that.x = that.r;
      that.vx *= -1.0;
    }

    return that.ent.attr({'cx': that.x, 'cy': that.y});
  };

  that.dist = function (x, y) {
    return Math.sqrt((that.x - x) * (that.x - x) + (that.y - y) * (that.y - y));
  };

  return that;
};

$(function () {
  var paper = Raphael("holder", width, height);
  var bg = paper.rect(0, 0, width, height).attr('fill', 'black');
  var balls = [];
  var i, num = 40;

  for (i = 0; i < num; i++) {
    balls.push(ball(paper, Math.random() * width, Math.random() * height));
  }

  $('#holder').mousedown(function (ev) {
    var mx = ev.offsetX, my = ev.offsetY;
    var i;
    for (i = 0; i < balls.length; i++) {
      if (balls[i].dist(mx, my) < 100) {
        balls[i].vx = Math.random() * 20.0 - 10.0;
        balls[i].vy = -20.0;
      }
    }
  });

  var last = performance.now(), cnt = 0;
  (function loop () {
    requestAnimationFrame(loop);
    cnt += 1;
    if (cnt > 2) {
      cnt = 0;
      var cur = performance.now(), delta = cur - last;
      var i;
      for (i = 0; i < balls.length; i++) {
        (function (b) { b.fall(delta); })(balls[i]);
      }
    }
  })();
});

