/**
 * 传送门：检测黑曜石框、点燃、站立计时
 * 框规格（简化版 MC）：内空宽 2、高 3；外框黑曜石
 */
import { BlockType } from './voxel.js?v=lobby10';

/** 在准星附近尝试点燃传送门，成功返回 {axis,x,y,z} */
export function tryLightPortal(world, tx, ty, tz) {
  // 以点击的黑曜石为线索，扫描可能的框
  for (const axis of ['x', 'z']) {
    for (let dy = -4; dy <= 1; dy++) {
      for (let d = -3; d <= 0; d++) {
        const ox = axis === 'x' ? tx + d : tx;
        const oz = axis === 'z' ? tz + d : tz;
        const oy = ty + dy;
        if (isValidFrame(world, axis, ox, oy, oz)) {
          fillPortal(world, axis, ox, oy, oz);
          return { axis, x: ox, y: oy, z: oz };
        }
      }
    }
  }
  return null;
}

function frameBlocks(axis, ox, oy, oz) {
  // 内空：从 (ox+1,oy+1) 起 2×3；外框
  const cells = [];
  if (axis === 'x') {
    for (let y = 0; y <= 4; y++) {
      for (let x = 0; x <= 3; x++) {
        const isEdge = y === 0 || y === 4 || x === 0 || x === 3;
        if (isEdge) cells.push([ox + x, oy + y, oz, true]);
        else cells.push([ox + x, oy + y, oz, false]);
      }
    }
  } else {
    for (let y = 0; y <= 4; y++) {
      for (let z = 0; z <= 3; z++) {
        const isEdge = y === 0 || y === 4 || z === 0 || z === 3;
        if (isEdge) cells.push([ox, oy + y, oz + z, true]);
        else cells.push([ox, oy + y, oz + z, false]);
      }
    }
  }
  return cells;
}

function isValidFrame(world, axis, ox, oy, oz) {
  const cells = frameBlocks(axis, ox, oy, oz);
  for (const [x, y, z, isEdge] of cells) {
    const b = world.getBlock(x, y, z);
    if (isEdge) {
      if (b !== BlockType.OBSIDIAN) return false;
    } else if (b !== BlockType.AIR && b !== BlockType.PORTAL) {
      return false;
    }
  }
  return true;
}

function fillPortal(world, axis, ox, oy, oz) {
  const cells = frameBlocks(axis, ox, oy, oz);
  for (const [x, y, z, isEdge] of cells) {
    if (!isEdge) world.setBlock(x, y, z, BlockType.PORTAL);
  }
}

/** 玩家是否站在传送门方块内 */
export function standingInPortal(world, px, py, pz) {
  const x = Math.floor(px);
  const y = Math.floor(py);
  const z = Math.floor(pz);
  const y2 = Math.floor(py + 0.9);
  return world.getBlock(x, y, z) === BlockType.PORTAL
    || world.getBlock(x, y2, z) === BlockType.PORTAL;
}

/** 在出生点附近生成一座已点燃的传送门（用于地狱/末地回程） */
export function spawnReturnPortal(world, cx, cy, cz, axis = 'x') {
  const ox = Math.floor(cx) - 1;
  const oy = Math.floor(cy);
  const oz = Math.floor(cz);
  const cells = frameBlocks(axis, ox, oy, oz);
  for (const [x, y, z, isEdge] of cells) {
    world.setBlock(x, y, z, isEdge ? BlockType.OBSIDIAN : BlockType.PORTAL);
  }
  return { x: ox + 1.5, y: oy + 1, z: oz + (axis === 'z' ? 1.5 : 0) };
}
