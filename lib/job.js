/*jshint evil: false, bitwise:false, strict: false, undef: true, white: false, node:true */

var EventEmitter = require('events').EventEmitter;

/**
events emited on jobs:
    persisted : emited when the job is persited, guaranteeing that it will be executing in the future even if the server goes down.
    started : emited when the job is passed to a worker for execution
    error(err) : emited when running the job generates an error, not emited when success has been emited.
    success(jobResult) : emited when the jobs finishes successful, not emited when error has been emited.
    end : emited when the job is done, either giving an error or finishing successful. Emited after error and success 
    log(logLevel, msg) : emited when logger.info, logger.trace, ... is called inside the job
    removed : emited when the job has been removed from the database, only when the job finished successful
    progress(progressValue from 0 and 1) : only for job proxies, tracking the progress of the sub-jobs
*/

function Job(file, data) {
    this.data = data;
    this.file = file;
}

Job.prototype = Object.create(EventEmitter.prototype);

module.exports = Job;