/* ============================================================
   Iron Man 3D Transformations — script.js
   - Loads ironman.glb if present, falls back to procedural suit
   - OrbitControls for mouse orbit
   - Real-time transform panel
   - Drag-and-drop GLB loading
   ============================================================ */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

(function () {
  'use strict';

  // ── Corner decorators ──────────────────────────────────────
  ['tl', 'tr', 'bl', 'br'].forEach(pos => {
    const d = document.createElement('div');
    d.className = `corner corner-${pos}`;
    document.body.appendChild(d);
  });

  // ── Scene Setup ───────────────────────────────────────────
  const container = document.getElementById('canvas-container');

  const scene = new THREE.Scene();

  // Subtle deep-space gradient background via fog + clear color
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  container.appendChild(renderer.domElement);

  // Background: deep dark blue-black
  renderer.setClearColor(0x050608, 1);

  // Subtle nebula-like background gradient via large sphere
  const bgGeo = new THREE.SphereGeometry(80, 32, 32);
  const bgMat = new THREE.MeshBasicMaterial({
    color: 0x050810,
    side: THREE.BackSide,
  });
  scene.add(new THREE.Mesh(bgGeo, bgMat));

  // ── Camera ────────────────────────────────────────────────
  const camera = new THREE.PerspectiveCamera(
    55, window.innerWidth / window.innerHeight, 0.01, 500
  );
  camera.position.set(0, 1.2, 4.5);

  // ── Orbit Controls ────────────────────────────────────────
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 1;
  controls.maxDistance = 20;
  controls.target.set(0, 0.5, 0);

  // ── Lighting ──────────────────────────────────────────────
  // Ambient fill
  const ambient = new THREE.AmbientLight(0x102030, 1.2);
  scene.add(ambient);

  // Key light (warm top-front)
  const keyLight = new THREE.DirectionalLight(0xffe8d0, 2.5);
  keyLight.position.set(3, 5, 4);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  scene.add(keyLight);

  // Arc reactor fill (cyan, front-center)
  const arcLight = new THREE.PointLight(0x00cfff, 3, 12);
  arcLight.position.set(0, 0.5, 3);
  scene.add(arcLight);

  // Red accent (Iron Man red)
  const redLight = new THREE.PointLight(0xff2200, 1.5, 10);
  redLight.position.set(-3, 2, -2);
  scene.add(redLight);

  // Gold accent
  const goldLight = new THREE.PointLight(0xffa500, 1.2, 10);
  goldLight.position.set(3, -1, -2);
  scene.add(goldLight);

  // ── Floor / Platform ──────────────────────────────────────
  const floorGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.06, 64);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x0a1520,
    metalness: 0.9,
    roughness: 0.3,
    emissive: 0x001020,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.position.y = -1.55;
  floor.receiveShadow = true;
  scene.add(floor);

  // Glowing ring on floor edge
  const ringGeo = new THREE.TorusGeometry(1.5, 0.018, 16, 128);
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0x00cfff,
    emissive: 0x00cfff,
    emissiveIntensity: 2.5,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -1.52;
  scene.add(ring);

  // ── Grid Helper ───────────────────────────────────────────
  const gridHelper = new THREE.GridHelper(20, 30, 0x001833, 0x001833);
  gridHelper.position.y = -1.58;
  scene.add(gridHelper);

  // ── Particle field (stars) ────────────────────────────────
  const starGeo = new THREE.BufferGeometry();
  const starCount = 600;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount * 3; i++) {
    starPos[i] = (Math.random() - 0.5) * 80;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0x88bbff,
    size: 0.08,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.6,
  });
  scene.add(new THREE.Points(starGeo, starMat));

  // ── Model pivot ───────────────────────────────────────────
  let model = null;         // actual model group
  const pivot = new THREE.Group();
  scene.add(pivot);

  // ── Procedural Iron Man suit (fallback) ───────────────────
  function buildProceduralSuit() {
    const group = new THREE.Group();

    const red  = new THREE.MeshStandardMaterial({ color: 0xcc1500, metalness: 0.85, roughness: 0.25, envMapIntensity: 1 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xe0980a, metalness: 0.9,  roughness: 0.2,  envMapIntensity: 1 });
    const arc  = new THREE.MeshStandardMaterial({ color: 0x00dfff, emissive: 0x00cfff, emissiveIntensity: 4, metalness: 0.1, roughness: 0.2 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9, roughness: 0.3 });

    const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.rotation.set(rx, ry, rz);
      m.castShadow = true;
      group.add(m);
      return m;
    };

    // Torso
    add(new THREE.BoxGeometry(0.9, 1.1, 0.5, 2, 4, 2), red, 0, 0, 0);
    // Chest plate highlight
    add(new THREE.BoxGeometry(0.55, 0.45, 0.07), gold, 0, 0.22, 0.26);
    // Arc reactor
    add(new THREE.SphereGeometry(0.1, 16, 16), arc, 0, 0.12, 0.27);

    // Abdomen
    add(new THREE.BoxGeometry(0.72, 0.38, 0.42), gold, 0, -0.62, 0);

    // Pelvis
    add(new THREE.BoxGeometry(0.8, 0.28, 0.44), red, 0, -0.9, 0);

    // Head
    const head = new THREE.Group();
    // Helmet base
    const helmBase = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), red);
    helmBase.scale.set(1, 1.1, 0.95);
    helmBase.castShadow = true;
    head.add(helmBase);
    // Face plate gold
    const face = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.07), gold);
    face.position.set(0, -0.04, 0.24);
    head.add(face);
    // Eye slits
    [-0.08, 0.08].forEach(ex => {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.025, 0.04), arc);
      eye.position.set(ex, 0.01, 0.28);
      head.add(eye);
    });
    head.position.set(0, 0.74, 0);
    group.add(head);

    // Neck
    add(new THREE.CylinderGeometry(0.1, 0.12, 0.14, 12), dark, 0, 0.56, 0);

    // Shoulders
    [-1, 1].forEach(side => {
      const shoulderPivot = new THREE.Group();
      // Pauldron
      const pauldron = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), red);
      pauldron.scale.set(1, 0.75, 0.9);
      pauldron.castShadow = true;
      shoulderPivot.add(pauldron);
      // Gold strap
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.25), gold);
      strap.position.set(0, -0.08, 0);
      shoulderPivot.add(strap);
      shoulderPivot.position.set(side * 0.56, 0.3, 0);
      group.add(shoulderPivot);
    });

    // Upper arms
    [-1, 1].forEach(side => {
      add(new THREE.CylinderGeometry(0.11, 0.1, 0.42, 10), gold, side * 0.62, 0.02, 0);
    });

    // Forearms
    [-1, 1].forEach(side => {
      add(new THREE.CylinderGeometry(0.1, 0.09, 0.42, 10), red, side * 0.62, -0.45, 0);
      // Gauntlet
      add(new THREE.BoxGeometry(0.18, 0.14, 0.22), gold, side * 0.62, -0.73, 0);
    });

    // Thighs
    [-1, 1].forEach(side => {
      add(new THREE.CylinderGeometry(0.14, 0.12, 0.5, 10), red, side * 0.2, -1.22, 0);
    });

    // Shins
    [-1, 1].forEach(side => {
      add(new THREE.CylinderGeometry(0.12, 0.1, 0.52, 10), gold, side * 0.2, -1.75, 0);
    });

    // Boots
    [-1, 1].forEach(side => {
      add(new THREE.BoxGeometry(0.22, 0.2, 0.32), red, side * 0.2, -2.06, 0.04);
      // Boot thruster
      add(new THREE.CylinderGeometry(0.06, 0.07, 0.1, 12), arc, side * 0.2, -2.18, 0);
    });

    // Knee pads
    [-1, 1].forEach(side => {
      add(new THREE.SphereGeometry(0.1, 10, 10), gold, side * 0.2, -1.48, 0.08);
    });

    group.position.y = 0.65; // lift so boots are at y≈-1.5
    return group;
  }

  // ── Load model or build fallback ─────────────────────────
  function loadGLB(url, onLoaded) {
    const loader = new GLTFLoader();
    loader.load(
      url,
      gltf => {
        const m = gltf.scene;
        // Normalize scale / position
        const box = new THREE.Box3().setFromObject(m);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        const targetHeight = 2.8;
        const scale = targetHeight / maxDim;
        m.scale.setScalar(scale);

        // Centre at origin
        box.setFromObject(m);
        const centre = new THREE.Vector3();
        box.getCenter(centre);
        m.position.sub(centre);

        m.traverse(child => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        onLoaded(m);
        document.getElementById('drop-hint').classList.add('hidden');
        document.getElementById('status-text').textContent = 'MODEL LOADED';
      },
      undefined,
      err => {
        console.warn('GLB not found, using procedural suit.', err);
        onLoaded(buildProceduralSuit());
      }
    );
  }

  loadGLB('ironman.glb', m => {
    model = m;
    pivot.add(model);
  });

  // ── Drag-and-drop GLB ────────────────────────────────────
  document.addEventListener('dragover', e => e.preventDefault());
  document.addEventListener('drop', e => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file || !file.name.endsWith('.glb')) return;
    const url = URL.createObjectURL(file);
    if (model) { pivot.remove(model); model = null; }
    loadGLB(url, m => {
      model = m;
      pivot.add(model);
      resetAll();
    });
  });

  // ── UI Element References ─────────────────────────────────
  const txEl    = document.getElementById('tx');
  const tyEl    = document.getElementById('ty');
  const tzEl    = document.getElementById('tz');
  const rxEl    = document.getElementById('rx');
  const ryEl    = document.getElementById('ry');
  const rzEl    = document.getElementById('rz');
  const scaleEl = document.getElementById('scale');

  const txVal    = document.getElementById('tx-val');
  const tyVal    = document.getElementById('ty-val');
  const tzVal    = document.getElementById('tz-val');
  const rxVal    = document.getElementById('rx-val');
  const ryVal    = document.getElementById('ry-val');
  const rzVal    = document.getElementById('rz-val');
  const scaleVal = document.getElementById('scale-val');

  const infoPosEl   = document.getElementById('info-pos');
  const infoRotEl   = document.getElementById('info-rot');
  const infoScaleEl = document.getElementById('info-scale');

  // ── Slider gradient fill ──────────────────────────────────
  function updateSliderFill(input) {
    const min = parseFloat(input.min);
    const max = parseFloat(input.max);
    const val = parseFloat(input.value);
    const pct = ((val - min) / (max - min)) * 100;
    input.style.setProperty('--pct', pct + '%');
  }

  // ── Apply Transform ───────────────────────────────────────
  function updateTransform() {
    if (!model) return;

    const tx = parseFloat(txEl.value);
    const ty = parseFloat(tyEl.value);
    const tz = parseFloat(tzEl.value);
    const rx = parseFloat(rxEl.value);
    const ry = parseFloat(ryEl.value);
    const rz = parseFloat(rzEl.value);
    const s  = parseFloat(scaleEl.value);

    // Apply to pivot (so orbit centre stays)
    pivot.position.set(tx, ty, tz);
    pivot.rotation.set(
      THREE.MathUtils.degToRad(rx),
      THREE.MathUtils.degToRad(ry),
      THREE.MathUtils.degToRad(rz)
    );
    pivot.scale.setScalar(s);

    // Value labels
    txVal.textContent    = tx.toFixed(2);
    tyVal.textContent    = ty.toFixed(2);
    tzVal.textContent    = tz.toFixed(2);
    rxVal.textContent    = rx + '°';
    ryVal.textContent    = ry + '°';
    rzVal.textContent    = rz + '°';
    scaleVal.textContent = s.toFixed(2) + '×';

    // Info panel
    infoPosEl.textContent   = `${tx.toFixed(2)}, ${ty.toFixed(2)}, ${tz.toFixed(2)}`;
    infoRotEl.textContent   = `${rx}°, ${ry}°, ${rz}°`;
    infoScaleEl.textContent = `${s.toFixed(2)}×`;

    // Fill gradients
    [txEl, tyEl, tzEl, rxEl, ryEl, rzEl, scaleEl].forEach(updateSliderFill);

    // Live matrices
    updateMatrices(tx, ty, tz, rx, ry, rz, s);
  }

  // ── Reset ─────────────────────────────────────────────────
  function resetAll() {
    txEl.value = tyEl.value = tzEl.value = 0;
    rxEl.value = ryEl.value = rzEl.value = 0;
    scaleEl.value = 1;
    updateTransform();
  }

  document.getElementById('reset-btn').addEventListener('click', resetAll);

  // ── Auto-rotate ───────────────────────────────────────────
  let autoRotate = true;
  const autoBtn = document.getElementById('autorotate-btn');

  autoBtn.addEventListener('click', () => {
    autoRotate = !autoRotate;
    autoBtn.classList.toggle('active', autoRotate);
    autoBtn.textContent = `◉ AUTO-ROTATE: ${autoRotate ? 'ON' : 'OFF'}`;
  });

  // ── Event Listeners (sliders) ─────────────────────────────
  document.querySelectorAll('#controls input[type="range"]').forEach(input => {
    input.addEventListener('input', updateTransform);
    updateSliderFill(input);
  });

  // Initial update
  updateTransform();

  // ── Live Matrix Updater ───────────────────────────────────
  function set(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function fmtR(v) { return v.toFixed(2); }
  function fmtNeg(v) {
    // Always show the minus sign explicitly for the negated cell
    return (v >= 0 ? '\u22120.' : '') + Math.abs(v).toFixed(2);
  }

  function updateMatrices(tx, ty, tz, rx, ry, rz, s) {
    // Translation [T]
    set('mt-tx', tx.toFixed(2));
    set('mt-ty', ty.toFixed(2));
    set('mt-tz', tz.toFixed(2));

    // Scaling [S]
    const sv = s.toFixed(2);
    set('ms-s1', sv); set('ms-s2', sv); set('ms-s3', sv);

    // Rotation X
    const rxRad = THREE.MathUtils.degToRad(rx);
    const cRx = Math.cos(rxRad), sRx = Math.sin(rxRad);
    set('angle-x', `\u03b8 = ${rx}\u00b0`);
    set('mrx-c',  fmtR(cRx));  set('mrx-c2', fmtR(cRx));
    set('mrx-s',  fmtR(sRx));
    set('mrx-ns', (sRx >= 0 ? '\u2212' : '+') + Math.abs(sRx).toFixed(2));

    // Rotation Y
    const ryRad = THREE.MathUtils.degToRad(ry);
    const cRy = Math.cos(ryRad), sRy = Math.sin(ryRad);
    set('angle-y', `\u03b8 = ${ry}\u00b0`);
    set('mry-c',  fmtR(cRy));  set('mry-c2', fmtR(cRy));
    set('mry-s',  fmtR(sRy));
    set('mry-ns', (sRy >= 0 ? '\u2212' : '+') + Math.abs(sRy).toFixed(2));

    // Rotation Z
    const rzRad = THREE.MathUtils.degToRad(rz);
    const cRz = Math.cos(rzRad), sRz = Math.sin(rzRad);
    set('angle-z', `\u03b8 = ${rz}\u00b0`);
    set('mrz-c',  fmtR(cRz));  set('mrz-c2', fmtR(cRz));
    set('mrz-s',  fmtR(sRz));
    set('mrz-ns', (sRz >= 0 ? '\u2212' : '+') + Math.abs(sRz).toFixed(2));
  }

  // ── Theory Accordion ─────────────────────────────────────
  document.querySelectorAll('.theory-acc').forEach(btn => {
    const bodyId = btn.getAttribute('data-acc');
    const body   = document.getElementById(bodyId);
    btn.addEventListener('click', () => {
      const isOpen = btn.classList.contains('active');
      btn.classList.toggle('active', !isOpen);
      body.classList.toggle('collapsed', isOpen);
    });
  });

  // ── Arc light pulse ───────────────────────────────────────
  let arcT = 0;
  function pulseArcLight(dt) {
    arcT += dt;
    arcLight.intensity = 2.5 + Math.sin(arcT * 2.5) * 0.8;
  }

  // ── Theme Toggle ──────────────────────────────────────────
  const themeBtn = document.getElementById('theme-toggle');
  const themeIcon = document.getElementById('theme-icon');
  const themeLabel = document.getElementById('theme-label');
  let isLightMode = false;

  themeBtn.addEventListener('click', () => {
    isLightMode = !isLightMode;
    document.body.classList.toggle('light-mode', isLightMode);
    
    if (isLightMode) {
      themeIcon.textContent = '🌙';
      themeLabel.textContent = 'DARK MODE';
      renderer.setClearColor(0xe0e5ec, 1);
      gridHelper.material.color.setHex(0x9ca3af);
    } else {
      themeIcon.textContent = '☀️';
      themeLabel.textContent = 'LIGHT MODE';
      renderer.setClearColor(0x050608, 1);
      gridHelper.material.color.setHex(0x001833);
    }
  });

  // ── Resize ────────────────────────────────────────────────
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // ── Animation Loop ────────────────────────────────────────
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();

    if (autoRotate && model) {
      const baseRY = THREE.MathUtils.degToRad(parseFloat(ryEl.value));
      pivot.rotation.y = baseRY + clock.getElapsedTime() * 0.4;
    }

    pulseArcLight(dt);
    controls.update();
    renderer.render(scene, camera);
  }

  animate();
})();
