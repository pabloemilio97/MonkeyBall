let WIDTH = window.innerWidth;
let HEIGHT = window.innerHeight;

//Initialize game object
let Game = {};

//Initialize game controls
let orbitControls = null;
let tiltForward = null;
let tiltLeft = null;
let tiltBackward = null;
let tiltRight = null;

//Events when certain keys are pressed
Game.onKeyDown = function ( event )
{
    switch ( event.keyCode ) {

        case 38: // up
        case 87: // w
            tiltForward = true;
            break;

        case 37: // left
        case 65: // a
            tiltLeft = true; 
            break;

        case 40: // down
        case 83: // s
            tiltBackward = true;
            break;

        case 39: // right
        case 68: // d
            tiltRight = true;
            break;

        case 32: // space for reset
            Game.reset();
            break;
    }

}

//Events when certain keys are released
Game.onKeyUp = function (event) {
    switch( event.keyCode ) {
        case 38: // up
        case 87: // w
            tiltForward = false;
            break;

        case 37: // left
        case 65: // a
            tiltLeft = false;
            break;

        case 40: // down
        case 83: // s
            tiltBackward = false;
            break;

        case 39: // right
        case 68: // d
            tiltRight = false;
            break;

    }
}

//Helper function for loading OBJ models

Game.load3dModel = function(objModelUrl, mtlModelUrl){
    mtlLoader = new THREE.MTLLoader();
    mtlLoader.load(mtlModelUrl, materials =>{
        materials.preload();
        objLoader = new THREE.OBJLoader();
        
        objLoader.setMaterials(materials);

        objLoader.load(objModelUrl, object=>{
            this.monkeyLoaded = true;
            this.monkey = object;
            object.rotation.x = - Math.PI / 2;
            object.scale.set(0.1, 0.1, 0.1);
            this.scene.add(object);
        });
    });
}


//Fetch canvas, create camera and scene and initial meshes

Game.init = function() {
    //Keeps track of time elapsed
    this.timestamp = 0;

    // setup a WebGL renderer within an existing canvas
    this.canvas = document.getElementById("canvas");
    this.canvas.width = WIDTH;
    this.canvas.height = HEIGHT;
    this._previousElapsed = 0; //For tick

    //Renderer settings
    this.renderer = new THREE.WebGLRenderer({canvas: canvas});
    this.renderer.setViewport(0, 0, WIDTH, HEIGHT);

    // Turn on shadows
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.BasicShadowMap;
    
    // create the scene
    this.scene = new THREE.Scene();

    // create a camera
    this.camera = new THREE.PerspectiveCamera( 45, this.canvas.width / this.canvas.height, 1, 4000 );
    this.camera.position.z = 300;
    this.camera.position.y = 100;
    this.camera.position.x = 0;
    this.scene.add(this.camera);

    //Add orbit controls
    orbitControls = new THREE.OrbitControls(this.camera, this.renderer.domElement);

    //Add sky
    let bgTexture = new THREE.TextureLoader().load("../assets/sky.jpeg");
    this.scene.background = bgTexture;

    //Set ground texture
    this.grassTexture = new THREE.TextureLoader().load("../assets/grass.jpeg");
    this.grassTexture.wrapS = THREE.RepeatWrapping;
    this.grassTexture.wrapT = THREE.RepeatWrapping;
    this.grassTexture.repeat.set( 8, 16 );
    this.grassMaterial = new THREE.MeshLambertMaterial({map: this.grassTexture});

    //Set ground bump map
    this.grassMaterial.normalMap = new THREE.TextureLoader().load("../assets/grassNormal.jpeg");  

    //Create ground and add it to the scene
    this.ground = new THREE.Mesh(new THREE.BoxGeometry(100, 400, 3), this.grassMaterial);
    this.ground.rotation.x = -Math.PI / 2;
    this.groundGroup = new THREE.Group()
    this.groundGroup.add(this.ground)

    //Set up shadows for ground
    this.ground.castShadow = true;
    this.ground.receiveShadow = true;

    //Create  player and add it to the scene
    let sphereTexture = new THREE.TextureLoader().load("../assets/ball.png");
    this.sphere = new THREE.Mesh(new THREE.SphereGeometry( 8, 32, 32 ),
    new THREE.MeshPhongMaterial({map: sphereTexture, transparent: true, opacity: 0.6}));
    this.scene.add(this.sphere);

    //Set up shadows for ground
    this.sphere.castShadow = true;
    this.sphere.receiveShadow = true;
    this.sphereInitialPosition = {x: 0, y: 10.1, z: -150};

    //Load monkey
    this.monkeyLoaded = false;
    this.load3dModel("../assets/monkeyObj.obj", "../assets/monkeyMtl.mtl");

    //Create bodies
    this.groundMaterial = new CANNON.Material();
    this.groundShapes = []

    //Create obstacle texture
    this.obstacleTexture = new THREE.TextureLoader().load("../assets/wood.jpeg");
    this.obstacleNormal = new THREE.TextureLoader().load("../assets/woodNormal.jpg");
    this.obstacleBump = new THREE.TextureLoader().load("../assets/woodBump.jpg");
    this.obstacleMaterial = new THREE.MeshLambertMaterial({map: this.obstacleTexture});
    this.obstacleMaterial.normalMap = this.obstacleNormal;
    this.obstacleMaterial.bumpMap = this.obstacleBump;
    this.obstacleMaterial.bumpScale = 10000;

    //Initialize obstacles
    this.obstacles = [];
    this.obstacles.push(this.createObstacleMesh(-20, 4, -120, 60, 5, 30));
    this.obstacles.push(this.createObstacleMesh(20, 4, -40, 60, 5, 30));
    this.obstacles.push(this.createObstacleMesh(0, 6, 20, 60, 10, 10));
    this.obstacles.push(this.createObstacleMesh(-25, 4, 60, 10, 5, 70));
    this.obstacles.push(this.createObstacleMesh(25, 4, 60, 10, 5, 70));

    //Initialize barrel meshes array
    this.barrelMeshes = [];

    //Create goal
    this.goalTexture = new THREE.TextureLoader().load("../assets/goalFlag.jpg");
    this.goalMaterial = new THREE.MeshBasicMaterial({map: this.goalTexture});
    this.goal = new THREE.Mesh(new THREE.BoxGeometry(40, 45, 0.1), this.goalMaterial);
    this.goal.rotation.x = -Math.PI / 2;
    this.goal.position.z = 50;
    this.goal.position.y = 1.5;
    this.groundGroup.add(this.goal)

    //Create barrel material
    this.barrelTexture = new THREE.TextureLoader().load("../assets/barrel.jpg");
    this.barrelMaterial = new THREE.MeshPhongMaterial({map: this.barrelTexture});

    //Add light
    let spotlight = new THREE.SpotLight(0xffffff);
    this.spotlight = spotlight;
    spotlight.shadow.mapSize.width = 4096;
    spotlight.shadow.mapSize.height = 4096;
    spotlight.shadow.camera.near = 500;
    spotlight.shadow.camera.far = 1000;
    spotlight.shadow.camera.fov = 30;
    spotlight.position.set(0, 600, -300);
    spotlight.rotation.x = -Math.PI / 4;
    spotlight.castShadow = true;
    spotlight.power = 3.5;

    this.scene.add(spotlight);

    //Manage if player won
    this.won = false;

    //Event listeners for controls
    document.addEventListener( "keydown", this.onKeyDown, false );
    document.addEventListener( "keyup", this.onKeyUp, false );

    // Create physical world
    this.scene.add(this.groundGroup);

    let groundMeshes = [
        this.ground,
        this.goal,
        ...this.obstacles,
    ];
    this.initPhysicalWorld(groundMeshes);
    
    window.requestAnimationFrame(this.tick);
}

//Sets up physical bodies for obstacles in course
Game.createObstacleMesh = function(px, py, pz, bx, by, bz) {
    obstacleMesh = new THREE.Mesh(new THREE.BoxGeometry(bx, by, bz),
        this.obstacleMaterial);
    this.groundGroup.add(obstacleMesh)
    obstacleMesh.position.x = px;
    obstacleMesh.position.y = py;
    obstacleMesh.position.z = pz;
    //Set up shadows for mesh
    obstacleMesh.castShadow = true;
    obstacleMesh.receiveShadow = true;
    return obstacleMesh;
}

//Resets player position and world settings
Game.reset = function(){
    //Reset sphere
    this.world.remove(this.sphereBody);
    this.sphereBody = this.addMovingBody(this.sphere, {mass: 10}, 
        {x: this.sphereInitialPosition.x,
        y: this.sphereInitialPosition.y,
        z: this.sphereInitialPosition.z}
    );

    //Reset ground
    //Create ground and add it to the scene
    this.groundGroup.rotation.set(0, 0, 0);
    this.groundBody.quaternion.copy(this.groundGroup.quaternion);

    //Destroy all barrels
    for(let i = 0; i < this.barrelBodies.length; i++){
        let barrelBody = this.barrelBodies[i];
        let barrelMesh = this.barrelMeshes[i];
        this.scene.remove(barrelMesh);
        this.world.remove(barrelBody);
    }
}

//Creates the phyisical world and initializes the bodies of the shapes within
Game.initPhysicalWorld = function(groundMeshes){
    //Creates cannon world
    const world = new CANNON.World();
    this.world = world;
    this.fixedTimeStep = 1.0/60.0;
    this.damping = 0.01;
    
    world.broadphase = new CANNON.NaiveBroadphase();
    world.gravity.set(0, -50, 0);
    
    this.debugRenderer = new THREE.CannonDebugRenderer(this.scene, this.world);
        
    // For each cannon shape we want to associate to a mesh
    groundMeshes.forEach(mesh => {
        shape = this.createShapeFromMesh(mesh);
        this.groundShapes.push(shape)
    });

    //Creates physical bodies for each type of shape
    this.groundBody = this.addStaticBody(this.groundShapes);
    this.sphereBody = this.addMovingBody(this.sphere, {mass: 10}, 
        {x: this.sphereInitialPosition.x,
        y: this.sphereInitialPosition.y,
        z: this.sphereInitialPosition.z}
    );

    //Initialize array for barrel bodies
    this.barrelBodies = [];
};

//Creates a bounding box from a mesh for a specific shape
Game.createShapeFromMesh = function (mesh) {
    let shape;
    mesh.geometry.computeBoundingBox();
    let box = mesh.geometry.boundingBox;
    shape = new CANNON.Box(new CANNON.Vec3(
        (box.max.x - box.min.x) / 2,
        (box.max.y - box.min.y) / 2,
        (box.max.z - box.min.z) / 2,
    ));
    let shapeWrapper = {}
    shapeWrapper.shape = shape;
    shapeWrapper.position = new CANNON.Vec3(mesh.position.x, mesh.position.y, mesh.position.z);

    shapeWrapper.quaternion = mesh.quaternion;
    
    return shapeWrapper;
}

//Creates a body for moving objects
Game.addMovingBody = function (mesh, bodyOptions, position) {
    let shape;
    //Create a bounding sphere, else a box
    if (mesh.geometry.type === 'SphereGeometry'){
        mesh.geometry.computeBoundingSphere();
        shape = new CANNON.Sphere(mesh.geometry.boundingSphere.radius);
    }
    else { //Remove if unused
        mesh.geometry.computeBoundingBox();
        let box = mesh.geometry.boundingBox;
        shape = new CANNON.Cylinder(5, 5, 10, 32);
    }

    //Make body position equal to the object position
    let material = new CANNON.Material();
    bodyOptions.material = material;
    let body = new CANNON.Body(bodyOptions);
    body.linearDamping = this.damping;
    body.position.x = position.x;
    body.position.y = position.y;
    body.position.z = position.z;
    body.computeAABB();
    
    // keep a reference to the mesh so we can update its properties later
    body.mesh = mesh;

    let material_ground = new CANNON.ContactMaterial(this.groundMaterial, material, { friction: 1.0, restitution: 0.1});
    this.world.addContactMaterial(material_ground);
    this.world.addBody(body);
    if(mesh.geometry.type === 'CylinderGeometry'){
        this.barrelBodies.push(body);
        body.addShape(shape, new CANNON.Vec3(0, 0, 0), mesh.quaternion);
        body.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0), Math.PI/2);
    }
    else{
        body.addShape(shape);
    }
    return body;
};

//Creates a body for static objects
Game.addStaticBody = function(shapes){
    let body = new CANNON.Body({mass: 0, material: this.groundMaterial});

    shapes.forEach(shape => {
        body.addShape(shape.shape, shape.position, shape.quaternion);
    });

    body.computeAABB();
    this.world.add(body);
    return body;
}

// Updates game by one time unit and calls the update function
Game.tick = function (elapsed) {
    window.requestAnimationFrame(this.tick);

    // compute delta time in seconds -- also cap it
    var delta = (elapsed - this._previousElapsed) / 1000.0
    
    delta = Math.min(delta, 0.25); // maximum delta of 250 ms
    this._previousElapsed = elapsed;

    this.update(delta);
    this.renderer.render(this.scene, this.camera);
    orbitControls.update();
    this.debugRenderer.update();
}.bind(Game);

//Updates game
Game.update = function (delta) {
    function _continuous_random_between(min, max){  
        random = (Math.random() * (max - min)) + min; 
        return random
    }

    this.timestamp += delta;
    this.world.step(delta);

    //Each 3 seconds create a barrel
    if(Math.floor(this.timestamp) % 4 == 3){
        //let cylinderTexture = new THREE.TextureLoader().load("../assets/ball.png");
        let cylinder = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 10, 32), this.barrelMaterial);
        this.scene.add(cylinder);

        //Set up shadows for ground
        cylinder.castShadow = true;
        cylinder.receiveShadow = true;
        this.barrelMeshes.push(cylinder);
        cylinder.rotation.x = Math.PI / 2;
        this.addMovingBody(cylinder, {mass: 100}, 
            {x: _continuous_random_between(-50, 50),
            y: _continuous_random_between(50, 70),
            z: _continuous_random_between(-200, 200)}
        );
        
        this.timestamp = 0;
    }
    
    //Update barrel meshes
    for(let i = 0; i < this.barrelMeshes.length; i++){
        let barrelMesh = this.barrelMeshes[i];
        let barrelBody = this.barrelBodies[i];
        //barrelMesh.rotation.x = Math.PI / 2;
        barrelMesh.position.copy(barrelBody.position);
        barrelMesh.quaternion.copy(barrelBody.quaternion);
    }

    // Sync sphere mesh with body
    this.sphere.position.copy(this.sphereBody.position);
    this.sphere.quaternion.copy(this.sphereBody.quaternion);

    if(this.monkeyLoaded){
        this.monkey.position.copy(this.sphere.position);
        this.monkey.position.y -= 5;
    }

    // Sync camera position with sphere
    this.camera.position.z = this.sphere.position.z + 100;
    this.camera.position.y = this.sphere.position.y + 50;
    this.camera.position.x = this.sphere.position.x;
    this.camera.lookAt(this.sphere.position.x, this.sphere.position.y, this.sphere.position.z);
    

    // Manage tilts
    let lateralSensitivity = 600;
    let lateralAngle = Math.PI / lateralSensitivity;
    
    let frontalSensitivity = lateralSensitivity * 2;
    let frontalCalc = frontalSensitivity * Math.abs(this.sphere.position.z)/100
    frontalSensitivity = Math.max(frontalCalc, frontalSensitivity);
    let frontalAngle = Math.PI / frontalSensitivity;


    if(tiltForward){
        this.groundGroup.rotation.x -= frontalAngle;
    }
    else{
        if(this.groundGroup.rotation.x < 0){
            this.groundGroup.rotation.x += frontalAngle;
        }
    }
    if(tiltBackward){
        this.groundGroup.rotation.x += frontalAngle;
    }
    else{
        if(this.groundGroup.rotation.x > 0){
            this.groundGroup.rotation.x -= frontalAngle;
        }
    }
    if(tiltLeft){
        this.groundGroup.rotation.z += lateralAngle;
    }
    else{
        if(this.groundGroup.rotation.z > 0){
            this.groundGroup.rotation.z -= lateralAngle;
        }
    }
    if(tiltRight){
        this.groundGroup.rotation.z -= lateralAngle;
    }
    else{
        if(this.groundGroup.rotation.z < 0){
            this.groundGroup.rotation.z += lateralAngle;
        }
    }
    this.groundBody.quaternion.copy(this.groundGroup.quaternion)

    let spherePosition = this.sphereBody.position;

    if(this.spotlight.power >= 100){
        alert("You win");
        this.spotlight.power = 3.5;
        this.reset();
        this.won = false;
    }
    if(this.won){
        this.spotlight.power += 3;
    }
    //Check if user reached goal
    if(spherePosition.z >= 50 && spherePosition.z <= 60
       && spherePosition.x >= -15 && spherePosition.x <= 15){
        this.won = true;
    }

    if(spherePosition.y < -250){
        this.reset();
    }
};

//Initializes game when window loads
window.onload = function () {
    Game.init();
};