/*jshint evil: false, bitwise:false, strict: false, undef: true, white: false, node:true */

module.exports = function(config) {
    
    return function(data, result) {
        process.nextTick(function() {
            result(null, data.a + data.b);
        });
    };
    
};