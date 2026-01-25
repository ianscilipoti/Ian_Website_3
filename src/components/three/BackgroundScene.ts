import * as THREE from 'three';

// Brand colors
const COLORS = [
  new THREE.Color(0xCB8BD2), // purple
  new THREE.Color(0x8ED28B), // green
  new THREE.Color(0x8BCBD2), // blue
];

// Configuration
const CONFIG = {
  maxRibbons: 30,
  initialRibbons: 10,
  trailLength: 80,           // Number of points in trail
  trailUpdateInterval: 16,   // ms between trail point captures
  ribbonWidth: 0.015,
  splitChance: 0.002,        // Chance per frame to split
  minSplitInterval: 3000,    // Min ms between splits for a ribbon
  spawnInterval: 2000,       // Ms between new ribbon spawns
  speed: 0.008,
  turnSpeed: 0.02,
  divergeRate: 0.015,
  bounds: { x: 3, y: 2 },    // Movement bounds
};

interface Ribbon {
  id: number;
  points: THREE.Vector3[];
  velocity: THREE.Vector2;
  targetAngle: number;
  color: THREE.Color;
  opacity: number;
  mesh: THREE.Mesh | null;
  lastSplitTime: number;
  lastTrailUpdate: number;
  age: number;
  fadingOut: boolean;
}

let ribbons: Ribbon[] = [];
let nextRibbonId = 0;
let scene: THREE.Scene;
let lastSpawnTime = 0;

function createRibbonGeometry(points: THREE.Vector3[], width: number): THREE.BufferGeometry {
  if (points.length < 2) {
    return new THREE.BufferGeometry();
  }

  const vertices: number[] = [];
  const indices: number[] = [];
  const uvs: number[] = [];
  const opacities: number[] = [];

  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    const t = i / (points.length - 1);

    // Calculate direction for width offset
    let direction: THREE.Vector3;
    if (i === 0) {
      direction = new THREE.Vector3().subVectors(points[1], points[0]).normalize();
    } else if (i === points.length - 1) {
      direction = new THREE.Vector3().subVectors(points[i], points[i - 1]).normalize();
    } else {
      direction = new THREE.Vector3().subVectors(points[i + 1], points[i - 1]).normalize();
    }

    // Perpendicular in 2D (we're working in xy plane)
    const perpendicular = new THREE.Vector3(-direction.y, direction.x, 0);

    // Taper width towards the tail
    const taperWidth = width * (0.3 + 0.7 * t);

    // Add two vertices (left and right of center line)
    const left = point.clone().add(perpendicular.clone().multiplyScalar(taperWidth));
    const right = point.clone().sub(perpendicular.clone().multiplyScalar(taperWidth));

    vertices.push(left.x, left.y, left.z);
    vertices.push(right.x, right.y, right.z);

    uvs.push(0, t);
    uvs.push(1, t);

    // Opacity fades towards tail
    const opacity = t * t; // Quadratic fade
    opacities.push(opacity, opacity);
  }

  // Create triangles
  for (let i = 0; i < points.length - 1; i++) {
    const baseIndex = i * 2;
    indices.push(baseIndex, baseIndex + 1, baseIndex + 2);
    indices.push(baseIndex + 1, baseIndex + 3, baseIndex + 2);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('opacity', new THREE.Float32BufferAttribute(opacities, 1));
  geometry.setIndex(indices);

  return geometry;
}

function createRibbonMaterial(color: THREE.Color): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: color },
      uOpacity: { value: 1.0 },
    },
    vertexShader: `
      attribute float opacity;
      varying float vOpacity;
      varying vec2 vUv;

      void main() {
        vOpacity = opacity;
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vOpacity;
      varying vec2 vUv;

      void main() {
        // Soft edges
        float edgeFade = 1.0 - pow(abs(vUv.x - 0.5) * 2.0, 2.0);
        float alpha = vOpacity * uOpacity * edgeFade * 0.7;
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}

function createRibbon(position?: THREE.Vector3, velocity?: THREE.Vector2, color?: THREE.Color): Ribbon {
  const startPos = position || new THREE.Vector3(
    (Math.random() - 0.5) * CONFIG.bounds.x * 2,
    (Math.random() - 0.5) * CONFIG.bounds.y * 2,
    0
  );

  const angle = velocity
    ? Math.atan2(velocity.y, velocity.x)
    : Math.random() * Math.PI * 2;

  const ribbonColor = color || COLORS[Math.floor(Math.random() * COLORS.length)].clone();

  // Initialize trail with starting position
  const points: THREE.Vector3[] = [];
  for (let i = 0; i < CONFIG.trailLength; i++) {
    points.push(startPos.clone());
  }

  const ribbon: Ribbon = {
    id: nextRibbonId++,
    points,
    velocity: velocity?.clone() || new THREE.Vector2(
      Math.cos(angle) * CONFIG.speed,
      Math.sin(angle) * CONFIG.speed
    ),
    targetAngle: angle,
    color: ribbonColor,
    opacity: 0,
    mesh: null,
    lastSplitTime: Date.now(),
    lastTrailUpdate: Date.now(),
    age: 0,
    fadingOut: false,
  };

  return ribbon;
}

function spawnRibbon(): void {
  if (ribbons.length >= CONFIG.maxRibbons) return;

  const ribbon = createRibbon();
  ribbons.push(ribbon);
}

function splitRibbon(ribbon: Ribbon): void {
  if (ribbons.length >= CONFIG.maxRibbons) return;
  if (Date.now() - ribbon.lastSplitTime < CONFIG.minSplitInterval) return;

  ribbon.lastSplitTime = Date.now();

  // Create new ribbon at same position with slightly diverged velocity
  const headPos = ribbon.points[ribbon.points.length - 1].clone();
  const divergeAngle = (Math.random() - 0.5) * 0.5; // Small initial divergence
  const newVelocity = ribbon.velocity.clone().rotateAround(new THREE.Vector2(0, 0), divergeAngle);

  // Slightly different color variation
  const newColor = ribbon.color.clone();
  newColor.offsetHSL(0, 0, (Math.random() - 0.5) * 0.1);

  const newRibbon = createRibbon(headPos, newVelocity, newColor);
  newRibbon.points = ribbon.points.map(p => p.clone()); // Copy trail
  newRibbon.opacity = ribbon.opacity;
  newRibbon.age = ribbon.age;

  ribbons.push(newRibbon);
}

function updateRibbon(ribbon: Ribbon, deltaTime: number): void {
  ribbon.age += deltaTime;

  // Fade in
  if (!ribbon.fadingOut && ribbon.opacity < 1) {
    ribbon.opacity = Math.min(1, ribbon.opacity + deltaTime * 0.001);
  }

  // Fade out old ribbons
  if (ribbon.age > 15000 && !ribbon.fadingOut) {
    ribbon.fadingOut = true;
  }

  if (ribbon.fadingOut) {
    ribbon.opacity -= deltaTime * 0.0005;
  }

  // Smoothly change direction
  ribbon.targetAngle += (Math.random() - 0.5) * CONFIG.turnSpeed;

  const currentAngle = Math.atan2(ribbon.velocity.y, ribbon.velocity.x);
  const angleDiff = ribbon.targetAngle - currentAngle;
  const newAngle = currentAngle + angleDiff * 0.05;

  const speed = ribbon.velocity.length();
  ribbon.velocity.set(
    Math.cos(newAngle) * speed,
    Math.sin(newAngle) * speed
  );

  // Update head position
  const head = ribbon.points[ribbon.points.length - 1];
  const newHead = new THREE.Vector3(
    head.x + ribbon.velocity.x * deltaTime * 0.1,
    head.y + ribbon.velocity.y * deltaTime * 0.1,
    0
  );

  // Soft boundary wrapping
  if (Math.abs(newHead.x) > CONFIG.bounds.x) {
    ribbon.targetAngle = Math.PI - ribbon.targetAngle;
    newHead.x = Math.sign(newHead.x) * CONFIG.bounds.x;
  }
  if (Math.abs(newHead.y) > CONFIG.bounds.y) {
    ribbon.targetAngle = -ribbon.targetAngle;
    newHead.y = Math.sign(newHead.y) * CONFIG.bounds.y;
  }

  // Update trail points
  const now = Date.now();
  if (now - ribbon.lastTrailUpdate > CONFIG.trailUpdateInterval) {
    ribbon.lastTrailUpdate = now;
    ribbon.points.shift();
    ribbon.points.push(newHead);
  } else {
    // Interpolate head position
    ribbon.points[ribbon.points.length - 1] = newHead;
  }

  // Random split chance
  if (!ribbon.fadingOut && Math.random() < CONFIG.splitChance && ribbons.length < CONFIG.maxRibbons) {
    splitRibbon(ribbon);
  }

  // Update mesh
  if (ribbon.mesh) {
    ribbon.mesh.geometry.dispose();
    ribbon.mesh.geometry = createRibbonGeometry(ribbon.points, CONFIG.ribbonWidth);
    (ribbon.mesh.material as THREE.ShaderMaterial).uniforms.uOpacity.value = ribbon.opacity;
  } else {
    const geometry = createRibbonGeometry(ribbon.points, CONFIG.ribbonWidth);
    const material = createRibbonMaterial(ribbon.color);
    ribbon.mesh = new THREE.Mesh(geometry, material);
    scene.add(ribbon.mesh);
  }
}

function removeRibbon(ribbon: Ribbon): void {
  if (ribbon.mesh) {
    scene.remove(ribbon.mesh);
    ribbon.mesh.geometry.dispose();
    (ribbon.mesh.material as THREE.Material).dispose();
  }
}

// Check WebGL support
function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

export function initScene(container: HTMLElement | null): (() => void) | undefined {
  if (!container) return;

  if (!hasWebGL()) {
    container.classList.add('animated-background--fallback');
    return;
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    container.classList.add('animated-background--fallback');
    return;
  }

  const width = container.clientWidth;
  const height = container.clientHeight;

  // Scene setup
  scene = new THREE.Scene();

  // Camera
  const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
  camera.position.z = 2;

  // Renderer
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: 'low-power',
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  // Initialize ribbons
  ribbons = [];
  for (let i = 0; i < CONFIG.initialRibbons; i++) {
    spawnRibbon();
  }
  lastSpawnTime = Date.now();

  // Visibility tracking
  let isVisible = true;
  const observer = new IntersectionObserver(
    (entries) => {
      isVisible = entries[0].isIntersecting;
    },
    { threshold: 0.1 }
  );
  observer.observe(container);

  // Animation loop
  let lastTime = performance.now();
  let animationId: number;

  function animate() {
    animationId = requestAnimationFrame(animate);

    if (!isVisible) return;

    const now = performance.now();
    const deltaTime = Math.min(now - lastTime, 50); // Cap delta to prevent jumps
    lastTime = now;

    // Spawn new ribbons periodically if under limit
    if (Date.now() - lastSpawnTime > CONFIG.spawnInterval && ribbons.length < CONFIG.maxRibbons * 0.7) {
      spawnRibbon();
      lastSpawnTime = Date.now();
    }

    // Update all ribbons
    for (const ribbon of ribbons) {
      updateRibbon(ribbon, deltaTime);
    }

    // Remove dead ribbons
    const deadRibbons = ribbons.filter(r => r.opacity <= 0);
    for (const ribbon of deadRibbons) {
      removeRibbon(ribbon);
    }
    ribbons = ribbons.filter(r => r.opacity > 0);

    renderer.render(scene, camera);
  }

  animate();

  // Handle resize
  function handleResize() {
    const newWidth = container.clientWidth;
    const newHeight = container.clientHeight;
    camera.aspect = newWidth / newHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(newWidth, newHeight);
  }

  window.addEventListener('resize', handleResize);

  // Cleanup
  return () => {
    cancelAnimationFrame(animationId);
    for (const ribbon of ribbons) {
      removeRibbon(ribbon);
    }
    ribbons = [];
    renderer.dispose();
    window.removeEventListener('resize', handleResize);
    observer.disconnect();
  };
}
