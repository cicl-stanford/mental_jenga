var WINDOW_ON = false;
var FIG_PATH = 'static/images/'
var RATIO = 1;
try {
	var Box2D = require('box2dweb');
	var jsonfile = require('jsonfile');
} catch (ReferenceError) {
	RATIO = window.devicePixelRatio;
	WINDOW_ON = true;
}

//box2d variables             
var b2Vec2 = Box2D.Common.Math.b2Vec2;
var b2BodyDef = Box2D.Dynamics.b2BodyDef;
var b2Body = Box2D.Dynamics.b2Body;
var b2FixtureDef = Box2D.Dynamics.b2FixtureDef;
var b2World = Box2D.Dynamics.b2World;
var b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape;
var b2WorldManifold = Box2D.Collision.b2WorldManifold;
var b2ContactListener = Box2D.Dynamics.b2ContactListener;

var BRICK_SPECIAL_DEFAULT = 0;
var BRICK_SPECIAL2_DEFAULT = 1;
var SETTLE_TIME_DEFAULT = 1000;
var ANIMATE_TIME_DEFAULT = 3000;
var GRAVITY_DEFAULT = 10;

var BRICK_NUM_DEFAULT = 20;

var scale = 100;
var fullX = 8;
var fullY = 6;
var centerX = fullX / 2;
var centerY = fullY / 2;

//variables 
var brick_density = 10;
var brick_friction = 0.5;
var brick_restitution = 0.2;
var brick_width = 0.4;
var brick_height = 0.2;

var table_density = 0.5;
var table_friction = 0.5;
var table_restitution = 0.2;

var noise_type = 'none';
var noise_level = 0;

//placeholders 
world = undefined;
stage = undefined;
bodies = []; // instances of b2Body (from Box2D)
actors = []; // instances of Bitmap (from IvanK)
extras = [];

//control variables 
var timer = 0;
var animate_time = ANIMATE_TIME_DEFAULT;
var animate_threshold_count = 0;
var interventionTimer = 1000;
bw = undefined;

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


class BrickWorld {
	constructor(vis) {
		this.bricks_array = [];
		this.world = undefined;
		bodies = []; // instances of b2Body (from Box2D)
		actors = []; // instances of Bitmap (from IvanK)

		this.visualize = vis
		this.settle_time = SETTLE_TIME_DEFAULT;
		this.gravity = GRAVITY_DEFAULT;
		this.special = BRICK_SPECIAL_DEFAULT;
		this.special2 = BRICK_SPECIAL2_DEFAULT;
	}

	//sets up the world by creating the stage if it doesn't exist, table, ground, etc.
	setupWorld() {
		this.clearAll();
		// world = new b2World(new b2Vec2(0, gravity), false); //gravity in Y direction
		this.world = new b2World(new b2Vec2(0, this.gravity), true); //gravity in Y direction
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
		this.createBox(
			centerX, 0.1, centerX, fullY - 0.1, 0, b2Body.b2_staticBody, 10, 1, 0, 'ground', 'ground.png');
		//table
		this.createBox(0.1, 0.4, centerX - 1, fullY - 0.4 - 0.2, 0, b2Body.b2_staticBody, table_density, table_friction, table_restitution, "left_leg", "table_leg.png");
		this.createBox(0.1, 0.4, centerX + 1, fullY - 0.4 - 0.2, 0, b2Body.b2_staticBody, table_density, table_friction, table_restitution, "right_leg", "table_leg.png");
		this.createBox(1.5, 0.1, centerX, fullY - 0.1 - 0.80 - 0.18, 0, b2Body.b2_staticBody, table_density, table_friction, table_restitution, "table", "table_top.png");
		this.settle(100);
	}

	generateBrickPositions(data) {
		this.setupWorld();
		//data = defaultFor(data, this.data)
		// special = parseInt(defaultFor(special, brick_special));
		this.bricks_array = [];
		//check how many bricks to actually initialize with
		var bricks_num = (data.length !== 0) ? data.length : BRICK_NUM_DEFAULT;
		for (var i = 0; i < bricks_num; i++) {
			var image = 'brick.png'
			if (i === this.special) {
				image = 'brick_special.png'
			} else if (i === this.special2) {
				image = 'brick_white.png'
			}
			//var image = (i === this.special) ? "brick_special.png" : "brick.png";
			if (data.length !== 0) {
				var brick_x = data[i].x;
				var brick_y = data[i].y;
				var brick_angle = data[i].angle;
				var brick_name = data[i].name;
			} else {
				//x and y positions of the bricks 
				var brick_x = centerX + Math.random() - 0.5; //randomly place in the center
				//height is FROM THE TOP
				var maxNum = 4; //maximum height
				var minNum = 2; //minimum height
				var brick_y = (i === this.special) ? 3.5 : Math.random() * (maxNum - minNum) + minNum;
				var brick_angle = Math.random() * Math.PI;
				var brick_name = 'brick_'+i;
			}
			this.bricks_array.push(
				this.createBox(brick_width, brick_height, brick_x, brick_y, brick_angle, b2Body.b2_dynamicBody, brick_density, brick_friction, brick_restitution, brick_name, image)
			);
		}
		//this.data = (data.length !== 0) ? data : this.pushData();
	}

	clearAll() {
		if (stage !== undefined) {
			for (var i = 0; i < extras.length; i++) {
				stage.removeChild(extras[i]);
			}
			endVis();
			extras = [];
			bodies = [];
			actors = [];
		}
		for (var i = 0; i < this.bricks_array.length; i++) {
			this.destroyBrick(this.bricks_array[i])
		}
		this.world = undefined;
		this.bricks_array = [];
	}

	//allow bricks to settle, without animation
	settle(steps) {
		var numSteps = defaultFor(steps, this.settle_time)
		for (var j = 0; j < numSteps; j++) {
			this.world.Step(1 / 60, 5, 5);
			this.world.ClearForces();
			this.destroyDeadBricks();
		}
		if (this.visualize) {
			updateActors();
		}
	}

	//create a box of given parameters
	createBox(width, height, x, y, angle, type, density, friction, restitution, data, img) {
		// Create the fixture definition
		var fixDef = new b2FixtureDef;
		fixDef.density = density; // Set the density
		fixDef.friction = friction; // Set the friction
		fixDef.restitution = restitution; // Set the restitution - bounciness
		fixDef.shape = new b2PolygonShape;
		fixDef.shape.SetAsBox(width, height);

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
			bodies.push(b);
			var bd = new BitmapData(FIG_PATH + img);
			var bm = new Bitmap(bd);
			bm.x = -width*scale;
			bm.y = -height*scale;
			var actor  = new Sprite();
			actor.scaleX = RATIO+.05;
			actor.scaleY = RATIO+.05;
			if (type === b2Body.b2_dynamicBody) {
				bm.addEventListener(MouseEvent.MOUSE_DOWN, selectBrick);
				bm.obj_id = parseInt(data.slice(6));
				bm.addEventListener(MouseEvent.MOUSE_DOWN, holdBrick);
				bm.addEventListener(MouseEvent.MOUSE_UP, releaseBrick);
			}
			actor.addChild(bm);
			stage.addChild(actor);
			actors.push(actor);
		}
		return b;
	}

	destroyBrick(brick) {
		brick.SetPosition(new b2Vec2(-5, -5));
		brick.SetLinearVelocity(new b2Vec2(0, 0));
		brick.SetAngularVelocity(0);
		brick.SetActive(false);
		this.world.DestroyBody(brick)
	}
	//get rid of bricks that have fallen below the table
	destroyDeadBricks() {
		var that = this;
		this.bricks_array.forEach(function (brick) {
			if (brick.GetPosition().y > 5) {
				that.destroyBrick(brick);
			}
		})
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

	toggleMovement() {
		if (visualize) {
			if (!animating) {
				beginVis();
			} else {
				endVis();
			}
		}
	}

	//remove a brick with given noise parameters
	removeBrick(type, level, id) {
		console.log(type)
		id = defaultFor(parseInt(id), -1)
		if (id === -1) {
			console.log('brick ' + id + ' does not exist!')
			id = Math.max(0, this.special);
		}
		var theBrick = this.bricks_array[id];
		if (type === 'cognitive') {
			var levels = level.split(',')
			console.log(level.split(','))
			this.applyNoise('dxy-global', levels[0], theBrick);
			this.applyNoise('intervention', levels[1], theBrick);
			this.applyNoise('collision-dynamics', levels[2], theBrick);
		} else if (type === 'perceptual-impulse-lae') {
			var levels = level.split(',')
			console.log(level.split(','))
			this.applyNoise('dxy-global', levels[0], theBrick);
			this.applyNoise('impulse-local-above-extended', levels[1], theBrick);
		} else {
			this.applyNoise(type, level, theBrick);
		}

		var types = ['cognitive', 'intervention']
		if (types.indexOf(type) === -1) {
			this.destroyBrick(theBrick);
			if (this.visualize && clickedBrick !== undefined) {
				stage.removeChild(clickedBrick);
				clickedBrick = undefined;
			}	
		}
	}

	applyNoise(type, level, theBrick) {
		var noise = gaussian(0, level);
		var remove_brick = true;
		var goodBricks = this.getGoodBricks();

		if (type === "dxy-local-above") {
			var contact_list = this.getContacts('above', theBrick);
			for (var i = 0; i < contact_list.length; i++) {
				brick = contact_list[i];
				p = brick.GetPosition();
				brick.SetPosition(new b2Vec2(
					p.x + .1 * noise(),
					p.y + .1 * noise()
				))
			}
		} else if (type === "dxy-global") {
			goodBricks.forEach(function(brick) {
				var p = brick.GetPosition();
				brick.SetPosition(new b2Vec2(
					p.x + .1 * noise(),
					p.y + .1 * noise()
				))
			})
		} else if (type === "impulse-local") {
			var contact_list = this.getContacts('contacts', theBrick);
			contact_list.forEach(function(brick) {
				brick.ApplyImpulse(new b2Vec2(noise(), noise()), brick.GetPosition())
			})
		} else if (type === "impulse-local-above-extended") {
			var contact_list = this.getContacts('above-extended', theBrick);
			console.log(contact_list)
			contact_list.forEach(function (brick) {
				console.log(level)
				brick.ApplyImpulse(new b2Vec2(noise(), noise()), brick.GetPosition())
			})
		} else if (type === "impulse-global") {
			this.bricks_array.forEach(function(brick) {
				brick.ApplyImpulse(new b2Vec2(noise(), noise()), brick.GetPosition())
			})
		} else if (type === "collision-dynamics") {
			var nl = new NoiseContactListener(level);
			this.world.SetContactListener(nl);
		} else if (type === "intervention") {
			var r_imp = -5*level*Math.random();
			var t_imp = Math.PI * Math.random();
			var noiseVec = new b2Vec2(r_imp * Math.cos(t_imp), r_imp * Math.sin(t_imp))
			theBrick.ApplyImpulse(noiseVec,theBrick.GetPosition())
			if (this.visualize) {
				interventionTimer = 0;
			} else {
				settle(30);
			}
		}
	}

	getContacts(type, brick) {
		var contact_list = [brick];
		var edge = brick.GetContactList();
		if (type === 'contacts') {
			while (true) {
				if (edge === null) {break;}
				if (edge.other.GetType() == 2) {
					contact_list.push(edge.other)
				}
				edge = edge.next
			}
		} else if (type === 'above') {
			while (true) {
				if (edge === null) {break;}
				var wm = new b2WorldManifold();
				edge.contact.GetWorldManifold(wm)
				var pts = wm.m_points
				var ysum = 0;
				var nonzeronum = 0;
				for (var i = 0; i < 2; i++) {
					if (pts[i].x !== 0 || pts[i].y !== 0) {
						ysum += pts[i].y
						nonzeronum++;
					}
				}
				if (nonzeronum !== 0) {
					var yval = ysum / nonzeronum;
					if (edge.other.GetType() === 2 && yval < brick.GetPosition().y - 0.05 && brick.GetPosition().y > edge.other.GetPosition().y) {
						contact_list.push(edge.other)
					}
				}
				edge = edge.next
			}
			return contact_list;
		} else if (type === 'above-extended') {
			var idx = 0;
			while (idx < contact_list.length) {
				var cur = contact_list[idx];
				var above_list = this.getContacts('above',cur);
				above_list.forEach(function(abrick) {
					if (contact_list.indexOf(abrick) === -1) {
						contact_list.push(abrick);
					}
				})
				idx++;
			}
		}
		return contact_list;
	}

	loadData(data, special, special2) {
		var that = this;
		if (typeof special !== undefined) {
			this.special = special;
			this.special2 = special2;
		}
		this.generateBrickPositions(data);
		this.bricks_array.forEach(function(brick) {
			if (brick.GetPosition().x === -5) {
				that.destroyBrick(brick);
			}
		})
		this.settle(10)
	}
}


/*

VISUALIZATION HELPER FUNCTIONS

*/


function updateActors() {
	for (var i = 0; i < actors.length; i++) {
		var body = bodies[i];
		var actor = actors[i];
		var p = body.GetPosition();
		actor.x = p.x * RATIO * scale;
		actor.y = p.y * RATIO * scale;
		actor.rotation = body.GetAngle() * 180 / Math.PI;
	}
}

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

function animate() {
	timer++;
	interventionTimer++;
	if (timer % 1000 === 0) {
		console.log('timesteps', timer)

	}
	if ((timer >= animate_time || animate_threshold_count > 10) && !moving) {
		console.log(bw.getGoodBricks().length)
		console.log('animation stopped! timesteps', timer)
		endVis();
		$('#simulate', parent.document).prop('disabled',false)
		//parent.update_on_animation_end(nbricks)
		// $('#watch', parent.document).prop('disabled', false);
		// $('.ui-slider', parent.document).show();  
		return;
	}
	var vel = bw.bricks_array.reduce(function(s,b) {
		s[0] += b.GetLinearVelocity().Length();
		s[1] += Math.abs(b.GetAngularVelocity());
		return s;
	},[0,0])
	if (vel[0] < 0.1 && vel[1] < 0.1) {
		animate_threshold_count++;
	}

	if (interventionTimer === 30) {
		bw.destroyBrick(bw.bricks_array[bw.special]);
	}
	bw.world.Step(1 / 60, 5, 5);
	bw.world.ClearForces();
	bw.destroyDeadBricks();
	updateActors();
}

class NoiseContactListener extends b2ContactListener {
	constructor(level) {
		super();
		this.level = level;
		this.gauss = gaussian(0, this.level/10);
	}
	BeginContact(contact) {
		var wm = new b2WorldManifold();
		contact.GetWorldManifold(wm)
		var pts = wm.m_points
		
		var a = contact.GetFixtureA().GetBody();
		var b = contact.GetFixtureB().GetBody();

		var v1 = a.GetLinearVelocityFromWorldPoint(pts[0]);
		var v2 = b.GetLinearVelocityFromWorldPoint(pts[0]);
		
		var C = this.gauss()
		var vel = new b2Vec2(C*(v1.x - v2.x), C*(v1.y - v2.y));
		var new_vel = new b2Vec2(vel.y, vel.x)

		a.ApplyImpulse(new_vel, pts[0])
		b.ApplyImpulse(new_vel.GetNegative(), pts[0])

	}
	EndContact(contact) {}
	PreSolve(contact, manifold) {}
	PostSolve(contact, impulse) {}
}



/*

MOUSE MOVEMENT FUNCTIONS

*/

function brickMaker(opt) {
	if (opt === 'start') {
		if (bw === undefined) {
			bw = new BrickWorld(true);
			bw.setupWorld();
		}
		moving = true;
		selecting = false;
		stage.addEventListener(MouseEvent.MOUSE_DOWN, addBrick);
		stage.addEventListener(MouseEvent.MOUSE_MOVE, moveBrick);
		beginVis();
		
	} else {
		moving = false;
		selecting = true;
		stage.removeEventListener(MouseEvent.MOUSE_DOWN, addBrick);
		stage.removeEventListener(MouseEvent.MOUSE_MOVE, moveBrick);
		endVis();
	}
}
function addBrick(e) {
	if (e.target.obj_id !== undefined) {
		return
	}
	//parent.window.parent.updateInfo(bw.pushData())
	var bd = new BitmapData(FIG_PATH + 'brick.png');
	var bm = new Bitmap(bd);
	//Resize the image and location depending on the pixel RATIO/zoom level
	bm.scaleX = RATIO;
	bm.scaleY = RATIO;
	bm.x = e.target.mouseX / RATIO;
	bm.y = e.target.mouseY / RATIO;

	bw.bricks_array.push(
		bw.createBox(brick_width, brick_height, bm.x, bm.y, 0, b2Body.b2_dynamicBody, brick_density, brick_friction, brick_restitution, 'brick_'+bw.bricks_array.length, 'brick.png')
	)
	console.log('created',bw.bricks_array.length)
	updateActors()
}
function holdBrick(e) {
	if (animating || !moving) {
		return;
	}
	if (e.target.obj_id !== undefined) {
		console.log('holding', e.target.obj_id)
		movingBrick = bw.bricks_array[e.target.obj_id];
	}
}
function releaseBrick(e) {
	if (movingBrick !== null && toggleAngle) {
		movingBrick.SetAngle(movingBrick.GetAngle() + Math.PI / 2);
		updateActors();
	}
	toggleAngle = true;
	movingBrick = null;
}
function moveBrick(e) {
	if (movingBrick == null) return;
	toggleAngle = false;
	var x = stage.mouseX / RATIO / scale;
	var y = stage.mouseY  / RATIO / scale;
	movingBrick.SetPosition(new b2Vec2(x,y));
	updateActors()
}
function selectBrick(e) {
	if (animating || !selecting) {
		return;
	}
	if (e.target.mask_id !== undefined) {
		stage.removeChild(clickedBrick);
		clickedBrick = undefined;
		return;
	} else if (e.target.obj_id !== undefined) {
		var object_id = e.target.obj_id

		console.log('took control of', object_id);
		var bd = new BitmapData(FIG_PATH+'brick_filter.png');
		var bm = new Bitmap(bd);
		//Resize the image and location depending on the pixel RATIO/zoom level
		bm.scaleX = RATIO;
		bm.scaleY = RATIO;
		var brick = bw.bricks_array[object_id];
		var angle = brick.GetAngle()
		bm.x = (brick.GetPosition().x - Math.cos(angle)/2.5 + Math.sin(angle)/5) * scale * RATIO
		bm.y = (brick.GetPosition().y - Math.sin(angle)/2.5 - Math.cos(angle)/5) * scale * RATIO
		bm.rotation = angle * 180 / Math.PI;
		bm.addEventListener(MouseEvent.MOUSE_DOWN, selectBrick);

		var actor  = new Sprite();
		bm.mask_id = object_id;
		actor.mask_id = object_id;
		actor.addChild(bm);
		if (clickedBrick !== undefined) {
			stage.removeChild(clickedBrick)
		}
		clickedBrick = actor;
		stage.addChild(actor);
		extras.push(actor);

		bw.special = object_id;
	} else {
		console.log('missed!', e.target);
	}
}



/*

VISUALIZATION FUNCTIONS

*/

function animateRandom(special) {
	special = defaultFor(special, 0)
	bw = new BrickWorld(true);
	bw.loadData([],0)
	beginVis();
}


function loadClip(id, type, special, special2, noiseType, noiseLevel) {
	$.ajax({
		url: id + '.json',
		dataType: 'json',
		success: function(data) {
			if (load_lock) {
				return;
			}
			bw = new BrickWorld(true);
			bw.loadData(data, special, special2);
			if (type === 'load') {
				selecting = false;
			} else if (type === 'animate') {
				beginVis();
			} else if (type === 'remove') {
				special = defaultFor(special, 0)
				load_lock = true;
				setTimeout(function() {
					bw.removeBrick(noiseType, noiseLevel, special);
					load_lock = false;
					beginVis();
				}, 800)
			}
		},
		error: function(XMLHttpRequest, textStatus, errorThrown) { 
	        console.log("loading didn't work: " + id);
	    }     
	});
}

function takeScreenshot() {
	var canvas = document.getElementById('c')
	canvas.toBlob(function(blob) {;
		saveAs(blob, 'screenshot.png');
	},'image/png');
}

function saveOneData() {
	var brick_positions = bw.pushData();
	var json = JSON.stringify(brick_positions);
	var blob = new Blob([json], {
		type: 'application/json'
	});
	saveAs(blob, "snapshot_"+Date.now().toString().slice(5)+".json")
}

function takeVideo(pos) {
	// does not work on safari
	if (pos === 'start') {
		var canvas = document.getElementById('c')
		recorder = RecordRTC(canvas, {
		    type: 'canvas',
		    showMousePointer: true
		});
		recorder.startRecording();
	} else if (pos === 'end') {
		recorder.stopRecording(function() {
			var blob = this.getBlob();
			console.log(blob)
		    saveAs(blob, 'video.webm');
		});
	}
}


/*

HELPER FUNCTIONS *********************************************

*/

//gives default value for a variable
function defaultFor(arg, val) {
	return typeof arg !== 'undefined' ? arg : val;
}

// returns a gaussian random function with the given mean and stdev.
function gaussian(mean, stdev) {
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




if (!WINDOW_ON) {
	module.exports = {
		BrickWorld: BrickWorld
	}
}