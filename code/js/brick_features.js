var tools = require('./brick_tools')
var data_source = require('./data_source')
var jsonfile = require('jsonfile')
var fs = require('fs')

/*

run this like:
node brick_features.js [scene|black|other] [1|2|3]

create a 'features/' folder beforehand to avoid errors!
*/

var option = process.argv[2]
var exp = process.argv[3]

var trials = data_source.exp[exp];

// store results into features folder
var feats_folder = './features'
if (!fs.existsSync(feats_folder)){
    fs.mkdirSync(feats_folder);
}

if (exp == 3) {
    var key = jsonfile.readFileSync('../../data/exp3_key.json')
}

if (option === 'scene' || option === 'all') {
    var file = './features/scene_exp'+exp+'.json';
    var feats = {}
    for (var i = 1; i <= Object.keys(trials).length; i++) {
        var id = 'trial_'+i
        feats[id] = tools.getSceneFeatures(trials[id]);
    }
    jsonfile.writeFileSync(file, feats, options={'spaces':2}, function (err) {
        console.error(err)
    })
}

if (option === 'black' || option === 'all') {
    if (exp == 4) {
        for (var i = 1; i <= Object.keys(trials).length; i++) {
            var feats = {}
            var id = 'trial_'+i
            for (var j = 0; j < trials[id].length; j++) {
                feats[j] = tools.getBlackFeatures(trials[id], 4, j)
            }
            var file = './features/exp4/black_exp4_'+i+'.json';
            jsonfile.writeFileSync(file, feats, options={'spaces':2}, function (err) {
                console.error(err)
            })
        }
        
    } else {
        var feats = {}
        for (var i = 1; i <= Object.keys(trials).length; i++) {
            var id = 'trial_'+i
            if (exp == 3) {
                feats[id] = tools.getBlackFeatures(trials[id], 3, key[i-1])
            } else {
                feats[id] = tools.getBlackFeatures(trials[id], exp)
            }
        }
        var file = './features/black_exp'+exp+'.json';
        jsonfile.writeFileSync(file, feats, options={'spaces':2}, function (err) {
            console.error(err)
        })
    }
}

if (option === 'other' || option === 'all') {
    var feats = {}
    for (var i = 1; i <= Object.keys(trials).length; i++) {
        var id = 'trial_'+i
        if (exp == 3) {
            feats[id] = tools.getOtherFeatures(trials[id], 3, key[i-1])
        } else {
            feats[id] = tools.getOtherFeatures(trials[id], exp)
        }
        
    }
    var file = './features/other_exp'+exp+'.json';
    jsonfile.writeFileSync(file, feats, options={'spaces':2}, function (err) {
        console.error(err)
    })
}
