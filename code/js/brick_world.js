/*
main file for simulating brick worlds

configured to use both with interfaces (as javascript in html) or by requiring with node

*/


var WINDOW_ON = false;
var FIG_PATH = '../../figures/sprites/'
var RATIO = 1;
try {
    var Box2D = require('box2dweb');
    var jsonfile = require('jsonfile');
} catch (ReferenceError) {
    console.log('box2dweb and jsonfile modules not defined, so they should be defined via js imports.')
    RATIO = window.devicePixelRatio;
    WINDOW_ON = true;
    console.log('RATIO:', RATIO)
}

//box2d variables             
var b2Vec2 = Box2D.Common.Math.b2Vec2;
var b2Mat22 = Box2D.Common.Math.b2Mat22;
var b2BodyDef = Box2D.Dynamics.b2BodyDef;
var b2Body = Box2D.Dynamics.b2Body;
var b2FixtureDef = Box2D.Dynamics.b2FixtureDef;
var b2World = Box2D.Dynamics.b2World;
var b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape;
var b2WorldManifold = Box2D.Collision.b2WorldManifold;
var b2ContactListener = Box2D.Dynamics.b2ContactListener;
var b2Transform = Box2D.Common.Math.b2Transform;

var BRICK_SPECIAL_DEFAULT = 0;
var SETTLE_TIME_DEFAULT = 700;
var GRAVITY_DEFAULT = 10;

var BRICK_NUM_DEFAULT = 20;

var scale = 100;
var fullX = 8;
var fullY = 6;
var centerX = fullX / 2;
var centerY = fullY / 2;


// brick variables
var brick_fname = 'brick_border'
var brick_density = 10;
var brick_friction = .6;
// brick_friction is .6 consistently throughout all experiments
var brick_restitution = 0.2;
// actual brick height/width are 2x, but SetAsBox uses 'half-width/height'
brick_height = 0.2
brick_width = 0.4

// no point remaking this every time we create a new brick
var brickFixDef = new b2FixtureDef;
brickFixDef.density = brick_density; // Set the density
brickFixDef.friction = brick_friction; // Set the friction
brickFixDef.restitution = brick_restitution; // Set the restitution - bounciness
brickFixDef.shape = new b2PolygonShape;
// uses 'half-height' and 'half-width'
brickFixDef.shape.SetAsBox(brick_width, brick_height);

//table variables
var table_exists = true;
var table_density = 10;
var table_friction = .6;
// table_friction is 1 for exp 1
var table_restitution = 0.2;

//noise variables (default)
var noise_type = 'none';
var noise_level = 0;

class BrickWorld {
    // only parameter necessary is to determine whether visualization is necessary
    constructor(vis=false) {
        this.bricks_array = [];
        this.bricks_array_set = new Set();
        this.world = undefined;
        
        this.visualize = vis
        this.settle_time = SETTLE_TIME_DEFAULT;
        this.gravity = GRAVITY_DEFAULT;
        this.special = BRICK_SPECIAL_DEFAULT;

        // for the white brick for visualization
        this.special2 = undefined;

        // so we can change the table friction as necessary
        this.table_friction = table_friction;

        this.bodies = []; // instances of b2Body (from Box2D)
        if (this.visualize) {
            actors = []; // instances of Bitmap (from IvanK)
            extras = [];
        }
    }

    //sets up the world by creating the stage if it doesn't exist, table, ground, etc.
    setupWorld() {
        this.clearAll();
        // world = new b2World(new b2Vec2(0, gravity), false); //gravity in Y direction
        this.world = new b2World(new b2Vec2(0, this.gravity), false); //gravity in Y direction
        if (this.visualize) {
            if (stage === undefined) {
                stage = new Stage("c");
            }
            var bg = new Bitmap(new BitmapData(FIG_PATH + "wallpaper.png"));
            bg.scaleX = bg.scaleY = scale;
            stage.addChild(bg);
            extras.push(bg);
        }

        //ground
        this.createBox(centerX, 0.1, centerX, fullY - 0.1, 0, b2Body.b2_staticBody, 10, 1, 0, 'ground', 'ground.png');

        if (table_exists) {
            //table
            this.createBox(0.1, 0.4, centerX - 1, fullY - 0.4 - 0.2, 0, b2Body.b2_staticBody, table_density, this.table_friction, table_restitution, "left_leg", "table_leg.png");
            this.createBox(0.1, 0.4, centerX + 1, fullY - 0.4 - 0.2, 0, b2Body.b2_staticBody, table_density, this.table_friction, table_restitution, "right_leg", "table_leg.png");
            this.createBox(1.5, 0.1, centerX, fullY - 0.1 - 0.80 - 0.18, 0, b2Body.b2_staticBody, table_density, this.table_friction, table_restitution, "table", "table_top.png");
        }
        this.settle(100);
    }

    // set up a new world and generate a bunch of bricks depending on conditions
    // data argument controls whether these are controlled or random. [] means random
    generateBrickPositions(data) {
        this.setupWorld();
        //data = defaultFor(data, this.data)
        // special = parseInt(defaultFor(special, brick_special));
        this.bricks_array = [];
        //check how many bricks to actually initialize with
        if (data.length !== 0) {
            for (var i = 0; i < data.length; i++) {
                var brick_x = data[i].x;
                var brick_y = data[i].y;
                var brick_angle = data[i].angle;
                var brick_name = data[i].name;
                var image = brick_fname;
                if (i == this.special) {
                    var image = brick_fname + '_special.png'
                } else if (i == this.special2) {
                    var image = brick_fname + '_white.png'
                } else {
                    var image = brick_fname + '.png'
                }
                this.bricks_array.push(
                    this.createBox(brick_width, brick_height, brick_x, brick_y, brick_angle, b2Body.b2_dynamicBody, brick_density, brick_friction, brick_restitution, brick_name, image, brickFixDef)
                );
            }
        } else if (this.visualize) {
            for (var i = 0; i < BRICK_NUM_DEFAULT; i++) {
                //x and y positions of the bricks 
                var brick_x = centerX + Math.random() - 0.5; //randomly place in the center
                //height is FROM THE TOP
                var maxNum = 4; //maximum height
                var minNum = 2; //minimum height
                var brick_y = (i == this.special) ? 3.5 : Math.random() * (maxNum - minNum) + minNum;
                var brick_angle = Math.random() * Math.PI;
                var brick_name = 'brick_'+i;
                var image = (i == this.special) ? brick_fname + "_special.png" : brick_fname + ".png";
                this.bricks_array.push(
                    this.createBox(brick_width, brick_height, brick_x, brick_y, brick_angle, b2Body.b2_dynamicBody, brick_density, brick_friction, brick_restitution, brick_name, image, brickFixDef)
                );
            }
        } else {
            throw "You shouldn't be loading an empty data array if you're not on visualization mode."
        }
        this.bricks_array_set = new Set(this.bricks_array);
    }

    // wipe all the variables and the world
    clearAll() {
        if (this.visualize && stage !== undefined) {
            for (var i = 0; i < extras.length; i++) {
                stage.removeChild(extras[i]);
            }
            endVis();
            this.bodies = [];
            if (this.visualize) {
                actors = [];
                extras = [];
            }
        }
        for (var i = 0; i < this.bricks_array.length; i++) {
            this.destroyBrick(this.bricks_array[i])
        }
        this.world = undefined;
        this.bricks_array = [];
    }

    //allow bricks to settle, without animation
    settle(steps, nosleep=null) {
        var numSteps = defaultFor(steps, this.settle_time)
        for (var j = 0; j < numSteps; j++) {
            this.world.Step(1 / 60, 15, 5);
            this.world.ClearForces();
            if (nosleep == null) {
                this.sleepStationaryBricks();
            }
            this.destroyDeadBricks();
            if (WINDOW_ON) {
                console.log('step')
            }
        }
        if (this.visualize) {
            updateActors();
        }
    }

    //create a general box of given parameters
    createBox(width, height, x, y, angle, type, density, friction, restitution, data, img, fixDef=null) {
        // Create the fixture definition if it doesn't exist (i.e. for the bricks)
        if (fixDef === null) {
            var fixDef = new b2FixtureDef;
            fixDef.density = density; // Set the density
            fixDef.friction = friction; // Set the friction
            fixDef.restitution = restitution; // Set the restitution - bounciness
            fixDef.shape = new b2PolygonShape;
            fixDef.shape.SetAsBox(width, height);
        }
        

        // Create the body definition
        var bodyDef = new b2BodyDef;
        bodyDef.type = type;
        bodyDef.position.x = x;
        bodyDef.position.y = y;
        bodyDef.angle = angle;
        bodyDef.linearDamping = 1;

        // Create the body in the box2d world
        var b = this.world.CreateBody(bodyDef);
        b.CreateFixture(fixDef);
        b.SetUserData(data);

        if (this.visualize) {
            this.bodies.push(b);
            var bd = new BitmapData(FIG_PATH + img);
            var bm = new Bitmap(bd);
            bm.x = -width*scale;
            bm.y = -height*scale;
            var actor  = new Sprite();
            actor.scaleX = RATIO+.05;
            actor.scaleY = RATIO+.05;
            if (type === b2Body.b2_dynamicBody) {
                bm.addEventListener(MouseEvent.MOUSE_DOWN, selectBrick);
                bm.obj_id = data.slice(6);
                // bm.addEventListener(MouseEvent.MOUSE_DOWN, holdBrick);
                // bm.addEventListener(MouseEvent.MOUSE_UP, releaseBrick);
            }
            actor.addChild(bm);
            stage.addChild(actor);
            actors.push(actor);
        }
        return b;
    }

    // move the brick to the corner (-5, -5) and destroy the body in the world
    destroyBrick(brick) {
        brick.SetPosition(new b2Vec2(-5, -5));
        brick.SetLinearVelocity(new b2Vec2(0, 0));
        brick.SetAngularVelocity(0);
        brick.SetActive(false);
        this.world.DestroyBody(brick)
    }

    //get rid of bricks that have fallen below the table
    destroyDeadBricks() {
        if (!table_exists) {
            return;
        }
        var bricksToRemove = [];
        for (let brick of this.bricks_array_set) {
            if (brick.GetPosition().y > 5) {
                bricksToRemove.push(brick)
            }
        }
        for (let brick of bricksToRemove) {
            if (WINDOW_ON) {
                console.log(brick.GetUserData(), 'destroyed!')
            }
            this.bricks_array_set.delete(brick);
            this.destroyBrick(brick);
        }
    }

    // puts bricks that are basically stationary to sleep
    sleepStationaryBricks() {
        // return
        for (let brick of this.bricks_array_set) {
            if (brick.IsAwake() && getId(brick) != this.special) {
                var vel = brick.GetLinearVelocity().Length()
                var angvel = brick.GetAngularVelocity()
                if (vel < .000005 && angvel < .000005) {
                    brick.SetAwake(false)
                }
            }
        }
    }

    //converts current array of bricks into JSON
    pushData() {
        var arr = [];
        this.bricks_array.forEach(function (brick) {
            arr.push({
                "name": brick.GetUserData(),
                "x": brick.GetPosition().x,
                "y": brick.GetPosition().y,
                "angle": brick.GetAngle()
            });
        })
        return arr;
    }

    //gets bricks still on the table
    getGoodBricks() {
        this.destroyDeadBricks();
        var goodBricks = this.bricks_array.filter(function(b) {
            return b.IsActive();
        })
        return goodBricks;
    }

    //remove a brick with given noise parameters
    removeBrick(type, level, id) {
        if (type == 'hsm') {
            type = 'perceptual,intervention,dynamics'
        }

        id = defaultFor(parseInt(id), -1)
        if (id == -1) {
            id = Math.max(0, this.special);
            // console.log('Brick -1 specified; brick '+id+' will be used instead.')
        }
        // console.log('Removing brick '+id+' with '+type+' noise. Params: '+level)
        var theBrick = this.bricks_array[id];

        var types = type.split(',')
        var levels = level.toString().split(',')
        console.assert(types.length == levels.length)
        if (WINDOW_ON) {
            console.log('types', types)
            console.log('levels', levels)
        }

        var extendedBricks = this.getContacts('extended', theBrick);
        var localBricks = this.getContacts('local', theBrick);

        var ids = [];
        for (var j = 0; j < extendedBricks.length; j++) {
            ids.push(getId(extendedBricks[j]))
        }
        // console.log(ids)

        this.interventionVel = undefined;
        this.doSleepAbove = false;
        this.doSleepLocal = false;

        for (var j = 0; j < types.length; j++) {
            this.applyNoise(types[j], parseFloat(levels[j]), theBrick, extendedBricks);
        }

        if (this.interventionVel == undefined) {
            // no intervention noise, so destroy the brick
            this.destroyBrick(theBrick);
            // theBrick.SetPosition(new b2Vec2(-5, -5));
            if (this.visualize && clickedBrick !== undefined) {
                stage.removeChild(clickedBrick);
                clickedBrick = undefined;
            }
        } else {
            // there is intervention noise, so make it go a bit
            if (this.visualize) {
                intTimer = 0;
                intVel = this.interventionVel;
            } else {
                for (var i = 0; i < 15; i++) {
                    this.settle(1);
                    theBrick.SetLinearVelocity(this.interventionVel)
                }
                this.destroyBrick(theBrick);
            }
        }
        
        if (this.doSleepAbove) {
            var goodBricks = this.getGoodBricks();
            goodBricks.forEach(function(b) {
                if (extendedBricks.indexOf(b) < 0) {
                    b.SetAwake(false)
                }
            })
            this.doSleepAbove = false
        } else if (this.doSleepLocal) {
            var goodBricks = this.getGoodBricks();
            goodBricks.forEach(function(b) {
                if (localBricks.indexOf(b) < 0 && extendedBricks.indexOf(b) < 0) {
                    // console.log(b.GetUserData())
                    b.SetAwake(false)
                }
            })
            this.doSleepLocal = false
        }
    }

    // apply a certain type of noise at a certain level to a particular brick (Body)
    applyNoise(type, level, theBrick, contactList) {
        if (level == 0) {
            return;
        }
        // gaussian noise unless gamma noise
        var rand_gauss = gaussian_gen(0, level);
        var rand_gamma = gamma_gen(level, 1);

        var goodBricks = this.getGoodBricks();
        var subtypes = type.split("-")

        if (subtypes.indexOf("perceptual") >= 0) {
            // normally you just do this
            goodBricks.forEach(brick => {
                if (brick == theBrick) {
                    return
                }
                if (subtypes.indexOf("slocal") >= 0) {
                    this.doSleepLocal = true
                } else {
                    this.doSleepAbove = true
                }
                var p = brick.GetPosition();
                // var x_mag = .01 * rand_gauss()
                var x_mag = .03 * rand_gauss()
                brick.SetPosition(new b2Vec2(
                    p.x + x_mag,
                    p.y
                ))
                brick.SetAwake(true)
            })
            // this.settle(10)

        } else if (subtypes.indexOf("impulse") >= 0) {
            // impulse family
            var y_vertical = Math.abs(rand_gauss())
            var aligned = subtypes.indexOf("aligned") >= 0
            var t_vel = 0
            if (aligned) {
                t_vel = Math.PI / 2 * Math.random() + Math.PI / 4;
            }
            contactList.forEach(function(brick) {
                var r_vel = -3*rand_gamma();
                if (aligned == false) {
                    t_vel = Math.PI / 2 * Math.random() + Math.PI / 4;
                }
                var x = r_vel * Math.cos(t_vel)
                var y = r_vel * Math.sin(t_vel)
                brick.ApplyImpulse(new b2Vec2(x,y),brick.GetPosition())
            })
        } else if (subtypes.indexOf("dynamics") >= 0) {
            var nl = new CollisionListener(level, getId(theBrick), "angular");
            this.world.SetContactListener(nl)
        }
    }

    // getting list of contacts for use in local noise models
    getContacts(type, brick) {
        var contact_list = [brick];
        var edge = brick.GetContactList();
        if (type === 'local') {
            // just the local contacts
            while (true) {
                if (edge === null) {break;}
                // the other body is a dynamic body; i.e. another brick
                if (edge.other.GetType() == 2) {
                    contact_list.push(edge.other)
                }
                edge = edge.next
            }
        } else if (type.startsWith('above')) {
            // the contacts that are local and above
            while (true) {
                if (edge == null) {break;}
                var wm = new b2WorldManifold();
                edge.contact.GetWorldManifold(wm)
                // console.log(brick.GetUserData(), edge.other.GetUserData(), edge, wm.m_normal)
                var pts = wm.m_points
                var xsum = 0;
                var ysum = 0;
                var nonzeronum = 0;
                for (var i = 0; i < 2; i++) {
                    // check whether the contact is actually legit
                    if (pts[i].x !== 0 || pts[i].y !== 0) {
                        xsum += pts[i].x
                        ysum += pts[i].y
                        nonzeronum++;
                    }
                }
                // console.log(pts[0], pts[1], edge.other.GetType())
                if (nonzeronum !== 0 && edge.other.GetType() === 2) {
                    if (type == 'above_center1') {
                       var yval = ysum / nonzeronum;
                       // center of mass of second brick is above that of first brick
                       // contact point is above that of first brick
                       if (yval < brick.GetPosition().y - 0.05 && brick.GetPosition().y > edge.other.GetPosition().y) {
                           contact_list.push(edge.other)
                       } 
                    } else if (type == 'above_center2') {
                        // center of mass of second brick is above that of first brick
                        if (brick.GetPosition().y > edge.other.GetPosition().y) {
                            contact_list.push(edge.other)
                        }
                    } else if (type == 'above_local') {
                        // second brick is above first brick in local area around contact point
                        var xval = xsum / nonzeronum;
                        var yval = ysum / nonzeronum;
                        // get the points slightly above and below contact point
                        var point_plus = new b2Vec2(xval, yval - 0.01)
                        var point_minus = new b2Vec2(xval, yval + 0.01)
                        // check if they are contained in the respective bricks
                        var brick_a = brick.GetFixtureList().TestPoint(point_minus)
                        var brick_b = edge.other.GetFixtureList().TestPoint(point_plus)
                        if (brick_a || brick_b) {
                            contact_list.push(edge.other)
                        }
                    }
                    
                }
                edge = edge.next
            }
        } else if (type === 'extended') {
            // recursive notion of above
            var idx = 0;
            while (idx < contact_list.length) {
                var cur = contact_list[idx];
                // recurse the 'above' definition for all bricks, and use BFS
                var above_list = this.getContacts('above_local',cur);
                above_list.forEach(function(abrick) {
                    var b_idx = contact_list.indexOf(abrick)
                    if (b_idx === -1) {
                        contact_list.push(abrick);
                    }
                })
                idx++;
            }
        } else if (type === 'pile') {
            // all bricks in the pile, which is extended notion of local
            var idx = 0;
            while (idx < contact_list.length) {
                var cur = contact_list[idx];
                // recurse the 'local' definition for all bricks, and use BFS
                var local_list = this.getContacts('local',cur);
                local_list.forEach(function(abrick) {
                    var b_idx = contact_list.indexOf(abrick)
                    if (b_idx === -1) {
                        contact_list.push(abrick);
                    }
                })
                idx++;
            }
        }

        return contact_list;
    }

    // turn the data into a brick world
    loadData(data, special=null, special2=null, settle_time=null) {
        var that = this;
        if (special !== null) {
            this.special = special;
        }
        if (special2 !== null) {
            this.special2 = special2
        }
        this.generateBrickPositions(data);
        this.bricks_array.forEach(function(brick) {
            if (brick.GetPosition().x === -5) {
                that.destroyBrick(brick);
            }
        })
        if (settle_time !== null) {
            this.settle(settle_time)
        } else {
            this.settle(50)
        }
        this.data = data
    }
}

class CollisionListener extends b2ContactListener {
    constructor(level, special, ctype) {
        super();
        this.gauss = gaussian_gen(0, level);
        this.special = special
        this.ctype = ctype
    }
    BeginContact(contact) {
        var a = contact.GetFixtureA().GetBody();
        var b = contact.GetFixtureB().GetBody();
        var bodies = [a,b]

        for (var i=0; i<2; i++) {
            // don't apply noise to the removed brick
            if (getId(bodies[i]) == this.special) {
                continue
            }
            var d = bodies[i].GetLinearVelocity()
            var L = d.Length()
            // only apply noise if sufficient amount of motion
            if (L < 0.5) {
                continue
            }

            if (this.ctype == 'original') {
                // multiply amplitude of noise by this amount, capped by .5 and 1.5
                var amp = 1 + Math.max(Math.min(this.gauss() / 25, .5), -.5)
                
                // change angle of current velocity by theta
                var theta = this.gauss() / 25
                // create rotation matrix, apply rotation + amplification
                var m_rotate = b2Mat22.FromAngle(theta)
                d.MulM(m_rotate)
                d.Multiply(amp)
            } else if (this.ctype == 'mul') {
                // multiply amplitude of noise by this amount, capped by .5 and 1.5
                var amp = 1 + this.gauss() / 25
                d.Multiply(amp)
            } else if (this.ctype == 'add') {
                var dx = this.gauss() / 25
                var dy = this.gauss() / 25
                d.Add(new b2Vec2(dx, dy))
            } else if (this.ctype == 'angular') {
                // change angle of current velocity by theta
                // further divide by 2 to keep range within 1 to 10
                // var theta = this.gauss() / 20 / 2
                var theta = this.gauss() / 10
                // console.log(theta, bodies[i].GetAngle())
                // create rotation matrix, apply rotation + amplification
                var m_rotate = b2Mat22.FromAngle(theta)
                d.MulM(m_rotate)
            }

           
            bodies[i].SetLinearVelocity(d)
        }
    }
    EndContact(contact) {}
    PreSolve(contact, manifold) {}
    PostSolve(contact, impulse) {}
}

/*

HELPER FUNCTIONS *********************************************

*/

function getId(body) {
    return parseInt(body.GetUserData().slice(6))
}

//gives default value for a variable
function defaultFor(arg, val) {
    return typeof arg !== 'undefined' ? arg : val;
}

function dist(a, b) {
    dx = (a[0] - b[0])
    dy = a[1] - b[1]
    return Math.sqrt(dx * dx + dy * dy)
}

// returns a gaussian random function with the given mean and stdev.
function gaussian_gen(mean, stdev) {
    var y2;
    var use_last = false;
    return function() {
        var y1;
        if(use_last) {
           y1 = y2;
           use_last = false;
        }
        else {
            var x1, x2, w;
            do {
                 x1 = 2.0 * Math.random() - 1.0;
                 x2 = 2.0 * Math.random() - 1.0;
                 w  = x1 * x1 + x2 * x2;               
            } while( w >= 1.0);
            w = Math.sqrt((-2.0 * Math.log(w))/w);
            y1 = x1 * w;
            y2 = x2 * w;
            use_last = true;
       }
       return retval = mean + stdev * y1;
    }
}


// https://github.com/distributions-io/gamma-random/blob/master/lib/number.js
function gamma_gen( alpha, beta ) {
    var c, d,
        x,
        u, v;
    d = alpha - 1/3;
    c = 1 / Math.sqrt( 9 * d );
    return function() {
        while ( true ) {
            do {
                a = gaussian_gen(0,1)
                x = a();
                v = 1 + c * x;
            } while( v <= 0 );
            v = v*v*v;
            u = Math.random();
            if ( u < 1 - 0.331 * (x*x) * (x*x) ) {
                return (1/beta) * d * v;
            }
            if ( Math.log( u ) < 0.5*x*x + d * ( 1 - v + Math.log( v ) ) ) {
                return (1/beta) * d * v;
            }
        }
    }
}

// https://stackoverflow.com/questions/9043805/test-if-two-lines-intersect-javascript-function
// returns true iff the line from (a,b)->(c,d) intersects with (p,q)->(r,s)
function intersects(a,b,c,d,p,q,r,s) {
  var det, gamma, lambda;
  det = (c - a) * (s - q) - (r - p) * (d - b);
  if (det === 0) {
    return false;
  } else {
    lambda = ((s - q) * (r - a) + (p - r) * (s - b)) / det;
    gamma = ((b - d) * (r - a) + (c - a) * (s - b)) / det;
    return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
  }
};


if (!WINDOW_ON) {
    module.exports = {
        BrickWorld: BrickWorld
    }
}