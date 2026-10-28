import test from 'node:test';
import assert from 'node:assert/strict';
import { createControls } from '../controls.js';

test('basic fire stays held until every keyboard or touch source releases', () => {
  const controls = createControls();
  controls.pressFire('key:Space');
  controls.pressFire('pointer:7');
  controls.releaseFire('pointer:7');
  assert.equal(controls.isFiring(), true);
  controls.releaseFire('key:Space');
  assert.equal(controls.isFiring(), false);
});

test('ultimate is queued once and cleared on blur', () => {
  const controls = createControls();
  controls.queueUltimate();
  assert.equal(controls.consumeUltimate(), true);
  assert.equal(controls.consumeUltimate(), false);
  controls.pressFire('pointer:1');
  controls.queueUltimate();
  controls.clear();
  assert.equal(controls.isFiring(), false);
  assert.equal(controls.consumeUltimate(), false);
});

test('a quick fire tap still reaches one animation frame', () => {
  const controls = createControls();
  controls.pressFire('touch');
  controls.releaseFire('touch');
  assert.equal(controls.isFiring(), false);
  assert.equal(controls.consumeFire(), true);
  assert.equal(controls.consumeFire(), false);
});
