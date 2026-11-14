/* Constellation background (tsParticles) — CB7 red / blue theme */
(async () => {
  if (typeof tsParticles === "undefined") return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  try {
    if (typeof loadSlim === "function") { try { await loadSlim(tsParticles); } catch (e) {} }
    const mobile = window.innerWidth < 700;
    await tsParticles.load({ id: "tsparticles", options: {
      fullScreen: { enable: true, zIndex: -1 },
      background: { color: "transparent" },
      fpsLimit: 60,
      particles: {
        number: { value: mobile ? 35 : 75, density: { enable: true } },
        color: { value: ["#ff1f1f", "#1a6bff", "#19d3ff", "#ffffff"] },
        links: { enable: true, distance: mobile ? 110 : 140, color: "#3a6bff", opacity: 0.22, width: 1 },
        move: { enable: true, speed: 1, outModes: { default: "bounce" } },
        opacity: { value: { min: 0.3, max: 0.85 } },
        size: { value: { min: 1, max: 2.6 } }
      },
      interactivity: {
        events: { onHover: { enable: true, mode: "grab" }, onClick: { enable: true, mode: "push" } },
        modes: { grab: { distance: 160, links: { opacity: 0.55 } }, push: { quantity: 3 } }
      },
      detectRetina: true
    }});
  } catch (e) { console.log("particles failed", e); }
})();
