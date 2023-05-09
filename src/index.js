import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import wordwrap from 'wordwrapjs';
import * as THREE from 'three';
import * as Tone from 'tone';

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
    baseUrl: "./cello/",
}).toDestination();

const pentatonic = ['F#1','A2', 'B2', 'C#3', 'E3', 'F#3', 'A3', 'C#4', 'E4'];

let poems = [
    "sounds of a hearbeat",
    "too many letters",
    "too many characters",
    "too many memories",
    "tug at this red string",
    "see where it leads",
    "a web is a trap",
    "the web is a trap",
    "so then why is this so lovely?",
    "dusty lights",
    "old journals",
    "old flames",
    "magpie bridge",
    "heavenly river",
    "two hearts united",
    "jade rabbit",
    "elixir for you",
    "flashlight under the covers",
    "do I remember",
    "do you remember",
    "backyard nights",
    "rabbit ears",
    "rabbit years",
    "who didn't cry",
    "who sheds tears",
    "a story about a girl",
    "born of plum flowers",
    "resentment also blooms",
    "flowers bloom",
    "a muse is temporary",
    "this isn't temporary",
    "goodbye"
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

for (let i = N; i < N+50; i ++) {
    gData.nodes.push({
        id: i,
        x: getRandomInRange(-1000, 1000),
        y: getRandomInRange(-1000, 1000),
        z: getRandomInRange(-1000, 1000)
    });
}

// Add event listeners to handle user interactions
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

        // Set the initial visibility of the sphere to false
        sphere.visible = false;

        // Set the position of the sphere based on node data
        sphere.position.set(node.x, node.y, node.z);
        return sphere;
    })
    .d3Force('charge', null)
    .d3Force('center', null)
    .d3Force('link', null)
    .linkThreeObject(link => {
        let container = new THREE.Object3D(); // Container for link and text

        // Get source and target nodes' positions
        let source = gData.nodes[link.source];
        let target = gData.nodes[link.target];

        let sourcePosition = new THREE.Vector3(source.x, source.y, source.z);
        let targetPosition = new THREE.Vector3(target.x, target.y, target.z);

        // Create link
        let lineGeometry = new THREE.BufferGeometry().setFromPoints([sourcePosition, targetPosition]);
        let lineMaterial = new THREE.LineBasicMaterial({
            color: '#9cc0ff',
            transparent: true,
            opacity: 0.8
        });
        let line = new THREE.Line(lineGeometry, lineMaterial);
        container.add(line);

        // Create text
        let text = createTextSprite(link.text, 'white');
        let midPoint = new THREE.Vector3().addVectors(sourcePosition, targetPosition).multiplyScalar(0.5);
        text.position.copy(midPoint);

        // Calculate the rotation quaternion based on the link direction
        let direction = new THREE.Vector3().subVectors(targetPosition, sourcePosition).normalize();
        let up = new THREE.Vector3(0, 1, 0);
        let quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction);

        // Apply the rotation quaternion to the text mesh
        text.setRotationFromQuaternion(quaternion);

        container.add(text);

        return container;
    })
    .linkPositionUpdate((sprite, { start, end }) => {
        let middlePos = new THREE.Vector3()
            .addVectors(
                new THREE.Vector3(start.x, start.y, start.z),
                new THREE.Vector3(end.x, end.y, end.z)
            )
            .multiplyScalar(0.5);
        sprite.position.copy(middlePos);
    })

Graph.controls().maxDistance = 700;

function getRandomInRange(min, max) {
    let r = Math.random() * (max - min + 1) + min;
    return r;
}

function createTextSprite(text, color) {
    let canvas = document.createElement('canvas');
    let context = canvas.getContext('2d');
    let canvasWidth = 420; // increase canvas size
    let canvasHeight = 900; // increase canvas size
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    let fontSize = 35; // set font size
    let fontFace = 'Cormorant Infant';// set font face
    let maxWidth = 400; // set max width for the text
    let lineHeight = fontSize * 1.2; 

    context.font = `${fontSize}px ${fontFace}`; // set font size and face
    context.fillStyle = color;
    context.textAlign = 'center';

    // Wrap text using wordwrapjs
    let wrappedText = wordwrap.wrap(text, {
        width: maxWidth / (fontSize / 2), // Calculate the width based on the font size
        break: true,
    })

    // Draw wrapped text on the canvas
    let lines = wrappedText.split('\n');
    for (let i = 0; i < lines.length; i++) {
        context.fillText(lines[i], canvasWidth / 2, (canvasHeight / 2) - (lines.length / 2 - i) * lineHeight);
    }

    let texture = new THREE.CanvasTexture(canvas);
    let material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide, depthTest: false });

    let geometry = new THREE.PlaneGeometry(150, 350);
    let mesh = new THREE.Mesh(geometry, material);

    return mesh;
}


// camera orbit
let angle = 0;
let lerpFactor = 0.05;


// Initialize the camera orbit
let intervalId = setInterval(updateCameraPosition, 50);
startCameraOrbit();


// Function to update the camera position
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

// Function to update angle based on the current camera position
function updateAngle() {
    let currentPos = Graph.cameraPosition();
    angle = Math.atan2(currentPos.x, currentPos.z);
}


function startCameraOrbit() {
    if (!intervalId) {
        updateAngle();
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
        updateAngle();
        startCameraOrbit();
    }, 50);
}


function updateDistance() {
    let cameraPos = Graph.cameraPosition();
    distance = Math.sqrt(cameraPos.x * cameraPos.x + cameraPos.z * cameraPos.z);
}


document.getElementById('3d-graph').addEventListener('wheel', updateDistance);
document.getElementById('3d-graph').addEventListener('mousedown', handleUserInteraction);
document.getElementById('3d-graph').addEventListener('touchmove', handleUserInteraction);
document.getElementById('3d-graph').addEventListener('touchstart', handleUserInteraction);
document.getElementById('3d-graph').addEventListener('mouseup', handleUserInteractionEnd);
document.getElementById('3d-graph').addEventListener('touchend', handleUserInteractionEnd);
document.getElementById('3d-graph').addEventListener('mouseout', handleUserInteractionEnd);

Graph.onEngineTick(() => {
    if (userInteracting) {
        stopCameraOrbit();
    } else {
        startCameraOrbit();
    }
});

function updateSphereVisibility(sourceId, targetId) {
    let sourceNode = Graph.graphData().nodes.find(node => node.id === sourceId);
    let targetNode = Graph.graphData().nodes.find(node => node.id === targetId);

    if (sourceNode && sourceNode.__threeObj) {
        sourceNode.__threeObj.visible = true;
    }

    if (targetNode && targetNode.__threeObj) {
        targetNode.__threeObj.visible = true;
    }
}

setInterval(addConnection, 1500);

function addConnection() {
    let nodeIds = gData.nodes.map(node => node.id);
    let sourceNodeId = nodeIds[Math.floor(Math.random() * nodeIds.length)];
    let targetNodeId = nodeIds[Math.floor(Math.random() * nodeIds.length)];

    let linkExists = gData.links.some(link =>
        (link.source === sourceNodeId && link.target === targetNodeId) ||
        (link.source === targetNodeId && link.target === sourceNodeId)
    );

    if (!linkExists) {
        gData.links.push({
            source: sourceNodeId,
            target: targetNodeId,
            text: poems[Math.floor(Math.random() * poems.length)]
        });

        Graph.graphData(gData);

        // Update the visibility of the spheres
        updateSphereVisibility(sourceNodeId, targetNodeId);

    }
    if (Tone.context.state == 'running') {
        let note = pentatonic[Math.floor(Math.random() * pentatonic.length)];
        sampler.triggerAttackRelease([note], 4);
    }
    
}


// center start text

let textSprite = createTextSprite("a whispered story...", "white");
textSprite.position.set(0, 0, 0);
Graph.scene().add(textSprite);


// glowy effect

let bloomPass = new UnrealBloomPass();
bloomPass.strength = 1.5;
bloomPass.radius = 1;
bloomPass.threshold = 0.8;
Graph.postProcessingComposer().addPass(bloomPass);


// sky background

function createGradientTexture() {
    let size = 2;
    let canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    let ctx = canvas.getContext('2d');

    let gradient = ctx.createLinearGradient(0, 0, 0, size);
    gradient.addColorStop(0, '#01013b'); //dark top
    gradient.addColorStop(1, '#2779cc'); //light bottom
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    let texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = texture.magFilter = THREE.LinearFilter;

    return texture;
}


let gradientTexture = createGradientTexture();

let gradientMaterial = new THREE.MeshBasicMaterial({
    map: gradientTexture,
    depthTest: false,
    depthWrite: false,
});

let gradientGeometry = new THREE.PlaneGeometry(2, 2);

let gradientMesh = new THREE.Mesh(gradientGeometry, gradientMaterial);
gradientMesh.frustumCulled = false;

let scene = Graph.scene();
scene.background = gradientTexture;

// navigation
const controls = Graph.controls();
controls.enableDamping = false; // Disable damping (inertia)
controls.staticMoving = true; // Use static moving without inertia


// window resize
function onWindowResize() {
    // Update camera aspect ratio and projection matrix
    Graph.camera().aspect = window.innerWidth / window.innerHeight;
    Graph.camera().updateProjectionMatrix();

    // Update renderer size
    Graph.renderer().setSize(window.innerWidth, window.innerHeight);
}

// Attach the event listener to the window
window.addEventListener('resize', onWindowResize, false);



