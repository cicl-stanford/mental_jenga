/*
    most visualization functions are here, for use in the interfaces
*/

// container variables for objects
stage = undefined;
actors = []; // instances of Bitmap (from IvanK)
extras = [];

// control variables for visualization
var animate_threshold_count = 0;
var intNoiseVel = null;
var intLimit = 15;
var intToggle = false;
var sleepToggle = false;

var animate_time = 3000;

var visualize = true;
var animating = false;
var clipNumber = 0;

var selecting = false;
var moving = false;
var clickedBrick = undefined;
var movingBrick = null;
var toggleAngle = true;

var load_lock = false;

var recorder;


// the actual instance of BrickWorld we will be using
var bw = undefined;


// what happens when you just press 'animate' on the debug screen
function animateRandom(special=0) {
    bw = new BrickWorld(true);
    bw.loadData([],special)
    beginVis();
}

// loads a clip
function loadClip(type, id, special, noise=null) {
    var id_split = id.split(',');
    // change location of data later
    var exp = id_split[0];
    var trial = id_split[1]
    var special2 = null;
    if (exp == 3) {
        var key_path = 'data/exp3_key.json'
        $.ajax({
            url: key_path,
            async: false,
            dataType: 'json',
            success: function(js_data) {
                data = js_data[trial - 1]
                if (data['stimulus'] != trial) {
                    console.log('something is wrong with the key', data['stimulus'], trial)
                }
                // turns out filenames are actually labeled correctly
                // trial = data['tower']
                console.log('trial data', data)
                special = data['a']
                special2 = data['b']
            }
        })
    }

    var clip_path = 'data/exp' + exp + '/' + trial + '.json';
    console.log('loading data from:', clip_path)
    $.ajax({
        url: clip_path,
        dataType: 'json',
        success: function(data) {
            if (load_lock) {
                return;
            }
            special = defaultFor(special, 0)
            bw = new BrickWorld(true);
            // we used a friction value of 1 for exp 1
            if (exp == 1) {
                bw.table_friction = 1
            }

            if (type === 'load') {
                // load for 0 timesteps usually
                bw.loadData(data, special, special2, 0);
                selecting = true;
            } else if (type === 'animate') {
                bw.loadData(data, special, special2, 0);
                beginVis();
            } else if (type === 'play') {
                bw.loadData(data, special, special2, 0);
                special = defaultFor(special, 0)
                load_lock = true;
                setTimeout(function() {
                    load_lock = false;
                    beginVis();
                }, 800)
            } else if (type === 'remove') {
                // load for 10 timesteps to let contacts settle, then remove
                bw.loadData(data, special, special2);
                special = defaultFor(special, 0)
                load_lock = true;
                if (noise === null) {throw "Cannot load and remove clip; noise parameters not defined"}
                setTimeout(function() {
                    bw.removeBrick(noise[0], noise[1], special);
                    load_lock = false;
                    beginVis();
                }, 800)
            }
        },
        error: function(XMLHttpRequest, textStatus, errorThrown) { 
            console.log("loading failed:",id);
        }     
    });
}


// start and end visualization
function beginVis() {
    if (visualize && !animating) {
        timer = 0;
        animating = true;
        selecting = false;
        animate_threshold_count = 0;
        stage.addEventListener(Event.ENTER_FRAME, animate);
    }
}

function endVis() {
    if (visualize && animating) {
        animating = false;
        stage.removeEventListener(Event.ENTER_FRAME, animate);
    }
}

// animation loop, called over and over again via beginVis/endVis listeners
function animate() {

    // logging brick details
    if (timer % 500 === 0) {
        console.log(timer,bw.bricks_array)
    }

    // stop animating after a threshold
    if ((timer >= animate_time || animate_threshold_count > 10000) && !moving) {
        console.log('animation stopped', timer, bw.getGoodBricks().length)
        endVis();
        return;
    }
    
    bw.world.Step(1 / 60, 5, 5);
    bw.world.ClearForces();

    if (timer % 100 == 0) {
        bw.setAsleepTimer(timer)
    }

    // bw.sleepStationaryBricks();
    bw.destroyDeadBricks();
    updateActors();
    timer++;
}

// update the visuals in the canvas
function updateActors() {
    for (var i = 0; i < actors.length; i++) {
        var body = bw.bodies[i];
        var actor = actors[i];
        var p = body.GetPosition();
        actor.x = p.x * RATIO * scale;
        actor.y = p.y * RATIO * scale;
        actor.rotation = body.GetAngle() * 180 / Math.PI;
    }
}
