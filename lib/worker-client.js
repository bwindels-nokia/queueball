/*jshint evil: false, bitwise:false, strict: false, undef: true, white: false, node:true */
var trycatch = require('trycatch');
var config;

var log = function(level, msg) {
    process.send({
        log: {msg: msg, level: level}
    });
};

function runJob(data, file) {
    function handleError(err) {
        process.send({
            error: ''+err,
            stack: err.stack || ''
        });
    }
    
    var jobFactory;
    var jobRunner;
    try {
        jobFactory = require(file);
        jobRunner = jobFactory(config);
    } catch(err) {
        return handleError(err);
    }
    var callbackCalled = false;
    
    function run() {
        jobRunner(data, function(err, result) {
            if(callbackCalled) {
                throw new Error('a job should not call its callback multiple times');
            }
            if(err) {
                return handleError(err);
            }
            callbackCalled = true;
            process.send({
                done: true,
                result: result
            });
        }, log);
    }
    
    trycatch(run, handleError);
}

process.on('message', function(msg) {
    if(msg.start) {
        runJob(msg.data, msg.file);
    }
    else if(msg.config) {
        config = msg.config;
    }
});

