import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function RaceScene({ progress = 0, nitro = false, running = false }) {
  const mountRef = useRef(null);
  const stateRef = useRef({ progress, nitro, running });
  useEffect(() => { stateRef.current = { progress, nitro, running }; }, [progress, nitro, running]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#0b1220");
    scene.fog = new THREE.Fog("#0b1220", 18, 65);
    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 140);
    camera.position.set(0, 7, 13);
    camera.lookAt(0, 0.8, -3);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0x9acaff, 0x172033, 2.0));
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.3);
    keyLight.position.set(-5, 12, 7); keyLight.castShadow = true; scene.add(keyLight);
    const neon = new THREE.PointLight(0x22d3ee, 28, 30); neon.position.set(4, 4, -7); scene.add(neon);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(100, 120), new THREE.MeshStandardMaterial({ color: "#101827", roughness: 0.9 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.14; floor.position.z = -30; floor.receiveShadow = true; scene.add(floor);

    const road = new THREE.Mesh(new THREE.PlaneGeometry(10, 100), new THREE.MeshStandardMaterial({ color: "#222b3a", roughness: 0.88 }));
    road.rotation.x = -Math.PI / 2; road.position.set(0, 0, -27); road.receiveShadow = true; scene.add(road);

    const laneMat = new THREE.MeshStandardMaterial({ color: "#64748b", emissive: "#263244", emissiveIntensity: 0.4 });
    const dashes = [];
    for (let z = 12; z > -68; z -= 5) {
      const dash = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.025, 2.1), laneMat);
      dash.position.set(0, 0.02, z); scene.add(dash); dashes.push(dash);
    }
    const edgeMat = new THREE.MeshStandardMaterial({ color: "#38bdf8", emissive: "#0ea5e9", emissiveIntensity: 1.1 });
    for (const x of [-5.1, 5.1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.28, 100), edgeMat);
      rail.position.set(x, 0.12, -27); scene.add(rail);
    }
    // Procedural scenery pillars
    for (let i = 0; i < 34; i++) {
      const side = i % 2 ? 1 : -1;
      const h = 1.2 + (i % 5) * 0.55;
      const mat = new THREE.MeshStandardMaterial({ color: i % 3 ? "#182a42" : "#173b4a", emissive: i % 3 ? "#071c31" : "#064e5b", emissiveIntensity: 0.65 });
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.8 + (i%3)*0.25, h, 0.8), mat);
      pillar.position.set(side * (7 + (i%4)*1.4), h/2 - 0.05, 10 - i * 2.7); scene.add(pillar);
    }

    const car = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.42, 2.6), new THREE.MeshStandardMaterial({ color: "#22d3ee", metalness: 0.68, roughness: 0.25 }));
    body.position.y = 0.58; body.castShadow = true; car.add(body);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.45, 1.05), new THREE.MeshStandardMaterial({ color: "#10243c", metalness: 0.55, roughness: 0.2 }));
    cabin.position.set(0, 0.98, -0.12); cabin.castShadow = true; car.add(cabin);
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.25, 0.06), new THREE.MeshStandardMaterial({ color: "#67e8f9", emissive: "#0891b2", emissiveIntensity: 0.7, metalness: 0.4 }));
    windshield.position.set(0, 1.02, -0.68); car.add(windshield);
    const wheelMat = new THREE.MeshStandardMaterial({ color: "#080b11", roughness: 0.65 });
    for (const x of [-0.82, 0.82]) for (const z of [-0.82, 0.82]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.18, 16), wheelMat);
      wheel.rotation.z = Math.PI/2; wheel.position.set(x, 0.32, z); wheel.castShadow = true; car.add(wheel);
    }
    const headMat = new THREE.MeshStandardMaterial({ color: "#e0f2fe", emissive: "#bae6fd", emissiveIntensity: 2.0 });
    for (const x of [-0.48, 0.48]) {
      const light = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.09, 0.07), headMat);
      light.position.set(x, 0.62, -1.32); car.add(light);
    }
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.9, 12), new THREE.MeshBasicMaterial({ color: "#fb923c" }));
    flame.rotation.x = -Math.PI/2; flame.position.set(0, 0.55, 1.55); flame.visible = false; car.add(flame);
    car.position.set(0, 0, 5); scene.add(car);

    const rival = car.clone(true);
    rival.position.set(-2.4, 0, 0.5);
    rival.scale.setScalar(0.75);
    rival.traverse(o => { if (o.isMesh && o.material && o.material.color) o.material = o.material.clone(); if (o.isMesh && o.material?.color) o.material.color.set("#fb7185"); });
    scene.add(rival);

    const resize = () => {
      const w = Math.max(1, mount.clientWidth), h = Math.max(1, mount.clientHeight);
      camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h, false);
    };
    const observer = new ResizeObserver(resize); observer.observe(mount); resize();
    let frame;
    const clock = new THREE.Clock();
    const animate = () => {
      frame = requestAnimationFrame(animate);
      const t = clock.getElapsedTime(), s = stateRef.current;
      dashes.forEach((d, i) => { d.position.z = ((12 - i*5 + (s.running ? t*9 : t*0.25)) % 80 + 80) % 80 - 65; });
      car.position.x = Math.sin(t * 0.8) * 0.12;
      car.rotation.z = Math.sin(t * 1.5) * 0.012;
      flame.visible = !!s.nitro;
      flame.scale.setScalar(0.8 + (Math.sin(t*25)+1)*0.22);
      rival.position.z = 0.5 - Math.min(1, s.progress/100) * 8;
      camera.position.x = Math.sin(t*0.18)*0.25;
      camera.lookAt(0, 0.7, -3);
      renderer.render(scene, camera);
    };
    animate();
    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); renderer.dispose();
      scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { if (Array.isArray(o.material)) o.material.forEach(m=>m.dispose()); else o.material.dispose(); } });
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div className="race-scene" ref={mountRef} aria-label="3D racing track" />;
}
