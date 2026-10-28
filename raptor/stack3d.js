import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js';

const host = document.getElementById('view3d');
if (host) {
  const W = () => host.clientWidth || 720;
  const H = () => host.clientHeight || 440;

  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(38, W() / H(), 0.1, 5000);

  const rnd = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  rnd.setPixelRatio(Math.min(devicePixelRatio, 2));
  rnd.setSize(W(), H(), false);
  rnd.domElement.style.width = '100%';
  rnd.domElement.style.height = '100%';
  host.appendChild(rnd.domElement);

  scene.add(new THREE.HemisphereLight(0xa8c4dc, 0x101215, 0.75));
  const key = new THREE.DirectionalLight(0xfff0dc, 1.7);
  key.position.set(90, 200, 130);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x7fb3d5, 1.0);
  rim.position.set(-140, 60, -110);
  scene.add(rim);

  const steel = new THREE.MeshStandardMaterial({ color: 0xc3cad2, metalness: 0.9, roughness: 0.34 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x6e7783, metalness: 0.82, roughness: 0.48 });
  const hot = new THREE.MeshStandardMaterial({ color: 0x2c3138, metalness: 0.88, roughness: 0.52 });

  const group = new THREE.Group();
  scene.add(group);

  let grid = null;
  let flame = null;

  /* ── build the stack at true proportions ── */
  function build(dia, bh, sh, nose) {
    // clear previous geometry, keeping the group
    while (group.children.length) {
      const c = group.children.pop();
      c.geometry?.dispose?.();
    }
    const R = dia / 2;
    const H2 = bh;            // booster tank
    const S2 = sh;            // ship tank
    const N2 = nose;

    // booster body
    const boost = new THREE.Mesh(new THREE.CylinderGeometry(R, R, H2, 48, 1, false), steel);
    group.add(boost);

    // grid fins, sized with the vehicle
    for (let i = 0; i < 4; i++) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(dia * 0.075, dia * 0.34, dia * 0.26), dark);
      const a = i * Math.PI / 2 + Math.PI / 4;
      fin.position.set(Math.cos(a) * (R + dia * 0.14), H2 / 2 - dia * 0.62, Math.sin(a) * (R + dia * 0.14));
      fin.rotation.y = -a;
      group.add(fin);
    }
    // legs
    for (let i = 0; i < 6; i++) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(dia * 0.07, dia * 0.7, dia * 0.07), dark);
      const a = i * Math.PI / 3;
      leg.position.set(Math.cos(a) * (R + dia * 0.08), -H2 / 2 + dia * 0.35, Math.sin(a) * (R + dia * 0.08));
      group.add(leg);
    }

    // ship
    const ship = new THREE.Group();
    ship.position.y = H2 / 2 + S2 / 2 + 1.6;
    group.add(ship);

    ship.add(new THREE.Mesh(new THREE.CylinderGeometry(R, R, S2, 48, 1, false), steel));

    const cone = new THREE.Mesh(new THREE.ConeGeometry(R, N2, 48, 1), steel);
    cone.position.y = S2 / 2 + N2 / 2;
    ship.add(cone);

    // flaps
    [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sz]) => {
      const f = new THREE.Mesh(new THREE.BoxGeometry(dia * 0.05, S2 * 0.24, dia * 0.5), dark);
      f.position.set(sx * (R + dia * 0.05), (sz > 0 ? 1 : -1) * S2 * 0.3, sz * (R + dia * 0.05) * 0.55);
      f.rotation.z = sx * 0.2;
      ship.add(f);
    });

    // 33 engines in 3 + 10 + 20
    const eR = dia * 0.078;
    const engGeo = new THREE.CylinderGeometry(eR * 0.7, eR, dia * 0.3, 14, 1, true);
    const nozGeo = new THREE.CylinderGeometry(eR, eR * 1.42, dia * 0.26, 14, 1, true);
    const baseY = -H2 / 2 - dia * 0.16;

    const ring = (n, rad, yOff) => {
      for (let i = 0; i < n; i++) {
        const a = i * 2 * Math.PI / n + (n === 10 ? 0.31 : 0);
        const x = Math.cos(a) * rad * R * 2, z = Math.sin(a) * rad * R * 2;
        const e = new THREE.Mesh(engGeo, hot); e.position.set(x, baseY + yOff, z); group.add(e);
        const no = new THREE.Mesh(nozGeo, hot); no.position.set(x, baseY + yOff - dia * 0.26, z); group.add(no);
      }
    };
    ring(3, 0.14, 0);
    ring(10, 0.30, dia * 0.05);
    ring(20, 0.44, dia * 0.10);

    // exhaust
    if (flame) { flame.geometry.dispose(); scene.remove(flame); }
    flame = new THREE.Mesh(
      new THREE.ConeGeometry(R * 0.95, H2 * 0.3, 32, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xe0925c, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false })
    );
    flame.rotation.x = Math.PI;
    flame.position.y = -H2 / 2 - H2 * 0.17;
    group.add(flame);

    // ground grid, rescaled with the stack
    if (grid) { grid.geometry.dispose(); scene.remove(grid); }
    grid = new THREE.GridHelper(dia * 22, 22, 0x2a313a, 0x1d2229);
    grid.position.y = -H2 / 2 - H2 * 0.34;
    scene.add(grid);

    // store extents so the camera can frame the whole thing
    group.userData.top = H2 / 2 + S2 + N2 + 1.6;
    group.userData.bottom = -H2 / 2 - H2 * 0.34;
  }

  build(9, 62.8, 27.5, 12);

  /* ── interaction ── */
  let drag = false, px = 0, py = 0, rotY = 0.7, rotX = 0.06, auto = true, zoom = 1;
  const el = rnd.domElement;
  el.style.cursor = 'grab';
  el.addEventListener('pointerdown', e => {
    drag = true; auto = false; px = e.clientX; py = e.clientY; el.style.cursor = 'grabbing';
  });
  window.addEventListener('pointerup', () => { drag = false; el.style.cursor = 'grab'; });
  window.addEventListener('pointermove', e => {
    if (!drag) return;
    rotY += (e.clientX - px) * 0.008;
    rotX = Math.max(-0.45, Math.min(0.8, rotX + (e.clientY - py) * 0.005));
    px = e.clientX; py = e.clientY;
  });
  el.addEventListener('wheel', e => {
    e.preventDefault();
    zoom = Math.max(0.45, Math.min(2.4, zoom + (e.deltaY > 0 ? 0.07 : -0.07)));
  }, { passive: false });

  function resize() {
    cam.aspect = W() / H();
    cam.updateProjectionMatrix();
    rnd.setSize(W(), H(), false);
    rnd.domElement.style.width = '100%';
    rnd.domElement.style.height = '100%';
  }
  window.addEventListener('resize', resize);
  if (window.ResizeObserver) new ResizeObserver(resize).observe(host);

  // let the page's sliders rebuild the geometry
  window.__setStack = (dia, bh, sh, nose) => {
    build(dia, bh, sh, nose);
  };

  const clock = new THREE.Clock();
  function tick() {
    const t = clock.getElapsedTime();
    if (auto) rotY += 0.0018;
    group.rotation.y = rotY;
    group.rotation.x = rotX * 0.3;
    if (flame) {
      flame.material.opacity = 0.13 + Math.sin(t * 6) * 0.06;
      flame.scale.y = 1 + Math.sin(t * 9) * 0.05;
    }
    // frame whatever the current stack height is
    const top = group.userData.top, bot = group.userData.bottom;
    const mid = (top + bot) / 2, span = top - bot;
    const dist = span * 2.05 * zoom;
    cam.position.set(0, mid + span * 0.06, dist);
    cam.lookAt(0, mid, 0);
    rnd.render(scene, cam);
    requestAnimationFrame(tick);
  }
  tick();
}
