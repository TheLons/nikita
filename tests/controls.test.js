import test from 'node:test';
import assert from 'node:assert/strict';
import { createControls } from '../controls.js';

test('opposing directions cancel and released touch direction stops movement', () => {
  const controls = createControls();
  controls.press('left');
  assert.deepEqual(controls.vector(), { dx: -1, dy: 0 });
  controls.press('right');
  assert.deepEqual(controls.vector(), { dx: 0, dy: 0 });
  controls.release('left');
  assert.deepEqual(controls.vector(), { dx: 1, dy: 0 });
  controls.release('right');
  assert.deepEqual(controls.vector(), { dx: 0, dy: 0 });
});

test('clearing controls releases a stuck movement direction', () => {
  const controls = createControls();
  controls.press('up');
  assert.deepEqual(controls.vector(), { dx: 0, dy: -1 });
  controls.clear();
  assert.deepEqual(controls.vector(), { dx: 0, dy: 0 });
});
