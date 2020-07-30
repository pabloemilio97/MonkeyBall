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
            if ( canJump === true ) velocity.y += 350;
            canJump = false;
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
Fetch canvas, create camera and scene and initial meshes
*/
Game.init = function() {
    // setup a WebGL renderer within an existing canvas
    this.canvas = document.getElementById("canvas");
    this.canvas.width = WIDTH;
    this.canvas.height = HEIGHT;
    this.renderer = new THREE.WebGLRenderer({canvas: canvas});
    this._previousElapsed = 0;
    this.renderer.setViewport(0, 0, WIDTH, HEIGHT);

    // create the scene
    this.scene = new THREE.Scene();

    // create a camera
    this.camera = new THREE.PerspectiveCamera( 45, this.canvas.width / this.canvas.height, 1, 4000 );
    this.camera.position.z = 45;
    this.camera.position.y = 25;
    this.scene.add(this.camera);
    this.camera.rotation.set(-Math.PI/8, 0, 0);

    //Add orbit controls
    orbitControls = new THREE.OrbitControls(this.camera, this.renderer.domElement);

    //Create ground and add it to the scene
    this.ground = new THREE.Mesh(new THREE.BoxGeometry(30, 30, 2),
        new THREE.MeshBasicMaterial({color: 0xffffff}));
    this.ground.rotation.x = -Math.PI / 2;
    console.log(this.ground)
    this.groundGroup = new THREE.Group()
    this.groundGroup.add(this.ground)
    this.scene.add(this.groundGroup);

    //Create sphere, later player and add it to the scene
    this.sphere = new THREE.Mesh(new THREE.SphereGeometry( 1, 32, 32 ),
    new THREE.MeshBasicMaterial({color: 0xddffaa}));
    this.scene.add(this.sphere);
    this.sphere.position.y = 5;

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
    this.initPhysicalWorld();

    window.requestAnimationFrame(this.tick);
}

Game.initPhysicalWorld = function(){
    const world = new CANNON.World();
    this.world = world;
    this.fixedTimeStep = 1.0/60.0;
    this.damping = 0.01;
    
    world.broadphase = new CANNON.NaiveBroadphase();
    world.gravity.set(0, -10, 0);
    this.debugRenderer = new THREE.CannonDebugRenderer(this.scene, this.world);
    
    //Create bodies
    this.groundMaterial = new CANNON.Material();
    let shapes = []

    let test_ground_mesh = new THREE.Mesh(new THREE.BoxGeometry(30, 30, 2), new THREE.MeshBasicMaterial({color: 0x444444}));
    test_ground_mesh.rotation.x = -Math.PI / 2;
    test_ground_mesh.position.y = 4;
    test_ground_mesh.position.z = 4;
    this.groundGroup.add(test_ground_mesh);

    // For each cannon shape we want to associate to a mesh
    let ground1 = this.createShapeFromMesh(this.ground);
    let test_ground = this.createShapeFromMesh(test_ground_mesh);
    
    shapes.push(ground1);
    shapes.push(test_ground);
    this.groundBody = this.addStaticBody(shapes);

    this.sphereBody = this.addMovingBody(this.sphere, {mass: 5})

    
    //Iterate over static bodies to add them to global body
    // let globalBody = new CANNON.Body({mass: 0});
    // for(i = 0; i < thistaticBodies.length; i++){
    //     globalBody.add(staticBodies[i]);
    // }
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
    console.log(mesh.position)
    shapeWrapper.position = new CANNON.Vec3(mesh.position.x, mesh.position.y, mesh.position.z);

    shapeWrapper.quaternion = mesh.geometry.quaternion;
    
    return shapeWrapper;
}
// /*
// Create world so that physics work
// Create all bodies
// */
// Game.initPhysicalWorld = function () {
//     this.world = new CANNON.World();
//     console.log(this.sphere.geometry)

//     this.sphereBody = this.addPhysicalBody(this.sphere, {mass: 1});
// };

/*
Create a cannon js body from a mesh
*/

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
        console.log(box)
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

    let material_ground = new CANNON.ContactMaterial(this.groundMaterial, material, { friction: 0.0, restitution: 0.7});
    this.world.addContactMaterial(material_ground);
    this.world.addBody(body);
    return body;
};

Game.addStaticBody = function(shapes){
    //No se esta calculando el bounding box,
    //no esta recibiendo valores la shape.position

    let body = new CANNON.Body({mass: 0, material: this.groundMaterial});

    shapes.forEach(shape => {
        console.log(shape.position)
        body.addShape(shape.shape, shape.position, shape.quaternion);
    });

    body.computeAABB();
    this.world.add(body);
    return body;
}

/*Game.addStaticBody = function (mesh, bodyOptions) {
    var shape;
    // create a Sphere shape for spheres and thorus knots,
    // a Box shape otherwise
    
    mesh.geometry.computeBoundingBox();
    let box = mesh.geometry.boundingBox;
    console.log(box)
    shape = new CANNON.Box(new CANNON.Vec3(
        (box.max.x - box.min.x) / 2,
        (box.max.y - box.min.y) / 2,
        (box.max.z - box.min.z) / 2,
    ));
    
    let material = this.groundMaterial;
    bodyOptions.material = material;
    let body = new CANNON.Body(bodyOptions);
    body.addShape(shape);
    body.position.x = mesh.position.x;
    body.position.y = mesh.position.y;
    body.position.z = mesh.position.z;
    body.computeAABB();
    // keep a reference to the mesh so we can update its properties later
    body.mesh = mesh;
    
    // Copy floor rotation
    body.quaternion.copy(mesh.quaternion);
    this.world.addBody(body);
    this.staticBodies.push(body);
    return body;
};*/

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
    
    // Sync meshes with bodies
    this.sphere.position.copy(this.sphereBody.position)
    

    // Manage tilts
    sensitivity = 60
    if(tiltForward){
        this.ground.rotation.x -= Math.PI / sensitivity;
    }
    if(tiltBackward){
        this.ground.rotation.x += Math.PI / sensitivity;
    }
    if(tiltLeft){
        this.ground.rotation.y += Math.PI / sensitivity;
    }
    if(tiltRight){
        this.ground.rotation.y -= Math.PI / sensitivity;
    }
    this.groundBody.quaternion.copy(this.ground.quaternion)
    //this.groundBody.angularVelocity.x = Math.PI / 4;
    //this.groundBody.quaternion.setFromAxisAngle( new CANNON.Vec3(1,0,0), Math.PI / 18);
};

window.onload = function () {
    Game.init();
};