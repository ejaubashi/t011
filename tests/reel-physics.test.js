import test from 'node:test';
import assert from 'node:assert/strict';
import { createReelPhysics, springStep } from '../src/reel-physics.js';

const settle = (physics, start = 0, hz = 60) => {
  for (let i = 1; i <= hz * 4; i++) physics.step(1 / hz, start + i * 1000 / hz);
};

test('small wheel deltas move continuously before snapping', () => {
  const reel = createReelPhysics(4);
  reel.wheel(.05, 0);
  reel.step(1 / 60, 16.67);
  assert.ok(reel.position > 0 && reel.position < .05);
  assert.equal(reel.index, 0);
  settle(reel);
  assert.equal(reel.position, 0);
  assert.equal(reel.mode, 'idle');
});

test('successive input has no selection gate and supports immediate reversal', () => {
  const reel = createReelPhysics(4);
  reel.wheel(.8, 0); reel.wheel(.8, 10); reel.wheel(.8, 20);
  settle(reel, 20);
  assert.equal(reel.position, 2);
  reel.wheel(-1.1, 5000);
  settle(reel, 5000);
  assert.equal(reel.position, 1);
});

test('release carries a flick and long holds remove stale momentum', () => {
  const flick = createReelPhysics(4);
  flick.beginDrag(0); flick.drag(.7, 100); flick.endDrag(100); settle(flick, 100);
  assert.equal(flick.position, 1);
  const hold = createReelPhysics(4);
  hold.beginDrag(0); hold.drag(.3, 30); hold.endDrag(800); settle(hold, 800);
  assert.equal(hold.position, 0);
});

test('spring time integration is consistent across 60 and 120 Hz', () => {
  const simulate = hz => {
    let state = { position: 0, velocity: 0 };
    for (let i = 0; i < hz / 2; i++) state = springStep(state.position, state.velocity, 1, 1 / hz);
    return state;
  };
  assert.ok(Math.abs(simulate(60).position - simulate(120).position) < 1e-10);
});

test('reverse wrapping, explicit navigation and reduced motion remain usable', () => {
  const reel = createReelPhysics(4);
  reel.wheel(-1.1, 0); settle(reel); assert.equal(reel.index, 3);
  reel.goTo(0, 1); settle(reel, 5000); assert.equal(reel.index, 0);
  reel.goTo(2); reel.step(1 / 60, 10000, true);
  assert.equal(reel.position, 2); assert.equal(reel.mode, 'idle');
});

test('rapid explicit navigation preserves every button or keyboard step', () => {
  const reel = createReelPhysics(4);
  reel.stepBy(1); reel.stepBy(1); reel.stepBy(1);
  settle(reel);
  assert.equal(reel.position, 3);
});
