var fs = require('fs'), path = require('path'), util = require('util');

// Globals

var env = process.env;

var debug = false;

var default_t2group = 't2g-graphcrest';
var default_Q = 'S';

var packages;
(function () {
    var cuda_home = '/opt/cuda/4.1';
    var mvapich2 = '/usr/apps/mvapich2/1.8.1';
    packages = {
      cuda41: {
        bin: path.join(cuda_home, 'bin'),
        lib: path.join(cuda_home, 'lib64')
      },
      mvapich2: {
        bin: path.join(mvapich2, 'intel', 'bin'),
        lib: path.join(mvapich2, 'intel', 'lib')
      }
    };
})();

// Utilities

function spawn(command, argv) {
  if (debug) {
    console.log('spawn: ', command, argv);
  }

  var cp = require('child_process').spawn(command, argv);

  cp.stdout.on('data', function (x) { console.log('' + x); });
  cp.stderr.on('data', function (x) { console.error('' + x); });
  cp.on('close', function (code) {
    if (code != 0)
      console.error(command + ' process exited with code: ' + code);
  });
  }

// t2sub part

function submit(spec) {
  var workdir = path.dirname(process.argv[1]);
  spec.RunScript = process.argv[1];
  spec.Jobname = spec.Jobname || path.basename(spec.RunScript);

  var f = function (a) {
    return a.map(function (x) { return (x < 10 ? '0' : '') + x; }).join('');
  };
  var d = new Date();
  spec.jobid = util.format('%s-%s-%s',
    spec.Jobname,
    f([ d.getFullYear(), d.getMonth() + 1, d.getDate() ]),
    f([ d.getHours(), d.getMinutes() ]));

  var runfile_prefix = path.join(workdir, spec.jobid);
  spec.Runconf = runfile_prefix + '.conf';

  var argv = [];

  function arg(/* ... */) {
    for (var i = 0; i < arguments.length; i++) argv.push(arguments[i]);
  }

  arg('-v',
    'T2PBS_RUNCONF=' + spec.Runconf +
    ',NODE_PATH=/work0/t2g-graphcrest/lib/node_modules:.');
  arg('-o', runfile_prefix + '.out');
  arg('-e', runfile_prefix + '.err');
  arg('-N', spec.Jobname);

  (function () {
      var PBS = spec.PBS;
      PBS.argv = argv;
      var Select = PBS.Select, selectors = [ 'select=' + Select.Chunks ];
      for (var k in Select)
        if (k != 'Chunks') selectors.push(k + '=' + Select[k]);
      arg('-l', selectors.join(':'));
      arg('-q', PBS.Q);
      arg('-W', 'group_list=' + PBS.group);
  })();

  arg(spec.RunScript);

  fs.writeFileSync(spec.Runconf, JSON.stringify(spec, null, 2));

  spawn('t2sub', argv);
}

// mpirun part

function mpirun(spec) {
  spec.env = env;

  env.PATH = [
    path.join(packages.cuda41.bin),
    path.join(packages.mvapich2.bin),
    env.PATH ].join(':');

  env.LD_LIBRARY_PATH = [
    path.join(packages.cuda41.lib),
    path.join(packages.mvapich2.lib),
    env.LD_LIBRARY_PATH ].join(':');

  var hosts = fs.readFileSync(env.PBS_NODEFILE, 'ascii').split('\n');
  hosts.pop();

  var MPI = {
    procs: hosts.length,
    hosts: hosts
  };

  MPI.argv = [
    '-n', MPI.procs,
    '-hostfile', env.PBS_NODEFILE,
    spec.Command ];

  spec.MPI = MPI;
  
  fs.writeFileSync(spec.Runconf, JSON.stringify(spec, null, 2));

  spawn('mpirun', MPI.argv);
}

// Main part

function main(spec) {
  if (!env.T2PBS_RUNCONF) {
    if (spec.debug) debug = true;
    var PBS = spec.PBS
    if (!PBS.Q) PBS.Q = default_Q;
    if (!PBS.group) PBS.group = default_t2group;
    submit(spec);
  } else {
    process.chdir(path.dirname(env.T2PBS_RUNCONF));
    spec = JSON.parse(fs.readFileSync(env.T2PBS_RUNCONF, 'ascii'));
    mpirun(spec);
  }
}

module.exports = {
  VERSION: "0.1.0",
  run: main
};
