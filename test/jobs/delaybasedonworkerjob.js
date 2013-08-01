/*jshint evil: false, bitwise:false, strict: false, undef: true, white: false, node:true */


module.exports = function(config) {
    
    var r = 'ok';
    
    return function(data, result) {
        if(data.worker === 0) {
            setTimeout(function() {
                result(null, r);
            }, 50);
        } else {
            process.nextTick(function() {
                result(null, r);
            });
        }
    };
    
};