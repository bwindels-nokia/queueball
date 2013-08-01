/*jshint evil: false, bitwise:false, strict: false, undef: true, white: false, node:true */


/* run with nodeunit test-queueball.js */

var Scheduler = require('node_modules/queueball/lib/index').Scheduler;
var path = require('path');
var testCase = require('nodeunit').testCase;

module.exports = testCase({
    "test basic job execution" : function(test) {
        test.expect(3);
        var queue = new Scheduler({workers: 1});
        var enqueuedJob;
        var job = queue.push(path.join(__dirname, 'jobs/sum.js'), {a: 5, b: 2});
        queue.on('enqueued', function(enqjob) {
            enqueuedJob = enqjob;
            test.equal(job, enqueuedJob, 'the enqueued event should emit the job that is returned from push');
        });

        job.on('success', function(sum) {
            test.equal(sum, 7, 'result of job should be 7');
        });
        job.on('end', function(sum) {
            test.ok('the end event should always be emitted when a job finishes, either with a result or an error');
        });
        job.on('error', function(err) {
            test.fail('sum job should not fail');
        });
        queue.on('end', function() {
            queue.shutdown();
            test.done();
        });
    },
    "test multiple job execution using configuration value": function(test) {
        var c = 10;
        var numberOfJobs = 50;
        var queue = new Scheduler({
            workers: 5,
            workerConfig: {c: c}
        });

        var jobFile = path.join(__dirname, 'jobs/configsum.js');
        var doneCount = 0;

        function enqueueJob(i) {
            var a = Math.ceil(Math.random() * 500);
            var b = Math.ceil(Math.random() * 500);
            var job = queue.push(jobFile, {a: a, b: b});
            job.on('success', function(sum) {
                ++doneCount;
                test.equal(a + b + c, sum, 'configsum job should yield sum of a + b + c');
            });
            job.on('error', function(err) {
                test.fail('configsum job should not fail');
            });
        }

        for(var i = 0; i < numberOfJobs; i++) {
            enqueueJob(i);
        }

        queue.on('end', function() {
            queue.shutdown();
            test.equal(doneCount, numberOfJobs, 'done callback for job should be called the same amount as jobs were queued');
            test.done();
        });
    },
    "test scheduler handling correctly selected workers that are busy": function(test) {
        test.expect(4);

        var queue = new Scheduler({
            workers: 3 //3 workers, one of them never used so we always have a free worker
        });
        /** delaybasedonworkerjob is programmed in a way that if worker === 0,
            it takes 50ms to yield its result (a string we won't use),
            else on next tick */
        var jobs = [
            {worker: 0},
            {worker: 0},
            {worker: 1},
            {worker: 1}
        ];
        var doneJobs = [];
        var startedJobs = [];

        queue.selectWorker = function(job) {
            return this.workers()[job.data.worker];
        };

        function enqueueJob(i) {
            var job = queue.push(path.join(__dirname, 'jobs/delaybasedonworkerjob.js'), jobs[i]);
            job.on('started', function() {
                startedJobs[i] = true;

                if(i === 1) {
                    test.ok(doneJobs[0], 'job #0 should have finished before starting job #1');
                    /*  we want to check that the scheduler went on to try schedule job 2 and 3
                        after seeing the selected worker for job 1 was busy */
                    test.ok(startedJobs[2], 'job #2 should have started before starting job #1');
                } else if(i === 3) {
                    test.ok(doneJobs[2], 'job #2 should have finished before starting job #3');
                }
            });
            job.on('success', function(sum) {
                doneJobs[i] = true;
            });
            job.on('error', function(err) {
                test.fail('job should not fail');
            });
        }

        for(var i = 0; i < jobs.length; i++) {
            enqueueJob(i);
        }

        queue.on('end', function() {
            queue.shutdown();
            test.equal(jobs.length, doneJobs.length, 'all jobs should have finished');
            test.done();
        });
    },
    "test failing job": function(test) {
        test.expect(3);
        var queue = new Scheduler({workers: 1});
        var job = queue.push(path.join(__dirname, 'jobs/errorjob.js'), {});
        job.on('success', function(sum) {
            test.fail('done should not be emited when the job fails');
        });
        job.on('error', function(err) {
            test.ok(err.message.indexOf('fail!') !== -1, 'error message from worker should be copied to exception on master');
            test.ok(err.stack.indexOf('errorjob.js') !== -1, 'error stack from worker should be copied to exception on master');
            test.ok('error job should fail');
        });
        queue.on('end', function() {
            queue.shutdown();
            test.done();
        });
    },
    "test logging from a job": function(test) {
        test.expect(2);
        var queue = new Scheduler({workers: 1});
        var job = queue.push(path.join(__dirname, 'jobs/logjob.js'), {});
        job.on('log', function(level, msg) {
            test.equal('info', level, 'the log level that was logged from the job should be emited here');
            test.equal('hello world', msg, 'the exact message that was logged from the job should be emited here');
        });
        job.on('error', function(err) {
            test.fail('job should not fail');
        });
        queue.on('end', function() {
            queue.shutdown();
            test.done();
        });
    },
    "test not returning a result from a job": function(test) {
        test.expect(1);
        var queue = new Scheduler({workers: 1});
        var job = queue.push(path.join(__dirname, 'jobs/noresultjob.js'), {});
        job.on('success', function(result) {
            test.equal(typeof result , 'undefined', 'result should be undefined');
        });
        job.on('error', function(err) {
            test.fail('job should not fail');
        });
        queue.on('end', function() {
            queue.shutdown();
            test.done();
        });
    }
});


