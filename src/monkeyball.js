let WIDTH = window.innerWidth;
let HEIGHT = window.innerHeight;
let Game = {};
let orbitControls = null;
let tiltForward = null;
let tiltLeft = null;
let tiltBackward = null;
let tiltRight = null;
// mesh -> object that is rendered
// body -> cannon js object

function onKeyDown ( event )
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
            break;
    }

}

function onKeyUp( event ) {
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

/*
Helper function for loading OBJ models
*/
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

/*
Fetch canvas, create camera and scene and initial meshes
*/
Game.init = function() {
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
    let texture = new THREE.TextureLoader().load("../assets/grass.jpeg");
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set( 8, 16 );

    let material = new THREE.MeshLambertMaterial({map: texture});

    //Set ground bump map
    material.normalMap = new THREE.TextureLoader().load("../assets/grassNormal.jpeg");  

    //Create ground and add it to the scene
    this.ground = new THREE.Mesh(new THREE.BoxGeometry(100, 400, 3), material);
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
    this.sphere.position.y = 3.1;
    this.sphere.position.z = -150;
    //Set up shadows for ground
    this.sphere.castShadow = true;
    this.sphere.receiveShadow = true;

    //Load monkey
    this.monkeyLoaded = false;
    this.load3dModel("../assets/monkeyObj.obj", "../assets/monkeyMtl.mtl");


    //Create bodies
    this.groundMaterial = new CANNON.Material();
    this.groundShapes = []

    //Initialize obstacles
    this.obstacles = []
    this.obstacles.push(this.createObstacleMesh(-20, 4, -120, 60, 5, 30));
    this.obstacles.push(this.createObstacleMesh(20, 4, -40, 60, 5, 30));

    //Add light
    let spotlight = new THREE.SpotLight(0xffffff);
    this.spotlight = spotlight;
    spotlight.shadow.mapSize.width = 4096;
    spotlight.shadow.mapSize.height = 4096;
    spotlight.shadow.camera.near = 500;
    spotlight.shadow.camera.far = 1000;
    spotlight.shadow.camera.fov = 30;
    // let spotlightHelper = new THREE.SpotLightHelper(spotlight, 0x000000);
    // this.scene.add( spotlightHelper );
    spotlight.position.set(0, 600, -300);
    spotlight.rotation.x = -Math.PI / 4;
    spotlight.castShadow = true;
    this.scene.add(spotlight);

    //Event listeners for controls
    document.addEventListener( "keydown", onKeyDown, false );
    document.addEventListener( "keyup", onKeyUp, false );

    /*document.addEventListener('keyup', function (event) {
        if (event.keyCode === 27) { // Jalo hacerlo un reset button
            event.preventDefault();
            this.reset();
        }
    }.bind(this));*/

    // Create physical world
    this.scene.add(this.groundGroup);

    let groundMeshes = [
        this.ground,
        ...this.obstacles,
    ];
    this.initPhysicalWorld(groundMeshes);
    
    window.requestAnimationFrame(this.tick);
}

Game.createObstacleMesh = function(px, py, pz, bx, by, bz) {
    obstacleMesh = new THREE.Mesh(new THREE.BoxGeometry(bx, by, bz),
        new THREE.MeshBasicMaterial({color: 0xffffff}));
    this.groundGroup.add(obstacleMesh)
    obstacleMesh.position.x = px;
    obstacleMesh.position.y = py;
    obstacleMesh.position.z = pz;
    //Set up shadows for mesh
    obstacleMesh.castShadow = true;
    obstacleMesh.receiveShadow = true;
    return obstacleMesh;
}
Game.initPhysicalWorld = function(groundMeshes){
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

    this.groundBody = this.addStaticBody(this.groundShapes);
    this.sphereBody = this.addMovingBody(this.sphere, {mass: 10});
};

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


Game.addMovingBody = function (mesh, bodyOptions) {
    var shape;
    // create a Sphere shape for spheres and thorus knots,
    // a Box shape otherwise
    if (mesh.geometry.type === 'SphereGeometry'){
        mesh.geometry.computeBoundingSphere();
        shape = new CANNON.Sphere(mesh.geometry.boundingSphere.radius);
    }
    else {
        mesh.geometry.computeBoundingBox();
        let box = mesh.geometry.boundingBox;
        shape = new CANNON.Box(new CANNON.Vec3(
            (box.max.x - box.min.x) / 2,
            (box.max.y - box.min.y) / 2,
            (box.max.z - box.min.z) / 2
        ));
    }
    let material = new CANNON.Material();
    bodyOptions.material = material;
    let body = new CANNON.Body(bodyOptions);
    body.addShape(shape);
    body.linearDamping = this.damping;
    body.position.x = mesh.position.x;
    body.position.y = mesh.position.y;
    body.position.z = mesh.position.z;
    body.computeAABB();
    // keep a reference to the mesh so we can update its properties later
    body.mesh = mesh;

    let material_ground = new CANNON.ContactMaterial(this.groundMaterial, material, { friction: 1.0, restitution: 0.1});
    this.world.addContactMaterial(material_ground);
    this.world.addBody(body);
    return body;
};

Game.addStaticBody = function(shapes){
    let body = new CANNON.Body({mass: 0, material: this.groundMaterial});

    shapes.forEach(shape => {
        body.addShape(shape.shape, shape.position, shape.quaternion);
    });

    body.computeAABB();
    //body.angularVelocity.x = 5;
    this.world.add(body);
    return body;
}

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

Game.update = function (delta) {
    this.timestamp += delta;
    this.world.step(delta);

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
};

window.onload = function () {
    Game.init();
};