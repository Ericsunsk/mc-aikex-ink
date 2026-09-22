/**
 * 末影龙 Boss（末地）
 */
import * as THREE from 'three';

export class EnderDragon {
  constructor(scene, x = 0, y = 28, z = 0) {
    this.scene = scene;
    this.id = 'dragon';
    this.kind = 'dragon';
    this.maxHp = 200;
    this.hp = 200;
    this.dead = false;
    this.hurtTimer = 0;
    this.phase = Math.random() * Math.PI * 2;
    this.radius = 18;
    this.center = new THREE.Vector3(x, y, z);
    this.position = new THREE.Vector3(x + this.radius, y, z);
    this.collisionWidth = 3.5;
    this.collisionHeight = 2.5;
    this._netDriven = false;

    this.group = new THREE.Group();
    this._build();
    this.scene.add(this.group);
    this._baseMats = [];
    this.group.traverse((o) => {
      if (o.isMesh && o.material?.color) {
        this._baseMats.push({ mat: o.material, hex: o.material.color.getHex() });
      }
    });
  }

  _build() {
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x1a0028 });
    const wingMat = new THREE.MeshLambertMaterial({ color: 0x4a0080 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff00ff });

    const body = new THREE.Mesh(new THREE.BoxGeometry(4, 1.6, 2.2), bodyMat);
    body.position.y = 1;
    this.group.add(body);

    const head = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 1.8), bodyMat);
    head.position.set(2.6, 1.2, 0);
    this.group.add(head);
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.1), eyeMat);
    eyeL.position.set(3.35, 1.4, 0.4);
    this.group.add(eyeL);
    const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.1), eyeMat);
    eyeR.position.set(3.35, 1.4, -0.4);
    this.group.add(eyeR);

    this.wingL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 5), wingMat);
    this.wingL.position.set(0, 1.4, 2.8);
    this.group.add(this.wingL);
    this.wingR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 5), wingMat);
    this.wingR.position.set(0, 1.4, -2.8);
    this.group.add(this.wingR);

    const tail = new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 0.5), bodyMat);
    tail.position.set(-3.2, 0.9, 0);
    this.group.add(tail);
  }

  hitDistance(origin, dir, maxDist) {
    if (this.dead) return Infinity;
    const hw = this.collisionWidth / 2;
    const min = {
      x: this.position.x - hw,
      y: this.position.y,
      z: this.position.z - hw,
    };
    const max = {
      x: this.position.x + hw,
      y: this.position.y + this.collisionHeight,
      z: this.position.z + hw,
    };
    let tmin = 0;
    let tmax = maxDist;
    for (const axis of ['x', 'y', 'z']) {
      const o = origin[axis];
      const d = dir[axis];
      if (Math.abs(d) < 1e-8) {
        if (o < min[axis] || o > max[axis]) return Infinity;
        continue;
      }
      let t1 = (min[axis] - o) / d;
      let t2 = (max[axis] - o) / d;
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return Infinity;
    }
    return tmin >= 0 ? tmin : Infinity;
  }

  takeDamage(amount = 5) {
    if (this.dead) return null;
    this.hp -= amount;
    this.hurtTimer = 0.4;
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      return { dead: true, drops: [] };
    }
    return { dead: false, drops: [] };
  }

  update(dt) {
    if (this.dead) return;
    dt = Math.min(dt, 0.1);
    this.phase += dt * 0.55;
    this.position.x = this.center.x + Math.cos(this.phase) * this.radius;
    this.position.z = this.center.z + Math.sin(this.phase) * this.radius;
    this.position.y = this.center.y + Math.sin(this.phase * 2) * 2.5;
    this.group.position.copy(this.position);
    this.group.rotation.y = -this.phase + Math.PI / 2;
    const flap = Math.sin(this.phase * 8) * 0.45;
    if (this.wingL) this.wingL.rotation.x = flap;
    if (this.wingR) this.wingR.rotation.x = -flap;

    if (this.hurtTimer > 0) {
      this.hurtTimer -= dt;
      for (const { mat, hex } of this._baseMats) {
        mat.color.setHex(this.hurtTimer > 0 ? 0xff44ff : hex);
      }
    }
  }

  dispose() {
    if (!this.group) return;
    this.group.traverse((c) => {
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    });
    this.scene.remove(this.group);
    this.group = null;
  }
}
