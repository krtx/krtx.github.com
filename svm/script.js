Array.prototype.shuffle = function() {
    var i = this.length;
    while(i){
        var j = Math.floor(Math.random()*i);
        var t = this[--i];
        this[i] = this[j];
        this[j] = t;
    }
    return this;
}

$(document).ready(function(){
    var width = 500, height = 500, radius = 5;
    var paper = Raphael("holder", width, height);

    var base = paper.rect(0, 0, width, height)
        .attr('fill', '#fff')
        .attr('stroke', '#888');
    
    $('#holder').click(function (ev) {
        paper.circle(ev.offsetX, ev.offsetY, radius)
            .attr('fill', '#f88')
            .attr('stroke', '#fff');
        $('#points').val($('#points').val() + ev.offsetX + " " + ev.offsetY + " 1\n");
        $('#count').html(parseInt($('#count').html(), 10) + 1);
    });
    $('#holder').bind('contextmenu', function (ev) {
        paper.circle(ev.offsetX, ev.offsetY, radius)
            .attr('fill', '#8f8')
            .attr('stroke', '#fff');
        $('#points').val($('#points').val() + ev.offsetX + " " + ev.offsetY + " -1\n");
        $('#count').html(parseInt($('#count').html(), 10) + 1);
        return false;
    });
    console.log($('button'));
    $('button').click(function (ev) {
        strs = $('#points').val().replace(/\n$/, "").split("\n").shuffle().join("\n");
        $('#points').val(strs + "\n");
    });
});
