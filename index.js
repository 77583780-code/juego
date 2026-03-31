// Configuración básica
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const loader = new THREE.GLTFLoader();

// 1. CARGAR TU MAPA DUST 2
loader.load("./de_dust2_2020.glb", (gltf) => {
    scene.add(gltf.scene);
    console.log("Mapa cargado");
});

// 2. CARGAR EL CUCHILLO
loader.load("./knife_animated.glb", (gltf) => {
    const knife = gltf.scene;
    knife.scale.set(0.1, 0.1, 0.1); 
    knife.position.set(0.5, -0.5, -1); // Posición frente a la cámara
    camera.add(knife);
    scene.add(camera);
});

camera.position.set(0, 1.6, 5); // Altura de ojos humana

// Luz para que se vea todo
const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
scene.add(light);

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();
