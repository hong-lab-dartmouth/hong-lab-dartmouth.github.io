/* =============================================================
   Spring — the site's motion primitive.

   A fixed-duration CSS transition cannot be grabbed and redirected
   mid-flight, which is what makes gesture-driven UI feel alive. This
   is a small rAF spring solver instead: it always animates from the
   current on-screen value, and re-targeting mid-motion carries the
   existing velocity through rather than hard-cutting it.

   Parameterised the way Apple's design tooling is, not with the
   physics triplet:

     damping   1.0 = critically damped, no overshoot (the default)
               ~0.8 = slight bounce, ONLY after a real flick
     response  seconds to reach the target. Not a duration — a spring
               has no fixed duration; settle time emerges.

   Values Apple ships:  move 1.0/0.4 · rotate 0.8/0.4 · drawer 0.8/0.3

   No dependencies, no build step — same as the rest of the site.
   ============================================================= */

(function (global) {
  'use strict';

  var reduceMotion = global.matchMedia
    ? global.matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false };

  /* Apple's momentum projection, from the Designing Fluid Interfaces
     sample code. Note this is the exponential-decay form, NOT the
     physics-textbook v^2/(2a) — the two disagree and this is the one
     that matches how iOS scrolling actually lands. */
  function project(velocity, decelerationRate) {
    var d = decelerationRate === undefined ? 0.998 : decelerationRate;
    return (velocity / 1000) * d / (1 - d);
  }

  /* Progressive resistance past a boundary. A hard stop reads as
     "frozen"; resistance reads as "responsive, but there's no more
     here". Constant 0.55 matches UIScrollView's feel. */
  function rubberband(overshoot, dimension, constant) {
    var c = constant === undefined ? 0.55 : constant;
    return (overshoot * dimension * c) / (dimension + c * Math.abs(overshoot));
  }

  /* A single scalar spring. Returns a handle whose .to() re-targets
     in flight, preserving velocity — that is what stops a reversal
     from hitting a "brick wall". */
  function spring(opts) {
    var value = opts.from;
    var target = opts.to;
    var velocity = opts.velocity || 0;
    var damping = opts.damping === undefined ? 1 : opts.damping;
    var response = opts.response === undefined ? 0.4 : opts.response;
    var onFrame = opts.onFrame;
    var onRest = opts.onRest;

    var raf = null;
    var last = null;
    var done = false;

    /* Under reduced motion the spring still runs, but it snaps to the
       target immediately so callers get one frame and a clean onRest.
       Callers pair this with an opacity cross-fade (see §14) — the
       point is a gentler equivalent, never the absence of feedback. */
    if (reduceMotion.matches) {
      value = target;
      if (onFrame) onFrame(value, 0);
      if (onRest) onRest(value);
      return { to: function () {}, stop: function () {}, value: function () { return value; }, velocity: function () { return 0; } };
    }

    var stiffness = Math.pow(2 * Math.PI / response, 2);
    var dampingCoeff = 4 * Math.PI * damping / response;

    function frame(now) {
      if (done) return;
      if (last === null) last = now;
      /* Clamp dt so a backgrounded tab doesn't integrate one huge
         step and fling the value into orbit on return. */
      var dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;

      /* Semi-implicit Euler, substepped for stability at stiff
         settings. Velocity updates first, then position uses it. */
      var steps = Math.max(1, Math.ceil(dt / (1 / 240)));
      var h = dt / steps;
      for (var i = 0; i < steps; i++) {
        var accel = -stiffness * (value - target) - dampingCoeff * velocity;
        velocity += accel * h;
        value += velocity * h;
      }

      if (onFrame) onFrame(value, velocity);

      var settled = Math.abs(value - target) < 0.01 && Math.abs(velocity) < 0.05;
      if (settled) {
        value = target;
        velocity = 0;
        if (onFrame) onFrame(value, 0);
        done = true;
        raf = null;
        if (onRest) onRest(value);
        return;
      }
      raf = global.requestAnimationFrame(frame);
    }

    raf = global.requestAnimationFrame(frame);

    return {
      /* Re-target mid-flight. Velocity carries over untouched unless
         the caller explicitly hands in a new one (e.g. a release). */
      to: function (next, newVelocity) {
        target = next;
        if (newVelocity !== undefined) velocity = newVelocity;
        if (done) {
          done = false;
          last = null;
          raf = global.requestAnimationFrame(frame);
        }
      },
      stop: function () {
        done = true;
        if (raf) global.cancelAnimationFrame(raf);
        raf = null;
      },
      value: function () { return value; },
      velocity: function () { return velocity; }
    };
  }

  /* Tracks the last few pointer samples so release velocity reflects
     what the finger was doing at the end, not averaged over the whole
     gesture. 100ms window — long enough to be stable, short enough to
     catch a late flick. */
  function VelocityTracker() {
    this.samples = [];
  }

  VelocityTracker.prototype.add = function (position, time) {
    this.samples.push({ p: position, t: time });
    var cutoff = time - 100;
    while (this.samples.length > 2 && this.samples[0].t < cutoff) {
      this.samples.shift();
    }
  };

  VelocityTracker.prototype.velocity = function () {
    if (this.samples.length < 2) return 0;
    var first = this.samples[0];
    var last = this.samples[this.samples.length - 1];
    var dt = last.t - first.t;
    if (dt <= 0) return 0;
    return ((last.p - first.p) / dt) * 1000; // px/s
  };

  VelocityTracker.prototype.reset = function () {
    this.samples.length = 0;
  };

  global.Motion = {
    spring: spring,
    project: project,
    rubberband: rubberband,
    VelocityTracker: VelocityTracker,
    get reduced() { return reduceMotion.matches; }
  };

  /* Marks that the spring engine is present, so the stylesheet can
     hide surfaces it knows JS will paint. If this file fails to load,
     the class is absent, those surfaces keep their default opacity,
     and the site degrades to the un-animated behaviour rather than
     showing an invisible modal. */
  document.documentElement.classList.add('motion-ready');
})(window);
