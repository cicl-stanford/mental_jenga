try {
	var Box2D = require('box2dweb');
	var jsonfile = require('jsonfile');
} catch (ReferenceError) {}

//box2d variables             
var b2Vec2 = Box2D.Common.Math.b2Vec2;
var b2BodyDef = Box2D.Dynamics.b2BodyDef;
var b2Body = Box2D.Dynamics.b2Body;
var b2FixtureDef = Box2D.Dynamics.b2FixtureDef;
var b2World = Box2D.Dynamics.b2World;
var b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape;
var b2WorldManifold = Box2D.Collision.b2WorldManifold;

var ratio;
try {
	ratio = window.devicePixelRatio;
} catch (ReferenceError) {
	ratio = 1;
}
var gravity = 10;
var scale = 100;

var fullX = 8;
var fullY = 6;
var centerX = fullX / 2;
var centerY = fullY / 2;

//variables 
var brick_density = 10;
var default_brick_friction = 0.5;
var brick_friction = 0.5;
var brick_restitution = 0.2;
var bricks_num_default = 20;
var brick_width = 0.4;
var brick_height = 0.2;

var table_density = 10;
var table_friction = 0.5;
//var table_friction = 1;
var table_restitution = 0.2;

//placeholders 
var world;
var stage;
var bodies = []; // instances of b2Body (from Box2D)
var actors = []; // instances of Bitmap (from IvanK)
var bricks_array = [];
var brick_special = 0;

//control variables 
var brick_init_positions;
var brick_positions_loaded;
var stop_simulation;
var timer = 0;
var ffRate = 1;

var visualize = false;
var loading_data = false;
var animate_time = 2000; //steps before the animation stops 
var settle_time = 1000;
// var settle_time = 200;
var clipNumber = 0;

var noise_type;
var noise_level;
var friction_variance;

var clicking = false;
var clickAng = 0;
var clickGravity = true;



var high = false;
var high_time = 340;

var idControlledObject;
var clickedBricks = [];

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


// simulates how many bricks are left on the table after given noise parameters
function getNoiseResults(data, noiseType, noiseLevel, brickFric, fricVariance, numSamples, getFallen, getData) {
	var noise_list = [];
	brick_positions_loaded = data;
	for (var i = 0; i < numSamples; i++) {
		loading_data = true;
		setupWorld();
		generateBrickPositions();
		loading_data = false;
		settle(10); //settling so contacts can form
		removeBrick(noiseType, noiseLevel, brickFric, fricVariance); // we are no longer using friction variance
		
		if (getFallen) {
			initBricks = []
			bricks_array.forEach(function(brick) {
				if (brick.GetPosition().x > 0) {
					initBricks.push(brick);
				}
			})
			settle();
			var fellBricks = []
			initBricks.forEach(function(brick) {
				if (brick.GetPosition().x === -5) {
					fellBricks.push(parseInt(brick.GetUserData().slice(6)));
				}
			})
			noise_list.push(fellBricks);
		} else {
			settle();
			if (getData) {
				noise_list.push(pushData());
			} else {
				noise_list.push(countGoodBricks());
			}
		}
	}
	return noise_list
}


/*

get the features for a bunch of data:
	- how many bricks are above it
	- how many bricks above it contact it through other stuff
	- above, but with recursive definition of 'above'
	- distance of black brick from edge
	- avg x displacement
	- avg y displacement
	- avg angle deviation from 90 degrees
	- max tower height

*/
function getWorldFeatures(data) {
	setupWorld();
	loadData(data);
	settle(1); //allow contacts to form
	var theBrick = bricks_array[brick_special];

	// perform bfs to find all bricks above the given brick
	var contact_bfs = [brick_special];
	var idx = 0;
	while (idx < contact_bfs.length) {
		var cur = contact_bfs[idx];
		var contact_edge = bricks_array[cur].GetContactList();
		while (true) {
			if (contact_edge === null) {break;}
			var bd = contact_edge.other
			if (bd.GetType() === 2) {
				// sketchily slicing the user data to find the ID
				if (contact_bfs.indexOf(bd.GetUserData().slice(6)) === -1) {
					if (bd.GetPosition().y < theBrick.GetPosition().y - 0.05) {
						contact_bfs.push(bd.GetUserData().slice(6));
					}
				}
			}
			contact_edge = contact_edge.next;
		}
		idx++;
	}

	// perform bfs to find all bricks above given brick that share the same definition of 'above'
	var contact_bfs_selective = [brick_special];
	idx = 0;
	while (idx < contact_bfs_selective.length) {
		var cur = contact_bfs_selective[idx];
		var contact_edge = bricks_array[cur].GetContactList();
		while (true) {
			if (contact_edge === null) {break;}
			var bd = contact_edge.other
			if (bd.GetType() === 2) {
				if (contact_bfs_selective.indexOf(bd.GetUserData().slice(6)) === -1) {
					// difference is here - using the current brick instead of the original brick
					if (bd.GetPosition().y < bricks_array[cur].GetPosition().y - 0.05) {
						contact_bfs_selective.push(bd.GetUserData().slice(6));
					}
				}
			}
			contact_edge = contact_edge.next;
		}
		idx++;
	}

	// heuristics for finding the other features
	var edge_distance = 1.5 - Math.abs(fullX / 2 - theBrick.GetPosition().x)
	var avg_x = 0;
	var avg_y = 0;
	var angle_dev = 0;
	var max_height = 100;
	var brick_count = 0;
	var above_count = 0;
	for (var i = 0; i < bricks_array.length; i++) {
		brick = bricks_array[i]
		if (brick.GetPosition().x < 0) {continue;}
		brick_count += 1;
		if (brick.GetPosition().y < theBrick.GetPosition().y - 0.05) {
			above_count++;
		}
		avg_x += (fullX / 2) - brick.GetPosition().x;
		avg_y += brick.GetPosition().y;
		// a bit tricky to get the angle to make sure it's within our range
		ang = (brick.GetAngle() % (Math.PI/2) + Math.PI/2) % (Math.PI/2);
		angle_dev += Math.min(Math.PI/2 - ang, ang);
		if (brick.GetPosition().y < max_height) {
			max_height = brick.GetPosition().y;
		}
	}

	// need to normalize by height of the table to actually calculate y values
	var table_height = 0.1 + 0.8 + 0.18 + 0.05;
	//averaging by dividing the sum by the number of bricks
	avg_x /= -brick_count;
	avg_y /= brick_count;
	avg_y = fullY - table_height - avg_y
	angle_dev /= brick_count;
	max_height = fullY - table_height - max_height;

	var feature_list = {
		'above_naive':above_count,
		'above_contact_general':contact_bfs.length - 1,
		'above_contact_selective':contact_bfs_selective.length - 1,
		'edge_distance':edge_distance,
		'avg_x':avg_x,
		'avg_y':avg_y,
		'avg_angle':angle_dev,
		'tower_height':max_height
	}
	return feature_list;
}

function getBrickFeatures(data, number) {
	//define some features for individual bricks
	setupWorld();
	loadData(data);
	settle(1); //allow contacts to form
	var theBrick = bricks_array[number];

	// perform bfs to find all bricks above the given brick
	var contact_bfs = [number];
	var idx = 0;
	while (idx < contact_bfs.length) {
		var cur = contact_bfs[idx];
		var contact_edge = bricks_array[cur].GetContactList();
		while (true) {
			if (contact_edge === null) {break;}
			var bd = contact_edge.other
			if (bd.GetType() === 2) {
				// sketchily slicing the user data to find the ID
				if (contact_bfs.indexOf(bd.GetUserData().slice(6)) === -1) {
					if (bd.GetPosition().y < theBrick.GetPosition().y - 0.05) {
						contact_bfs.push(bd.GetUserData().slice(6));
					}
				}
			}
			contact_edge = contact_edge.next;
		}
		idx++;
	}

	// perform bfs to find all bricks above given brick that share the same definition of 'above'
	var contact_bfs_selective = [number];
	idx = 0;
	while (idx < contact_bfs_selective.length) {
		var cur = contact_bfs_selective[idx];
		var contact_edge = bricks_array[cur].GetContactList();
		while (true) {
			if (contact_edge === null) {break;}
			var bd = contact_edge.other
			if (bd.GetType() === 2) {
				if (contact_bfs_selective.indexOf(bd.GetUserData().slice(6)) === -1) {
					// difference is here - using the current brick instead of the original brick
					if (bd.GetPosition().y < bricks_array[cur].GetPosition().y - 0.05) {
						contact_bfs_selective.push(bd.GetUserData().slice(6));
					}
				}
			}
			contact_edge = contact_edge.next;
		}
		idx++;
	}

	// heuristics for finding the other features
	var edge_distance = 1.5 - Math.abs(fullX / 2 - theBrick.GetPosition().x)
	var max_height = 100;
	var above_count = 0;
	for (var i = 0; i < bricks_array.length; i++) {
		if (brick.GetPosition().y < theBrick.GetPosition().y - 0.05) {
			above_count++;
		}
		if (brick.GetPosition().y < max_height) {
			max_height = brick.GetPosition().y;
		}
	}

	// need to normalize by height of the table to actually calculate y values
	var table_height = 0.1 + 0.8 + 0.18 + 0.05;
	var ang = (theBrick.GetAngle() % (Math.PI/2) + Math.PI/2) % (Math.PI/2);
	var angle_dev = Math.min(Math.PI/2 - ang, ang);
	var yPos = fullY - table_height - brick.GetPosition().y;
	var max_height = fullY - table_height - max_height;
	var percHeight = yPos / max_height;


	var feature_list = {
		'above_naive':above_count,
		'above_contact_general':contact_bfs.length - 1,
		'above_contact_selective':contact_bfs_selective.length - 1,
		'edge_distance':edge_distance,
		'angle_dev':angle_dev,
		'height_percent':percHeight
	}
}


/*

MAIN FUNCTIONS *********************************************

*/

//SAMPLING AND SAVING A LOT OF DATA
function sample(num, reps) {
	var table = {};
	clicking = false;
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
	clicking = false;
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
	loadData(brick_init_positions);
	settle(10);
	removeBrick('none', 0, brick_friction, 0);
	settle();

	var ground_truth = pushData();
	var ground_count = countGoodBricks();

	var final_count = [];
	for (var i = 0; i < reps; i++) {
		loadData(brick_init_positions);
		settle(10);
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

function clickBricks() {
	visualize = true;
	setupWorld();
	timer = 0;
	beginVis();
	bricks_array = []
	if (!clicking) {
		clicking = true;
		stage.addEventListener(MouseEvent.MOUSE_DOWN, AddBrick);
	}
}

function AddBrick(e) {
	var bd = new BitmapData('static/images/brick.png');
	var bm = new Bitmap(bd);
	//Resize the image and location depending on the pixel ratio/zoom level
	bm.scaleX = ratio;
	bm.scaleY = ratio;
	var angle = clickAng;
	bm.x = e.target.mouseX / ratio;
	bm.y = e.target.mouseY / ratio;

	bricks_array.push(
		createBox(brick_width, brick_height, bm.x, bm.y, clickAng * Math.PI / 180, b2Body.b2_dynamicBody, brick_density, default_brick_friction, brick_restitution, "brick_" + bricks_array.length, 'static/images/brick.png')
	)
	console.log(bricks_array)
}

// function RemoveBrick(e) {
// 	console.log(e.target)
// 	if (e.id !== undefined) {
// 		stage.removeChild(bricks_array[e.id]);
// 		bricks_array.splice(bricks_array)
// 	}
// }

function changeGravity(grav) {
	clickGravity = grav;
}

function changeAngle(ang) {
	clickAng = parseInt(ang);
}



//VISUALIZING SINGLE ANIMATIONS OF DATA
function animate() {
	clicking = false;
	visualize = true;
	setupWorld();
	generateBrickPositions();
	loading_data = false;
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
	visualize = true;
	$.ajax({
		url: 'static/'+prefix + number + '.json',
		dataType: 'json',
		success: function(response) {
			loading_data = true;
			brick_positions_loaded = response;
			if (shouldianimate) {
				animate();
			} else {
				setupWorld();
				generateBrickPositions();
				//settle();
				loading_data = false;
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
	high = false
	loading_data = true;
	$.ajax({
		url: 'data/' + number + '.json',
		dataType: 'json',
		success: function(response) {
			brick_positions_loaded = response;
			setupWorld();
			generateBrickPositions();
			settle(10);
			// console.log(response)
			// console.log(getNoiseResults(response, 'none', 0, 0.5, 0, 1, true, false))

			loading_data = false;
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

//LOAD A LIST OF IDS AND SAVE THE CORRESPONDING INITIAL AND FINAL IMAGES
function loadAndSave(list) {
	visualize = true;
	loading_data = true;
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
				settle(1)
				takeScreenshot(curSetting+"_"+list[curIndex]+".png");
				endVis();
				curIndex += 1;
				iterateNext();
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
	}

	//ground
	createBox(width = centerX,
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
	//check how many bricks to actually initialize with
	var bricks_num = (loading_data) ? brick_positions_loaded.length : bricks_num_default;
	for (var i = 0; i < bricks_num; i++) {
		console.log(high)
		var brick_image = (i === brick_special && !high) ? "static/images/brick_special.png" : "static/images/brick.png";
		if (loading_data) {
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
	// various noise models affecting the brick
	if (noiseType === "dxy-local") {
		var contact_list = getContacts(theBrick);
		contact_list.forEach(function (contact) {
			var x = contact.GetPosition().x;
			var y = contact.GetPosition().y;
			//arbitrary choice of 8 gives reasonable noise
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
	} else if (noiseType === "dx-local-above") {
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
		// arbitrary choice of 100 gives reasonable noise
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
	} else if (noiseType === "impulse-local-above-extended") {
		var contact_list = getExtendedContactsAbove(theBrick);
		contact_list.forEach(function (brick) {
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

// gets all contacts, i.e. other bricks touching this brick
function getContacts(brick) {
	var contact_list = [brick];
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

// same but only returns contacts whose contact point is above the center of mass of this brick
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
			if (contact_edge.other.GetType() === 2 && yval < brick.GetPosition().y - 0.05 && brick.GetPosition().y > contact_edge.other.GetPosition().y) {
				contact_list.push(contact_edge.other)
			}
		}
		contact_edge = contact_edge.next
	}
	return contact_list;
}

function getExtendedContactsAbove(brick) {
	var contact_list = [brick];
	idx = 0;
	while (idx < contact_list.length) {
		var cur = contact_list[idx];
		above_list = getContactsAbove(cur);
		above_list.forEach(function(abrick) {
			if (contact_list.indexOf(abrick) === -1) {
				contact_list.push(abrick);
			}
		})
		idx++;
	}
	return contact_list
}


//allow bricks to settle, without animation
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
	bricks_array.forEach(function (brick) {
		array.push({
			"name": brick.GetUserData(),
			"x": brick.GetPosition().x,
			"y": brick.GetPosition().y,
			"angle": brick.GetAngle()
		});
	})
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
	bricks_array = [];
	for (var i = 0; i < data.length; i++) {
		var brick = createBox(brick_width, brick_height, data[i].x, data[i].y, data[i].angle, b2Body.b2_dynamicBody, brick_density, brick_friction, brick_restitution, data[i].name, null)
		bricks_array.push(brick);
		if (data[i].x === -5) {
			world.DestroyBody(brick);
		}
	}
}

try {
	module.exports = {
		getNoiseResults: getNoiseResults,
		getWorldFeatures: getWorldFeatures,
		getBrickFeatures: getBrickFeatures,
		getMeanVariance: getMeanVariance
	}
} catch (ReferenceError){}
