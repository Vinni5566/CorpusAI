import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// Ambient 3D background tuned to the actual dashboard layout: the "Launch
// New Initiative" and "Adaptive Autonomy Engine" cards occupy the left
// ~30% / top ~60% of the screen, so the node loop is weighted toward the
// empty right and bottom regions instead of spread evenly around all edges.
// Colors match the existing UI: violet (headline), teal (autonomy ring),
// amber (human approval accent).

const TEAL = '#4fd1c5';
const AMBER = '#f2a54a';
const VIOLET = '#a78bfa';

type NodeDef = {
  name: string;
  color: string;
  pos: [number, number, number];
  size: number;
  human?: boolean;
};

const NODE_DEFS: NodeDef[] = [
  { name: 'orchestrator', color: VIOLET, pos: [17, 7, -5], size: 3.0 },
  { name: 'marketing', color: TEAL, pos: [19, -2, -6], size: 2.0 },
  { name: 'finance', color: TEAL, pos: [15, -9, -5], size: 2.2 },
  { name: 'human', color: AMBER, pos: [4, -10.5, -4], size: 2.9, human: true },
  { name: 'engineering', color: TEAL, pos: [-9, -9.5, -5], size: 2.0 },
  { name: 'growth', color: TEAL, pos: [-15, -1.5, -6], size: 1.7 },
];

const LOOP_ORDER = ['orchestrator', 'marketing', 'finance', 'human', 'engineering', 'growth', 'orchestrator'];

function glowTexture(hex: string, size = 128): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, hex + 'ff');
  g.addColorStop(0.35, hex + 'aa');
  g.addColorStop(0.7, hex + '40');
  g.addColorStop(1, hex + '00');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}

interface Pulse {
  sprite: THREE.Sprite;
  from: THREE.Vector3;
  to: THREE.Vector3;
  t: number;
  toName: string;
  holding: boolean;
  holdT: number;
}

export default function AnimatedBackground() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0e17, 0.018);

    const camera = new THREE.PerspectiveCamera(
      60,
      mount.clientWidth / mount.clientHeight,
      0.1,
      1000
    );
    camera.position.set(2, -1, 24);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    const nodeSprites: Record<string, THREE.Sprite> = {};
    NODE_DEFS.forEach((def) => {
      const halo = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: glowTexture(def.color), transparent: true, depthWrite: false, opacity: 0.5 })
      );
      halo.position.set(...def.pos);
      halo.scale.set(def.size * 2.2, def.size * 2.2, 1);
      group.add(halo);

      const core = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: glowTexture(def.color), transparent: true, depthWrite: false })
      );
      core.position.set(...def.pos);
      core.scale.set(def.size, def.size, 1);
      core.userData = def;
      group.add(core);
      nodeSprites[def.name] = core;
    });

    for (let i = 0; i < LOOP_ORDER.length - 1; i++) {
      const pa = nodeSprites[LOOP_ORDER[i]].position;
      const pb = nodeSprites[LOOP_ORDER[i + 1]].position;
      const geo = new THREE.BufferGeometry().setFromPoints([pa, pb]);
      const mat = new THREE.LineBasicMaterial({ color: 0x3d4a72, transparent: true, opacity: 0.6 });
      group.add(new THREE.Line(geo, mat));
    }

    const starCount = 450;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const x = 4 + Math.random() * 28 - 10;
      const y = (Math.random() - 0.5) * 26;
      starPos[i * 3] = x;
      starPos[i * 3 + 1] = y;
      starPos[i * 3 + 2] = (Math.random() - 0.5) * 40 - 15;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0x445070, size: 0.4, transparent: true, opacity: 0.75 });
    scene.add(new THREE.Points(starGeo, starMat));

    const pulseTex = glowTexture('#ffffff');
    const pulses: Pulse[] = [];
    function spawnPulse(fromName: string, toName: string) {
      const from = nodeSprites[fromName];
      const to = nodeSprites[toName];
      const isHuman = toName === 'human';
      const mat = new THREE.SpriteMaterial({
        map: pulseTex,
        transparent: true,
        depthWrite: false,
        color: new THREE.Color(isHuman ? AMBER : TEAL),
      });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(0.7, 0.7, 1);
      group.add(sprite);
      pulses.push({ sprite, from: from.position.clone(), to: to.position.clone(), t: 0, toName, holding: false, holdT: 0 });
    }

    const pulseInterval = prefersReducedMotion
      ? null
      : setInterval(() => {
          const idx = Math.floor(Math.random() * (LOOP_ORDER.length - 1));
          const a = LOOP_ORDER[idx];
          const b = LOOP_ORDER[idx + 1];
          if (Math.random() < 0.5) spawnPulse(a, b);
          else spawnPulse(b, a);
        }, 900);

    let mouseX = 0;
    let mouseY = 0;
    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', handleMouseMove);

    const clock = new THREE.Clock();
    let frameId: number;

    function animate() {
      frameId = requestAnimationFrame(animate);
      const dt = prefersReducedMotion ? 0 : clock.getDelta();
      const elapsed = clock.getElapsedTime();

      if (!prefersReducedMotion) {
        group.rotation.y = Math.sin(elapsed * 0.05) * 0.04;
        camera.position.x += (2 + mouseX * 1.5 - camera.position.x) * 0.02;
        camera.position.y += (-1 - mouseY * 1.2 - camera.position.y) * 0.02;
        camera.lookAt(2, -1, 0);

        Object.values(nodeSprites).forEach((s) => {
          const pulseSpeed = s.userData.human ? 1.1 : 2.0;
          const base = s.userData.size;
          const scale = base * (1 + 0.08 * Math.sin(elapsed * pulseSpeed + base));
          s.scale.set(scale, scale, 1);
        });

        for (let i = pulses.length - 1; i >= 0; i--) {
          const p = pulses[i];
          const holdDuration = p.toName === 'human' ? 1.1 : 0;

          if (!p.holding) {
            p.t += dt * 0.7;
            p.sprite.position.lerpVectors(p.from, p.to, Math.min(p.t, 1));
            p.sprite.material.opacity = 1 - Math.max(0, p.t - 0.85) * 6;
            if (p.t >= 1) {
              if (holdDuration > 0) {
                p.holding = true;
                p.holdT = 0;
              } else {
                group.remove(p.sprite);
                pulses.splice(i, 1);
              }
            }
          } else {
            p.holdT += dt;
            const pulse = 1 + 0.35 * Math.sin(p.holdT * 6);
            p.sprite.scale.set(0.7 * pulse, 0.7 * pulse, 1);
            if (p.holdT >= holdDuration) {
              group.remove(p.sprite);
              pulses.splice(i, 1);
            }
          }
        }
      }

      renderer.render(scene, camera);
    }
    animate();

    const handleResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      if (pulseInterval) clearInterval(pulseInterval);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      mount.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  return (
    <>
      <div
        ref={mountRef}
        style={{ position: 'fixed', inset: 0, zIndex: -2, background: '#0a0e17' }}
        aria-hidden="true"
      />
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: -1,
          pointerEvents: 'none',
          animation: 'edge-frame-pulse 5s ease-in-out infinite',
        }}
        aria-hidden="true"
      />
      <style>{`
        @keyframes edge-frame-pulse {
          0%, 100% {
            box-shadow:
              inset 0 0 60px 0px rgba(79, 209, 197, 0.08),
              inset 0 0 18px 2px rgba(79, 209, 197, 0.13);
          }
          50% {
            box-shadow:
              inset 0 0 80px 4px rgba(139, 127, 240, 0.11),
              inset 0 0 24px 3px rgba(139, 127, 240, 0.18);
          }
        }
      `}</style>
    </>
  );
}
