const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  2000
);

camera.position.z = 5;

// Set the initial camera position and rotation
const initialCameraPosition = new THREE.Vector3(0, 0, 5);
const initialCameraRotation = new THREE.Euler(0, 0, 0);

camera.position.copy(initialCameraPosition);
camera.rotation.copy(initialCameraRotation);

// Define the final camera position and rotation
const finalCameraPosition = new THREE.Vector3(0, 0, 20);
const finalCameraRotation = new THREE.Euler(0, 0, 0);

const animationDuration = 50; // Duration in seconds
const framesPerSecond = 60; // Number of animation frames per second

// Spring parameters
const damping = 4;
const stiffness = 10;
const restDelta = 0.001;


// Calculate the number of frames
const totalFrames = animationDuration * framesPerSecond;
let currentFrame = 0;

const geometry = new THREE.SphereGeometry(10, 512, 512);

const count = geometry.attributes.position.count;
const randoms = new Float32Array(count);

for (let i = 0; i < count; i++) {
  randoms[i] = Math.random();
}

geometry.setAttribute("aRandom", new THREE.BufferAttribute(randoms, 1));

const material = new THREE.ShaderMaterial({
  vertexShader: `
uniform float uTime;
uniform float uBigWavesElevation;
uniform vec2 uBigWavesFrequency;
uniform float uBigWavesSpeed;

uniform float uSmallWavesElevation;
uniform float uSmallWavesFrequency;
uniform float uSmallWavesSpeed;
uniform float uSmallIterations;

varying float vElevation;

vec4 permute(vec4 x)
{
    return mod(((x*34.0)+1.0)*x, 289.0);
}
vec4 taylorInvSqrt(vec4 r)
{
    return 1.79284291400159 - 0.85373472095314 * r;
}
vec3 fade(vec3 t)
{
    return t*t*t*(t*(t*6.0-15.0)+10.0);
}

float cnoise(vec3 P)
{
    vec3 Pi0 = floor(P); // Integer part for indexing
    vec3 Pi1 = Pi0 + vec3(1.0); // Integer part + 1
    Pi0 = mod(Pi0, 289.0);
    Pi1 = mod(Pi1, 289.0);
    vec3 Pf0 = fract(P); // Fractional part for interpolation
    vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0
    vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
    vec4 iy = vec4(Pi0.yy, Pi1.yy);
    vec4 iz0 = Pi0.zzzz;
    vec4 iz1 = Pi1.zzzz;

    vec4 ixy = permute(permute(ix) + iy);
    vec4 ixy0 = permute(ixy + iz0);
    vec4 ixy1 = permute(ixy + iz1);

    vec4 gx0 = ixy0 / 7.0;
    vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
    gx0 = fract(gx0);
    vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
    vec4 sz0 = step(gz0, vec4(0.0));
    gx0 -= sz0 * (step(0.0, gx0) - 0.5);
    gy0 -= sz0 * (step(0.0, gy0) - 0.5);

    vec4 gx1 = ixy1 / 7.0;
    vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
    gx1 = fract(gx1);
    vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
    vec4 sz1 = step(gz1, vec4(0.0));
    gx1 -= sz1 * (step(0.0, gx1) - 0.5);
    gy1 -= sz1 * (step(0.0, gy1) - 0.5);

    vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
    vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
    vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
    vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
    vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
    vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
    vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
    vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

    vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
    g000 *= norm0.x;
    g010 *= norm0.y;
    g100 *= norm0.z;
    g110 *= norm0.w;
    vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
    g001 *= norm1.x;
    g011 *= norm1.y;
    g101 *= norm1.z;
    g111 *= norm1.w;

    float n000 = dot(g000, Pf0);
    float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
    float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
    float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
    float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
    float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
    float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
    float n111 = dot(g111, Pf1);

    vec3 fade_xyz = fade(Pf0);
    vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
    vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
    float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x); 
    return 2.2 * n_xyz;
}

void main()
{
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);

    // Elevation
    float elevation = sin(modelPosition.x *0.4* uBigWavesFrequency.x + uTime * uBigWavesSpeed) *
                      sin(modelPosition.z *4.0* uBigWavesFrequency.y + uTime * uBigWavesSpeed) *
                      uBigWavesElevation;

    
    modelPosition.y += elevation;

    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;
    gl_Position = projectedPosition;

    vElevation = elevation;
}
  `,
  fragmentShader: `
    uniform vec3 uDepthColor;
  uniform vec3 uSurfaceColor;
  uniform float uColorOffset;
  uniform float uColorMultiplier;

  varying float vElevation;

void main()
{
    float mixStrength = (vElevation + uColorOffset) * uColorMultiplier;
    vec3 color = mix(uDepthColor, uSurfaceColor, mixStrength);
    
    gl_FragColor = vec4(color, 1.0);
}
  `,
  uniforms: {
    uTime: { value: 0 },
    uBigWavesElevation: { value: 0.2 },
    uBigWavesFrequency: { value: new THREE.Vector2(4, 1.5) },
    uBigWavesSpeed: { value: 3.0 },
    uColorOffset: { value: 0.08 },
    uColorMultiplier: { value: 2 },
    uDepthColor: { value: new THREE.Color("#02b7ff") },
    uSurfaceColor: { value: new THREE.Color("#ffffff") },
  },
});

const mesh = new THREE.Mesh(geometry, material);
mesh.scale.set(0.2, 0.2, 0.2);
mesh.rotation.x = -Math.PI * 0.4;
mesh.position.set(0, 0, 0);

scene.add(mesh);

// Create a canvas variable by selecting the canvas element with the specified ID
const canvas = document.getElementById("myCanvas");

// Create a renderer targeting the specific canvas element
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  canvas: canvas, // Specify the canvas element as the renderer's target
});
renderer.setSize(window.innerWidth, window.innerHeight);

//Here we invoque the raycaster
const raycaster = new THREE.Raycaster();

let currentIntersect = null;
const mouseClick = () => {
  if (currentIntersect) {
    console.log("click");
    const tween1 = new TWEEN.Tween(mesh.scale)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .to(
        {
          x: 0.3,
          y: 0.3,
          z: 0.3,
        },
        600
      );
    tween1.start();
    new TWEEN.Tween(mesh.material.uniforms.uBigWavesSpeed)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .to(
        {
          value: 3.0,
        },
        500
      )
      .start();
    new TWEEN.Tween(mesh.material.uniforms.uColorMultiplier)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .to(
        {
          value: 6.0,
        },
        500
      )
      .start();
  }
};
window.addEventListener("click", mouseClick);

//Mouse hover rotation
let mouseX = 0;
let mouseY = 0;

let targetX = 0;
let targetY = 0;

const windowHalfX = window.innerWidth / 2;
const windowHalfY = window.innerHeight / 2;

//Mouse coordinates
const mouse = new THREE.Vector2(window.innerWidth, window.innerHeight);
function onMouseMove(e) {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
  mouseX = e.clientX - windowHalfX;
  mouseY = e.clientY - windowHalfY;
}
//add the event listener for the upper function
window.addEventListener("mousemove", onMouseMove);

//Resize
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};
window.addEventListener("resize", () => {
  //Update sizes
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  //Update camera
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  //Update renderer
  renderer.setSize(sizes.width, sizes.height);
});
const resizeRenderer = () => {
  const rect = canvas.getBoundingClientRect();
  sizes.width = rect.width;
  sizes.height = rect.height;
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();
  renderer.setSize(sizes.width, sizes.height);
};

window.addEventListener("resize", resizeRenderer);

resizeRenderer();

//Here is where everything moves

const clock = new THREE.Clock(); 

function animate() {
  const elapsedTime = clock.getElapsedTime();

  //Mouse rotation
  targetX = mouseX * 0.001;
  targetY = mouseY * 0.001;

  //Raycaster animate function invocation with the mouse event
  raycaster.setFromCamera(mouse, camera);

  //Raycaster intersections
  const intersects = raycaster.intersectObjects([mesh]);
  //Here is where we check the currentIntersect
  if (intersects.length) {
    if (!currentIntersect) {
      new TWEEN.Tween(mesh.scale)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .to(
          {
            x: 0.25,
            y: 0.25,
            z: 0.25,
          },
          300
        )
        .start();
      new TWEEN.Tween(mesh.material.uniforms.uBigWavesSpeed)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .to(
          {
            value: 3.0,
          },
          500
        )
        .start();
    }
    currentIntersect = intersects[0];
  } else {
    if (currentIntersect) {
      new TWEEN.Tween(mesh.scale)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .to(
          {
            x: 0.2,
            y: 0.2,
            z: 0.2,
          },
          600
        )
        .start();
      new TWEEN.Tween(mesh.material.uniforms.uColorMultiplier)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .to(
          {
            value: 2,
          },
          500
        )
        .start();
    }
    currentIntersect = null;
  }

  material.uniforms.uTime.value = elapsedTime;

  TWEEN.update();
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

animate();

// Function to update the camera's position with a spring-like ease
function updateCamera() {
  if (currentFrame >= totalFrames) return;

  const progress = currentFrame / totalFrames;

  // Apply a custom spring-like ease
  const t = progress;
  const deltaT = 2 / framesPerSecond;
  const omega = 5 * Math.PI * stiffness;
  const zeta = damping / (2 * Math.sqrt(stiffness));
  const expTerm = Math.exp(-zeta * omega * t);
  const cosTerm = Math.cos(omega * Math.sqrt(2 - zeta * zeta) * t);
  const positionFactor = expTerm * (cosTerm + (zeta / Math.sqrt(1 - zeta * zeta)) * Math.sin(omega * Math.sqrt(1 - zeta * zeta) * t));

  // Interpolate camera position using lerp with the spring-like ease
  const lerpedPosition = new THREE.Vector3().lerpVectors(initialCameraPosition, finalCameraPosition, positionFactor);

  camera.position.copy(lerpedPosition);

  currentFrame++;

  requestAnimationFrame(updateCamera);
}

// Call the updateCamera function to start the animation
updateCamera();
