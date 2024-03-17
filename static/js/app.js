import { sendUpdatedData } from './client.js';
import * as THREE from "https://cdn.skypack.dev/three@0.132.2";

let scene, camera, renderer, snakeHead, curve, snakeGeometry, snakeMaterial, snakeMesh;
let points = []; // Stores the points for the curve
let direction = new THREE.Vector3(0.05, 0, 0); // Initial movement direction


let lastUpdateTime = 0;
const updateInterval = 100; // Update every 100 milliseconds


let snakeProperties = {
    headColor: "",
    bodyColor: "",
    headPosition: { x: 0, y: 0, z: 0 }, // Adjust based on your game's starting position
    direction: { x: 0.05, y: 0, z: 0 } // Example initial direction
};

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

    renderer = new THREE.WebGLRenderer({canvas: canvas, antialias: true });
    renderer.setSize(canvas.width, canvas.height);
    //document.body.appendChild(renderer.domElement);

    // Use random colors for the snake and head
    const snakeColor = getRandomColor();
    snakeProperties.bodyColor = snakeColor;
    const headColor = getRandomColor();
    snakeProperties.headColor = headColor;

    // Snake head
    snakeHead = new THREE.Mesh(new THREE.SphereGeometry(0.4, 15), new THREE.MeshBasicMaterial({ color: headColor }));
    scene.add(snakeHead);

    // Initial points for the snake's body
    for (let i = 0; i < 50; i++) {
        points.push(new THREE.Vector3(i * -0.1, 0, 0)); // Spread the points along the negative x-axis
    }

    // Curve and geometry
    curve = new THREE.CatmullRomCurve3(points, false, "centripetal");
    snakeGeometry = new THREE.TubeGeometry(curve, 64, 0.2, 8, false);
    snakeMaterial = new THREE.MeshBasicMaterial({ color: snakeColor });
    snakeMesh = new THREE.Mesh(snakeGeometry, snakeMaterial);
    scene.add(snakeMesh);


    // Eyes
    const eyeMaterial = new THREE.MeshStandardMaterial({color: 0x000000});
    const eyeGeometry = new THREE.SphereGeometry(0.05, 12, 6);
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(0.3, -0.2, 0.2);  // Move eye to the front and adjust Y, Z for left and up positions
    rightEye.position.set(0.3, 0.2, 0.2);  // Move eye to the front and adjust Y, Z for right and up positions
    snakeHead.add(leftEye);
    snakeHead.add(rightEye);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    animate();
}




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
    const moveSpeed = 0.04;
    switch (event.key) {
        case 'w': direction.set(0, moveSpeed, 0); break;
        case 's': direction.set(0, -moveSpeed, 0); break;
        case 'a': direction.set(-moveSpeed, 0, 0); break;
        case 'd': direction.set(moveSpeed, 0, 0); break;
    }
});

init();