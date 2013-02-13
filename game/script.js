
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

var w = 45, h = 30;
var csize = 18;

var cell = function (spec) {
  var that = {x: spec.x, y: spec.y};

  that.move = function (ax, ay) {
    that.x = (that.x + ax).limit(0, w - 1);
    that.y = (that.y + ay).limit(0, h - 1);
  };

  return that;
};

var cells_factory = function (spec) {
  var that = {paper: spec.paper};
  var holder = new Array(h), rects = new Array(h);
  var i, j;

  for (i = 0; i < h; i++) {
    holder[i] = new Array(w);
    rects[i] = new Array(w);
    for (j = 0; j < w; j++) {
      if (Math.random() > 0.8) holder[i][j] = true;
      else holder[i][j] = false;
      rects[i][j] = that.paper
        .rect(j * csize, i * csize, csize, csize)
        .attr('fill', '#222')
        .hide();
    }
  }

  var next = function () {
    var _holder = new Array(h);
    for (i = 0; i < h; i++) {
      _holder[i] = new Array(w);
      for (j = 0; j < w; j++) _holder[i][j] = holder[i][j];
    }
    for (i = 0; i < h; i++) for (j = 0; j < w; j++) {
      var count = 0, ay, ax;
      for (ay = i - 1; ay <= i + 1; ay++) 
        for (ax = j - 1; ax <= j + 1; ax++)
          if (holder[ay.torus(0,h)][ax.torus(0,w)] === true) count++;
      if (holder[i][j] === false && count === 3)
        _holder[i][j] = true;
      else if (holder[i][j] === true && (count <= 2 || 5 <= count))
        _holder[i][j] = false;
    }
    holder = _holder; 
  };

  that.draw_bg = function () {
    that.paper
      .rect(0, 0, w * csize, h * csize)
      .attr('fill', 'white')
      .attr('stroke', 'black').toBack();
    for (i = 0; i < w + 1; i++) {
      that.paper
        .path("M" + (i * csize) + ",0L" + (i * csize) + "," + (h * csize))
        .attr('stroke', '#ccc')
        .attr('stroke-dasharray', '-');
    }
    for (i = 0; i < h + 1; i++) {
      that.paper
        .path("M0," + (i * csize) + "L" + (w * csize) + "," + (i * csize))
        .attr('stroke', '#ccc')
        .attr('stroke-dasharray', '-');
    }
  };

  var draw_cells = function () {
    for (i = 0; i < h; i++) for (j = 0; j < w; j++) {
      if (holder[i][j] === true) rects[i][j].show().toFront();
      else rects[i][j].hide();
    }
  };
  
  that.render = function () {
    draw_cells();
    next();
  };

  that.holder = holder;

  return that;
};

$(function () {
  var paper = Raphael("holder", w * csize, h * csize);
  var cells = cells_factory({paper: paper});
  cells.draw_bg();
  var gps = 6;
  var run = true, last = performance.now();
  (function loop () {
    requestAnimationFrame(loop);
    var cur = performance.now(), delta = cur - last;
    if (delta > 1000 / gps) {
      last = cur;
      if (run) cells.render();
    }
  })();
  $(document).click(function () { run = !run; });
});
