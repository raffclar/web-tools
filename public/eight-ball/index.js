import * as THREE from 'three';

const COLOR_BALL = '#000000';
const COLOR_LOGO_CIRCLE = '#ffffff';
const COLOR_LOGO_TEXT = '#000000';
const COLOR_WINDOW_RIM_INNER = '#111111';
const COLOR_WINDOW_RIM_OUTER = '#333333';
const COLOR_LIQUID_GRADIENT_START = 'rgba(0, 2, 5, 0.5)';
const COLOR_LIQUID_GRADIENT_MID = 'rgba(0, 3, 10, 0.8)';
const COLOR_LIQUID_GRADIENT_END = 'rgba(0, 0, 0, 1)';

// Configuration - Colors
const COLOR_AMBIENT_LIGHT = 0xffffff;
const COLOR_MAIN_LIGHT = 0xffffff;
const COLOR_FILL_LIGHT = 0xffffff;
const COLOR_DIE_EMISSIVE = 0xffffff;
const COLOR_DIE_TEXT_BG = '#000208';
const COLOR_DIE_TEXT = '#ffffff';
const COLOR_DIE_TEXT_GLOW = '#00ffff';
const COLOR_DIE_HIGHLIGHT_EMISSIVE_HEX = 0x00096FFF;

const phrases = [
    "It is certain",
    "It is decidedly so",
    "Without a doubt",
    "Yes definitely",
    "You may rely on it",
    "As I see it, yes",
    "Most likely",
    "Outlook good",
    "Yes",
    "Signs point to yes",
    "Reply hazy, try again",
    "Ask again later",
    "Better not tell you now",
    "Cannot predict now",
    "Concentrate and ask again",
    "Don't count on it",
    "My reply is no",
    "My sources say no",
    "Outlook not so good",
    "Very doubtful"
];

const ball = document.getElementById('eight-ball');
const container = document.getElementById('three-container');

// Three.js Setup
let scene, camera, renderer, die, ballMesh, ballGroup, envMap;
// States: 'idle', 'shaking', 'settling', 'floating'
// 'idle' is the initial start state and ensures we have a view of the '8'
// 'floating' is the final state where an answer is correctly oriented
let state = 'idle';
const targetQuaternion = new THREE.Quaternion();

// Dragging state
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let totalDragDistance = 0;

function init() {
    scene = new THREE.Scene();
    
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 6;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width * 2, height * 2, false);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Load reflection map
    const loader = new THREE.TextureLoader();
    loader.load(
        'reflection_map.png',
        (texture) => {
            const img = texture.image;
            if (!img || !(img instanceof HTMLImageElement || img instanceof HTMLCanvasElement || img instanceof ImageBitmap || img instanceof OffscreenCanvas)) {
                console.error('Texture image is not a valid CanvasImageSource');
                return;
            }
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // Get a gray scale version of the reflection map using numbers from BT-601 Standard
            for (let i = 0; i < data.length; i += 4) {
                const gray = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
                data[i] = gray;
                data[i + 1] = gray;
                data[i + 2] = gray;
            }
            ctx.putImageData(imageData, 0, 0);
            
            const greyTexture = new THREE.CanvasTexture(canvas);
            greyTexture.mapping = THREE.EquirectangularReflectionMapping;
            greyTexture.colorSpace = THREE.SRGBColorSpace;
            
            envMap = greyTexture;
            
            // Update existing materials if they were already created
            if (ballMesh) {
                ballMesh.material.envMap = envMap;
                ballMesh.material.needsUpdate = true;
            }
            if (die) {
                if (Array.isArray(die.material)) {
                    die.material.forEach(m => {
                        m.envMap = envMap;
                        m.needsUpdate = true;
                    });
                } else {
                    die.material.envMap = envMap;
                    die.material.needsUpdate = true;
                }
            }
        },
        () => {},
        (err) => {
            console.error('An error happened while loading the texture', err);
        }
    );

    // Light
    const ambientLight = new THREE.AmbientLight(COLOR_AMBIENT_LIGHT, 0.5);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(COLOR_MAIN_LIGHT, 0.8);
    mainLight.position.set(5, 5, 10);
    scene.add(mainLight);

    const fillLight = new THREE.PointLight(COLOR_FILL_LIGHT, 0.3);
    fillLight.position.set(-5, -5, 2);
    scene.add(fillLight);

    ballGroup = new THREE.Group();
    scene.add(ballGroup);

    createBall();
    createDie();
    
    // Position the die inside the ball
    // We add it to the scene instead of ballGroup so it doesn't rotate with the ball
    // Note: we rotate the die with user movement to partially match the ball's rotation
    scene.add(die);
    
    // Initial rotation to show the '8' logo
    // The logo is at (0, 0, 1), so looking at it means no rotation needed initially
    ballGroup.rotation.y = 0;
    
    // Position die initially
    die.position.set(0, 0, -0.5);
    
    // Initial state
    state = 'idle';
    
    animate();
}

function createBall() {
    const geometry = new THREE.SphereGeometry(2, 64, 64);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 1024;
    canvas.height = 512;

    // Fill with black
    ctx.fillStyle = COLOR_BALL;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw the '8' logo on one side (center of left half of UV)
    // UV (0.25, 0.5) in texture space
    const logoX = canvas.width * 0.25;
    const logoY = canvas.height * 0.5;
    
    ctx.fillStyle = COLOR_LOGO_CIRCLE;
    ctx.beginPath();
    ctx.arc(logoX, logoY, 120, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = COLOR_LOGO_TEXT;
    // The '8' needs to be huge
    ctx.font = 'bold 160px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('8', logoX, logoY);

    // Add noise to the whole ball (except the window hole we're about to cut)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 12; // Slightly reduced noise
        data[i] = Math.min(255, Math.max(0, data[i] + noise));
        data[i+1] = Math.min(255, Math.max(0, data[i+1] + noise));
        data[i+2] = Math.min(255, Math.max(0, data[i+2] + noise));

        // Add a subtle "grain" or "dust" effect to weather the ball
        if (Math.random() > 0.99) {
            const grain = Math.random() * 50;
            data[i] = Math.min(255, data[i] + grain);
            data[i+1] = Math.min(255, data[i+1] + grain);
            data[i+2] = Math.min(255, data[i+2] + grain);
        }
    }
    ctx.putImageData(imageData, 0, 0);

    // Draw the window area on the other side (center of right half of UV)
    // UV (0.75, 0.5) in texture space
    const windowX = canvas.width * 0.75;
    const windowY = canvas.height * 0.5;
    // Increased window radius slightly to ensure glass fits inside cleanly
    const windowRadius = 50;

    // We want the window to be transparent so we can see the die inside.
    // In Canvas, we can use destination-out to cut a hole.
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(windowX, windowY, windowRadius, 0, Math.PI * 2);
    ctx.fill();

    // Draw the liquid background behind/in the hole
    // This can probably be simplified as the gradients are very subtle
    ctx.globalCompositeOperation = 'destination-over';
    const grad = ctx.createRadialGradient(windowX, windowY, 0, windowX, windowY, windowRadius);
    grad.addColorStop(0, COLOR_LIQUID_GRADIENT_START); // Darker and more opaque center
    grad.addColorStop(0.6, COLOR_LIQUID_GRADIENT_MID); // Darker mid
    grad.addColorStop(1, COLOR_LIQUID_GRADIENT_END);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(windowX, windowY, windowRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = 'source-over';
    // Add a rim to the window to create a slight indent look
    // Inner rim (darker/recessed edge)
    ctx.strokeStyle = COLOR_WINDOW_RIM_INNER;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(windowX, windowY, windowRadius + 1, 0, Math.PI * 2);
    ctx.stroke();

    // Outer highlight rim (top edge)
    ctx.strokeStyle = COLOR_WINDOW_RIM_OUTER;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(windowX, windowY, windowRadius + 3, 0, Math.PI * 2);
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.15,
        metalness: 0.6,
        envMap: envMap,
        envMapIntensity: 1.0,
        transparent: true,
        side: THREE.FrontSide
    });

    ballMesh = new THREE.Mesh(geometry, material);
    ballMesh.renderOrder = 0;
    ballGroup.add(ballMesh);
}

function createTextTexture(text) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 512;

    // Background - dark murky blue/black
    ctx.fillStyle = COLOR_DIE_TEXT_BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Text
    ctx.fillStyle = COLOR_DIE_TEXT;
    ctx.shadowColor = COLOR_DIE_TEXT_GLOW;
    ctx.shadowBlur = 20; // Reduced blur
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Draw text at the center of the canvas (0.5, 0.5)
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    // In our createDie UV mapping, 'up' in UV space corresponds to the face APEX.
    // In an icosahedron face, the apex is the vertex furthest from the equator.
    // To have the text readable when the apex is pointing DOWN in screen space,
    // we need to rotate the text 180 degrees.
    ctx.rotate(Math.PI);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    ctx.font = 'bold 40px Arial'; // Slightly smaller font to ensure it fits the triangle
    const rawWords = text.toUpperCase().split(' ');
    const lines = [];
    let currentLine = '';

    rawWords.forEach((word) => {
        const lineIndex = lines.length;
        const maxLength = 12 - (lineIndex * 2); // More conservative max length

        if (currentLine === '') {
            currentLine = word;
        } else {
            const potentialLine = currentLine + ' ' + word;
            if (potentialLine.length <= maxLength) {
                currentLine = potentialLine;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
    });
    if (currentLine) {
        lines.push(currentLine);
    }

    const lineHeight = 54; // Adjusted line height
    const totalHeight = lines.length * lineHeight;
    // Adjust startY to be higher because the triangle is narrower at the bottom of the texture (which is the top of the readable text)
    // When text is flipped 180, Y decreases from bottom to top of readable text.
    // In UV space, Y+ is APEX (which is now bottom of readable text).
    // So Y- in UV space is TOP of readable text.
    const startY = (canvas.height / 2) - (totalHeight / 2) + lineHeight / 2 - 10;

    lines.forEach((line, i) => {
        ctx.fillText(line, canvas.width / 2, startY + (i * lineHeight));
    });
    ctx.restore();
    return new THREE.CanvasTexture(canvas);
}

function createDie() {
    if (die) return;

    const geometry = new THREE.IcosahedronGeometry(0.85, 0);
    
    // Ensure the geometry has non-indexed attributes so each face has its own vertices
    const nonIndexedGeometry = geometry.toNonIndexed();
    
    // Fix UVs: for each triangle, map its vertices to the triangle in our canvas texture
    const uvAttribute = nonIndexedGeometry.getAttribute('uv');
    const positionAttribute = nonIndexedGeometry.getAttribute('position');
    const vA = new THREE.Vector3();
    const vB = new THREE.Vector3();
    const vC = new THREE.Vector3();
    
    // Store local normals for opacity updates
    nonIndexedGeometry.userData.faceNormals = [];

    for (let i = 0; i < uvAttribute.count; i += 3) {
        vA.fromBufferAttribute(positionAttribute, i);
        vB.fromBufferAttribute(positionAttribute, i + 1);
        vC.fromBufferAttribute(positionAttribute, i + 2);

        // Calculate the center of the face
        const center = new THREE.Vector3().add(vA).add(vB).add(vC).divideScalar(3);
        const normal = center.clone().normalize();
        nonIndexedGeometry.userData.faceNormals.push(normal);
        
        // Find the "apex" vertex (furthest from the equator)
        const vertices = [vA.clone(), vB.clone(), vC.clone()];
        vertices.sort((a, b) => Math.abs(b.y) - Math.abs(a.y));
        const apex = vertices[0];

        // Project vertices onto a plane perpendicular to the face normal
        // Find the "localUp" vector. This should be a vector from center to apex
        // projected onto the plane of the face and then normalized.
        // Actually, since apex, center, and normal are roughly in the same plane
        // for an equilateral triangle on a sphere, the apex-center is already
        // close to being in the plane. To be precise:
        const localUp = apex.clone().sub(center);
        const normalComponent = localUp.dot(normal);
        localUp.sub(normal.clone().multiplyScalar(normalComponent)).normalize();
        
        const localRight = localUp.clone().cross(normal).normalize();
        
        const projectAligned = (v) => {
            const rel = v.clone().sub(center);
            return {
                x: rel.dot(localRight),
                y: rel.dot(localUp)
            };
        };

        const paA = projectAligned(vA);
        const paB = projectAligned(vB);
        const paC = projectAligned(vC);

        // Scale factor - slightly increased to fill more of the canvas
        const scale = 1.25;
        
        // Horizontal offset: Ensure the apex is exactly at x=0.5
        // Since we project using localRight and localUp where localUp points to apex,
        // the apex's projected x coordinate (paA.x, paB.x or paC.x) will be 0.
        uvAttribute.setXY(i, 0.5 + paA.x * scale, 0.5 + paA.y * scale);
        uvAttribute.setXY(i + 1, 0.5 + paB.x * scale, 0.5 + paB.y * scale);
        uvAttribute.setXY(i + 2, 0.5 + paC.x * scale, 0.5 + paC.y * scale);
    }
    
    const materials = phrases.map(phrase => {
        const texture = createTextTexture(phrase);
        return new THREE.MeshStandardMaterial({
            map: texture,
            emissiveMap: texture,
            roughness: 0.1,
            metalness: 0.1,
            emissive: COLOR_DIE_EMISSIVE,
            emissiveIntensity: 1.0,
            envMap: envMap,
            envMapIntensity: 0.2,
            side: THREE.FrontSide,
            transparent: false,
            opacity: 1.0
        });
    });

    // Add groups to the geometry, each group is one face (3 vertices)
    for (let i = 0; i < phrases.length; i++) {
        nonIndexedGeometry.addGroup(i * 3, 3, i);
    }

    die = new THREE.Mesh(nonIndexedGeometry, materials);
    die.renderOrder = 1;
}

function getFaceRotation(faceIndex) {
    if (!die) return new THREE.Quaternion();

    const geometry = die.geometry;
    const positionAttribute = geometry.getAttribute('position');
    
    // Get vertices for this face
    const vA = new THREE.Vector3().fromBufferAttribute(positionAttribute, faceIndex * 3);
    const vB = new THREE.Vector3().fromBufferAttribute(positionAttribute, faceIndex * 3 + 1);
    const vC = new THREE.Vector3().fromBufferAttribute(positionAttribute, faceIndex * 3 + 2);

    // Face normal (center-to-sphere surface)
    const center = new THREE.Vector3().add(vA).add(vB).add(vC).divideScalar(3);
    const normal = center.clone().normalize();

    // Replicate the UV mapping "up" logic
    // Find the "apex" vertex (furthest from the equator in local space)
    const vertices = [vA.clone(), vB.clone(), vC.clone()];
    vertices.sort((a, b) => Math.abs(b.y) - Math.abs(a.y));
    const apex = vertices[0];

    const localUp = apex.clone().sub(center);
    const normalComponent = localUp.dot(normal);
    localUp.sub(normal.clone().multiplyScalar(normalComponent)).normalize();

    // Create a rotation matrix that maps local axes to target axes
    const localRight = new THREE.Vector3().crossVectors(localUp, normal).normalize();
    
    // We want to map:
    // normal -> (0,0,1)
    // localUp -> (0,-1,0)
    // localRight -> (-1,0,0) (to keep it right-handed: cross(-1,0,0, 0,-1,0) = (0,0,1))
    
    const matrix = new THREE.Matrix4();
    matrix.set(
        -localRight.x, -localUp.x, normal.x, 0,
        -localRight.y, -localUp.y, normal.y, 0,
        -localRight.z, -localUp.z, normal.z, 0,
        0, 0, 0, 1
    );

    // We want the inverse of this matrix to rotate the die such that
    // normal becomes (0,0,1) and localUp becomes (0,-1,0)
    return new THREE.Quaternion().setFromRotationMatrix(matrix).invert();
}

function animate() {
    requestAnimationFrame(animate);
    
    if (die && ballGroup) {
        if (state === 'shaking') {
            const time = Date.now() * 0.005;
            // Smoother wobble using sine waves instead of pure random jitter
            ballGroup.rotation.x = Math.sin(time * 1.1) * 0.2;
            ballGroup.rotation.y = Math.sin(time * 1.2) * 0.2; // Changed from cos for variety
            ballGroup.rotation.z = Math.sin(time * 1.3) * 0.2;
            
            // Die sinks and wobbles during the shake
            die.position.z += (-0.5 - die.position.z) * 0.05;
            die.position.x = Math.sin(time * 2.0) * 0.1;
            die.position.y = Math.cos(time * 2.1) * 0.1;
        } else if (state === 'settling') {
            // Smoothly rotate the ball to show the window (PI rotation around Y)
            if (!isDragging) {
                ballGroup.rotation.y += (Math.PI - ballGroup.rotation.y) * 0.03;
                ballGroup.rotation.x *= 0.9;
                ballGroup.rotation.z *= 0.9;
            }

            // Smoothly rotate die towards the target while staying visible
            if (!isDragging) {
                die.quaternion.slerp(targetQuaternion, 0.05);
            }
            
            // Die floats up
            die.position.z += (1.0 - die.position.z) * 0.02;
            die.position.x *= 0.95;
            die.position.y *= 0.95;

            // Check if we are close to the target rotation to start floating
            if (die.quaternion.angleTo(targetQuaternion) < 0.01 && Math.abs(Math.PI - ballGroup.rotation.y) < 0.01) {
                // Snap to perfect alignment
                die.quaternion.copy(targetQuaternion);
                ballGroup.rotation.y = Math.PI;
                state = 'floating';
            }
        } else if ((state === 'floating' || state === 'idle') && !isDragging) {
            // Ensure we stay at the target rotation
            die.quaternion.copy(targetQuaternion);

            if (state === 'idle') {
                // Show logo side (rotation 0)
                ballGroup.rotation.y += (0 - ballGroup.rotation.y) * 0.03;
                die.position.z += (-0.5 - die.position.z) * 0.03;
            } else {
                // Show window side (rotation PI)
                ballGroup.rotation.y += (Math.PI - ballGroup.rotation.y) * 0.03;

            }

            // Subtle floating animation
            const time = Date.now() * 0.002;
            const floatOffset = Math.sin(time) * 0.05;
            die.position.z += (1.0 + floatOffset - die.position.z) * 0.03;

            // Also add very subtle drift in x and y
            die.position.x += (Math.sin(time * 0.7) * 0.03 - die.position.x) * 0.01;
            die.position.y += (Math.cos(time * 0.8) * 0.03 - die.position.y) * 0.01;
            ballGroup.rotation.x *= 0.9;
        }
    }

    // Update face materials based on orientation to make the answer easier to read
    updateFaceMaterials();
    renderer.render(scene, camera);
}

function updateFaceMaterials() {
    if (!die) return;

    // Use the die's world normal to compare with the camera direction
    const worldNormal = new THREE.Vector3();
    const cameraDirection = new THREE.Vector3(0, 0, 1);
    const dieQuaternion = die.getWorldQuaternion(new THREE.Quaternion());

    let maxDot = -1;
    let frontFaceIndex = -1;

    // The die text background color is COLOR_DIE_TEXT_BG (#000208)
    // We want to fade to a color that matches the murky liquid, which is almost black.
    const FADE_COLOR = new THREE.Color(0x000000);
    const BASE_COLOR = new THREE.Color(0xffffff);

    const faceNormals = die.geometry.userData.faceNormals;

    for (let i = 0; i < phrases.length; i++) {
        const localNormal = faceNormals[i];

        // Transform normal to world space
        worldNormal.copy(localNormal).applyQuaternion(dieQuaternion).normalize();
        
        const dot = worldNormal.dot(cameraDirection);
        
        if (dot > maxDot) {
            maxDot = dot;
            frontFaceIndex = i;
        }

        // Set all faces to an obscured state by default
        die.material[i].color.copy(FADE_COLOR);
        die.material[i].emissive.setHex(COLOR_DIE_EMISSIVE);
        die.material[i].emissiveIntensity = 0.05;
    }

    if (frontFaceIndex !== -1) {
        // Obscurity depends on distance to the window (die.position.z)
        // and orientation (dot product)
        // At z=-0.5 (deep), it should be very obscured
        // At z=1.4 (floating at the window), it should be visible
        let visibility = THREE.MathUtils.smoothstep(die.position.z, -0.5, 1.4);
        // Highlight the selected face
        const material = die.material[frontFaceIndex];
        // Use emissive to make it glow and be visible through the dark "liquid"
        material.emissive.setHex(COLOR_DIE_HIGHLIGHT_EMISSIVE_HEX);
        material.emissiveIntensity = 0.3;
        // Also fade the base color
        material.color.lerpColors(FADE_COLOR, BASE_COLOR, visibility);
    }
}

function shakeBall() {
    if (state !== 'idle' && state !== 'floating') return;
    state = 'shaking';
    
    // Pick the answer immediately and rotate die to it
    const randomIndex = Math.floor(Math.random() * phrases.length);
    const rotation = getFaceRotation(randomIndex);
    targetQuaternion.copy(rotation);
    setTimeout(() => {
        state = 'settling';
    }, 1200); 
}

// Handle resize
window.addEventListener('resize', () => {
    if (!camera || !renderer) return;
    const width = container.clientWidth;
    const height = container.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width * 2, height * 2, false);
});

init();

// Handle dragging
container.addEventListener('mousedown', (e) => {
    if (e.button === 0) { // Left mouse button
        isDragging = true;
        totalDragDistance = 0;
        previousMousePosition = {
            x: e.clientX,
            y: e.clientY
        };
    }
});

window.addEventListener('mousemove', (e) => {
    if (state !== 'idle' && state !== 'floating') return;

    if (isDragging && ballGroup) {
        const deltaMove = {
            x: e.clientX - previousMousePosition.x,
            y: e.clientY - previousMousePosition.y
        };

        totalDragDistance += Math.sqrt(deltaMove.x * deltaMove.x + deltaMove.y * deltaMove.y);

        // Rotation speed factor
        const rs = 0.005;
        
        // Update rotation
        // Dragging left/right (deltaMove.x) rotates around Y axis
        // Dragging up/down (deltaMove.y) rotates around X axis
        const rotationY = deltaMove.x * rs;
        const rotationX = deltaMove.y * rs;

        ballGroup.rotation.y += rotationY;
        ballGroup.rotation.x += rotationX;

        if (die) {
            // Apply the same rotation to the die
            // Since die is in world space (added to the scene), we apply rotation around the world axes.
            // To match ballGroup's behavior exactly, we rotate around world Y then world X
            const qX = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), rotationX);
            const qY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotationY);

            // To rotate around WORLD axes using quaternions:
            // world_rotation * current_quaternion
            die.quaternion.premultiply(qX);
            die.quaternion.premultiply(qY);

            // Also, update targetQuaternion so it doesn't snap back immediately if we are in a state that uses it
            targetQuaternion.copy(die.quaternion);
        }

        previousMousePosition = {
            x: e.clientX,
            y: e.clientY
        };
    }
});

window.addEventListener('mouseup', () => {
    isDragging = false;
});

ball.addEventListener('click', () => {
    // Only shake if we didn't just finish a significant drag
    if (totalDragDistance < 5) {
        shakeBall();
    }
});

window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        if (ballMesh) {
            ballMesh.visible = !ballMesh.visible;
        }
    }
});
