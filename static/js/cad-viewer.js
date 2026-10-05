/**
 * Vortex CNC & 3D Studio CRM - Interactive 3D CAD Viewer
 * High-performance WebGL visualizer for CNC machined parts & 3D prints.
 * Powered by Three.js with custom procedural mechanical geometries & STL/OBJ drag-and-drop.
 */

class VortexCadViewer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.currentMesh = null;
    this.boundingHelper = null;
    this.gridHelper = null;
    this.currentMaterialType = 'aluminum';
    this.isWireframe = false;
    this.showBoundingBox = true;
    this.autoRotate = true;
    this.animationFrameId = null;

    this.init();
  }

  init() {
    // Check if Three.js is loaded
    if (typeof THREE === 'undefined') {
      console.warn("Three.js not loaded yet. Waiting...");
      setTimeout(() => this.init(), 200);
      return;
    }

    const width = this.container.clientWidth || 600;
    const height = this.container.clientHeight || 420;

    // Scene setup with dark studio environment
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0c111d);
    this.scene.fog = new THREE.FogExp2(0x0c111d, 0.003);

    // Camera
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(120, 100, 140);

    // Renderer with antialias and tone mapping
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);

    // Orbit controls (if OrbitControls loaded, otherwise fallback mouse drag)
    if (typeof THREE.OrbitControls !== 'undefined') {
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.maxDistance = 400;
      this.controls.minDistance = 20;
    } else {
      this.setupFallbackControls();
    }

    // Studio Lighting setup
    this.setupLighting();

    // Worktable / CNC Bed Grid
    this.gridHelper = new THREE.GridHelper(240, 24, 0x06b6d4, 0x1e293b);
    this.gridHelper.position.y = -35;
    this.scene.add(this.gridHelper);

    // Load initial default model (Turbine Blisk)
    this.loadPreset('turbine');

    // Handle Resize
    window.addEventListener('resize', () => this.onResize());

    // Start Render Loop
    this.animate();
  }

  setupLighting() {
    // Ambient soft fill
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    // Key Light (warm white)
    const keyLight = new THREE.DirectionalLight(0xfff5ea, 1.8);
    keyLight.position.set(100, 150, 100);
    keyLight.castShadow = true;
    this.scene.add(keyLight);

    // Cool Rim / Accent Light (industrial cyan)
    const rimLight = new THREE.DirectionalLight(0x06b6d4, 1.2);
    rimLight.position.set(-100, 80, -100);
    this.scene.add(rimLight);

    // Bottom bounce light
    const bounceLight = new THREE.DirectionalLight(0xf59e0b, 0.5);
    bounceLight.position.set(0, -100, 50);
    this.scene.add(bounceLight);
  }

  setupFallbackControls() {
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };

    this.renderer.domElement.addEventListener('mousedown', (e) => {
      isDragging = true;
      prevMouse = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => { isDragging = false; });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging || !this.currentMesh) return;
      const deltaX = e.clientX - prevMouse.x;
      const deltaY = e.clientY - prevMouse.y;
      this.currentMesh.rotation.y += deltaX * 0.01;
      this.currentMesh.rotation.x += deltaY * 0.01;
      prevMouse = { x: e.clientX, y: e.clientY };
    });

    this.renderer.domElement.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.camera.position.z = Math.max(30, Math.min(300, this.camera.position.z + e.deltaY * 0.1));
    });
  }

  getMaterial(type = 'aluminum') {
    const isWire = this.isWireframe;

    switch (type) {
      case 'aluminum':
        return new THREE.MeshStandardMaterial({
          color: 0xdddddd,
          metalness: 0.92,
          roughness: 0.28,
          wireframe: isWire
        });
      case 'anodized_black':
        return new THREE.MeshStandardMaterial({
          color: 0x181a20,
          metalness: 0.85,
          roughness: 0.35,
          wireframe: isWire
        });
      case 'titanium':
        return new THREE.MeshStandardMaterial({
          color: 0x8a929a,
          metalness: 0.88,
          roughness: 0.40,
          wireframe: isWire
        });
      case 'brass':
        return new THREE.MeshStandardMaterial({
          color: 0xd4af37,
          metalness: 0.90,
          roughness: 0.25,
          wireframe: isWire
        });
      case 'sls_nylon':
        return new THREE.MeshStandardMaterial({
          color: 0x334155,
          metalness: 0.1,
          roughness: 0.85,
          wireframe: isWire
        });
      case 'sla_resin':
        return new THREE.MeshPhysicalMaterial({
          color: 0x06b6d4,
          metalness: 0.1,
          roughness: 0.15,
          transmission: 0.7,
          thickness: 1.2,
          wireframe: isWire
        });
      default:
        return new THREE.MeshStandardMaterial({
          color: 0xcccccc,
          metalness: 0.8,
          roughness: 0.3,
          wireframe: isWire
        });
    }
  }

  setMaterialType(type) {
    this.currentMaterialType = type;
    if (this.currentMesh) {
      this.currentMesh.traverse((child) => {
        if (child.isMesh) {
          child.material = this.getMaterial(type);
        }
      });
    }
  }

  toggleWireframe() {
    this.isWireframe = !this.isWireframe;
    this.setMaterialType(this.currentMaterialType);
    return this.isWireframe;
  }

  toggleAutoRotate() {
    this.autoRotate = !this.autoRotate;
    return this.autoRotate;
  }

  toggleBoundingBox() {
    this.showBoundingBox = !this.showBoundingBox;
    if (this.boundingHelper) {
      this.boundingHelper.visible = this.showBoundingBox;
    }
    return this.showBoundingBox;
  }

  clearCurrentMesh() {
    if (this.currentMesh) {
      this.scene.remove(this.currentMesh);
      this.currentMesh = null;
    }
    if (this.boundingHelper) {
      this.scene.remove(this.boundingHelper);
      this.boundingHelper = null;
    }
  }

  loadPreset(presetName) {
    this.clearCurrentMesh();

    const group = new THREE.Group();
    const material = this.getMaterial(this.currentMaterialType);

    if (presetName === 'turbine') {
      // 5-Axis CNC Turbine Impeller Blisk
      // Central hub
      const hubGeo = new THREE.CylinderGeometry(14, 28, 45, 32);
      const hub = new THREE.Mesh(hubGeo, material);
      hub.position.y = 5;
      group.add(hub);

      // Bore through center
      const boreGeo = new THREE.CylinderGeometry(8, 8, 50, 24);
      const boreInner = new THREE.Mesh(boreGeo, new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 }));
      group.add(boreInner);

      // Twisted 5-axis milled aerofoil blades
      const bladeCount = 14;
      for (let i = 0; i < bladeCount; i++) {
        const angle = (i / bladeCount) * Math.PI * 2;
        const bladeGeo = new THREE.BoxGeometry(2.5, 32, 38);
        const blade = new THREE.Mesh(bladeGeo, material);
        blade.position.set(Math.cos(angle) * 32, 5, Math.sin(angle) * 32);
        blade.rotation.y = -angle + 0.45;
        blade.rotation.z = 0.35;
        blade.rotation.x = 0.2;
        group.add(blade);
      }

      // Base mounting flange
      const flangeGeo = new THREE.CylinderGeometry(48, 48, 8, 32);
      const flange = new THREE.Mesh(flangeGeo, material);
      flange.position.y = -18;
      group.add(flange);

    } else if (presetName === 'manifold') {
      // Hydraulic 6-Port CNC Manifold Block
      const blockGeo = new THREE.BoxGeometry(70, 45, 90);
      const block = new THREE.Mesh(blockGeo, material);
      group.add(block);

      // Counter-bored fluid ports
      const portMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.9 });
      const portLocations = [
        { x: -20, y: 23, z: -25 },
        { x: 20, y: 23, z: -25 },
        { x: -20, y: 23, z: 25 },
        { x: 20, y: 23, z: 25 },
        { x: -36, y: 0, z: 0 },
        { x: 36, y: 0, z: 0 }
      ];

      portLocations.forEach((loc, idx) => {
        const isSide = Math.abs(loc.x) > 30;
        const pGeo = new THREE.CylinderGeometry(6, 6, 8, 16);
        const port = new THREE.Mesh(pGeo, portMat);
        port.position.set(loc.x, loc.y, loc.z);
        if (isSide) port.rotation.z = Math.PI / 2;
        group.add(port);

        // Chamfer ring
        const ringGeo = new THREE.TorusGeometry(7.5, 1, 8, 24);
        const ring = new THREE.Mesh(ringGeo, material);
        ring.position.set(loc.x, loc.y + (isSide ? 0 : 0.5), loc.z);
        if (!isSide) ring.rotation.x = Math.PI / 2;
        group.add(ring);
      });

    } else if (presetName === 'bracket') {
      // Lightweight 3D Printed Voronoi / Aerospace Bracket
      const mainRingGeo = new THREE.TorusGeometry(30, 8, 16, 40);
      const mainRing = new THREE.Mesh(mainRingGeo, material);
      mainRing.rotation.x = Math.PI / 2;
      group.add(mainRing);

      // Struts
      for (let j = 0; j < 6; j++) {
        const ang = (j / 6) * Math.PI * 2;
        const strutGeo = new THREE.CylinderGeometry(4, 3, 55, 12);
        const strut = new THREE.Mesh(strutGeo, material);
        strut.position.set(Math.cos(ang) * 35, 0, Math.sin(ang) * 35);
        strut.rotation.z = Math.PI / 2;
        strut.rotation.y = -ang;
        group.add(strut);
      }

      // Outer mounting ears
      const earMat = material;
      const earGeo = new THREE.CylinderGeometry(10, 10, 12, 20);
      const ear1 = new THREE.Mesh(earGeo, earMat);
      ear1.position.set(55, 0, 0);
      const ear2 = new THREE.Mesh(earGeo, earMat);
      ear2.position.set(-55, 0, 0);
      group.add(ear1);
      group.add(ear2);

    } else if (presetName === 'gear') {
      // Helical Gearbox Drive Housing
      const gearBodyGeo = new THREE.CylinderGeometry(38, 38, 50, 48);
      const gearBody = new THREE.Mesh(gearBodyGeo, material);
      group.add(gearBody);

      // Gear teeth
      const toothCount = 28;
      for (let t = 0; t < toothCount; t++) {
        const tAng = (t / toothCount) * Math.PI * 2;
        const toothGeo = new THREE.BoxGeometry(4, 48, 6);
        const tooth = new THREE.Mesh(toothGeo, material);
        tooth.position.set(Math.cos(tAng) * 40, 0, Math.sin(tAng) * 40);
        tooth.rotation.y = -tAng;
        tooth.rotation.z = 0.2; // helical angle!
        group.add(tooth);
      }

      // Central Splined Bore
      const centerHoleGeo = new THREE.CylinderGeometry(16, 16, 52, 24);
      const centerHole = new THREE.Mesh(centerHoleGeo, new THREE.MeshStandardMaterial({ color: 0x050505 }));
      group.add(centerHole);

    } else {
      // Sensor Enclosure / Faceplate
      const encGeo = new THREE.BoxGeometry(85, 25, 60);
      const enc = new THREE.Mesh(encGeo, material);
      group.add(enc);

      const cavityGeo = new THREE.BoxGeometry(75, 12, 50);
      const cavity = new THREE.Mesh(cavityGeo, new THREE.MeshStandardMaterial({ color: 0x0a0f1d, roughness: 0.9 }));
      cavity.position.y = 8;
      group.add(cavity);
    }

    this.currentMesh = group;
    this.scene.add(this.currentMesh);

    // Compute bounding box and dimension helper
    const box = new THREE.Box3().setFromObject(this.currentMesh);
    const size = new THREE.Vector3();
    box.getSize(size);

    this.boundingHelper = new THREE.Box3Helper(box, 0x06b6d4);
    this.boundingHelper.visible = this.showBoundingBox;
    this.scene.add(this.boundingHelper);

    // Update telemetry UI dimensions
    this.updatePartDimensionsBadge(size);
  }

  updatePartDimensionsBadge(size) {
    const dimEl = document.getElementById('cad-dimensions-badge');
    const volEl = document.getElementById('cad-volume-badge');
    const weightEl = document.getElementById('cad-weight-badge');

    const x = Math.round(size.x * 2.2);
    const y = Math.round(size.y * 2.2);
    const z = Math.round(size.z * 2.2);
    const volCm3 = Math.round((x * y * z) / 1000 * 0.42); // rough solid fraction
    const density = this.currentMaterialType === 'aluminum' ? 2.7 : (this.currentMaterialType === 'titanium' ? 4.43 : (this.currentMaterialType === 'brass' ? 8.5 : 1.25));
    const weightGrams = Math.round(volCm3 * density);

    if (dimEl) dimEl.textContent = `${x} × ${z} × ${y} mm`;
    if (volEl) volEl.textContent = `${volCm3} cm³`;
    if (weightEl) weightEl.textContent = `${weightGrams} g (${(weightGrams/1000).toFixed(2)} kg)`;
  }

  loadCustomSTL(buffer) {
    // Basic STL ASCII/binary parser support
    if (typeof THREE.STLLoader !== 'undefined') {
      const loader = new THREE.STLLoader();
      const geometry = loader.parse(buffer);
      this.clearCurrentMesh();

      geometry.center();
      geometry.computeVertexNormals();

      const material = this.getMaterial(this.currentMaterialType);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.scale.set(0.8, 0.8, 0.8);

      this.currentMesh = new THREE.Group();
      this.currentMesh.add(mesh);
      this.scene.add(this.currentMesh);

      const box = new THREE.Box3().setFromObject(this.currentMesh);
      const size = new THREE.Vector3();
      box.getSize(size);

      this.boundingHelper = new THREE.Box3Helper(box, 0x06b6d4);
      this.boundingHelper.visible = this.showBoundingBox;
      this.scene.add(this.boundingHelper);

      this.updatePartDimensionsBadge(size);
    }
  }

  onResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {
    this.animationFrameId = requestAnimationFrame(() => this.animate());

    if (this.controls) {
      this.controls.update();
    }

    if (this.autoRotate && this.currentMesh) {
      this.currentMesh.rotation.y += 0.007;
      if (this.boundingHelper) {
        this.boundingHelper.updateMatrixWorld();
      }
    }

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}

// Export to window
if (typeof window !== 'undefined') {
  window.VortexCadViewer = VortexCadViewer;
}
