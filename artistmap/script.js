
// ===================================================
// ==================== utilities ====================
// ===================================================

var range = function (l, r, v) {
    return Math.min(Math.max(l, v), r);
};


// ==================================================
// ===================== lastfm =====================
// ==================================================

var lastfm = {};

(function ($y) {
    // super simple lastfm api binding (require jQuery)
    var api = function (api_key) {
        var that = {};

        var endpoint = 'http://ws.audioscrobbler.com/2.0/';
        that.endpoint = endpoint;

        var factory = function (method) {
            return function (params, callback) {
                params.method = method;
                params.api_key = api_key;
                params.format = 'json';

                return $.getJSON(endpoint, params, callback);
            };
        };

        that.user = {
            getTopArtists: factory('user.gettopartists'),
            getInfo: factory('user.getinfo')
        };
        that.artist = {
            getTopTags: factory('artist.gettoptags')
        };

        return that;
    };

    $y.api = api;
})(lastfm);

var api = lastfm.api('8bda5d4b3452346cb10744d3ae78ddee');

// get tags of specified user's top artists
var artisttags = function (user, params, dfd, callback) {

    var maxartists = (params && params.artists && (params.artists > 500 ? 500 : params.artists)) || 100; // default to 100, max 500
    var maxtags = (params && params.tags && (params.tags > 100 ? 100: params.tags)) || 100; // default to 100, max 100

    var ret = {};
    return api.user.getTopArtists({user: user, limit: maxartists}).done(function (data) {
        var i, artists = data.topartists.artist, defs = [];
        for (i = 0; i < artists.length; i++) {
            defs.push(
                (function (name) {
                    return function () {
                        return api.artist.getTopTags({artist: name}).done(function (data) {
                            dfd.notify('getTopTags: ' + name); // NOTIFY * artists
                            ret[name] = {};
                            var tags = data.toptags.tag;
                            if (tags) {
                                tags = tags.splice(0, maxtags);
                                $.each(tags, function (idx) {
                                    ret[name][tags[idx].name] = parseInt(tags[idx].count, 10);
                                });
                            }
                        });
                    };
                })(artists[i].name)()
            );
        }
        return $.when.apply($, defs).then(function (data) {
            callback(ret);
        });
    });
};


// ==================================================
// ============ calculate similarities ==============
// ==================================================

// get a distance between artists by pearson's r
var simPearson = function (atags, a1, a2) {
    var si = [];

    $.each(atags[a1], function (key) {
        if (key in atags[a2]) si.push(key);
    });

    var n = si.length;
    if (n === 0) return 0;

    var sum1 = 0, sum2 = 0, sum1sq = 0, sum2sq = 0, prod = 0;
    $.each(si, function (idx) {
        sum1 += atags[a1][si[idx]];
        sum2 += atags[a2][si[idx]];
        sum1sq += atags[a1][si[idx]] * atags[a1][si[idx]];
        sum2sq += atags[a2][si[idx]] * atags[a2][si[idx]];
        prod += atags[a1][si[idx]] * atags[a2][si[idx]]
    });

    var num = prod - (sum1 * sum2 / n);
    var den = Math.sqrt((sum1sq - Math.pow(sum1, 2) / n) * (sum2sq - Math.pow(sum2, 2) / n));

    if (den === 0.0) return 0.0;

    var r = num / den;
    return r;
};

var simDistance = function (atags, a1, a2) {
    var si = [];

    $.each(atags[a1], function (key) {
        if (key in atags[a2]) si.push(key);
    });

    if (si.length === 0) return 0;

    var sumsq = 0.0;
    $.each(si, function (idx) {
        sumsq += Math.pow(atags[a1][si[idx]] - atags[a2][si[idx]], 2);
    });

    return 1.0 / (1.0 + sumsq);
};

// [-1,1]
var tanimoto = function (atags, a1, a2) {
    var si = [];

    $.each(atags[a1], function (key) {
        if (key in atags[a2]) si.push(key);
    });

    var dot = 0.0;
    $.each(si, function (idx) {
        dot += atags[a1][si[idx]] * atags[a2][si[idx]];
    });

    var sq1 = 0.0, sq2 = 0.0;
    $.each(atags[a1], function (k, v) { sq1 += v * v; });
    $.each(atags[a2], function (k, v) { sq2 += v * v; });

    return dot / (sq1 + sq2 - dot);
};

// get similarities between all the artists
var similarities = function (atags, cmp, threshold) {

    var i, j, k;
    var ret = {nodes: [], links: []};
    threshold = threshold || 0.0;

    for (k in atags) {
        if (atags.hasOwnProperty(k)) {
            ret.nodes.push({nodeName: k});
        }
    }

    var n = ret.nodes.length;
    
    for (i = 0; i < n; i++) {
        for (j = i + 1; j < n; j++) {
            var val = cmp(atags, ret.nodes[i].nodeName, ret.nodes[j].nodeName);
            if (val > threshold) {
                ret.links.push({
                    source: i, target: j,
                    value: val
                });
            }
        }
    }

    return ret;
};


// ==================================================
// =================== draw graph ===================
// ==================================================

/*
  *** Parameters ***
  - width, height
    描画エリアの大きさ
  - radius
    円の半径

  - user*
  
  - artist*
    アーティストの数
  - tag
    類似度を計算する時に考慮するタグの数
  - threshold*
    類似度のしきい値

  - linkDistance
    辺の長さ
  - charge*
    斥力
  - gravity*
    重力

 */

var width = 600, height = 600; // canvas size
var radius = 10; // radius of node

var artist = 20, tag = 10;
var threshold = 0.5; // threshold of similarity

var drawer = function (width, height, radius) {
    var that = {};

    var svg  = d3.select('svg').attr('width', width).attr('height', height);
    // frame
    svg.append('rect').attr('x', 1).attr('y', 1).attr('width', width - 2).attr('height', height - 2).attr('fill', 'none').attr('stroke', 'steelblue');

    var force, link = [], node = [], text = [];

    that.draw = function (user, artist, tag, threshold, dfd) {
        return artisttags(user, {artists: artist, tags: tag}, dfd, function (atags) {
            console.log(atags);
            dfd.notify('calculating...'); // NOTIFY * 1
            var graph = similarities(atags, tanimoto, threshold);

            that.force = d3.layout.force().size([width, height]).nodes(graph.nodes)
                .links(graph.links).linkDistance(100).charge(-100).gravity(0.025).start();
            
            if (link.length > 0) link.data([]).exit().remove();
            link = svg.selectAll('line.link').data(graph.links).enter().append('line').attr('class', 'link');
            
            if (node.length > 0) node.data([]).exit().remove();
            node = svg.selectAll('circle.node').data(graph.nodes).enter().append('circle').attr('class', 'node').attr('r', radius).call(that.force.drag);
            
            if (text.length > 0) text.data([]).exit().remove();
            text = svg.selectAll('text').data(graph.nodes).enter().append('text').text(function (d) { return d.nodeName; });
            
            that.force.on('tick', function () {
                link.attr('x1', function (d) { return d.source.x; })
                    .attr('y1', function (d) { return d.source.y; })
                    .attr('x2', function (d) { return d.target.x; })
                    .attr('y2', function (d) { return d.target.y; });
                node.attr('cx', function (d) { return range(0, width, d.x); })
                    .attr('cy', function (d) { return range(0, height, d.y); });
                text.attr('x', function (d) { return d.x; })
                    .attr('y', function (d) { return d.y; });
            });
            dfd.resolve();
        });
    };

    return that;
};

var layout;
        
$(document).ready(function () {
    layout = drawer(width, height, radius);

    $('form').submit(function () {
        var user = $('input:first').val();
        artist = $('input:eq(1)').val();
        var notify = 0;
        var dfd = $.Deferred();
        dfd.notify('start'); // NOTIFY * 1
        api.user.getInfo({user: user}, function (data) {
            $('#message').html('');
            if (data.hasOwnProperty('error')) {
                $('#message').html('error: the user ' + user + ' does not exist?');
                return ;
            }
            layout.draw(user, artist, tag, threshold, dfd);
        });
        // notify: artists + 2
        dfd.progress(function (arg) {
            $('#message').text(arg);
            notify++;
        }).done(function () {
            $('#message').text(notify);
        });
    });

    $('#gravity .down').click(function (e) {
        layout.force.stop();
        layout.force.gravity(layout.force.gravity() - 0.01);
        layout.force.start();
        return false;
    });
    $('#gravity .up').click(function (e) {
        layout.force.stop();
        layout.force.gravity(layout.force.gravity() + 0.01);
        layout.force.start();
        return false;
    });
    $('#charge .down').click(function (e) {
        layout.force.stop();
        layout.force.charge(layout.force.charge() - 5.0);
        layout.force.start();
        return false;
    });
    $('#charge .up').click(function (e) {
        layout.force.stop();
        layout.force.charge(layout.force.charge() + 5.0);
        layout.force.start();
        return false;
    });

});

