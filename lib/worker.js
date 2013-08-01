/*jshint evil: false, bitwise:false, strict: false, undef: true, white: false, node:true */

var EventEmitter = require('events').EventEmitter;
var path = require('path');
var workerId = 0;

/* wrapper function to only require node-fork when native child_process.fork is not supported */
function fork(file) {
    var cp = require('child_process');
    if(cp.fork) {
        return cp.fork(file, [], {env: process.env});
    } else {
        var nodefork = require('node-fork').fork;
        return nodefork(file);
    }
}

function Worker(childConfig, options) {
    this.options = options || {};
    this.childConfig = childConfig;
    this.id = ++workerId;
}

Worker.prototype = {};

Worker.prototype._startWorkerProcess = function() {
    this.workerProcess = fork(path.join(__dirname, 'worker-client.js'));
    this.workerProcess.on('message', this._processMessage.bind(this));
    this.workerProcess.send({
        config: this.childConfig
    });
};

Worker.prototype._processMessage = function(message) {
    var self = this;
    
    function finishJob(job) {
        if(self.options.killWorkerAfterJob) {
            self.shutdown();
        }
    }
    
    if(message.error) {
        finishJob(self.job);
        var error = new Error(message.error);
        error.stack = message.stack;
        process.nextTick(function() {
            var job = self.job;
            self.job = null;
            job.emit('error', error);
            job.emit('end');
        });
    }
    else if(message.done) {
        finishJob(self.job);
        process.nextTick(function() {
            var job = self.job;
            self.job = null;
            job.emit('success', message.result);
            job.emit('end');
        });
    }
    else if(message.log) {
        self.job.emit('log', message.log.level, message.log.msg);
    }
};

Worker.prototype.isBusy = function() {
    return !!this.job;
};

Worker.prototype.run = function(job) {
    if(this.isBusy()) {
        throw new Error('I am busy!');
    }
    this.job = job;
    this.job.emit('started');
    
    if(!this.workerProcess) {
        this._startWorkerProcess();
    }
    this.workerProcess.send({
        start: true,
        data: job.data,
        file: job.file
    });
};

Worker.prototype.shutdown = function() {
    if(this.workerProcess) {
        this.workerProcess.kill();
        this.workerProcess = null;
    }
};

module.exports = Worker;