import * as THREE from 'three';
import { isSolid } from './voxel.js?v=lobby10';

export class Mage {
  constructor(game) {
    this.game = game;
    this.nextCast = 0; this.nextBlink = 0;
    this.effects = new Map(); this.sequence = 0;
    this.orb = new THREE.Mesh(new THREE.IcosahedronGeometry(.1, 1), new THREE.MeshBasicMaterial({ color: 0xff781c }));
    this.orb.position.set(.28, -.20, -.55);
    game.camera.add(this.orb); this.orb.visible = false;
  }
  cast() {
    const g = this.game, now = Date.now();
    if (now < this.nextCast || !g._controlsActive() || g.player.hp <= 0) return;
    this.nextCast = now + 950;
    const origin = g.camera.position.clone(), dir = g.camera.getWorldDirection(new THREE.Vector3());
    let end = origin.clone().addScaledVector(dir, 40), ground = null;
    for (let t = .1; t <= 40; t += .1) {
      const point = origin.clone().addScaledVector(dir, t);
      if (!isSolid(g.world.getBlock(Math.floor(point.x), Math.floor(point.y), Math.floor(point.z)))) continue;
      end = point.addScaledVector(dir, -.12);
      // Find the exposed floor below impact, so fire rests on terrain rather than floats.
      for (let y = Math.floor(end.y); y >= Math.max(0, end.y - 48); y--) {
        if (isSolid(g.world.getBlock(Math.floor(end.x), y, Math.floor(end.z)))) {
          ground = [end.x, y + 1.02, end.z]; break;
        }
      }
      break;
    }
    const msg = { t: 'fireball', end: end.toArray(), ground };
    if (g._online) g.net._send(msg);
    else this.receive({ ...msg, id: `solo-${++this.sequence}`, origin: origin.toArray(),
      dimension: g.dimension, start: now, impact: now + Math.max(80, origin.distanceTo(end) / 22 * 1000), solo: true });
  }
  canOccupy(p) {
    const world = this.game.world;
    for (let x = Math.floor(p.x - .3); x <= Math.floor(p.x + .3); x++)
      for (let y = Math.floor(p.y + .02); y <= Math.floor(p.y + 1.74); y++)
        for (let z = Math.floor(p.z - .3); z <= Math.floor(p.z + .3); z++)
          if (isSolid(world.getBlock(x, y, z))) return false;
    return true;
  }
  blink() {
    const g = this.game, now = Date.now();
    if (g.combat.mode !== 'mage' || !g._controlsActive() || g.player.hp <= 0 || now < this.nextBlink) return;
    const origin = g.player.position, dir = g.camera.getWorldDirection(new THREE.Vector3());
    const target = origin.clone();
    for (let t = .2; t <= 8; t += .2) {
      const next = origin.clone().addScaledVector(dir, t);
      if (!this.canOccupy(next)) break;
      target.copy(next);
    }
    if (target.distanceTo(origin) < .2) return;
    this.nextBlink = now + 5100;
    if (g._online) g.net._send({ t: 'blink', to: target.toArray() });
    else this.teleport(target.toArray());
  }
  teleport(to) {
    const p = this.game.player;
    p.position.set(...to); p.velocity.set(0,0,0); p._fallVy = 0;
    this.game.camera.position.set(p.position.x, p.position.y + p.eyeHeight, p.position.z);
    document.body.classList.add('mage-blink');
    setTimeout(() => document.body.classList.remove('mage-blink'), 180);
  }
  remove(key) {
    const effect = this.effects.get(key);
    if (!effect) return;
    this.game.scene.remove(effect.mesh);
    effect.mesh.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); });
    this.effects.delete(key);
  }
  clear() { for (const key of this.effects.keys()) this.remove(key); }
  receive(msg) {
    const key = `${msg.t}-${msg.id}`;
    if (this.effects.has(key)) return;
    const mesh = new THREE.Group();
    if (msg.t === 'fireball') {
      mesh.add(new THREE.Mesh(new THREE.IcosahedronGeometry(.24, 1), new THREE.MeshBasicMaterial({color:0xffa125})));
    } else {
      const ring = new THREE.Mesh(new THREE.CircleGeometry(2.5, 32), new THREE.MeshBasicMaterial({color:0xff4510, transparent:true, opacity:.42, side:THREE.DoubleSide, depthWrite:false}));
      ring.rotation.x = -Math.PI / 2; mesh.add(ring);
      for (let i = 0; i < 16; i++) {
        const flame = new THREE.Mesh(new THREE.ConeGeometry(.16, .8, 5), new THREE.MeshBasicMaterial({color:i%2 ? 0xffc64a : 0xff6719, transparent:true, opacity:.85}));
        const angle = i * 2.4, radius = .4 + (i % 5) * .4;
        flame.position.set(Math.cos(angle)*radius,.4,Math.sin(angle)*radius); mesh.add(flame);
      }
      mesh.position.set(...msg.position);
    }
    this.effects.set(key, { msg, mesh }); this.game.scene.add(mesh);
  }
  tick(active) {
    const g = this.game, now = Date.now();
    this.orb.visible = active && g.combat.mode === 'mage' && g.player.hp > 0;
    this.orb.rotation.y += .04;
    for (const [key, {msg, mesh}] of this.effects) {
      mesh.visible = msg.dimension === g.dimension;
      if (msg.t === 'fireball') {
        const fraction = Math.min(1, (now-msg.start)/(msg.impact-msg.start));
        mesh.position.fromArray(msg.origin).lerp(new THREE.Vector3(...msg.end), Math.max(0,fraction));
        if (now < msg.impact) continue;
        this.remove(key);
        if (msg.solo && msg.ground) this.receive({t:'fire',id:msg.id,position:msg.ground,dimension:msg.dimension,expires:msg.impact+5000});
      } else {
        if (now >= msg.expires) { this.remove(key); continue; }
        mesh.children.forEach((o,i) => { if (i) o.scale.y = .8 + Math.sin(now*.012+i)*.3; });
      }
    }
  }
}
