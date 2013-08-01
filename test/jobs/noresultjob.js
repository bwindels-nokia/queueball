/*jshint evil: false, bitwise:false, strict: false, undef: true, white: false, node:true */

module.exports = function(config) {
    
    return function(data, result, log) {
        process.nextTick(function() {
            result();
        });
    };
    
};