/*jshint evil: false, bitwise:false, strict: false, undef: true, white: false, node:true */

module.exports = function(config) {
    
    return function(data, result, log) {
        log('info','hello world');
        process.nextTick(function() {
            result(null, 1);
        });
    };
    
};