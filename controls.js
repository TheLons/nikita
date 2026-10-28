const directions = new Set(['up', 'down', 'left', 'right']);

export function createControls() {
  const held = new Map();
  const fireSources = new Set();
  let fireQueued = false;
  let ultimateQueued = false;

  return {
    press(direction, source = direction) {
      if (directions.has(direction)) held.set(source, direction);
    },
    release(direction, source = direction) {
      held.delete(source);
    },
    vector() {
      const active = new Set(held.values());
      return {
        dx: Number(active.has('right')) - Number(active.has('left')),
        dy: Number(active.has('down')) - Number(active.has('up')),
      };
    },
    pressFire(source = 'fire') {
      fireSources.add(source);
      fireQueued = true;
    },
    releaseFire(source = 'fire') { fireSources.delete(source); },
    isFiring() { return fireSources.size > 0; },
    consumeFire() {
      const fire = fireSources.size > 0 || fireQueued;
      fireQueued = false;
      return fire;
    },
    queueUltimate() { ultimateQueued = true; },
    consumeUltimate() {
      const queued = ultimateQueued;
      ultimateQueued = false;
      return queued;
    },
    clear() {
      held.clear();
      fireSources.clear();
      fireQueued = false;
      ultimateQueued = false;
    },
  };
}
