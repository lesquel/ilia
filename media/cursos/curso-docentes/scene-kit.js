  const clamp = (v) => Math.max(0, Math.min(1, v));
  const ease = (p) => 1 - Math.pow(1 - p, 3);
  const sections = [...document.querySelectorAll('section')];

  // Deterministic: every frame is a pure function of t, so the render can
  // step through time instead of recording a live animation.
  window.renderAt = (t) => {
    const { beats, duration } = window.ILIA;
    document.querySelector('.progress i').style.width = `${(100 * t) / duration}%`;
    beats.forEach((beat, index) => {
      const start = beat.at;
      const end = beats[index + 1]?.at ?? duration + 1;
      const section = sections.find((s) => s.dataset.scene === beat.scene);
      if (!section) return;
      const fadeIn = clamp((t - start) / 0.35);
      const fadeOut = clamp((end - t) / 0.35);
      section.style.opacity = Math.min(fadeIn, fadeOut);
      const local = t - start;
      section.querySelectorAll('[data-in]').forEach((el) => {
        const p = ease(clamp((local - Number(el.dataset.in)) / 0.5));
        el.style.opacity = p;
        el.style.transform = `translateY(${(1 - p) * 14}px)`;
      });
      section.querySelectorAll('[data-strike]').forEach((el) => {
        el.style.setProperty('--w', `${88 * ease(clamp((local - Number(el.dataset.strike)) / 0.6))}%`);
      });
      section.querySelectorAll('[data-scan]').forEach((el) => {
        const p = clamp((local - Number(el.dataset.scan)) / Number(el.dataset.scanDur));
        el.style.top = `${-50 + p * (el.parentElement.clientHeight + 50)}px`;
        el.style.opacity = p > 0 && p < 1 ? 1 : 0;
      });
      section.querySelectorAll('[data-straighten]').forEach((el) => {
        const p = ease(clamp((local - Number(el.dataset.straighten)) / 0.9));
        const appear = ease(clamp((local - Number(el.dataset.in)) / 0.5));
        el.style.transform = `rotate(${-9 * (1 - p)}deg) translateY(${(1 - appear) * 14}px)`;
        el.style.filter = `brightness(${0.82 + 0.18 * p})`;
      });
    });
  
    // data-say="start of a sentence": appear when the narration says it, so a
    // re-narrated voice keeps the timing without hand-tuned offsets.
    document.querySelectorAll('[data-say]').forEach((el) => {
      const line = window.ILIA.boundaries?.find((b) => b.text.startsWith(el.dataset.say));
      if (!line) return;
      const at = line.offset + Number(el.dataset.delay ?? 0);
      const p = ease(clamp((t - at) / 0.5));
      if (el.dataset.mode === 'mark') el.classList.toggle(el.dataset.markClass ?? 'on-red', t >= at);
      else { el.style.opacity = p; el.style.transform = `translateY(${(1 - p) * 14}px)`; }
    });
  };
