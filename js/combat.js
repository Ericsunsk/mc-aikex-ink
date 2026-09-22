import * as THREE from 'three';
import { isSolid } from './voxel.js?v=lobby10';

export class Combat {
  constructor(game) {
    this.game = game;
    this.armed = false;
    this.held = false;
    this.nextShot = 0;
    this.deadUntil = 0;
    this.lastHp = game.player.hp;
    this.traces = [];
    this.panel = document.createElement('div');
    this.panel.id = 'combatHud';
    this.panel.innerHTML = '<button id="equipAK">AK [Q]</button><button id="fireAK">开火</button><span id="combatStatus"></span>';
    document.body.appendChild(this.panel);
    this.status = this.panel.querySelector('span');
    const equip = this.panel.querySelector('#equipAK');
    equip.onclick = () => this.toggle();
    const fire = this.panel.querySelector('#fireAK');
    fire.onpointerdown = e => { e.preventDefault(); fire.setPointerCapture(e.pointerId); this.held = true; };
    fire.onpointerup = fire.onpointercancel = fire.onlostpointercapture = () => { this.held = false; };
    document.addEventListener('keydown', e => {
      if (e.code === 'KeyQ' && !e.repeat && game.isRunning && !/INPUT|TEXTAREA/.test(e.target.tagName)) this.toggle();
    });
    document.addEventListener('mousedown', e => { if (e.button === 0 && game.isPointerLocked) this.held = true; });
    document.addEventListener('mouseup', e => { if (e.button === 0) this.held = false; });
    document.addEventListener('pointerlockchange', () => { this.held = false; });
    window.addEventListener('blur', () => { this.held = false; });
    this.gun = new THREE.Group();
    const part = (x, y, z, w, h, d, color, tilt = 0) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color }));
      mesh.position.set(x, y, z); mesh.rotation.x = tilt; this.gun.add(mesh);
    };
    part(0, 0, 0, .09, .10, .38, 0x30343b); // receiver
    part(0, .015, -.30, .035, .035, .30, 0x171b20); // barrel
    part(0, -.01, -.16, .10, .085, .17, 0x955b32); // wooden handguard
    part(0, -.07, .20, .09, .13, .20, 0x955b32); // stock
    part(0, -.12, .07, .06, .19, .065, 0x704126, -.3);
    part(0, -.15, -.07, .06, .22, .10, 0x25292e, .3); // magazine
    part(0, .08, -.36, .025, .08, .025, 0x171b20);
    this.gun.position.set(.26, -.24, -.55);
    game.camera.add(this.gun); game.scene.add(game.camera);
  }

  toggle() { this.armed = !this.armed; this.held = false; }

  receive(msg) {
    const g = this.game;
    if (msg.id !== g.net.id) { g.remotes.upsert(msg); return; }
    if (msg.hp < g.player.hp) {
      document.body.classList.add('combat-hurt');
      setTimeout(() => document.body.classList.remove('combat-hurt'), 160);
    }
    g.player.hp = msg.hp; this.lastHp = msg.hp;
    this.deadUntil = msg.deadUntil || 0;
    if (!msg.hp) { this.held = false; g.player.keys = {}; }
    if (msg.respawn) {
      const reset = () => {
        g.player.position.set(msg.x, msg.y, msg.z);
        g.player.velocity.set(0, 0, 0); g.player._fallVy = 0;
        g.player.invuln = 3; g.player._wasOnGround = true;
      };
      if (g.dimension !== msg.dimension) g._switchDimension(msg.dimension).then(reset);
      else reset();
    }
    g._updateHpHud();
  }

  shoot() {
    const g = this.game, now = performance.now();
    if (!this.armed || !g.isRunning || g.player.hp <= 0 || now < this.nextShot) return;
    this.nextShot = now + 130;
    const dir = g.camera.getWorldDirection(new THREE.Vector3());
    const origin = g.camera.position;
    let distance = 80;
    for (let t = 0; t < 80; t += .05) {
      if (isSolid(g.world.getBlock(Math.floor(origin.x + dir.x * t), Math.floor(origin.y + dir.y * t), Math.floor(origin.z + dir.z * t)))) {
        distance = t; break;
      }
    }
    this.gun.position.z = -.48;
    if (g._online) g.net._send({ t: 'shoot', direction: dir.toArray(), distance });
    else this.trace({ origin: origin.toArray(), direction: dir.toArray(), distance, dimension: g.dimension });
  }

  trace(msg) {
    if (msg.dimension !== this.game.dimension) return;
    const start = new THREE.Vector3(...msg.origin);
    const end = start.clone().addScaledVector(new THREE.Vector3(...msg.direction), msg.distance);
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([start, end]), new THREE.LineBasicMaterial({ color: 0xffd36a }));
    this.game.scene.add(line); this.traces.push({ line, until: performance.now() + 90 });
  }

  tick() {
    const g = this.game, active = g.isRunning && (g.isPointerLocked || g.isMobile);
    this.panel.style.display = active ? 'flex' : 'none';
    this.gun.visible = active && this.armed && g.player.hp > 0;
    this.gun.position.z += (-.55 - this.gun.position.z) * .3;
    this.status.textContent = g.player.hp <= 0 ? `已阵亡 · ${Math.max(1, Math.ceil((this.deadUntil - Date.now()) / 1000))} 秒后重生` :
      this.armed ? 'AK · 按住左键/开火连射 · Q 收枪' : 'Q 装备 AK · 联机可互射';
    if (!active) this.held = false;
    if (active && this.held) this.shoot();
    if (g._online && g.player.hp !== this.lastHp) {
      g.net._send({ t: 'vitals', delta: g.player.hp - this.lastHp });
      this.lastHp = g.player.hp;
    }
    if (!g._online && g.player.hp <= 0) {
      if (!this.deadUntil) { this.deadUntil = Date.now() + 3000; this.held = false; }
      if (Date.now() >= this.deadUntil) this.receive({ id: g.net.id, hp: 20, respawn: true, x: 5.4, y: 50, z: 22.6, dimension: 'overworld' });
    }
    for (let i = this.traces.length - 1; i >= 0; i--) {
      const { line, until } = this.traces[i];
      if (performance.now() < until) continue;
      g.scene.remove(line); line.geometry.dispose(); line.material.dispose(); this.traces.splice(i, 1);
    }
  }
}
