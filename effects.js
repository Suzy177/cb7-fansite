/* CB7 motion effects: scroll progress bar, hero intro (Anime.js),
   scroll-reveal + springy cards (Motion), count-up numbers (Anime.js).
   Works with content that app.js loads later. */
(() => {
  const A = window.anime, M = window.Motion;
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. Scroll progress bar ---------- */
  const bar = document.createElement("div");
  bar.id = "scroll-progress";
  document.body.appendChild(bar);
  const setBar = () => {
    const h = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${h > 0 ? Math.min(scrollY / h, 1) : 0})`;
  };
  addEventListener("scroll", setBar, { passive: true });
  addEventListener("resize", setBar);
  setBar();

  if (reduce) return;

  /* ---------- 2. Count-up numbers ---------- */
  const NUM = /\d[\d,]*(\.\d+)?/;
  function countUp(el) {
    if (!A || el._counting || el.dataset.counted === el.textContent) return;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) if (NUM.test(node.nodeValue)) break;
    if (!node) return;
    const m = node.nodeValue.match(NUM), raw = m[0];
    const target = parseFloat(raw.replace(/,/g, ""));
    if (!isFinite(target)) return;
    if (!raw.includes(",") && target >= 1900 && target <= 2100) return; // skip years like 2025
    const dec = m[1] ? m[1].length - 1 : 0, comma = raw.includes(",");
    const before = node.nodeValue.slice(0, m.index), after = node.nodeValue.slice(m.index + raw.length);
    const o = { v: 0 };
    el._counting = true;
    A({
      targets: o, v: target, duration: 1300, easing: "easeOutCubic",
      update() {
        const s = comma ? o.v.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec }) : o.v.toFixed(dec);
        node.nodeValue = before + s + after;
      },
      complete() { node.nodeValue = before + raw + after; el._counting = false; el.dataset.counted = el.textContent; }
    });
  }
  const COUNT_SEL = ".stat-box .num, td.num, .podium-val";
  const countIn = (root) => {
    if (root.matches && root.matches(COUNT_SEL)) countUp(root);
    root.querySelectorAll && root.querySelectorAll(COUNT_SEL).forEach(countUp);
  };

  /* ---------- 3. Hero intro (Anime.js) ---------- */
  const hero = document.querySelector(".hero");
  if (hero && A) {
    const h1 = hero.querySelector("h1");
    if (h1 && !h1.querySelector(".w")) {
      h1.innerHTML = h1.textContent.trim().split(/\s+/).map((w) => `<span class="w">${w}</span>`).join(" ");
    }
    const parts = hero.querySelectorAll(".badge-pill, .hero-logo, .lead, .hero-cta");
    const photo = hero.querySelector(".hero-photo");
    A.set([...parts, ...hero.querySelectorAll("h1 .w")], { opacity: 0 });
    if (photo) A.set(photo, { opacity: 0 });
    const tl = A.timeline({ easing: "easeOutExpo" });
    tl.add({ targets: hero.querySelectorAll(".badge-pill, .hero-logo"), opacity: [0, 1], translateY: [24, 0], scale: [0.95, 1], duration: 800, delay: A.stagger(120) })
      .add({ targets: hero.querySelectorAll("h1 .w"), opacity: [0, 1], translateY: [40, 0], rotate: [8, 0], duration: 900, delay: A.stagger(45) }, "-=500")
      .add({ targets: hero.querySelectorAll(".lead, .hero-cta"), opacity: [0, 1], translateY: [20, 0], duration: 700, delay: A.stagger(120) }, "-=600");
    if (photo) tl.add({ targets: photo, opacity: [0, 1], translateX: [60, 0], duration: 1200 }, 300);
    tl.finished.then(() => [...parts, photo].forEach((el) => el && (el.style.transform = "")));
  }

  /* ---------- 4. Scroll reveal + springy cards (Motion) ---------- */
  const REVEAL_SEL = ".section-head, .stat-box, .card, tbody tr, .tabs, .error-box, .loading";
  const canHover = window.matchMedia && matchMedia("(hover: hover)").matches;

  if (!M || !M.animate) {
    // Motion didn't load: still count numbers, no hiding
    countIn(document.body);
    new MutationObserver((ms) => ms.forEach((mu) => mu.addedNodes.forEach((n) => n.nodeType === 1 && countIn(n)))).observe(document.body, { childList: true, subtree: true });
    return;
  }
  document.documentElement.classList.add("fx");
  const { animate } = M;
  const HIDDEN = "translateY(28px) scale(.97)", SHOWN = "translateY(0px) scale(1)";

  function springify(card) {
    if (card._spring || !card.classList.contains("card")) return;
    card._spring = true;
    const up = () => animate(card, { transform: "translateY(-6px) scale(1.02)" }, { type: "spring", stiffness: 400, damping: 15 });
    const down = () => animate(card, { transform: SHOWN }, { type: "spring", stiffness: 300, damping: 20 });
    if (canHover) { card.addEventListener("mouseenter", up); card.addEventListener("mouseleave", down); }
    card.addEventListener("pointerdown", () => animate(card, { transform: "translateY(0px) scale(.97)" }, { duration: 0.1 }));
    card.addEventListener("pointerup", canHover ? up : down);
    card.addEventListener("pointercancel", down);
  }

  const io = new IntersectionObserver((entries) => {
    let i = 0;
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      const el = e.target, delay = Math.min(i++, 8) * 0.07;
      animate(el, { opacity: [0, 1], transform: [HIDDEN, SHOWN] }, { delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] });
      setTimeout(() => countIn(el), delay * 1000 + 150);
      springify(el);
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -5% 0px" });

  const watch = (el) => {
    if (el._fx || el.closest(".hero")) return;
    el._fx = true;
    el.style.opacity = 0;
    el.style.transform = HIDDEN;
    io.observe(el);
  };
  const scan = (root) => {
    if (root.matches && root.matches(REVEAL_SEL)) watch(root);
    root.querySelectorAll && root.querySelectorAll(REVEAL_SEL).forEach(watch);
  };
  scan(document.body);

  // Content loaded later by app.js (roster, wars, leaderboards, tabs...)
  new MutationObserver((ms) => {
    ms.forEach((mu) => {
      if (mu.type === "childList") mu.addedNodes.forEach((n) => n.nodeType === 1 && scan(n));
      // numbers filled in later, e.g. "Avg roster trophies"
      const t = mu.target.nodeType === 1 ? mu.target : mu.target.parentElement;
      const num = t && t.closest && t.closest(COUNT_SEL);
      if (num && !num._counting && num.style.opacity !== "0") countUp(num);
    });
  }).observe(document.body, { childList: true, subtree: true, characterData: true });
})();
