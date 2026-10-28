import test from 'node:test';
import assert from 'node:assert/strict';
import { createLifecycle } from '../lifecycle.js';

test('blur stops combat and focus allows it again', () => {
  const lifecycle = createLifecycle();
  assert.equal(lifecycle.canAdvance(), true);
  lifecycle.setFocused(false);
  assert.equal(lifecycle.canAdvance(), false);
  lifecycle.setFocused(true);
  assert.equal(lifecycle.canAdvance(), true);
});

test('hidden tab suspends audio and visible tab resumes when sound is enabled', () => {
  const lifecycle = createLifecycle();
  lifecycle.setVisible(false);
  assert.equal(lifecycle.audioShouldRun(true, true), false);
  lifecycle.setVisible(true);
  assert.equal(lifecycle.audioShouldRun(true, true), true);
  assert.equal(lifecycle.audioShouldRun(true, false), false);
});
