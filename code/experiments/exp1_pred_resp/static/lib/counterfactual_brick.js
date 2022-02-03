//box2d variables             
var b2Vec2 = Box2D.Common.Math.b2Vec2;
var b2BodyDef = Box2D.Dynamics.b2BodyDef;
var b2Body = Box2D.Dynamics.b2Body;
var b2FixtureDef = Box2D.Dynamics.b2FixtureDef;
var b2World = Box2D.Dynamics.b2World;
var b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape;
var b2WorldManifold = Box2D.Collision.b2WorldManifold;

//global parameters
var brickScale = 1;

// var gravity = 5 * brickScale;
var gravity = 10;
var scale = 100 / brickScale;
var ratio = window.devicePixelRatio;

var fullX = 8 * brickScale; 
var fullY = 6 * brickScale;	

//variables 
var brick_density = 10;
var brick_friction = 0.5;
var brick_damping = 0;
var brick_restitution = 0.2;
var bricks_num_default = 20;
var bricks_num = bricks_num_default;
var brick_width = 0.4 * brickScale;
var brick_height = 0.2 * brickScale;
var friction_variance = 0.15;

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
var clipNumber = 0;
var brick_positions_loaded;
var stop_simulation;
var timer = 0;
var ffRate = 1;

var noiseType;
var noiseLevel;

var high = false;
var high_time = 340;

/*

MAIN FUNCTIONS *********************************************

*/

//SAMPLING AND SAVING A LOT OF DATA
function sample(num, reps) {
	high = false;
	var table = {};

	for (var i = 0; i < num; i++) {
		var dt = simulate(reps);
		table[dt[0]] = dt[1];
	}
	var jsonse = JSON.stringify(table);
	var jsonBlob = new Blob([jsonse], {
		type: 'application/json'
	});
	saveAs(jsonBlob, "table_"+Date.now()+".json");
}

function simulate(reps) {
	high = false;
	visualize = false;
	setupWorld();
	var stable = false;
	while (stable === false) {
		generateBrickPositions();
		settle();
		while (bricks_array[brick_special].GetPosition().x === -5
			&& bricks_array[brick_special].GetPosition().x === -5) {
			generateBrickPositions();
			settle();
		}
		var now = Date.now()

		var brick_init_positions = pushData();
		var init_count = countGoodBricks();

		loadData(brick_init_positions);
		settle();

		for (var i = 0; i < bricks_array.length; i++) {
			if (Math.abs(bricks_array[i].x - brick_init_positions[i].x) > 0.1) {
				stable = false;
			}
			if (Math.abs(bricks_array[i].y - brick_init_positions[i].y) > 0.1) {
				stable = false;
			}
		}
		if (init_count === countGoodBricks()) {
			stable = true;
		}
	}

	removeBrick('none', 0, 0);
	settle();

	var ground_truth = pushData();
	var ground_count = countGoodBricks();

	var final_count = [];
	for (var i = 0; i < reps; i++) {
		loadData(brick_init_positions);
		settle(1);
		removeBrick(noiseType, noiseLevel, friction_variance);
		settle();

		var count = countGoodBricks();
		final_count.push(count)
	}

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
	high = false;
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
				if (high) {
					$('#simulate', parent.document).prop('disabled',false);
				}
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

function animateHigh() {
	high = true;
	visualize = true;
	setupWorld();
	generateBrickPositions();
	//saveOneData();
	loadingData = false;
	timer = 0;
	beginVis();
}

//LOAD A CLIP AND ANIMATE IT
function loadClip(type, number) {
	var clipNumber = number;
	$.ajax({
		url: 'static/images/stimuli/' + type + '_' + clipNumber + '.json',
		dataType: 'json',
		success: function(response) {
			loadingData = true;
			brick_positions_loaded = response;
			animateHigh();
		},
		error: function(XMLHttpRequest, textStatus, errorThrown) { 
	        console.log("rip it didn't work: "+number)
	    }     
	});
}

function loadRemoveClip(number) {
	var clipNumber = number;
	visualize = true;
	$.ajax({
		url: 'data/initial_' + clipNumber + '.json',
		dataType: 'json',
		success: function(response) {
			loadingData = true;
			brick_positions_loaded = response;
			visualize = true;
			setupWorld();
			generateBrickPositions();
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
				//animateWorld();
				removeBrick(noiseType, noiseLevel, friction_variance);
				beginVis();
				//beginVis();
			},800);
		},
		error: function(XMLHttpRequest, textStatus, errorThrown) { 
	        console.log("rip it didn't work: "+number)
	    }     
	});
}

//LOAD A LIST OF IDS AND SAVE THE CORRESPONDING INITIAL AND FINAL IMAGES
function loadAndSave(list) {
	visualize = true;
	loadingData = true;
	var curIndex = 0;
	var curSetting = "initial";

	function iterateNext() {
		if (curIndex >= list.length) {
			if (curSetting === "initial") {
				curIndex = 0;
				curSetting = "final";
			} else {
				return;
			}
		}
		makeAjaxCall();
	}

	function makeAjaxCall() {
		$.ajax({
			url: 'data/'+curSetting+'_' + list[curIndex] + '.json',
			dataType: 'json',
			success: function(response) {
				brick_positions_loaded = response;
				setupWorld();
				beginVis();
				generateBrickPositions();
				setTimeout(function() {
					takeScreenshot("image_"+curSetting+"_"+list[curIndex]+".png");
					endVis();
					curIndex += 1;
					iterateNext();
				}, 500);
			},
			error: function(XMLHttpRequest, textStatus, errorThrown) { 
		        console.log("rip it didn't work: "+list[curIndex])
		    }
		});
	}

	iterateNext();

}


/*

SAVING FUNCTIONS *********************************************

*/

function saveOneData() {
	var brick_positions = pushData();
	var jsonse = JSON.stringify(brick_positions);
	var jsonBlob = new Blob([jsonse], {
		type: 'application/json'
	});
	saveAs(jsonBlob, "snapshot_"+Date.now()+".json")
}

function saveMassData(init_pos, ground_pos, id) {
	var jsonse = JSON.stringify(init_pos);
	var jsonBlob = new Blob([jsonse], {
		type: 'application/json'
	});
	saveAs(jsonBlob, "initial_"+id+".json")

	//arbitrarily save the first simulation for now
	var jsonse = JSON.stringify(ground_pos);
	var jsonBlob = new Blob([jsonse], {
		type: 'application/json'
	});
	saveAs(jsonBlob, "final_"+id+".json")
}

function takeScreenshot(name) {
	document.getElementById("c").toBlob(function(blob) {
		saveAs(blob, name);
	}, "image/png;base64");
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
		height = 0.1 * brickScale,
		x = centerX,
		y = fullY - 0.1 * brickScale,
		angle = 0,
		type = b2Body.b2_staticBody,
		density = 10,
		damping = 0,
		friction = 1,
		restitution = 0,
		userData = "box",
		rendered = true,
		img = "static/images/ground.png"
	);

	//table
	createBox(0.1 * brickScale, 0.4 * brickScale, centerX - 1 * brickScale, fullY - 0.4 * brickScale - 0.2 * brickScale, 0, b2Body.b2_staticBody, table_density, table_damping, table_friction, table_restitution, "left_leg", true, "static/images/table_leg.png");
	createBox( 0.1 * brickScale, 0.4 * brickScale, centerX + 1 * brickScale, fullY - 0.4 * brickScale - 0.2 * brickScale, 0, b2Body.b2_staticBody, table_density, table_damping, table_friction, table_restitution, "right_leg", true, "static/images/table_leg.png");
	createBox( 1.5 * brickScale, 0.1 * brickScale, centerX, fullY - 0.1 * brickScale - 0.80 * brickScale - 0.18 * brickScale, 0, b2Body.b2_staticBody, table_density, table_damping, table_friction, table_restitution, "table", true, "static/images/table_top.png");
	settle(100);
}

//generate random brick positions and stores in bricks_array
function generateBrickPositions() {
	for (var i = 0; i < bricks_array.length; i++) {
		world.DestroyBody(bricks_array[i]);
	}
	bricks_array = [];
	if (loadingData) {
		bricks_num = brick_positions_loaded.length
	} else {
		bricks_num = bricks_num_default
	}
	for (var i = 0; i < bricks_num; i++) {
		var brick_image = "static/images/brick.png";
		if (i === brick_special && !high) {
			var brick_image = "static/images/brick_special.png";
		}
		if (loadingData) {
			brick_x = brick_positions_loaded[i].x;
			brick_y = brick_positions_loaded[i].y;
			brick_angle = brick_positions_loaded[i].angle;
		} else {
			//x and y positions of the bricks 
			brick_x = centerX + 1 * Math.random() * brickScale - 0.5 * brickScale; //randomly place in the center
			//height is FROM THE TOP
			maxNum = 4 * brickScale; //maximum height
			minNum = 2 * brickScale; //minimum height
			if (high) {
				maxNum = -2 * brickScale;
				minNum = -4 * brickScale;
			}
			if (i === brick_special && !high) {
				brick_y = 3.5 * brickScale;
			} else {
				brick_y = Math.floor(Math.random() * (maxNum - minNum + 1)) + minNum;
			}
			brick_angle = Math.floor(Math.random() * 2) * 0.5 * Math.PI;
		}
		bricks_array.push(
			createBox(brick_width, brick_height, brick_x, brick_y, brick_angle, b2Body.b2_dynamicBody, brick_density, brick_damping, brick_friction, brick_restitution, "brick_" + i, true, brick_image)
		);
	}
}

//create a box (brick) of given parameters
function createBox(width, height, x, y, angle, type, density, damping, friction, restitution, userData, isRendered, img) {
	// Create the fixture definition
	var fixDef = new b2FixtureDef;
	fixDef.density = density; // Set the density
	fixDef.friction = friction; // Set the friction
	fixDef.restitution = restitution; // Set the restitution - bounciness
	fixDef.shape = new b2PolygonShape;
	fixDef.shape.SetAsBox(
		width // input should be half the width
		, height // input should be half the height
	);

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
		if (defaultFor(isRendered, false)) {
			bodies.push(b);
		}
		var bd = new BitmapData(img);
		var bm = new Bitmap(bd);
		bm.x = -width*scale;
		bm.y = -height*scale;
		var actor  = new Sprite();
		actor.addChild(bm);
		actor.scaleX = ratio+.05;
		actor.scaleY = ratio+.05;
		stage.addChild(actor);
		actors.push(actor);
	}
	return b;
}

//remove a brick with given noise parameters
function removeBrick(noiseType="none", noiseLevel=1, friction=0) {
	var theBrick = bricks_array[brick_special];
	var gauss = gaussian(0, friction);
	for (var j = 0; j < bricks_array.length; j++) {
		if (bricks_array[j].GetFixtureList() !== null) {
			var fric = bricks_array[j].GetFixtureList().GetFriction();
			bricks_array[j].GetFixtureList().SetFriction(fric + gauss());
		}
	}
	if (noiseType === "dxy-local") {
		var contact_list = []
		var contact_edge = theBrick.GetContactList()
		while (true) {
			if (contact_edge === null) {break;}
			if (contact_edge.other.GetType() == 2) {
				contact_list.push(contact_edge.other)
			}
			contact_edge = contact_edge.next
		}
		for (var i = 0; i < contact_list.length; i++) {
			contact = contact_list[i];
			var x = contact.GetPosition().x;
			var y = contact.GetPosition().y;
			x += noiseLevel * (1 - 2 * Math.random());
			y += noiseLevel * (1 - 2 * Math.random());
			contact.SetPosition(new b2Vec2(x, y));
		}
	} else if (noiseType === "dxy-global") {
		for (var i = 0; i < bricks_array.length; i++) {
			var brick = bricks_array[i];
			var x = brick.GetPosition().x;
			var y = brick.GetPosition().y;
			x += noiseLevel * (1 - 2 * Math.random());
			y += noiseLevel * (1 - 2 * Math.random());
			brick.SetPosition(new b2Vec2(x, y));
		}
	} else if (noiseType === "torque-brick") {
		theBrick.ApplyTorque(noiseLevel * (Math.random() - 0.5) * 100 * brickScale);
		settle(10);
	} else if (noiseType === "torque-local") {
		console.log(world)
		var contact_list = []
		var contact_edge = theBrick.GetContactList()
		while (true) {
			if (contact_edge === null) {break;}
			if (contact_edge.other.GetType() == 2) {
				contact_list.push(contact_edge.other)
			}
			contact_edge = contact_edge.next
		}
		for (var i = 0; i < contact_list.length; i++) {
			contact_list[i].ApplyTorque(noiseLevel * (Math.random() - 0.5) * 100 * brickScale);
		}
	} else if (noiseType === "torque-local-above") {
		var contact_list = []
		var contact_edge = theBrick.GetContactList()
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
				if (contact_edge.other.GetType() === 2 && yval < theBrick.GetPosition().y) {
					contact_list.push(contact_edge.other)
				}
			}
			contact_edge = contact_edge.next
		}
		for (var i = 0; i < contact_list.length; i++) {
			contact_list[i].ApplyTorque(noiseLevel * (Math.random() - 0.5) * 100 * brickScale);
		}
	} else if (noiseType === "torque-global") {
		for (var i = 0; i < bricks_array.length; i++) {
			bricks_array[i].ApplyTorque(noiseLevel * (Math.random() - 0.5) * 100 * brickScale);
		}
	}

	world.DestroyBody(bricks_array[brick_special]);
	bricks_array[brick_special].SetPosition(new b2Vec2(-5, -5));
}

//allow bricks to settle
function settle(steps=0) {
	var numSteps = steps;
	if (steps === 0) {
		numSteps = settle_time;
	}
	for (var j = 0; j < numSteps; j++) {
		world.Step(1 / 60, 5, 5);
		world.ClearForces();
		removeDeadBricks();
	}
}

//get rid of bricks that have fallen below the table
function removeDeadBricks() {
	for (var i in bricks_array) {
		if (bricks_array[i].GetPosition().y > 5 * brickScale) {
			world.DestroyBody(bricks_array[i]);
			bricks_array[i].SetPosition(new b2Vec2(-5, -5));
		}
	}
}


/*

HELPER FUNCTIONS *********************************************

*/

//set noise parameters
function setNoiseParams(nt, nl, fric) {
	noiseType = nt;
	noiseLevel = nl;
	friction_variance = fric;
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
	for (var i = 0; i < bricks_array.length; i++) {
		if (bricks_array[i].GetPosition().x !== -5 || bricks_array[i].GetPosition().y !== -5) {
			b++;
		}
	}
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
	for (var i = 0; i < bricks_array.length; i++) {
		world.DestroyBody(bricks_array[i]);
	}
	settle(100);
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
