
//box2d variables             
var b2Vec2 = Box2D.Common.Math.b2Vec2;
var b2BodyDef = Box2D.Dynamics.b2BodyDef;
var b2Body = Box2D.Dynamics.b2Body;
var b2FixtureDef = Box2D.Dynamics.b2FixtureDef;
var b2World = Box2D.Dynamics.b2World;
var b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape;
var b2WorldManifold = Box2D.Collision.b2WorldManifold;

//result variables 
var feature_list = [];
var noise_list = []; 

// var gravity = 5;
var gravity = 10;
var scale = 100;
var ratio = window.devicePixelRatio;

var fullX = 8; 
var fullY = 6;	

//variables 
var brick_density = 10;
var default_brick_friction = 0.5;
var brick_friction = 0.5;
var brick_damping = 0;
var brick_restitution = 0.2;
var bricks_num_default = 20;
var bricks_num = bricks_num_default;
var brick_width = 0.4;
var brick_height = 0.2;


var table_density = 10;
var table_friction = 1;
var table_damping = 0;
var table_restitution = 0.2;

//placeholders 
var world;
var stage;
var bodies = []; // instances of b2Body (from Box2D)
var actors = []; // instances of Bitmap (from IvanK)
var bricks_array = [];
var brick_special = 0;

//control variables 
var visualize = true;
var loadingData = false;
var animate_time = 2000; //steps before the animation stops 
var settle_time = 1000;
// var settle_time = 200;
var clipNumber = 0;
var brick_positions_loaded;
var stop_simulation;
var timer = 0;
var ffRate = 1;

var noise_type;
var noise_level;
var friction_variance;

var high = false;
var high_time = 340;

var idControlledObject;
var clickedBricks = [];

/*

MAIN FUNCTIONS *********************************************

*/

//SAMPLING AND SAVING A LOT OF DATA
function sample(num, reps) {
	var table = {};

	for (var i = 0; i < num; i++) {
		var dt = simulate(reps);
		table[dt[0]] = dt[1];
	}
	var table_json = JSON.stringify(table);
	jsonfile.writeFile('table_'+Date.now()+'.json', table_json, function (err) {
		console.error(err)
	})
}

function simulate(reps) {
	visualize = false;
	var stable = false;
	while (stable === false) {
		setupWorld();
		generateBrickPositions();
		settle();
		while (bricks_array[brick_special].GetPosition().x === -5
			&& bricks_array[brick_special].GetPosition().x === -5) {
			continue
		}

		var brick_init_positions = pushData();
		var init_count = countGoodBricks();

		loadData(brick_init_positions);
		settle();

		if (init_count === countGoodBricks()) {
			stable = true;
		}

		for (var i = 0; i < bricks_array.length; i++) {
			if (Math.abs(bricks_array[i].x - brick_init_positions[i].x) > 0.1 ||
				Math.abs(bricks_array[i].y - brick_init_positions[i].y) > 0.1) {
				continue;
			}
		}
		
	}
	//loadData(brick_init_positions);
	//settle(1);
	removeBrick('none', 0, brick_friction, 0);
	settle();

	var ground_truth = pushData();
	var ground_count = countGoodBricks();

	var final_count = [];
	for (var i = 0; i < reps; i++) {
		loadData(brick_init_positions);
		settle(1);
		removeBrick(noise_type, noise_level, brick_friction, friction_variance);
		settle();

		var count = countGoodBricks();
		final_count.push(count)
	}

	var now = Date.now();
	var mv = getMeanVariance(final_count)
	saveMassData(brick_init_positions, ground_truth, now);
	
	var dt = {
		'initial': init_count,
		'final_ground': ground_count,
		'final_mean': mv[0],
		'final_var': mv[1],
		'model': noiseType,
		'level': noiseLevel,
	}
	return [now, dt];
}



//VISUALIZING SINGLE ANIMATIONS OF DATA
function animate() {
	visualize = true;
	setupWorld();
	generateBrickPositions();
	loadingData = false;
	timer = 0;
	beginVis();
}


function AssumeControl(e) {
	if (e.target.mask_id !== undefined) {
		stage.removeChild(clickedBricks[e.target.mask_id]);
		clickedBricks[e.target.mask_id] = undefined;
		return;
	}
	if (e.target.obj_ix !== undefined) {
		var some_id = e.target.obj_ix;
		var object_id = e.target.obj_id
		if (clickedBricks[object_id] === undefined) {
			console.log('took control of', e.target.obj_id);
			var bd = new BitmapData('static/images/brick_filter.png');
			var bm = new Bitmap(bd);
			//Resize the image and location depending on the pixel ratio/zoom level
			bm.scaleX = ratio;
			bm.scaleY = ratio;
			var angle = bricks_array[object_id].GetAngle()
			bm.x = (bodies[some_id].GetPosition().x - Math.cos(angle)/2.5 + Math.sin(angle)/5) * scale * ratio
			bm.y = (bodies[some_id].GetPosition().y - Math.sin(angle)/2.5 - Math.cos(angle)/5) * scale * ratio
			bm.addEventListener(MouseEvent.MOUSE_DOWN, AssumeControl);
			bm.rotation = angle * 180 / Math.PI;

			var actor  = new Sprite();
			bm.mask_id = object_id;
			actor.mask_id = object_id
			//console.log(bm)
			actor.addChild(bm);
			clickedBricks[object_id] = actor
			stage.addChild(actor);
		} else {
			stage.removeChild(clickedBricks[object_id]);
			clickedBricks[object_id] = undefined;
		}
		
	} else {
		console.log('missed!', e.target);
	}
}

function getClicked() {
	var clicked = []
	console.log(clickedBricks)
	for (var i = 0; i < 20; i++) {
		brick = clickedBricks[i]
		if (brick !== undefined) {
			clicked.push(i)
		}
	}
	return clicked
}

function animateHigh() {
	high = true;
	visualize = true;
	setupWorld();
	generateBrickPositions();
	loadingData = false;
	timer = 0;
	beginVis();
}

function animateWorld() {
	for (var j = 0; j < ffRate; j++) {
		timer++;
		if (timer % 1000 === 0) {
			console.log(timer)
		}
		if (timer === animate_time) {
			endVis();
			break;
		}
		if (high) {
			if (timer === high_time) {
				endVis();
				$('#simulate', parent.document).prop('disabled',false);
				high = false;
				break;
			}
		}
		world.Step(1 / 60, 5, 5);
		world.ClearForces();
		for (var i = 0; i < actors.length; i++) {
			var body = bodies[i];
			var actor = actors[i];
			var p = body.GetPosition();
			actor.x = p.x * ratio * scale;
			actor.y = p.y * ratio * scale;
			actor.rotation = body.GetAngle() * 180 / Math.PI;
		}
		removeDeadBricks();
	}
}

//LOAD A CLIP AND ANIMATE IT
function loadClip(prefix, number, makehigh, shouldianimate) {
	high = makehigh;
	$.ajax({
		url: 'static/'+prefix + number + '.json',
		dataType: 'json',
		success: function(response) {
			loadingData = true;
			brick_positions_loaded = response;
			if (shouldianimate) {
				animate();
			} else {
				setupWorld();
				generateBrickPositions();
				//settle();
				loadingData = false;
				for (var i = 0; i < actors.length; i++) {
					var body = bodies[i];
					var actor = actors[i];
					var p = body.GetPosition();
					actor.x = p.x * ratio * scale;
					actor.y = p.y * ratio * scale;
					actor.rotation = body.GetAngle() * 180 / Math.PI;
					clickedBricks[i] = undefined;
				}
			}
		},
		error: function(XMLHttpRequest, textStatus, errorThrown) { 
	        console.log("rip it didn't work: "+number)
	    }     
	});
}


//LOAD AND REMOVE A PARTICULAR NUMBERED IMAGE
function loadRemoveClip(number) {
	visualize = true;
	loadingData = true;
	$.ajax({
		url: 'data/' + number + '.json',
		dataType: 'json',
		success: function(response) {
			brick_positions_loaded = response;
			setupWorld();
			generateBrickPositions();
			settle();
			loadingData = false;
			for (var i = 0; i < actors.length; i++) {
				var body = bodies[i];
				var actor = actors[i];
				var p = body.GetPosition();
				actor.x = p.x * ratio * scale;
				actor.y = p.y * ratio * scale;
				actor.rotation = body.GetAngle() * 180 / Math.PI;
			}
			setTimeout(function() {
				removeBrick(noise_type, noise_level, brick_friction, friction_variance);
				beginVis();
			},800)
			//1475636082855
		},
		error: function(XMLHttpRequest, textStatus, errorThrown) { 
	        console.log("rip it didn't work: "+number)
	    }     
	});
}


/*

SETUP FUNCTIONS *********************************************

*/

//sets up the world by creating the stage if it doesn't exist, table, ground, etc.
function setupWorld() {
	world = new b2World(new b2Vec2(0, gravity), false); //gravity in Y direction
	if (visualize) {
		if (stage === undefined) {
			stage = new Stage("c");
		}
		endVis();
		var bg = new Bitmap(new BitmapData("static/images/wallpaper.png"));
		bg.scaleX = bg.scaleY = scale;
		stage.addChild(bg);
		//background image
	}

	// I decided that 1 meter = 100 pixels
	centerX = fullX / 2;
	centerY = fullY / 2;

	//ground
	createBox(width = fullX / 2,
		height = 0.1,
		x = centerX,
		y = fullY - 0.1,
		angle = 0,
		type = b2Body.b2_staticBody,
		density = 10,
		friction = 1,
		restitution = 0,
		userData = "box",
		img = "static/images/ground.png"
	);

	//table
	createBox(0.1, 0.4, centerX - 1, fullY - 0.4 - 0.2, 0, b2Body.b2_staticBody, table_density, table_friction, table_restitution, "left_leg", "static/images/table_leg.png");
	createBox(0.1, 0.4, centerX + 1, fullY - 0.4 - 0.2, 0, b2Body.b2_staticBody, table_density, table_friction, table_restitution, "right_leg", "static/images/table_leg.png");
	createBox(1.5, 0.1, centerX, fullY - 0.1 - 0.80 - 0.18, 0, b2Body.b2_staticBody, table_density, table_friction, table_restitution, "table", "static/images/table_top.png");
	settle(100);
}


//generate random brick positions and stores in bricks_array
function generateBrickPositions() {
	bricks_array = [];
	var bricks_num = (loadingData) ? brick_positions_loaded.length : bricks_num_default;
	for (var i = 0; i < bricks_num; i++) {
		console.log(high)
		var brick_image = (i === brick_special && !high) ? "static/images/brick_special.png" : "static/images/brick.png";
		if (loadingData) {
			var brick_x = brick_positions_loaded[i].x;
			var brick_y = brick_positions_loaded[i].y;
			var brick_angle = brick_positions_loaded[i].angle;
		} else {
			//x and y positions of the bricks 
			var brick_x = centerX + Math.random() - 0.5; //randomly place in the center
			//height is FROM THE TOP
			var maxNum = 4; //maximum height
			var minNum = 2; //minimum height
			if (high) {
				maxNum = -2 * brickScale;
				minNum = -4 * brickScale;
			}
			var brick_y = (i === brick_special && !high) ? 3.5 : Math.random() * (maxNum - minNum) + minNum;
			var brick_angle = Math.random() * Math.PI;
		}
		bricks_array.push(
			createBox(brick_width, brick_height, brick_x, brick_y, brick_angle, b2Body.b2_dynamicBody, brick_density, default_brick_friction, brick_restitution, "brick_" + i, brick_image)
		);
	}
}

//create a box (brick) of given parameters
function createBox(width, height, x, y, angle, type, density, friction, restitution, userData, img) {
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
	var b = world.CreateBody(bodyDef);
	b.CreateFixture(fixDef);
	if (typeof userData !== 'undefined') {
		b.SetUserData(userData);
	}

	if (visualize) {
		isRendered = true;
		if (defaultFor(isRendered, false)) {
			bodies.push(b);
		}
		var bd = new BitmapData(img);
		var bm = new Bitmap(bd);
		bm.x = -width*scale;
		bm.y = -height*scale;
		bm.obj_ix = actors.length; //parseInt(userData.slice(6);
		bm.obj_id = parseInt(userData.slice(6));
		var actor  = new Sprite();
		actor.addChild(bm);
		actor.scaleX = ratio+.05;
		actor.scaleY = ratio+.05;
		if (type === b2Body.b2_dynamicBody && userData !== 'brick_0') {
			bm.addEventListener(MouseEvent.MOUSE_DOWN, AssumeControl);
			actor.obj_ix = actors.length;
		}
		stage.addChild(actor);
		actors.push(actor);
	}
	return b;
}

//remove a brick with given noise parameters
function removeBrick(noiseType, noiseLevel, brickFric, fricVar) {
	var noiseType = (typeof noiseType !== 'undefined') ? noiseType : "none";
	var noiseLevel = (typeof noiseLevel !== 'undefined') ? noiseLevel : 0;
	var brickFric = (typeof noiseLevel !== 'undefined') ? brickFric : 0.5;
	var fricVar = (typeof fricVar !== 'undefined') ? fricVar : 0;
	var theBrick = bricks_array[brick_special];
	var gauss = gaussian(0, fricVar);

	bricks_array.forEach(function (brick) {
		if (brick.GetFixtureList() !== null) {
			//var fric = brick.GetFixtureList().GetFriction();
			relu_fric = Math.max(brickFric + gauss(), 0.1);
			brick.GetFixtureList().SetFriction(relu_fric);
		}
	})
	if (noiseType === "dxy-local") {
		var contact_list = getContacts(theBrick);
		contact_list.forEach(function (contact) {
			var x = contact.GetPosition().x;
			var y = contact.GetPosition().y;
			x += noiseLevel * (1 - 2 * Math.random()) / 8;
			y += noiseLevel * (1 - 2 * Math.random()) / 8;
			contact.SetPosition(new b2Vec2(x, y));
		})
	} else if (noiseType === "dx-local") {
		var contact_list = getContacts(theBrick);
		contact_list.forEach(function (contact) {
			var x = contact.GetPosition().x;
			var y = contact.GetPosition().y;
			x += noiseLevel * (1 - 2 * Math.random()) / 8;
			contact.SetPosition(new b2Vec2(x, y));
		})
	}else if (noiseType === "dx-local-above") {
		var contact_list = getContactsAbove(theBrick);
		for (var i = 0; i < contact_list.length; i++) {
			brick = contact_list[i]
			if (brick.GetPosition().x === -5) {continue;}
			var x = brick.GetPosition().x;
			var y = brick.GetPosition().y;
			x += noiseLevel * (1 - 2 * Math.random()) / 8;
			brick.SetPosition(new b2Vec2(x, y));
		}
	} else if (noiseType === "dxy-local-above") {
		var contact_list = getContactsAbove(theBrick);
		for (var i = 0; i < contact_list.length; i++) {
			brick = contact_list[i]
			if (brick.GetPosition().x === -5) {continue;}
			var x = brick.GetPosition().x;
			var y = brick.GetPosition().y;
			x += noiseLevel * (1 - 2 * Math.random()) / 8;
			y += noiseLevel * (1 - 2 * Math.random()) / 8;
			brick.SetPosition(new b2Vec2(x, y));
		}
	} else if (noiseType === "dxy-global") {
		for (var i = 0; i < bricks_array.length; i++) {
			brick = bricks_array[i]
			if (brick.GetPosition().x === -5) {continue;}
			var x = brick.GetPosition().x;
			var y = brick.GetPosition().y;
			x += noiseLevel * (1 - 2 * Math.random()) / 8;
			y += noiseLevel * (1 - 2 * Math.random()) / 8;
			brick.SetPosition(new b2Vec2(x, y));
		}
	} else if (noiseType === "torque-brick") {
		theBrick.ApplyTorque(noiseLevel * (Math.random() - 0.5) * 100);
		settle(10);
	} else if (noiseType === "torque-local") {
		var contact_list = getContacts(theBrick);
		contact_list.forEach(function (contact) {
			contact.ApplyTorque(noiseLevel * (Math.random() - 0.5) * 100);
		})
	} else if (noiseType === "torque-local-above") {
		var contact_list = getContactsAbove(theBrick);
		contact_list.forEach(function (contact) {
			contact.ApplyTorque(noiseLevel * (Math.random() - 0.5) * 100);
		})
	} else if (noiseType === "torque-global") {
		for (var i = 0; i < bricks_array.length; i++) {
			brick = bricks_array[i];
			if (brick.GetPosition().x === -5) {continue;}
			brick.ApplyTorque(noiseLevel * (Math.random() - 0.5) * 100);
		}
	} else if (noiseType === "impulse-local") {
		var contact_list = getContacts(theBrick);
		contact_list.forEach(function(brick) {
			brick.ApplyImpulse(new b2Vec2(noiseLevel * (Math.random() - 0.5) * 5, noiseLevel * (Math.random() - 0.5) * 5), brick.GetPosition())
		})
	} else if (noiseType === "impulse-local-above") {
		var contact_list = getContactsAbove(theBrick);
		contact_list.forEach(function(brick) {
			brick.ApplyImpulse(new b2Vec2(noiseLevel * (Math.random() - 0.5) * 5, noiseLevel * (Math.random() - 0.5) * 5), brick.GetPosition())
		})
	} else if (noiseType === "impulse-global") {
		bricks_array.forEach(function(brick) {
			brick.ApplyImpulse(new b2Vec2(noiseLevel * (Math.random() - 0.5) * 5, noiseLevel * (Math.random() - 0.5) * 5), brick.GetPosition())
		})
	}

	world.DestroyBody(theBrick);
	theBrick.SetPosition(new b2Vec2(-5, -5));
}

function getContacts(brick) {
	var contact_list = [];
	var contact_edge = brick.GetContactList()
	while (true) {
		if (contact_edge === null) {break;}
		if (contact_edge.other.GetType() == 2) {
			contact_list.push(contact_edge.other)
		}
		contact_edge = contact_edge.next
	}
	return contact_list;
}

function getContactsAbove(brick) {
	var contact_list = [];
	var contact_edge = brick.GetContactList();
	while (true) {
		if (contact_edge === null) {break;}
		var wm = new b2WorldManifold();
		contact_edge.contact.GetWorldManifold(wm)
		var pts = wm.m_points
		var ysum = 0;
		var nonzeronum = 0;
		var yval = 0;
		for (var i = 0; i < 2; i++) {
			if (pts[i].x !== 0 || pts[i].y !== 0) {
				ysum += pts[i].y
				nonzeronum++;
			}
		}
		if (nonzeronum !== 0) {
			yval = ysum / nonzeronum;
			if (contact_edge.other.GetType() === 2 && yval < brick.GetPosition().y) {
				contact_list.push(contact_edge.other)
			}
		}
		contact_edge = contact_edge.next
	}
	return contact_list;
}

//allow bricks to settle
function settle(steps) {
	var numSteps = (typeof steps !== 'undefined') ? steps : settle_time;
	for (var j = 0; j < numSteps; j++) {
		world.Step(1 / 60, 5, 5);
		world.ClearForces();
		removeDeadBricks();
	}
}

//get rid of bricks that have fallen below the table
function removeDeadBricks() {
	bricks_array.forEach(function (brick) {
		if (brick.GetPosition().y > 5) {
			world.DestroyBody(brick);
			brick.SetPosition(new b2Vec2(-5, -5));
		}
	})
}


/*

HELPER FUNCTIONS *********************************************

*/

//set noise parameters
function setNoiseParams(nt, nl, fricVal, fricVar) {
	noise_type = nt;
	noise_level = nl;
	brick_friction = fricVal;
	friction_variance = fricVar;
}
//begin animation during visualization
function beginVis() {
	if (visualize) {stage.addEventListener(Event.ENTER_FRAME, animateWorld)}
}
//end animation during visualization
function endVis() {
	if (visualize) {stage.removeEventListener(Event.ENTER_FRAME, animateWorld)}
}
//counts number of bricks still on the table
function countGoodBricks() {
	var b = 0;
	bricks_array.forEach(function (brick) {
		if (brick.GetPosition().x !== -5) {
			b++;
		}
	})
	return b;
}
//converts current array of bricks into JSON
function pushData() {
	array = []
	for (var i = 0; i < bricks_array.length; i++) {
		array.push({
			"name": bricks_array[i].GetUserData(),
			"x": bricks_array[i].GetPosition().x,
			"y": bricks_array[i].GetPosition().y,
			"angle": bricks_array[i].GetAngle()
		});
	}
	return array;
}
//gives default value for a variable
function defaultFor(arg, val) {
	return typeof arg !== 'undefined' ? arg : val;
}
//get mean and variance
function getMeanVariance(data) {
	var sum = 0;
	var sumsq = 0;
	for (var i = 0; i < data.length; i++) {
		sum += data[i]
	}
	var mean = sum / data.length
	for (var i = 0; i < data.length; i++) {
		sumsq += Math.pow(data[i] - mean, 2)
	}
	var variance = sumsq / data.length
	return [mean, variance]
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
//resets brick array and loads data into the brick array
function loadData(data) {
	setupWorld();
	bricks_array = []
	for (var i = 0; i < data.length; i++) {
		brick_x = data[i].x;
		brick_y = data[i].y;
		brick_angle = data[i].angle;
		bricks_array.push(
			createBox(brick_width, brick_height, brick_x, brick_y, brick_angle, b2Body.b2_dynamicBody, brick_density, brick_damping, brick_friction, brick_restitution, "brick_" + i, true, null)
		);
	}
}
