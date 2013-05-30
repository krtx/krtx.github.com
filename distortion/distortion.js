
$(function () {
  var context = new webkitAudioContext();
  var mic, distort, filter, bufsize = 256;
  var success = function (stream) {
    mic = context.createMediaStreamSource(stream);

    filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 4000;
    filter.Q.value = 5;

    distort = context.createWaveShaper();
    distort.curve = new Float32Array(bufsize);
    var amount = 0.75;
    var i, k = 2 * amount / (1 - amount);
    for (i = 0; i < bufsize; i++) {
      if (bufsize / 2 - 20 <= i && i <= bufsize / 2 + 20) {
        console.log(i);
        distort.curve[i] = (i - bufsize / 2) * (1 / bufsize);
      }
      else {
        var x = (i - 0) * (1 - (-1)) / (bufsize - 0) + (-1);
        distort.curve[i] = (1 + k) * x / (1 + k * Math.abs(x));
      }
    }

    mic.connect(filter);
    filter.connect(distort);
    distort.connect(context.destination);
  }

  navigator.webkitGetUserMedia({audio: true}, success);
});

