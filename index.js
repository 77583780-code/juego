const juego = {
    scene: null, camera: null, renderer: null, clock: new THREE.Clock(),
    playerModel: null, partidaActiva: false, 
    stats: { nombre: "", genero: "hombre", kills: 0 },
    teclas: {}, raycaster: new THREE.Raycaster(), 

    // Variables de sala simulada
    servidoresActivos: [
        { host: "CimaGod", mapa: "dia", jugadores: 3, max: 4 },
        { host: "Bendy Ankles", mapa: "noche", jugadores: 1, max: 4 }
    ],

    // --- NUEVAS VARIABLES DE FÍSICA Y MOVIMIENTO (Caminar, No Traspasar Paredes) ---
    velocidadY: 0,
    gravedad: -0.012, 
    enSuelo: false,
    controls: null, // Para el PointerLock (Mouse)
    murosDeColision: [], // Aquí guardaremos las paredes que chocan

    init: function() {
        document.getElementById("btn_entrar_lobby").onclick = () => this.entrarAlLobby();
        document.getElementById("btn_play_main").onclick = () => this.iniciarMatchmakingAutomatico();
        
        // Registro de teclas seguro
        window.onkeydown = (e) => this.teclas[e.code] = true;
        window.onkeyup = (e) => this.teclas[e.code] = false;
        window.onmousedown = () => { if(this.partidaActiva) this.disparar(); };
    },

    abrirModal: function() { 
        const cont = document.getElementById("lista_servidores");
        cont.innerHTML = "";
        this.servidoresActivos.forEach((srv, i) => {
            cont.innerHTML += `<div style="display:flex; justify-content:space-between; margin-bottom:5px; align-items:center;">
                <span>${srv.host} - Mapa: ${srv.mapa} (${srv.jugadores}/${srv.max})</span>
                <button onclick="juego.unirseAServidor(${i})" style="background:#00ffaa; border:none; padding:5px; font-weight:bold; cursor:pointer;">UNIRSE</button>
            </div>`;
        });
        document.getElementById("modal-servidores").style.display = "flex"; 
    },
    cerrarModal: function() { document.getElementById("modal-servidores").style.display = "none"; },

    entrarAlLobby: function() {
        this.stats.nombre = document.getElementById("reg_nombre").value || "Soldado";
        this.stats.genero = document.getElementById("reg-genero").value;
        document.getElementById("display_nombre_user").innerText = this.stats.nombre;
        document.getElementById("inicio_pantalla").style.display = "none";
        document.getElementById("lobby_pantalla").style.display = "block";
        
        this.crearEscena3D();
    },

    crearEscena3D: function() {
        const container = document.getElementById("threejs_canvas");
        container.innerHTML = ""; 
        
        this.scene = new THREE.Scene();
        this.scene.background = null; // Deja ver tu imagen de fondo
        
        this.scene.add(new THREE.AmbientLight(0xffffff, 1.2));
        const luz = new THREE.DirectionalLight(0x00ffff, 1.5);
        luz.position.set(2, 5, 5);
        this.scene.add(luz);

        // CÁMARA INICIAL (Mirando al lobby)
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 1.3, 3.5); 

        // RENDERER
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor( 0x000000, 0 ); 
        container.appendChild(this.renderer.domElement);
        
        // PLATAFORMA CIRCULAR
        const circuloGeom = new THREE.RingGeometry(0.8, 1.2, 32);
        const circuloMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
        const plataforma = new THREE.Mesh(circuloGeom, circuloMat);
        plataforma.rotation.x = Math.PI / 2;
        plataforma.position.set(0, -0.3, 0); 
        this.scene.add(plataforma);

        const loader = new THREE.GLTFLoader();
        const skinUrl = this.stats.genero === "hombre" ? "./hombre.glb" : "./mujer.glb";
        
        // CARGAR EL MODELO 3D DE TU PERSONAJE
        loader.load(skinUrl, (gltf) => {
            this.playerModel = gltf.scene;
            this.playerModel.position.set(0, -0.3, 0); // Altura corregida
            
            // Autoescalado por si es Master Chief
            const box = new THREE.Box3().setFromObject(this.playerModel);
            const size = box.getSize(new THREE.Vector3()).length();
            if(size > 10) { this.playerModel.scale.set(0.01, 0.01, 0.01); } 
            else if(size < 0.5) { this.playerModel.scale.set(10, 10, 10); } 

            this.scene.add(this.playerModel);
        });

        this.loop();
    },

    iniciarMatchmakingAutomatico: function() {
        this.empezarPartida('dia');
    },
    crearServidorPublico: function() { this.empezarPartida(document.getElementById("sel-clima").value); },
    crearServidorPrivado: function() { if(!document.getElementById("cod-privado").value) { alert("Pon un código."); return; } this.empezarPartida(document.getElementById("sel-clima").value); },
    unirseAServidor: function(index) { this.empezarPartida(this.servidoresActivos[index].mapa); },

    // --- ENTRADA AL MAPA 3D (Física Real) ---
    empezarPartida: function(clima) {
        this.cerrarModal();
        document.getElementById("lobby_pantalla").style.display = "none";
        document.getElementById("image-background").style.display = "none"; // Quita la imagen de la ciudad
        document.getElementById("hud_pantalla").style.display = "block";

        this.partidaActiva = true;

        // Configuración de clima
        if(clima === 'noche') this.scene.background = new THREE.Color(0x000005);
        else if(clima === 'atardecer') this.scene.background = new THREE.Color(0x442200);
        else this.scene.background = new THREE.Color(0x87ceeb); 
        
        // --- ACTIVAR POINTERLOCKCONTROLS (MOUSE) ---
        // Tus ojos son la cámara.
        this.controls = new THREE.PointerLockControls(this.camera, document.body);
        this.scene.add(this.controls.getObject());
        
        // Bloquear el mouse con clic
        document.body.onclick = () => {
            if(this.partidaActiva) {
                this.controls.lock();
            }
        };

        // --- HACE VISIBLE TU CUERPO ABAJO ---
        if(this.playerModel) {
            this.scene.add(this.playerModel); // El cuerpo ya no está oculto
        }
        
        // --- CARGAR EL MAPA CON COLISIONES ---
        this.murosDeColision = [];
        new THREE.GLTFLoader().load("./mapa.glb", (gltf) => {
            gltf.scene.traverse(child => {
                if (child.isMesh) {
                    this.murosDeColision.push(child); // Registramos cada malla como una pared
                }
            });
            this.scene.add(gltf.scene);
            
            // Spawn Point
            if(this.controls) {
                this.controls.getObject().position.set(0, 1.6, -10); // Altura de ojos real
            }
        });
    },

    disparar: function() { 
        console.log("PUM! Disparaste.");
    },

    loop: function() {
        requestAnimationFrame(() => this.loop());
        
        if(this.partidaActiva && this.controls.isLocked) {
            // --- CÁLCULO DE MOVIMIENTO FÍSICO REAL (No Traspasar Paredes) ---
            const delta = this.clock.getDelta();
            const vel = this.teclas['ShiftLeft'] ? 0.3 : 0.15; 
            
            // Direcciones locales (X=lados, Z=adelante)
            let dirFrontal = new THREE.Vector3();
            this.camera.getWorldDirection(dirFrontal);
            dirFrontal.y = 0; // ANULAMOS EL EJE Y PARA NO FLOTAR
            dirFrontal.normalize();

            let dirLateral = new THREE.Vector3();
            dirLateral.crossVectors(this.camera.up, dirFrontal).normalize();

            // Guardar posición actual antes de mover
            const posActual = this.controls.getObject().position.clone();
            let posFutura = posActual.clone();

            // Mover temporalmente
            if(this.teclas['KeyW']) posFutura.addScaledVector(dirFrontal, vel);
            if(this.teclas['KeyS']) posFutura.addScaledVector(dirFrontal, -vel);
            if(this.teclas['KeyA']) posFutura.addScaledVector(dirLateral, vel);
            if(this.teclas['KeyD']) posFutura.addScaledVector(dirLateral, -vel);

            // --- CHEQUEO DE COLISIONES CON RAYCASTER ---
            // Lanzamos un rayo desde los ojos hacia la dirección del movimiento
            const direccionCaminada = posFutura.clone().sub(posActual).normalize();
            if(direccionCaminada.length() > 0) {
                this.raycaster.set(posActual, direccionCaminada);
                // Si el rayo choca con una pared a menos de 1 metro, NO movemos.
                const intercepciones = this.raycaster.intersectObjects(this.murosDeColision);
                if(intercepciones.length > 0 && intercepciones[0].distance < 1) {
                    // Chocaste. Te quedas donde estás (o te deslizamos sutilmente si estuviéramos programando a de Dust 2).
                    // Por simplicidad, aquí te bloqueamos.
                } else {
                    // No chocaste. ¡Mueve!
                    this.controls.getObject().position.copy(posFutura);
                }
            }

            // GRAVEDAD BÁSICA
            this.camera.position.y = 1.6; // Mantenemos altura bloqueada
            
            // --- SINCRONIZAR EL PERSONAJE CON LA CÁMARA (Hacer visibles piernas/manos abajo) ---
            if (this.playerModel) {
                // Posiciona el cuerpo justo donde está la cámara, pero un poquito hacia abajo para que no te tapes la vista a ti mismo.
                // Tu cuello está a 1.6, pero tu cuerpo empieza a -0.3. 
                this.playerModel.position.copy(this.controls.getObject().position);
                this.playerModel.position.y -= 1.6; // Lo bajamos de la altura de ojos al piso
                
                // Rotar el cuerpo para que mire hacia donde miran los ojos (Eje Y)
                this.playerModel.rotation.y = this.controls.getObject().rotation.y; 
            }
            
        } else if (this.playerModel) {
            // Rotar modelo en el lobby
            this.playerModel.rotation.y += 0.002;
        }

        if(this.renderer) this.renderer.render(this.scene, this.camera);
    }
};

juego.init();
