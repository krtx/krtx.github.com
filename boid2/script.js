
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

var width = 900, height = 600;

var visible = 80.0, too_near = 40.0;
var max_vel = 2.0;

var rad = 80, point;

var boid = function (paper, x, y) {
  var that = {
    x: x, y: y,
    vx: Math.random() * 3.0 - 1.5, vy: Math.random() * 3.0 - 1.5
  };

  that.shape_str = function () {
    return "M%s,%sL%s,%sL%s,%sL%s,%s"
      .sprintf(that.x + 10, that.y,
               that.x - 5, that.y - 5,
               that.x - 5, that.y + 5,
               that.x + 10, that.y);
  };

  that.rot_str = function () {
    return "R%s %s %s"
      .sprintf(Math.atan2(that.vy, that.vx) * 180.0 / Math.PI, that.x, that.y);
  };

  var ent = paper
    .path(that.shape_str())
    .attr('fill', '#ccc')
    .attr('stroke', '#555')
    .transform('R%d'.sprintf(that.theta));

  that.move = function (others, delta) {
    var sx = 0.0, sy = 0.0, sd = too_near
      , cx = 0.0, cy = 0.0
      , ax = 0.0, ay = 0.0
      , rx = Math.random() * 2.0 - 1.0, ry = Math.random() * 2.0 - 1.0
      , mx = 0.0, my = 0.0
      , s, c, a, i;
    for (i = 0; i < others.length; i++) {
      var d = that.dist(others[i]);
      if (d < sd) {
        sd = d;
        sx = that.x - others[i].x;
        sy = that.y - others[i].y;
      }
      if (d < visible) {
        cx += others[i].x - that.x;
        cy += others[i].y - that.y;
        ax += others[i].vx;
        ay += others[i].vy;
      }
    }
    if (!(sx === 0.0 && sy === 0.0)) {
      s = Math.sqrt(sx * sx + sy * sy);
      sx /= s; sy /= s;
    }
    if (!(cx === 0.0 && cy === 0.0)) {
      c = Math.sqrt(cx * cx + cy * cy);
      cx /= c; cy /= c;
    }
    if (!(ax === 0.0 && ay === 0.0)) {
      a = Math.sqrt(ax * ax + ay * ay);
      ax /= a; ay /= a;
    }
    d = Math.sqrt((that.x - point.attr('cx')) * (that.x - point.attr('cx')) +
                  (that.y - point.attr('cy')) * (that.y - point.attr('cy')));
    if (d < rad + visible) {
      mx = (that.x - point.attr('cx')) / d;
      my = (that.y - point.attr('cy')) / d;
    }
    that.vx = (that.vx + (6.0 * sx + 2.0 * cx + 1.0 * ax + 3.0 * rx + 5.0 * mx) * (delta / 1000.0)).limit(-max_vel, max_vel);
    that.vy = (that.vy + (6.0 * sy + 2.0 * cy + 1.0 * ay + 3.0 * ry + 5.0 * my) * (delta / 1000.0)).limit(-max_vel, max_vel);
    return that.go();
  }

  that.go = function () {
    that.vx *= 0.999;
    that.vy *= 0.999;
    that.x = (that.x + 2.0 * that.vx).torus(0.0, width);
    that.y = (that.y + 2.0 * that.vy).torus(0.0, height);
    return ent.attr({path: that.shape_str(), transform: that.rot_str()});
  };

  that.dist = function (b) {
    var dx = [-width, 0, width, 0], dy = [0, -height, 0, height];
    var d = Math.sqrt((that.x - b.x) * (that.x - b.x) + (that.y - b.y) * (that.y - b.y));
    var i;
    for (i = 0; i < 4; i++) {
      d = Math.min(d, Math.sqrt((that.x + dx[i] - b.x) * (that.x + dx[i] - b.x) +
                                (that.y + dy[i] - b.y) * (that.y + dy[i] - b.y)));
    }
    return d;
  };

  return that;
};

var move = function (boids, delta) {
  var i;
  for (i = 0; i < boids.length; i++) {
    boids[i].move(boids.slice(0, i).concat(boids.slice(i + 1, boids.length)), delta);
  }
};

$(function () {
  var paper = Raphael("holder", width, height);
  var boids = [];
  var i, num = 25;

  point = paper
    .circle(width / 2, height / 2, rad)
    .attr({'stroke': '#444', 'fill': '#ddd', 'fill-opacity': 20});
  $('#holder').mousemove(function (ev) {
    point.attr({cx: ev.offsetX, cy: ev.offsetY});
  });

  for (i = 0; i < num; i++) {
    boids.push(boid(paper, Math.random() * width, Math.random() * height));
  }

  var run = true, last = performance.now();
  var cnt = 0;
  (function loop () {
    requestAnimationFrame(loop);
    cnt += 1;
    if (cnt > 2) {
      cnt = 0;
      var cur = performance.now(), delta = cur - last;
      move(boids, delta);
      last = cur;
    }
  })();
});

