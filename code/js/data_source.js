/*

import this in node to get the data used in the experiments:
var exp = require('./data_source')

structured with three experiments (corresponding to the paper, not the psiturk ones:

exp[1] for experiment 1, etc.

each exp contains a dictionary in form `trial_X: json object of trial number X` in that experiment

example usage: exp[2]["trial_12"]

*/

var fs = require('fs');
var path = require('path');
var jsonfile = require('jsonfile')

var data_path = '../../data/'

var exp = {
    1:{},
    2:{},
    3:{},
    3.1:{},
    4:{}
}

for (var i=1;i<5;i++) {
    var exp_path = path.join(data_path, 'exp'+i.toString())
    var files = fs.readdirSync(exp_path)
    files.forEach(function(f) {
        if (f.endsWith('.json') && f.indexOf('_') == -1) {
            var dt = jsonfile.readFileSync(path.join(exp_path,f))
            exp[i]['trial_'+f.slice(0, -5)] = dt;
        }
    })
}


var exp3_key = jsonfile.readFileSync(path.join(data_path, 'exp3_key.json'))
exp[3.1] = exp3_key


module.exports = {
    exp: exp
}