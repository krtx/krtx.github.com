Function.prototype.method = function (name, func) {
    this.prototype[name] = func;
    return this;
};

Function.method('curry', function () {
    var slice = Array.prototype.slice,
        args = slice.apply(arguments),
        that = this;
    return function () {
        return that.apply(null, args.concat(slice.apply(arguments)));
    };
});

Array.method('reduce', function (f, value) {
    var i;
    for (i = 0; i < this.length; i += 1) {
        value = f(this[i], value);
    }
    return value;
});

var is_array = function (value) {
    return value &&
        typeof value === 'object' &&
        typeof value.length === 'number' &&
        typeof value.splice === 'function' &&
        !(value.propertyIsEnumerable('length'));
}

Array.method('toNString', function () {
    return "[" + this.map(function (v) {
        if (is_array(v)) return v.toNString();
        else return v.toString();
    }).join(',') + "]";
});

var to_string = function (c) {
    if (typeof c === 'string') return c;
    if (c.length === 1) {
        return to_string(c[0]);
    }
    if (is_array(c[1])) {
        return to_string(c[0]) + "(" + to_string(c[1]) + ")";
    }
    else {
        return to_string(c[0]) + to_string(c[1]);
    }
};

// ki(ski) === ((ki)((sk)i))
// [k, i, [s, k, i]]
var cparse_str = function (obj) {
    var ret = [];
    while (true){
        if (obj.idx >= obj.c.length) {
            return ret;
        }
        else if (obj.c[obj.idx] === '(') {
            obj.idx++;
            ret.push(cparse_str(obj));
        }
        else if (obj.c[obj.idx] === ')') {
            obj.idx++;
            break;
        }
        else {
            ret.push(obj.c[obj.idx]);
            obj.idx++;
        }
    }
    return ret;
};

// [k, i, [s, k, i]]
var ctrans = function (c) {
    if (is_array(c)) {
        if (c.length === 1) return c[0];
        else {
            var d = c.map(function (x) { return ctrans(x); });
            return d.slice(2)
                .reduce(
                    function(x, v) { return [v, x]; },
                    [d[0], d[1]]
                );
        }
    }
    else return c;
};

var cparse = function (c) {
    return ctrans(cparse_str({c: c, idx: 0}));
};

var eval_once = function (c) {
    if (typeof c === 'string') {
        return {f: c, args: []};
    }
    else {
        var p = eval_once(c[0]), q = eval_once(c[1]);
        if (is_array(p)) return [p, q];
        p.args.push(q);
        if (p.f === 'i' && p.args.length === 1) return [p.args[0]];
        else if (p.f === 'k' && p.args.length === 2) return [p.args[0]];
        else if (p.f === 's' && p.args.length === 3) {
            return [[p.args[0], p.args[2]], [p.args[1], p.args[2]]]
        }
        return p;
    }
};

var expand = function (c) {
    if (is_array(c)) {
        if (c.length === 1) return expand(c[0]);
        return c.map(function (elem) { return expand(elem); });
    }
    else {
        var expand_obj = function (obj) {
            if (obj.args.length === 0) return obj.f;
            return expand_obj({
                f: [obj.f, expand(obj.args[0])],
                args: obj.args.slice(1)
            });
        };
        return expand_obj(c);
    }
};

var add_left = function (term, c) {
    if (typeof term === 'string') return [c, term];
    return [add_left(term[0], c), term[1]];
};

var add_right = function (term, c) {
    if (typeof c === 'string') return [term, c];
    return [add_right(term, c[0]), c[1]];
};

var generate = function (len) {
    if (len === 1) {
        var r = Math.random()
          , a = 1.0 / 3.0;
        if (r < a) return 's';
        else if (r < 2.0 * a) return 'k';
        else if (r < 3.0 * a) return 'i';
    }
    else {
        var a = Math.floor(Math.random() * (len - 1)) + 1
          , l = generate(a)
          , r = generate(len - a);
        return [l, r];
    }
};

$(function (){
    $('#term').keypress(function (ev) {
        if (ev.which === 13) {
            var t = $('#term').val();
            if (t.length === 0) {
                $('#hist').html('');
                return ;
            }
            var c = cparse(t)
              , e = expand(eval_once(c));
            $('#hist').html(to_string(c) + '<br>' + $('#hist').html());
            $('#term').val(to_string(e));
        }
    });
});
