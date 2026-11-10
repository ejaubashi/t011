const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

// Exact critically damped spring integration keeps the feel consistent at 60/120 Hz.
export function springStep(position, velocity, target, dt, frequency = 16) {
  const offset = position - target;
  const impulse = velocity + frequency * offset;
  const decay = Math.exp(-frequency * dt);
  return {
    position: target + (offset + impulse * dt) * decay,
    velocity: (velocity - frequency * impulse * dt) * decay,
  };
}

export function createReelPhysics(count) {
  let position = 0, target = 0, velocity = 0, mode = 'idle';
  let lastInput = -Infinity, lastDrag = 0, dragVelocity = 0;
  const index = value => ((Math.round(value) % count) + count) % count;
  return {
    get position() { return position; },
    get velocity() { return velocity; },
    get index() { return index(position); },
    get mode() { return mode; },
    wheel(delta, now) {
      if (!Number.isFinite(delta) || delta === 0) return;
      target += delta;
      lastInput = now;
      mode = 'wheel';
    },
    beginDrag(now) {
      target = position;
      velocity = dragVelocity = 0;
      lastDrag = now;
      mode = 'drag';
    },
    drag(delta, now) {
      if (mode !== 'drag') return;
      const seconds = Math.max(8, now - lastDrag) / 1000;
      dragVelocity = dragVelocity * .4 + clamp(delta / seconds, -8, 8) * .6;
      velocity = dragVelocity;
      position += delta;
      target = position;
      lastDrag = now;
    },
    endDrag(now, cancelled = false) {
      if (mode !== 'drag') return;
      const release = cancelled ? 0 : dragVelocity * Math.exp(-Math.max(0, now - lastDrag - 30) / 90);
      target = Math.round(position + clamp(release * .13, -.8, .8));
      velocity = release;
      mode = 'snap';
    },
    goTo(next, direction = 0, immediate = false) {
      let destination = next + Math.round((position - next) / count) * count;
      if (Math.abs(destination - position) === count / 2 && direction) destination = position + count / 2 * direction;
      target = destination;
      if (immediate) { position = target; velocity = 0; mode = 'idle'; }
      else mode = 'snap';
    },
    stepBy(direction) { target = Math.round(target) + Math.sign(direction); mode = 'snap'; },
    intro() { position = target - .8; velocity = 0; mode = 'snap'; },
    step(seconds, now, reduced = false) {
      if (mode === 'drag') {
        velocity *= Math.exp(-seconds * 10);
        return;
      }
      if (mode === 'wheel' && now - lastInput >= 150) {
        // Trackpads supply their own momentum. Add no artificial second fling.
        target = Math.round(target);
        mode = 'snap';
      }
      if (reduced) { position = Math.round(target); velocity = 0; }
      else ({ position, velocity } = springStep(position, velocity, target, seconds, mode === 'wheel' ? 22 : 15));
      if (mode !== 'wheel' && Math.abs(target - position) < .0003 && Math.abs(velocity) < .003) {
        position = target; velocity = 0; mode = 'idle';
      }
    },
  };
}
