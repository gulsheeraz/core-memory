import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import wordwrap from 'wordwrapjs';
import * as THREE from 'three';
import * as Tone from 'tone';
import ForceGraph3D from '3d-force-graph';

const sampler = new Tone.Sampler({
    urls: {
        "A2": "A2.ogg",
        "B2": "B2.ogg",
        "C#3": "Cs3.ogg",
        "E3": "E3.ogg",
        "F#3": "Fs3.ogg",
        "A3": "A3.ogg",
        "B3": "B3.ogg",
        "C#4": "Cs4.ogg",
        "E4": "E4.ogg",
        "F#4": "Fs4.ogg",
    },
    attack: 0.5,
    release: 1,
    baseUrl: "./cello/"
}).toDestination();

const pentatonic = ['F#1', 'A2', 'B2', 'C#3', 'E3', 'F#3', 'A3', 'C#4', 'E4'];

let poems = [
    "sounds of a heartbeat", "too many letters", "too many characters", "too many memories", 
    "tug at this red string", "see where it leads", "a web is a trap", "the web is a trap", 
    "so then why is this so lovely?", "dusty lights", "old journals", "old flames", 
    "magpie bridge", "heavenly river", "two hearts united", "jade rabbit", "elixir for you", 
    "flashlight under the covers", "do I remember", "do you remember", "backyard nights", 
    "rabbit ears", "rabbit years", "who didn't cry", "who sheds tears", "a story about a girl", 
    "born of plum flowers", "resentment also blooms", "flowers bloom", "a muse is temporary", 
    "this isn't temporary", "goodbye"
];

let N = 150;
let gData = {
    nodes: [...Array(N).keys()].map(i => ({
        id: i,
        x: getRandomInRange(-450, 450),
        y: getRandomInRange(-450, 450),
        z: getRandomInRange(-450, 450)
    })),
    links: []
};

for (let i = N; i < N + 50; i++) {
    gData.nodes.push({
        id: i,
        x: getRandomInRange(-1000, 1000),
        y: getRandomInRange(-1000, 1000),
        z: getRandomInRange(-1000, 1000)
    });
}

let userInteracting = false;
let distance = 450;
let Graph = ForceGraph3D()
    (document.getElementById('3d-graph'))
    .enableNodeDrag(false)
    .enableNavigationControls(true)
    .showNavInfo(false)
    .cameraPosition({ z: distance })
    .graphData(gData)
    .nodeThreeObject(node => {
        let sphereGeometry = new THREE.SphereGeometry(3);
        let material = new THREE.MeshBasicMaterial({ color: '#fffee6' });
        let sphere = new THREE.Mesh(sphereGeometry, material);
        sphere.visible = false;
        sphere.position.set(node.x, node.y, node.z);
        return sphere;
    })
    .d3Force('charge', null)
    .d3Force('center', null)
    .d3Force('link', null)
    .linkThreeObject(link => {
        let container = new THREE.Object3D();
        let source = gData.nodes[link.source];
        let target = gData.nodes[link.target];
        let sourcePosition = new THREE.Vector3(source.x, source.y, source.z);
        let targetPosition = new THREE.Vector3(target.x, target.y, target.z);

        let lineGeometry = new THREE.BufferGeometry().setFromPoints([sourcePosition, targetPosition]);
        let lineMaterial = new THREE.LineBasicMaterial({ color: '#9cc0ff', transparent: true, opacity: 0.8 });
        let line = new THREE.Line(lineGeometry, lineMaterial);
        container.add(line);

        let text = createTextSprite(link.text, 'white');
        let midPoint = new THREE.Vector3().addVectors(sourcePosition, targetPosition).multiplyScalar(0.5);
        text.position.copy(midPoint);

        let direction = new THREE.Vector3().subVectors(targetPosition, sourcePosition).normalize();
        let up = new THREE.Vector3(0, 1, 0);
        let quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction);
        text.setRotationFromQuaternion(quaternion);

        container.add(text);
        return container;
    })
    .linkPositionUpdate((sprite, { start, end }) => {
        let middlePos = new THREE.Vector3().addVectors(new THREE.Vector3(start.x, start.y, start.z), new THREE.Vector3(end.x, end.y, end.z)).multiplyScalar(0.5);
        sprite.position.copy(middlePos);
    });

Graph.controls().maxDistance = 700;

function getRandomInRange(min, max) {
    return Math.random() * (max - min + 1) + min;
}

// Adjust the line height for better text positioning
function createTextSprite(text, color) {
    let canvas = document.createElement('canvas');
    let context = canvas.getContext('2d');
    let canvasWidth = 420;
    let canvasHeight = 900;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    let fontSize = 35;
    let fontFace = 'Cormorant Infant';
    let maxWidth = canvasWidth - 20; // Add some margin to the sides
    let lineHeight = fontSize * 1.2;

    context.font = `${fontSize}px ${fontFace}`;
    context.fillStyle = color || 'white';
    context.textAlign = 'center';

    let wrappedText = wordwrap.wrap(text, { width: maxWidth / (fontSize / 2), break: true });
    let lines = wrappedText.split('\n');
    for (let i = 0; i < lines.length; i++) {
        context.fillText(lines[i], canvasWidth / 2, (canvasHeight / 2) - (lines.length / 2 - i) * lineHeight);
    }

    let texture = new THREE.CanvasTexture(canvas);
    let material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide, depthTest: false });
    let geometry = new THREE.PlaneGeometry(150, 350);
    return new THREE.Mesh(geometry, material);
}

// Camera Orbit functionality
let angle = 0;
let lerpFactor = 0.05;
let intervalId = null;

function updateCameraPosition() {
    if (!userInteracting) {
        let currentPos = Graph.cameraPosition();
        let targetPos = {
            x: distance * Math.sin(angle),
            z: distance * Math.cos(angle)
        };

        let newPos = {
            x: currentPos.x + (targetPos.x - currentPos.x) * lerpFactor,
            z: currentPos.z + (targetPos.z - currentPos.z) * lerpFactor
        };

        Graph.cameraPosition(newPos);
        angle += Math.PI / 2000;
    }
}

function startCameraOrbit() {
    if (!intervalId) {
        intervalId = setInterval(updateCameraPosition, 50);
    }
}

function stopCameraOrbit() {
    clearInterval(intervalId);
    intervalId = null;
}

function handleUserInteraction() {
    userInteracting = true;
    stopCameraOrbit();
    if (Tone.context.state !== 'running') {
        Tone.start();
    }
}

function handleUserInteractionEnd() {
    setTimeout(() => {
        userInteracting = false;
        updateDistance();
        startCameraOrbit();
    }, 50);
}

function updateDistance() {
    let cameraPos = Graph.cameraPosition();
    distance = Math.sqrt(cameraPos.x * cameraPos.x + cameraPos.z * cameraPos.z);
}

// Event listeners for user interaction
document.getElementById('3d-graph').addEventListener('wheel', updateDistance);
document.getElementById('3d-graph').addEventListener('mousedown', handleUserInteraction);
document.getElementById('3d-graph').addEventListener('touchmove', handleUserInteraction);
document.getElementById('3d-graph').addEventListener('touchstart', handleUserInteraction);
document.getElementById('3d-graph').addEventListener('mouseup', handleUserInteractionEnd);
document.getElementById('3d-graph').addEventListener('touchend', handleUserInteractionEnd);
document.getElementById('3d-graph').addEventListener('mouseout', handleUserInteractionEnd);

// Automatically add connections periodically
setInterval(addConnection, 1500);

function addConnection() {
    let nodeIds = gData.nodes.map(node => node.id);
    let sourceNodeId = nodeIds[Math.floor(Math.random() * nodeIds.length)];
    let targetNodeId = nodeIds[Math.floor(Math.random() * nodeIds.length)];

    if (sourceNodeId !== targetNodeId && !gData.links.some(link => (link.source === sourceNodeId && link.target === targetNodeId) || (link.source === targetNodeId && link.target === sourceNodeId))) {
        let connection = {
            source: sourceNodeId,
            target: targetNodeId,
            text: poems[Math.floor(Math.random() * poems.length)]
        };
        gData.links.push(connection);
        Graph.graphData(gData);
        sampler.triggerAttack(pentatonic[Math.floor(Math.random() * pentatonic.length)]);
    }
}

// Start the camera orbit when the page loads
startCameraOrbit();

// Center start text
let textSprite = createTextSprite("a whispered story...", "white");
textSprite.position.set(0, 0, 0); // Position the text at the center of the 3D space
Graph.scene().add(textSprite);

// // glowy effect

// Setup scene, camera, and renderer
let scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
let renderer = new THREE.WebGLRenderer();
document.body.appendChild(renderer.domElement);
renderer.setSize(window.innerWidth, window.innerHeight);

// Create EffectComposer
let composer = new EffectComposer(renderer);

// Add RenderPass
composer.addPass(new RenderPass(scene, camera));

// Create and configure UnrealBloomPass
let bloomPass = new UnrealBloomPass();
bloomPass.strength = 1.5;
bloomPass.radius = 1;
bloomPass.threshold = 0.8;
composer.addPass(bloomPass);

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  composer.render();
}

animate();

// Log to check if the text sprite is created and added
console.log('Text Sprite created:', textSprite);

// center start text

// let textSprite = createTextSprite("a whispered story...", "white");
// textSprite.position.set(0, 0, 0);
// Graph.scene().add(textSprite);


// // glowy effect

// let bloomPass = new UnrealBloomPass();
// bloomPass.strength = 1.5;
// bloomPass.radius = 1;
// bloomPass.threshold = 0.8;
// Graph.postProcessingComposer().addPass(bloomPass);


// // sky background

// function createGradientTexture() {
//     let size = 2;
//     let canvas = document.createElement('canvas');
//     canvas.width = size;
//     canvas.height = size;
//     let ctx = canvas.getContext('2d');

//     let gradient = ctx.createLinearGradient(0, 0, 0, size);
//     gradient.addColorStop(0, '#01013b'); //dark top
//     gradient.addColorStop(1, '#2779cc'); //light bottom
//     ctx.fillStyle = gradient;
//     ctx.fillRect(0, 0, size, size);

//     let texture = new THREE.CanvasTexture(canvas);
//     texture.minFilter = texture.magFilter = THREE.LinearFilter;

//     return texture;
// }


// let gradientTexture = createGradientTexture();

// let gradientMaterial = new THREE.MeshBasicMaterial({
//     map: gradientTexture,
//     depthTest: false,
//     depthWrite: false,
// });

// let gradientGeometry = new THREE.PlaneGeometry(2, 2);

// let gradientMesh = new THREE.Mesh(gradientGeometry, gradientMaterial);
// gradientMesh.frustumCulled = false;

// let scene = Graph.scene();
// scene.background = gradientTexture;

// // navigation
// const controls = Graph.controls();
// controls.enableDamping = false; // Disable damping (inertia)
// controls.staticMoving = true; // Use static moving without inertia


// // window resize
// function onWindowResize() {
//     // Update camera aspect ratio and projection matrix
//     Graph.camera().aspect = window.innerWidth / window.innerHeight;
//     Graph.camera().updateProjectionMatrix();

//     // Update renderer size
//     Graph.renderer().setSize(window.innerWidth, window.innerHeight);
// }

// // Attach the event listener to the window
// window.addEventListener('resize', onWindowResize, false);
