var brick_tools = require('./brick_tools')
var source = require('./data_source')
var jsonfile = require('jsonfile')
var path = require('path')
var fs = require('fs')
var assert = require('assert');

/*
gets the noise for all the trials in the data source at a single noise point

run this like:
node simulate.js 1 torque-local-above 1.5 100
node simulate.js 2 dx-local 1.2 50

*/

var trials;

var exp = process.argv[2] // which experiment
var type = process.argv[3] // what type of noise you're using
var level = process.argv[4] // parameter(s) of the noise you're using
var num = process.argv[5] // how many trials you want to do

if (process.argv.length >= 7) {
    var trial_id = process.argv[6]
} else {
    var trial_id = 0
}

// need key in order to get the correct brick to remove in exp 3
if (exp == 3) {
    //var key = jsonfile.readFileSync('./data/exp3_key.json')
    var key = source.exp[3.1]
}
// gets the data for the experiment you're simulating
trials = source.exp[parseInt(exp)]

// store results into simulations folder
var sim_folder = './ss' + exp
if (!fs.existsSync(sim_folder)){
    fs.mkdirSync(sim_folder);
}

if (exp == 4) {
    for (var i = 1; i <= Object.keys(trials).length; i++) {
        var file = path.join(sim_folder, type + '_' + level + '_' + i + '.json')
        // var start = new Date()
        trial_name = 'trial_' + i
        var noise_list = brick_tools.getAllNoiseResults('fall-ids', trials[trial_name], type, level, num);
        // var end = new Date()
        console.log(exp, type, level, num, i)
        // console.log('average time per trial:', (end - start) / 42 / num)
        // console.log(noise_list[0])
        jsonfile.writeFileSync(file, noise_list, {spaces:0},'utf8', function(err){console.log(err)})
    }
    
} else {
    var file = path.join(sim_folder, type + '_' + level + '.json')

    var start = new Date()
    var noise_list = {}

    // actually run the simulation and store it in the file
    // start at 1 so i is equal to the trial id
    for (var i = 1; i <= Object.keys(trials).length; i++) {
        if (trial_id != 0 && trial_id != i) {
            continue;
        }
        trial_name = 'trial_' + i
        // special brick defaults to 0 unless we're in experiment 3
        var special = 0
        if (exp == 3) {
            // indexing into the actual json list, so list id is 1 less than i
            assert(key[i-1].stimulus == i)
            special = key[i-1].a
        }
        if (exp == 4) {
            noise_list[trial_name] = brick_tools.getAllNoiseResults('fall-ids', trials[trial_name], type, level, num);
        } else {
            noise_list[trial_name] = brick_tools.getNoiseResults('fall-ids', trials[trial_name], type, level, special, num, exp);
        }
    }
    var end = new Date()
    console.log(exp, type, level, num)
    console.log('average time per trial:', (end - start) / 42 / num)

    jsonfile.writeFile(file, noise_list, {spaces:0},'utf8', function(err){console.log(err)})
}


