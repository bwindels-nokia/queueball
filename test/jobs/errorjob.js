module.exports = function(config) {
    
    return function(data, result) {
        process.nextTick(function() {
            throw new Error('fail!');
        });
    };
    
};