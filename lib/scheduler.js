/*jshint evil: false, bitwise:false, strict: false, undef: true, white: false, node:true */

var EventEmitter = require('events').EventEmitter;

var Job = require('./job');
var Worker = require('./worker');

function Scheduler(options) {
    this.options = options;
    this.options.workerConfig = this.options.workerConfig || {};
    this.jobQueue = [];
}

Scheduler.prototype = Object.create(EventEmitter.prototype);


Scheduler.prototype._createWorkers = function() {
    this.workersList = [];
    for(var i = 0; i < this.options.workers; ++i) {
        this.workersList.push(new Worker(this.options.workerConfig, this.options));
    }
};

Scheduler.prototype._startNext = function() {
    var self = this;
    if(this.jobQueue.length === 0 && !this.hasBusyWorkers()) {
        process.nextTick(function() {
            self.emit('end');
        });
    }
    var jobIndex = 0, job, worker;
    while(this.freeWorkers().length && jobIndex < this.jobQueue.length) {
        job = this.jobQueue[jobIndex];
        worker = this.selectWorker(job);
        if(!worker.isBusy()) {
            this.jobQueue.splice(jobIndex, 1);
            worker.run(job);
        } else {
            ++jobIndex;
        }
    }
};

Scheduler.prototype.workers = function() {
    if(!this.workersList) {
        this._createWorkers();
    }
    return this.workersList;
};

Scheduler.prototype.freeWorkers = function() {
    if(!this.workersList) {
        this._createWorkers();
    }
    return this.workers().filter(function(worker) {
        return !worker.isBusy();
    });
};

Scheduler.prototype.hasBusyWorkers = function() {
    if(!this.workers) {
        return false;
    }
    return this.workers().some(function(worker) {
        return worker.isBusy();
    });
};

Scheduler.prototype.selectWorker = function(job) {
    var freeWorkers = this.freeWorkers();
    var index;
    if(freeWorkers.length) {
        return freeWorkers[0];
    } else {
        index = ((this.nextWorkerIndex || 0) + 1 ) % this.workers().length;
        this.nextWorkerIndex = index;
        return this.workers()[index];
    }
};

Scheduler.prototype.push = function(file, jobData) {
    var job = new Job(file, jobData);
    var startNext = this._startNext.bind(this);
    //continue running jobs when this job is done
    job.once('end', startNext);
    //start the queue if it is not running already
    process.nextTick(startNext);

    this.jobQueue.push(job);
    var self = this;
    process.nextTick(function() {
        self.emit('enqueued', job);
    });
    return job;
};

Scheduler.prototype.shutdown = function() {
    this.workers().forEach(function(worker) {
        worker.shutdown();
    });
};

Scheduler.prototype.size = function() {
    return this.jobQueue.length;
};

Scheduler.prototype.waitingJobs = function() {
    return this.jobQueue;
};

module.exports = Scheduler;