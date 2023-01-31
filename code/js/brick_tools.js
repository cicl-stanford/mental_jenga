/*

functions that simulate stuff inside of a brick world.
useful for simulations and resulting data collection/analysis.

configured to use both with interfaces (as javascript in html) or by requiring with node

*/


try {
    var Box2D = require('box2dweb');
    var jsonfile = require('jsonfile');
    var assert = require('assert')
    var brick_world = require('./brick_world');
    var seedrandom = require('seedrandom')

    BrickWorld = brick_world.BrickWorld;
} catch (ReferenceError) {
    console.log('WARNING: brick world not found.')
}

//SAMPLING AND SAVING A LOT OF DATA
function sample(num, reps) {
    var table = {};
    for (var i = 0; i < num; i++) {
        var dt = simulate(reps);
        table[dt[0]] = dt[1];
    }
    var table_json = JSON.stringify(table);
    var now = Date.now().toString().slice(5);
    jsonfile.writeFile('table_'+now+'.json', table_json, function (err){});
}

function getAllNoiseResults(type, data, noiseType, noiseLevel, numSamples) {
    var nlists = {}
    for (var i =0; i < data.length; i++) {
        var nlist = getNoiseResults(type, data, noiseType, noiseLevel, i, numSamples, 4)
        nlists[i] = nlist
    }
    return nlists;
}

// simulates how many bricks are left on the table after given noise parameters
function getNoiseResults(type, data, noiseType, noiseLevel, special, numSamples, exp) {
    // setting seed so everything is replicable
    seedrandom(0, { global: true })
    var noise_list = [];
    bw = new BrickWorld(false)
    // experiment 1 conducted with table friction == 1
    if (exp == 1) {
        bw.table_friction = 1
    }
    for (var i = 0; i < numSamples; i++) {
        bw.loadData(data, special);
        bw.removeBrick(noiseType, noiseLevel, special);
        if (type === 'fall-count') {
            // get number of bricks that fall, returns a list of numbers
            var before = bw.getGoodBricks().length;
            bw.settle();
            var after = bw.getGoodBricks().length;
            noise_list.push(before - after);
        } else if (type === 'final-data') {
            // get positions of all bricks, returns a list of data
            bw.settle();
            noise_list.push(bw.pushData())
        } else if (type === 'fall-ids') {
            // get ids of bricks that fall, returns a list of lists of ids
            var fall_list = []
            var before = bw.getGoodBricks();
            bw.settle();
            before.forEach(function(b) {
                if (!b.IsActive()) {
                    fall_list.push(parseInt(b.GetUserData().slice(6)));
                }
            })
            noise_list.push(fall_list)
        }
    }
    return noise_list;
}

//get mean and variance of a list of data
function getMeanVariance(data) {
    var sum = data.reduce(function(s,d) {
        s += d;
        return s;
    }, 0);
    var mean = sum / data.length
    var sumsq = data.reduce(function(s,d) {
        s += Math.pow(d - mean, 2);
        return s;
    }, 0);
    var variance = sumsq / data.length
    return [mean, variance]
}

/*
get the features for a bunch of data, for scene, black blocks, or other blocks
*/

function getSceneFeatures(data) {
    bw = new BrickWorld(false)
    bw.loadData(data)
    var bricks = bw.bricks_array

    var n_bricks = 0;
    var neg_max_y = 100;
    var total_edge_dist = 0;
    var total_angle_dev = 0;
    var total_x = 0;
    var total_y = 0;

    for (var i = 0; i < bricks.length; i++) {
        var brick = bricks[i]
        var x = brick.GetPosition().x
        if (x < 0) { continue; }
        n_bricks++;
        var y = brick.GetPosition().y
        if (y < neg_max_y) {
            neg_max_y = y
        }
        var dist_left = Math.abs(x - 2.5)
        var dist_right = Math.abs(x - 5.5)
        total_edge_dist += Math.min(dist_left, dist_right)
        var ang = Math.abs(brick.GetAngle() % (Math.PI/2))
        total_angle_dev += Math.min(Math.PI/2 - ang, ang)
        total_x += x
        total_y += y
    }

    var max_y = 6 - 1.18 - neg_max_y
    var avg_edge_dist = total_edge_dist / n_bricks
    var avg_angle_dev = total_angle_dev / n_bricks
    var avg_x = total_x / n_bricks
    var avg_y = 6 - 1.18 - total_y / n_bricks

    var features = {
        'n_bricks': n_bricks - 1, // don't count the special brick
        'max_y': max_y,
        'avg_edge_dist': avg_edge_dist,
        'avg_angle':avg_angle_dev,
        'avg_x':avg_x,
        'avg_y':avg_y
    }
    return features;
}

function getBlackFeatures(data, exp, extra_info) {
    bw = new BrickWorld(false)
    bw.loadData(data)
    var bricks = bw.bricks_array

    if (exp == 1 || exp == 2) {
        var brick = bw.bricks_array[0]
    } else if (exp == 3) {
        assert(extra_info != undefined)
        var brick = bw.bricks_array[extra_info['a']]
    } else if (exp == 4) {
        assert(extra_info != undefined)
        // console.log(data, bricks)
        var brick = bricks[extra_info]
    }

    var x = brick.GetPosition().x
    var y = 6 - 1.18 - brick.GetPosition().y
    var edge_dist = 1.5 - Math.abs(4 - x)
    var angle = Math.abs(brick.GetAngle() % (Math.PI/2))
    var angle_dev = Math.min(angle, Math.PI/2 - angle)
    var n_above = bw.getContacts('extended', brick).length

    var features = {
        'x': x,
        'y': y,
        'edge_dist': edge_dist,
        'angle': angle_dev,
        'above': n_above
    }
    
    return features;
}

function getOtherFeatures(data, exp, exp3_info) {
    bw = new BrickWorld(false)
    bw.loadData(data)
    var bricks = bw.bricks_array

    var features = []

    for (var i = 0; i < bricks.length; i++) {
        if (exp == 3) {
            assert(exp3_info != undefined)
            if (exp3_info['b'] != i) {
                continue;
            }
            var a = exp3_info['a']
        } else {
            var a = 0
        }
        var brick = bricks[i]
        var x = brick.GetPosition().x
        var y = 6 - 1.18 - brick.GetPosition().y
        if (x < 0) { continue; }
        var id = parseInt(brick.GetUserData().slice(6))
        var edge_dist = 1.5 - Math.abs(4 - x)
        var angle = Math.abs(brick.GetAngle() % (Math.PI/2))
        var angle_dev = Math.min(angle, Math.PI/2 - angle)

        var a_x = bricks[a].GetPosition().x
        var a_y = 6 - 1.18 - bricks[a].GetPosition().y

        var dx = x - a_x
        var dy = y - a_y

        var pile = bw.getContacts('pile', brick)
        var black_pile = 0
        for (var j = 0; j < pile.length; j++) {
            pile_brick = pile[j]
            brick_id = parseInt(pile_brick.GetUserData().slice(6))
            if (brick_id == 0) {
                black_pile = 1;
                break;
            }
        }

        features.push({
            'id': id,
            'x': x,
            'y': y,
            'dx': dx,
            'dy': dy,
            'edge_dist': edge_dist,
            'angle': angle_dev,
            'black_pile': black_pile
        })
    }

    return features
}


try {
    module.exports = {
        getNoiseResults: getNoiseResults,
        getAllNoiseResults: getAllNoiseResults,
        getMeanVariance: getMeanVariance,
        sample: sample,
        getSceneFeatures: getSceneFeatures,
        getBlackFeatures: getBlackFeatures,
        getOtherFeatures: getOtherFeatures
    }
} catch (ReferenceError) {console.log('failed to export brick_tools.js')}
