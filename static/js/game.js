import { sendUpdatedData, getClientId  } from './client.js';
import * as THREE from "https://cdn.skypack.dev/three@0.132.2";

let scene, camera, renderer, snakeHead, curve, snakeGeometry, snakeMaterial, snakeMesh;
let points = []; // Stores the points for the curve
let direction = new THREE.Vector3(0.05, 0, 0); // Initial movement direction
let snakeMeshes = {}; // Track all snake meshes, keyed by clientId
let localClientId = getClientId() ;

let lastUpdateTime = 0;
const updateInterval = 100; // Update every 100 milliseconds

console.log(localClientId)

let snakeProperties = {}

function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// Function to retrieve the current snake properties
export function getSnakeProperties() {
    return snakeProperties;
}

function init() {
    const canvas = document.querySelector('#myCanvas');
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, canvas.width / canvas.height, 0.1, 1000);
    camera.position.z = 10;

    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(canvas.width, canvas.height);
    document.body.appendChild(renderer.domElement);

    // Initialize lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    // Initialize the local player's snake
    initLocalSnake();

    // Start the animation loop
    animate();
}


function saveSnakeState() {
    const stateToSave = {
        localClientId,
        snakeProperties, // Includes headColor, bodyColor
        direction: { x: direction.x, y: direction.y, z: direction.z },
        points, // The curve points for the body
        headPosition: { x: snakeHead.position.x, y: snakeHead.position.y, z: snakeHead.position.z }
    };
    localStorage.setItem('snakeState ' + localClientId, JSON.stringify(stateToSave));
}

function loadSnakeState() {
    const savedStateJSON = localStorage.getItem('snakeState '+ localClientId);
    if (savedStateJSON) {
        return JSON.parse(savedStateJSON);
    }
    return null;
}


// Ensure you call this function before the page unloads
//window.addEventListener('beforeunload', saveSnakeState);


function initLocalSnake() {
    const savedState = loadSnakeState(localClientId);

    // Reset points array to ensure it's always defined
    points = [];

    if (savedState && savedState.points && savedState.localClientId === localClientId) {
        snakeProperties = savedState.snakeProperties; // Assuming this includes headColor, bodyColor, etc.
        direction.set(savedState.direction.x, savedState.direction.y, savedState.direction.z);

        // Ensure points are properly formatted as an array of THREE.Vector3
        points = savedState.points.map(p => new THREE.Vector3(p.x, p.y, p.z));
    } else {
        // Initialize with default properties if none are saved
        snakeProperties.headColor = getRandomColor();
        snakeProperties.bodyColor = getRandomColor();
        snakeProperties.headPosition = { x: 0, y: 0, z: 0 };
        direction.set(0.05, 0, 0);

        // Generate initial points for the snake's body
        for (let i = 0; i < 50; i++) {
            points.push(new THREE.Vector3(-0.1 * i, 0, 0)); // Line of points starting from the origin
        }
    }

    // Create the snake head
    snakeHead = new THREE.Mesh(
        new THREE.SphereGeometry(0.4, 15),
        new THREE.MeshBasicMaterial({ color: snakeProperties.headColor })
    );
    snakeHead.position.set(snakeProperties.headPosition.x, snakeProperties.headPosition.y, snakeProperties.headPosition.z);
    scene.add(snakeHead);

    // Create the snake body
    curve = new THREE.CatmullRomCurve3(points);
    snakeGeometry = new THREE.TubeGeometry(curve, 20, 0.2, 8, false);
    snakeMaterial = new THREE.MeshBasicMaterial({ color: snakeProperties.bodyColor });
    snakeMesh = new THREE.Mesh(snakeGeometry, snakeMaterial);
    scene.add(snakeMesh);

    // Add eyes or other details to the snake head as needed
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: '#000000' });
    const eyeGeometry = new THREE.SphereGeometry(0.05, 12, 6);
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(0.3, -0.2, 0.2);
    rightEye.position.set(0.3, 0.2, 0.2);
    snakeHead.add(leftEye);
    snakeHead.add(rightEye);
}


function createSnakeMesh(snakeInfo) {
    const snakeGroup = new THREE.Group();

    // Create head
    const headGeometry = new THREE.SphereGeometry(0.4, 32, 32);
    const headMaterial = new THREE.MeshBasicMaterial({ color: snakeInfo.headColor });
    const headMesh = new THREE.Mesh(headGeometry, headMaterial);
    headMesh.position.set(snakeInfo.headPosition.x, snakeInfo.headPosition.y, snakeInfo.headPosition.z);
    snakeGroup.add(headMesh);

    // Initialize body segments
    for (let i = 0; i < 10; i++) { // Example: Create 10 body segments
        const segmentGeometry = new THREE.SphereGeometry(0.2, 16, 16);
        const segmentMaterial = new THREE.MeshBasicMaterial({ color: snakeInfo.bodyColor });
        const segmentMesh = new THREE.Mesh(segmentGeometry, segmentMaterial);
        // Initially, place body segments directly behind the head
        segmentMesh.position.set(snakeInfo.headPosition.x - (i + 1) * 0.5, snakeInfo.headPosition.y, snakeInfo.headPosition.z);
        snakeGroup.add(segmentMesh);
    }

    return snakeGroup;
}


function animateSnake(clientId, newHeadPosition) {
    // Retrieve the entry for the clientId
    let snakeEntry = snakeMeshes[clientId];

    if (!snakeEntry) {
        console.error("Snake entry for clientId", clientId, "not found.");
        return;
    }

    // Prepend new head position to the history
    snakeEntry.positions.unshift(new THREE.Vector3(newHeadPosition.x, newHeadPosition.y, newHeadPosition.z));

    // Move the head to the new position
    snakeEntry.mesh.children[0].position.copy(snakeEntry.positions[0]);

    // Update body segments to follow the previous positions
    for (let i = 1; i < snakeEntry.mesh.children.length; i++) {
        if (snakeEntry.positions[i]) {
            snakeEntry.mesh.children[i].position.copy(snakeEntry.positions[i]);
        }
    }

    // Trim the positions history to match the number of segments
    while (snakeEntry.positions.length > snakeEntry.mesh.children.length) {
        snakeEntry.positions.pop();
    }
}


window.updateAllSnakes = function(snakesData) {
    Object.entries(snakesData).forEach(([clientId, snakeInfo]) => {
        if (clientId === localClientId) {
            // Handle local snake update if needed
            return;
        }

        if (!snakeMeshes[clientId]) {
            // If this snake doesn't exist, create it
            snakeMeshes[clientId] = {
                mesh: createSnakeMesh(snakeInfo),
                positions: []
            };
            scene.add(snakeMeshes[clientId].mesh);
        } else {
            // Animate existing snake
            animateSnake(clientId, snakeInfo.headPosition);
        }
    });
};


window.removeSnake = function(clientId) {
    const snakeEntry = snakeMeshes[clientId];
    if (snakeEntry) {
        scene.remove(snakeEntry.mesh); // Assuming snakeEntry.mesh is the THREE.Mesh or THREE.Group object
        delete snakeMeshes[clientId];
    }
};



function updateSnakeBody() {
    // Calculate boundaries (approximation for perspective camera)
    const aspectRatio = renderer.getSize(new THREE.Vector2()).x / renderer.getSize(new THREE.Vector2()).y;
    const distance = camera.position.z;
    const vFov = camera.fov * Math.PI / 180; // convert vertical fov to radians; trigonometric functions in JavaScript expect radians
    const planeHeight = 2 * Math.tan(vFov / 2) * distance; // visible height
    const planeWidth = planeHeight * aspectRatio; // visible width

    const boundaryX = planeWidth / 2; // the camera si in the canter; symmetric
    const boundaryY = planeHeight / 2;

    // Proposed new position
    const proposedPosition = snakeHead.position.clone().add(direction);

    // Check boundaries
    if (proposedPosition.x > -boundaryX && proposedPosition.x < boundaryX &&
        proposedPosition.y > -boundaryY && proposedPosition.y < boundaryY) {
        snakeHead.position.add(direction);

        // Update the curve with new points
        points.unshift(snakeHead.position.clone()); // Add the head's new position
        points.pop(); // Remove the last point


        curve.points = points;
        snakeMesh.geometry.dispose();
        snakeMesh.geometry = new THREE.TubeGeometry(curve, 64, 0.2, 8, false);

        // Rotate head based on direction
        let angle = Math.atan2(direction.y, direction.x);
        snakeHead.rotation.z = angle;


         snakeProperties = {
             headColor: snakeProperties.headColor,
             bodyColor: snakeProperties.bodyColor,
            headPosition: { x: snakeHead.position.x, y: snakeHead.position.y, z: snakeHead.position.z },
            direction: { x: direction.x, y: direction.y, z: direction.z }
        };
    }
}


function animate() {
    requestAnimationFrame(animate);

    updateSnakeBody();

    const now = Date.now();
    if (now - lastUpdateTime > updateInterval) {
        sendUpdatedData();
        lastUpdateTime = now;
    }

    renderer.render(scene, camera);
}

document.addEventListener('keydown', (event) => {
    const currentDirection = direction.clone(); // Clone the current direction
    const moveSpeed = 0.05; // Ensure this matches your game's speed

    switch (event.key) {
        case 'W':
        case 'w':
            if (currentDirection.y === 0) direction.set(0, moveSpeed, 0);
            break;
        case 'S':
        case 's':
            if (currentDirection.y === 0) direction.set(0, -moveSpeed, 0);
            break;
        case 'A':
        case 'a':
            if (currentDirection.x === 0) direction.set(-moveSpeed, 0, 0);
            break;
        case 'D':
        case 'd':
            if (currentDirection.x === 0) direction.set(moveSpeed, 0, 0);
            break;
    }

    // Prevent the snake from reversing direction
    if (direction.dot(currentDirection) < 0) {
        direction.copy(currentDirection); // Revert to the original direction if attempting to reverse
    }
});


document.addEventListener('DOMContentLoaded', function() {
    // Only initialize the game if we're on a session page
    if (window.location.pathname !== '/' && window.location.pathname.length > 1) {
        init(); // Your existing game initialization function
        // Ensure you call this function before the page unloads
        window.addEventListener('beforeunload', saveSnakeState);


    }
});


//document.addEventListener('DOMContentLoaded', init);

