// 1. CONFIGURACIÓN DEL MUNDO 3D
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Color del cielo (celeste)

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 2. ILUMINACIÓN (Para que tu mapa no se vea negro)
const luzAmbiente = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(luzAmbiente);
const luzSol = new THREE.DirectionalLight(0xffffff, 0.8);
luzSol.position.set(100, 200, 50);
scene.add(luzSol);

// 3. CONTROLES FPS (El mouse y el teclado)
const controls = new THREE.PointerLockControls(camera, document.body);
const blocker = document.getElementById('blocker');
const instrucciones = document.getElementById('instrucciones');

// Al hacer clic en el menú, entramos al juego
instrucciones.addEventListener('click', function () {
    controls.lock();
});

// Eventos para mostrar/ocultar el menú
controls.addEventListener('lock', function () {
    blocker.style.display = 'none';
});
controls.addEventListener('unlock', function () {
    blocker.style.display = 'flex';
});
scene.add(controls.getObject());

// 4. MOVIMIENTO Y FÍSICAS (Gravedad y WASD)
let moverseAdelante = false, moverseAtras = false, moverseIzquierda = false, moverseDerecha = false;
let puedeSaltar = false;
const velocidad = new THREE.Vector3();
const direccion = new THREE.Vector3();

document.addEventListener('keydown', (event) => {
    switch (event.code) {
        case 'KeyW': moverseAdelante = true; break;
        case 'KeyA': moverseIzquierda = true; break;
        case 'KeyS': moverseAtras = true; break;
        case 'KeyD': moverseDerecha = true; break;
        case 'Space': 
            if (puedeSaltar) { velocidad.y += 15; puedeSaltar = false; }
            break;
    }
});

document.addEventListener('keyup', (event) => {
    switch (event.code) {
        case 'KeyW': moverseAdelante = false; break;
        case 'KeyA': moverseIzquierda = false; break;
        case 'KeyS': moverseAtras = false; break;
        case 'KeyD': moverseDerecha = false; break;
    }
});

// 5. CARGAR TUS MODELOS 3D (¡AQUÍ DEBES PONER TUS ARCHIVOS!)
const loader = new THREE.GLTFLoader();

// --> CARGAR EL MAPA <--
// CAMBIA 'dust2.glb' POR EL NOMBRE EXACTO DE TU MAPA EN GITHUB
loader.load('dust2.glb', function (gltf) {
    const mapa = gltf.scene;
    scene.add(mapa);
}, undefined, function(error) {
    console.error("Error al cargar el mapa:", error);
});

// --> CARGAR LAS MANOS Y EL ARMA <--
// CAMBIA 'manos.glb' POR EL NOMBRE EXACTO DE TUS BRAZOS FPS EN GITHUB
loader.load('manos.glb', function (gltf) {
    const arma = gltf.scene;
    arma.scale.set(0.5, 0.5, 0.5); // Tamaño del arma
    arma.position.set(0.5, -0.5, -1.2); // Posición en la pantalla (derecha, abajo, adelante)
    arma.rotation.y = Math.PI; // Girar si está al revés
    camera.add(arma); // Pegamos el arma a la cámara para que se mueva con tu vista
}, undefined, function(error) {
    console.error("Error al cargar el arma:", error);
});

// Posición inicial del jugador
controls.getObject().position.set(0, 5, 0);

// 6. EL BUCLE PRINCIPAL (El corazón del juego que late 60 veces por segundo)
let tiempoAnterior = performance.now();

function animar() {
    requestAnimationFrame(animar);
    const tiempoActual = performance.now();
    const delta = (tiempoActual - tiempoAnterior) / 1000;

    if (controls.isLocked === true) {
        // Frenado por fricción
        velocidad.x -= velocidad.x * 10.0 * delta;
        velocidad.z -= velocidad.z * 10.0 * delta;
        velocidad.y -= 9.8 * 5.0 * delta; // Gravedad cayendo

        direccion.z = Number(moverseAdelante) - Number(moverseAtras);
        direccion.x = Number(moverseDerecha) - Number(moverseIzquierda);
        direccion.normalize(); // Para no correr más rápido en diagonal

        // Acelerar
        if (moverseAdelante || moverseAtras) velocidad.z -= direccion.z * 100.0 * delta;
        if (moverseIzquierda || moverseDerecha) velocidad.x -= direccion.x * 100.0 * delta;

        // Aplicar movimiento
        controls.moveRight(-velocidad.x * delta);
        controls.moveForward(-velocidad.z * delta);
        controls.getObject().position.y += (velocidad.y * delta);

        // Piso invisible (Para que no te caigas al vacío)
        if (controls.getObject().position.y < 2) {
            velocidad.y = 0;
            controls.getObject().position.y = 2;
            puedeSaltar = true;
        }
    }

    tiempoAnterior = tiempoActual;
    renderer.render(scene, camera);
}

// Adaptar la pantalla si cambias el tamaño de la ventana
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animar();
