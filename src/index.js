import * as THREE from 'three';
import { Camera, Group, LessStencilFunc, Mesh, ShapePath, Side, Vector2, Vector3 } from 'three';
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OBB } from 'three/examples/jsm/math/OBB';

/* SCENES */
const scenes = [new THREE.Scene(), new THREE.Scene()];
scenes[0].background = new THREE.Color(0x000000);

/* CAMERAS */
const camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.1, 100000 );
const miniMapCam = new THREE.OrthographicCamera(window.innerWidth / -2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / -2, 0.1, 10000);
const startCam = new THREE.OrthographicCamera(window.innerWidth / -2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / -2, 0.1, 10000);

/* RENDERER */
const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

/* MATERIALS */
const greenMat = new THREE.MeshBasicMaterial({color: 0x2ec27e});
const redMat = new THREE.MeshBasicMaterial({color: 0xe01b24});
const metallicMat = new THREE.MeshPhongMaterial({color: 0xFFFFFF});

/* LOADING MODELS */
const loader = new GLTFLoader();

// Player Car Model
const carScene = await loader.loadAsync("/assets/vintage_car.glb")
const carModel = carScene.scene;
scenes[0].add(carModel);
carModel.userData.obb = new OBB().fromBox3(new THREE.Box3().setFromObject(carModel));
carModel.userData.currentOBB = new OBB();
carModel.position.x = 1670;
carModel.position.z = -9370;

// Track Model
const trackScene = await loader.loadAsync("/assets/track.glb");
const track = trackScene.scene;
scenes[0].add(track);
track.scale.x = 200;
track.scale.y = 200;
track.scale.z = 200;

// Audience
const audienceScene = await loader.loadAsync("/assets/audience.glb");
const audience = audienceScene.scene;
scenes[0].add(audience);
audience.scale.x = 200;
audience.scale.y = 200;
audience.scale.z = 200;
audience.userData.obb = new OBB().fromBox3(new THREE.Box3().setFromObject(audience));

// Fuel Can
const FuelCanScene = await loader.loadAsync("/assets/gasoline_canister.glb");
const fuelCan = FuelCanScene.scene;
// scenes[0].add(fuelCan);
fuelCan.scale.x = 0.6;
fuelCan.scale.y = 0.6;
fuelCan.scale.z = 0.6;

// opponent
const orangeScene = await loader.loadAsync("/assets/orange_car.glb");
const greenScene = await loader.loadAsync("/assets/green_car.glb");
const blueScene = await loader.loadAsync("/assets/blue_car.glb");
var opponents = [
	orangeScene.scene.clone(),
	blueScene.scene.clone(),
	greenScene.scene.clone(),
];


/* MINIMAP CONSTANTS */
const p = 20;
const q = 30;
const l = window.innerWidth/5;
const b = window.innerHeight/5;
const x = (window.innerWidth - l - q);
const y = (window.innerHeight - b - p);

/* CAR CONSTANTS */
const handling = 0.0005;
const terminalAngularVelocity = 1.7;
const acc = 500;
const brakeAcc = 2000;
const backAcc = 300;
const friction = 200;
const terminalSpeed = 5000;
const mileage = 0.005;
const fuelCanCapacity = 25;

/* CAR VARIABLES */
var speed = 0;
var laps = -1;
var health = 100 + opponents.length * 10;
var fuel = 100;
var time = 0;
var distanceToNextFuelCan = 0;

/* HUD */
// fuel text
{
	var fuelText = document.createElement('div');
	fuelText.style.position = 'absolute';
	fuelText.style.fontStyle = "Verdana";
	fuelText.style.color = "white";
	fuelText.style.fontSize = 2 + "rem";
	fuelText.innerHTML = "Fuel Left: " + fuel;
	fuelText.style.top = 10 + 'px';
	fuelText.style.left = 1050 + 'px';
	document.body.appendChild(fuelText);
}

// score text
{
	var lapsText = document.createElement('div');
	lapsText.style.position = 'absolute';
	lapsText.style.fontStyle = "Verdana";
	lapsText.style.color = "white";
	lapsText.style.fontSize = 2 + "rem";
	lapsText.innerHTML = "Laps: " + laps;
	lapsText.style.top = 45 + 'px';
	lapsText.style.left = 1050 + 'px';
	document.body.appendChild(lapsText);
}

// health text
{
	var healthText = document.createElement('div');
	healthText.style.position = 'absolute';
	healthText.style.fontStyle = "Verdana";
	healthText.style.color = "white";
	healthText.style.fontSize = 2 + "rem";
	healthText.innerHTML = "Health: " + health;
	healthText.style.top = 80 + 'px';
	healthText.style.left = 1050 + 'px';
document.body.appendChild(healthText);
}

// time
{
	var timeText = document.createElement('div');
	timeText.style.position = 'absolute';
	timeText.style.fontStyle = "Verdana";
	timeText.style.color = "white";
	timeText.style.fontSize = 2 + "rem";
	timeText.innerHTML = "Time Elapsed: " + time;
	timeText.style.top = 115 + 'px';
	timeText.style.left = 1050 + 'px';
	document.body.appendChild(timeText);
}

// next fuel can distance
{
	var fcDistanceText = document.createElement('div');
	fcDistanceText.style.position = 'absolute';
	fcDistanceText.style.fontStyle = "Verdana";
	fcDistanceText.style.color = "white";
	fcDistanceText.style.fontSize = 2 + "rem";
	fcDistanceText.innerHTML = "Closest Fuel: " + distanceToNextFuelCan;
	fcDistanceText.style.top = 150 + 'px';
	fcDistanceText.style.left = 1050 + 'px';
	document.body.appendChild(fcDistanceText);
}

// game start text
{
	var gameStartText = document.createElement('div');
	gameStartText.style.position = 'absolute';
	gameStartText.style.fontStyle = "Verdana";
	gameStartText.style.fontSize = 2 + "rem";
	gameStartText.style.textAlign = "center";
	gameStartText.innerHTML = !isStarted ? "Use WASD to move.<br>Check in to all checkpoints to complete a lap.<br>Press SPACE to start the game" : "";
	gameStartText.style.top = window.innerHeight/2 - 100 + 'px';
	gameStartText.style.left = window.innerWidth/2 - 330 + 'px';
	document.body.appendChild(gameStartText);
}

// game over text
{
var gameOverText = document.createElement('div');
gameOverText.style.position = 'absolute';
gameOverText.style.fontStyle = "Verdana";
gameOverText.style.color = "white";
gameOverText.style.fontSize = 2 + "rem";
gameOverText.style.textAlign = "center";
gameOverText.innerHTML = gameOver ? "Game Over<br>" : "";
gameOverText.style.top = window.innerHeight/2 - 100 + 'px';
gameOverText.style.left = window.innerWidth/2 - 330 + 'px';
document.body.appendChild(gameOverText);
}
/* CLOCK */
var clock = new THREE.Clock();
var dt = 0;

/* TRACK CONSTANTS */
const track_width = 1900;

const checkPointCoords = 
[
	new THREE.Vector3(1000, 0, -9200),
	new THREE.Vector3(970, 5, -700),
	new THREE.Vector3(-1138 + track_width/2 * Math.sin(-0.0955), 5, 1900 + track_width/2 * Math.cos(-0.0955)),
	new THREE.Vector3(-4293.78 + track_width/2 * Math.sin(-66.847), 5, -1600 + track_width/2 * Math.cos(-66.487)),
	new THREE.Vector3(-6700 + track_width/2 * Math.sin(-0.849), 5, -4382 + track_width/2 * Math.cos(-0.849)),
	new THREE.Vector3(-6700 + 500/2 * Math.sin(-2.417), 5, -10672 + 500/2 * Math.cos(-2.417)),
	new THREE.Vector3(-5380 + 500/2 * Math.sin(-5.489), 5, -13368 + 500/2 * Math.cos(-5.489)),
	new THREE.Vector3(-2700 + 500/2 * Math.sin(-5.489), 5, -14800 - 500/2 * Math.cos(-5.489)),
	new THREE.Vector3(6724 + track_width/2 * Math.sin(-4.156), 5, -14508 + track_width/2 * Math.cos(-4.156)),
	new THREE.Vector3(6876 + track_width/2 * Math.sin(-4.894), 5, -13875 + track_width/2 * Math.cos(-4.894)),
	new THREE.Vector3(2412 + track_width/2 * Math.sin(-2.4149), 5, -10661 + track_width/2 * Math.cos(-2.4149)),
];
const checkPointRots = 
[
	Math.PI/2,
	Math.PI/2,
	-0.0955,
	-66.847,
	-0.849,
	-2.417,
	-5.489,
	-5.489 + Math.PI,
	-4.156,
	-4.894,
	-2.4149
];
const checkPoints = 
[
	new THREE.Mesh(	new THREE.BoxGeometry(10, 10, 1900)),
	new THREE.Mesh(	new THREE.BoxGeometry(10, 10, 1900)),
	new THREE.Mesh(	new THREE.BoxGeometry(10, 10, 1900)),
	new THREE.Mesh(	new THREE.BoxGeometry(10, 10, 1900)),
	new THREE.Mesh( new THREE.BoxGeometry(10, 10, 1900)),
	new THREE.Mesh(	new THREE.BoxGeometry(10, 10, 500)),
	new THREE.Mesh(	new THREE.BoxGeometry(10, 10, 500)),
	new THREE.Mesh(	new THREE.BoxGeometry(10, 10, 500)),
	new THREE.Mesh(	new THREE.BoxGeometry(10, 10, 1900)),
	new THREE.Mesh(	new THREE.BoxGeometry(10, 10, 1900)),
	new THREE.Mesh(	new THREE.BoxGeometry(10, 10, 1900)),
];

const n_checkPoints = checkPoints.length;
for (let i = 0; i < n_checkPoints; i++) {
	checkPoints[i].material.copy(redMat);
	checkPoints[i].userData.obb = new OBB().fromBox3(new THREE.Box3().setFromObject(checkPoints[i]));
	checkPoints[i].position.copy(checkPointCoords[i]); 	
	checkPoints[i].rotation.y = checkPointRots[i];
	checkPoints[i].userData.isChecked = false;
	checkPoints[i].userData.currentOBB = new OBB();
	scenes[0].add(checkPoints[i]);
}
checkPoints[0].userData.isChecked = true;
checkPoints[0].material.color.set(0x2ec27e);

// Fuel Can Coords
const fuelCanCoords = 
[
	[new THREE.Vector3(1670, 50, -270), new THREE.Vector3(1170, 50, -270), new THREE.Vector3(670, 50, -270)],
	[new THREE.Vector3(-2167, 50, 571), new THREE.Vector3(-2667, 50, 571), new THREE.Vector3(-3167, 50, 571)],
	[new THREE.Vector3(-7224, 50, -6680), new THREE.Vector3(-7724, 50, -6680), new THREE.Vector3(-8224, 50, -6680)],
	[new THREE.Vector3(1596, 50, -15216), new THREE.Vector3(1596, 50, -15716), new THREE.Vector3(1596, 50, -16216)]
];

const fuelCans = 
[
	fuelCan.clone(),
	fuelCan.clone(),
	fuelCan.clone(),
	fuelCan.clone(),
];


for(let i = 0; i < fuelCans.length; i++) {
	fuelCans[i].userData.obb = new OBB().fromBox3(new THREE.Box3().setFromObject(fuelCan));
	fuelCans[i].position.copy(fuelCanCoords[i][Math.floor(Math.random() * 3)]);
	fuelCans[i].userData.currentOBB = new OBB();
	scenes[0].add(fuelCans[i]);
}

for(let i = 0; i < opponents.length; i++) {
	opponents[i].userData.obb = new OBB().fromBox3(new THREE.Box3().setFromObject(opponents[i]));
	opponents[i].userData.currentOBB = new OBB();
	opponents[i].userData.health = 50 + opponents.length * 10;
	opponents[i].userData.speed = terminalSpeed * (0.7 + 0.3 * (i+1));
	opponents[i].userData.isDead = false;
	opponents[i].userData.target = new THREE.Vector3();
	opponents[i].userData.target.copy(checkPointCoords[0]);
	opponents[i].userData.laps = new Number(-1);
	setTarget(i);
	
	scenes[0].add(opponents[i]);
}
opponents[0].position.x = 1670 - 1000;
opponents[0].position.z = -9370 + 1000;
opponents[1].position.x = 1670;
opponents[1].position.z = -9370 + 2000;
opponents[2].position.x = 1670 - 1000;
opponents[2].position.z = -9370 + 3000;

/* LIGHTING */
const color = 0xFFFFFF;
const intensity = 2;
const light = new THREE.HemisphereLight(color, intensity);
light.position.set(-1, 100, 100);
scenes[0].add(light);
const ambient = new THREE.AmbientLight(color, 0.3);
scenes[0].add(ambient);

var isStarted = false;
var gameOver = false;
var cansToBeSpawned = [];
function animate() {
	requestAnimationFrame( animate );

	if(gameOver) {
		console.log("game over");
		const vals = ["Orange", "Blue  ", "Green "];
		var ranking = [[], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], []];
		for (let i = 0; i < opponents.length; i++) {
			ranking[opponents[i].userData.laps].push(i);
		}
		ranking[laps].push("You   ");
		let s = "";
		for(let i = ranking.length-1; i > -1; i--) {
			if(ranking[i].length === 0) continue;
			else{
				for(let j = 0; j < ranking[i].length; j++) {
					if(ranking[i][j] === "You   ")
					{
						s += ranking[i][j] + "      " + laps + "<br>";
						continue;
					}
					s += vals[ranking[i][j]] + "      " + opponents[ranking[i][j]].userData.laps + "<br>";
				}
			}
		}
		gameOverText.innerHTML = "Game Over!<br>" + s;
		console.log(s);
		return;
	}

	if(!isStarted) {
		setupKeyControls();
		renderer.render( scenes[1], startCam );
		return;
	}

	dt = clock.getDelta();

	gameStartText.innerHTML = !isStarted ? "Use WASD to move.<br>Check in to all checkpoints to complete a lap.<br>Press SPACE to start the game" : "";
	distanceToNextFuelCan = Infinity;
	let closestIdx = 0;
	for(let i = 0; i < fuelCans.length; i++) {
		let thebigD = carModel.position.distanceTo(fuelCans[i].position);
		if(distanceToNextFuelCan > thebigD) {
			distanceToNextFuelCan = thebigD;
			closestIdx = i;
		}
	}
	fuelCans[closestIdx].rotation.y += 0.03;
	fcDistanceText.innerHTML = "Closest Fuel: " + Math.floor(distanceToNextFuelCan);
	timeText.innerHTML = "Time Elapsed: " + Math.floor(time);
	healthText.innerHTML = "Health: " + health;
	lapsText.innerHTML = "Laps: " + laps;
	fuelText.innerHTML = "Fuel left: " + Math.max(Math.floor(fuel), 0);	
	// console.log("x: ", carModel.position.x, "z: ", carModel.position.z);
	// console.log(carModel.rotation.y);

	setupKeyControls();
	carController();
	carModel.position.z += speed * dt * Math.cos(carModel.rotation.y);
	carModel.position.x += speed * dt * Math.sin(carModel.rotation.y);
	carModel.userData.currentOBB.copy(carModel.userData.obb);
	carModel.userData.currentOBB.applyMatrix4(carModel.matrixWorld);

	for(let i = 0; i < n_checkPoints; i++) {
		checkPoints[i].userData.currentOBB.copy(checkPoints[i].userData.obb);
		checkPoints[i].userData.currentOBB.applyMatrix4(checkPoints[i].matrixWorld);
	}
	

	// console.log(fuel);
	// console.log(speed);
	if(fuel < 0 && speed == 0) {
		gameOver = true;
		return;
	}

	time += dt;

	for(let i = 1; i < n_checkPoints; i++) {
		if(carModel.userData.currentOBB.intersectsOBB(checkPoints[i].userData.currentOBB) &&
		   checkPoints[i-1].userData.isChecked) {
			checkPoints[i].material.color.set(0x2ec27e);
			console.log(i);
			checkPoints[i].userData.isChecked = true;
		}
	}

	if(carModel.userData.currentOBB.intersectsOBB(checkPoints[0].userData.currentOBB) && 
	   checkPoints[n_checkPoints-1].userData.isChecked) {
		laps++;
		console.log(laps);
		for(let i = 1; i < n_checkPoints; i++) {
			checkPoints[i].material.color.set(0xe01b24);
			checkPoints[i].userData.isChecked = false;
		}
	}

	if(audience.userData.obb.intersectsOBB(carModel.userData.currentOBB) || 
	   carModel.position.z > 5050 || carModel.position.z < -18040 || 
	   carModel.position.x > 10044 || carModel.position.x < -10030) {
		speed = 0;
		const closest = nearestCheckPoint(carModel, true);
		carModel.position.copy(checkPoints[closest].position);
		carModel.rotation.y = checkPointRots[closest] - Math.PI/2;
	}
	
	for(let i = 0; i < fuelCans.length; i++) {
		fuelCans[i].rotation.y += 0.01;	
		fuelCans[i].userData.obb.rotation.y += 0.01;
		if(carModel.userData.currentOBB.intersectsOBB(fuelCans[i].userData.obb)) {
			fuel = Math.min(fuelCanCapacity + fuel, 100);
			fuelCans[i].position.y = -100000;
			fuelCans[i].userData.obb.center.y = -100000;
			if(cansToBeSpawned.length > 0) {
				let idx = cansToBeSpawned.shift();
				fuelCans[idx].position.copy(fuelCanCoords[idx][Math.floor(Math.random() * 3)])
				fuelCans[idx].userData.obb.center.copy(fuelCans[idx].position);
			}
			cansToBeSpawned.push(i);
		}
	}

	setCamera();
	moveOpponent();
	
	// OPPONENTS
	for(let i = 0; i < opponents.length; i++) {
		if(opponents[i].userData.isDead) {
			continue;
		}
		opponents[i].userData.currentOBB.copy(opponents[i].userData.obb);
		opponents[i].userData.currentOBB.applyMatrix4(opponents[i].matrixWorld);
		if(carModel.userData.currentOBB.intersectsOBB(opponents[i].userData.currentOBB)) {
			speed = speed < 0 ? (speed  * 0.8) : (-speed * 0.8);
			var dir = opponents[i].position.clone();
			dir.sub(carModel.position);
			dir.divideScalar(dir.length());
			dir.multiplyScalar(20);
			carModel.position.copy(carModel.position.sub(dir));
			opponents[i].position.copy(opponents[i].position.add(dir));
			opponents[i].userData.health -= 10;
			health -= 10;
			if(health <= 0) {
				gameOver = true;
			}
			if(opponents[i].userData.health <= 0) {
				opponents[i].userData.isDead = true;
				opponents[i].visible = false;
			}
		}
	}

	for(let i = 0; i < opponents.length; i++) {
		if(opponents[i].userData.isDead) continue;
		if(opponents[i].position.z > 5050 || opponents[i].position.z < -18040 || 
		opponents[i].position.x > 10044 || opponents[i].position.x < -10030) {
			const closest = nearestCheckPoint(opponents[i], false);
			opponents[i].userData.speed = 0;
			opponents[i].position.copy(checkPoints[closest].position);
			opponents[i].rotation.y = checkPointRots[closest] - Math.PI/2;
		}
	}
	

	renderer.setScissorTest(true);
	
	renderer.setScissor( 0, 0, window.innerWidth, window.innerHeight )
	renderer.setViewport( 0, 0, window.innerWidth, window.innerHeight )
	renderer.render( scenes[0], camera );
	
	renderer.setScissor(x, y, l, b);
	renderer.setViewport(x, y, l, b);
	renderer.render( scenes[0], miniMapCam );

	renderer.setScissorTest(false);

};

function moveOpponent() {
	for(let i = 0; i < opponents.length; i++) {
		opponents[i].userData.speed = Math.min(terminalSpeed * 0.4 * (i+1), opponents[i].userData.speed + acc*dt);
		var d = opponents[i].position.distanceTo(opponents[i].userData.target);
		if(d <= 1000) {
			console.log("Pohonch gaya");
			if((opponents[i].userData.targetIndex % n_checkPoints)=== 0) opponents[i].userData.laps++;
			opponents[i].userData.targetIndex += 1;
			opponents[i].userData.target.copy(checkPointCoords[opponents[i].userData.targetIndex % (n_checkPoints)]);
			d = opponents[i].position.distanceTo(opponents[i].userData.target);
		}
		opponents[i].userData.d = d;
		opponents[i].userData.cosT =  (opponents[i].userData.target.z - opponents[i].position.z) / d;
		opponents[i].userData.sinT = (opponents[i].userData.target.x - opponents[i].position.x) / d;
		opponents[i].userData.sinA = Math.sin(opponents[i].rotation.y);
		opponents[i].userData.cosA = Math.cos(opponents[i].rotation.y);
		opponents[i].rotation.y += (2 * opponents[i].userData.speed * (opponents[i].userData.sinT * opponents[i].userData.cosA - opponents[i].userData.sinA * opponents[i].userData.cosT)) / opponents[i].userData.d * dt;
		opponents[i].position.x += dt * opponents[i].userData.speed * Math.sin(opponents[i].rotation.y);
		opponents[i].position.z += dt * opponents[i].userData.speed * Math.cos(opponents[i].rotation.y);
	}
}

function setTarget(i) {
	opponents[i].userData.targetIndex = 0;
}

function nearestCheckPoint(car, isPlayer) {
	var leastDistance = Infinity;
	var closestCheckPointIndex = 0;
	for (let i = 1; i < n_checkPoints; i++) {
		if(!checkPoints[i].userData.isChecked && isPlayer)
			continue;

		const currDistance = checkPoints[i].position.distanceTo(car.position);
		if(currDistance < leastDistance) {
			leastDistance = currDistance;
			closestCheckPointIndex = i;
		}
	}
	return closestCheckPointIndex;
}

var keys = {};
var ToggleE = false; // false: third person, true: first person

function setupKeyControls() {
	document.onkeydown = 
		function(e) {
			if(e.code == 'KeyD') {
				keys['D'] = true;
			}
			if(e.code == 'KeyS') {
				keys['S'] = true;
			}
			if(e.code == 'KeyA') {
				keys['A'] = true;
			}
			if(e.code == 'KeyW') {
				keys['W'] = true;
			}
			if(e.code == 'KeyE') {
				keys['E'] = true;
			}
			if(e.code == 'KeyK') {
				keys['K'] = true;
			}
			if(e.code == 'KeyL') {
				keys['L'] = true;
			}
			if(e.code == 'Space') {
				keys['Space'] = true;
			}
		};
	document.onkeyup =  
		function(e) {
			if(e.code == 'KeyD') {
				keys['D'] = false;
			}
			if(e.code == 'KeyS') {
				keys['S'] = false;
			}
			if(e.code == 'KeyA') {
				keys['A'] = false;
			}
			if(e.code == 'KeyW') {
				keys['W'] = false;
			}
			if(e.code == 'KeyE') {
				keys['E'] = true;
				ToggleE = !ToggleE;
			}
			if(e.code == 'KeyK') {
				keys['K'] = false;
			}
			if(e.code == 'KeyL') {
				keys['L'] = false;
			}
			if(e.code == 'Space') {
				keys['Space'] = false;
				isStarted = true; 
			}
		};
}

function carController() {
	if(keys['D']) {
		if(speed > 0) {
			carModel.rotation.y -= Math.min(terminalAngularVelocity, speed * handling) * dt;
		}
		else {
			carModel.rotation.y -= Math.max(-terminalAngularVelocity, speed * handling) * dt;
		}
	}
	if(keys['S']) {
		if(speed > 0) {
			speed -= brakeAcc * dt;
		}
		else if(fuel > 0){
			fuel += mileage * speed * dt;
			speed -= backAcc * dt;
			speed = Math.max(speed, -terminalSpeed);
		}
	}
	if(keys['A']) {
		if(speed > 0) {
			carModel.rotation.y += Math.min(terminalAngularVelocity, speed * handling) * dt;
		}
		else {
			carModel.rotation.y += Math.max(-terminalAngularVelocity, speed * handling) * dt;
		}
	}
	if(keys['W']) {
		if(speed < 0) {
			speed += brakeAcc * dt;
		}
		else if(fuel > 0){
			fuel -= mileage * speed * dt;
			speed += acc * dt;
			speed = Math.min(speed, terminalSpeed)
		}
	}
	if(!keys['W'] && !keys['S']) {
		if(speed < 1 && speed > -1) {
			speed = 0;
			return;
		}
		speed += friction * ((speed < 0) ? 1 : -1) * dt;
	}
};

function setCamera() {
	var offset = [-450, 170];
	var phase = Math.PI;
	var driverSeat = -8;
	if(ToggleE) {
		offset[0] = -2;
		offset[1] = 79;
	}
	camera.position.x = carModel.position.x + offset[0] * Math.sin(carModel.rotation.y) - driverSeat * Math.cos(carModel.rotation.y); 
	camera.position.z = carModel.position.z + offset[0] * Math.cos(carModel.rotation.y) + driverSeat * Math.sin(carModel.rotation.y);
	camera.position.y = carModel.position.y + offset[1];
	// if(Math.abs(carModel.rotation.y - camera.rotation.y) >= 0.5) {
	// 	if(carModel.rotation.y - camera.rotation.y < 0) {
	// 		camera.rotation.y = carModel.rotation.y + 0.5 + Math.PI;
	// 	}
	// 	else {
	// 		camera.rotation.y = carModel.rotation.y - 0.5 + Math.PI;
	// 	}
	// }
	// camera.rotation.y = carModel.rotation.y + phase;

	if(!ToggleE)
		camera.lookAt(new Vector3(carModel.position.x, carModel.position.y + offset[1]/2, carModel.position.z)); 
	else{
		camera.lookAt(new Vector3(camera.position.x, camera.position.y, camera.position.z));
		camera.rotation.y = carModel.rotation.y + phase;
	}	
		// mini-map camera

	miniMapCam.position.x = carModel.position.x;
	miniMapCam.position.y = carModel.position.y + 500;
	miniMapCam.position.z = carModel.position.z;
	miniMapCam.lookAt(carModel.position);
};

animate();
Footer