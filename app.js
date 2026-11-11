// CB7 fan site – auto-updated data from the StatHut backend (refreshes every 2 hours)
const API = "https://app.stathut.in";

const CLANS = [
  { tag: "#2U8RYVCV8", short: "Eclipse" },
  { tag: "#2CR2CYLJ", short: "Legacy" },
];

const PROS = [
  { tag: "#9RGLCULUG", name: "PJ", photo: "assets/people/pj.jpg?v=2" },
  { tag: "#92GYU0Q8V", name: "Shiaki", photo: "assets/people/shiaki.jpg?v=2" },
  { tag: "#QVJPCQV0J", name: "Lotasa", photo: "assets/people/lotasa.jpg?v=2" },
  { tag: "#QL2VRQGU0", name: "Anakin", photo: "assets/people/anakin.jpg?v=2" },
  { tag: "#LLPGYR0LU", name: "Mugi", photo: "assets/people/mugi.jpg?v=2" },
];

const BUILDERS = [
  { name: "Jotape", photo: "assets/people/jotape.jpg?v=2" },
  { name: "Loope", photo: "assets/people/loope.jpg?v=2" },
  { name: "Satans", photo: "assets/people/satans.jpg?v=2" },
];

const DISCORD = "https://discord.gg/cb7";

// ---------- helpers ----------
const $ = (sel, root = document) => root.querySelector(sel);
const clean = (tag) => tag.replace("#", "");
const fmt = (n) => (n === null || n === undefined || n === "" ? "–" : Number(n).toLocaleString("en-US"));
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// read a field from latest_stats first, then from the top-level object
const pick = (obj, key) => {
  if (!obj) return undefined;
  const s = obj.latest_stats;
  if (s && s[key] !== undefined && s[key] !== null) return s[key];
  return obj[key];
};

async function getJSON(path) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(API + path, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

function timeAgo(iso) {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 60000;
  if (diff < 1) return "just now";
  if (diff < 60) return `${Math.round(diff)} min ago`;
  if (diff < 1440) return `${Math.round(diff / 60)} h ago`;
  return `${Math.round(diff / 1440)} d ago`;
}

const ROLE = { leader: "Leader", coLeader: "Co-Leader", admin: "Elder", elder: "Elder", member: "Member" };
const WAR_LABEL = { inWar: "Battle Day", preparation: "Preparation", warEnded: "War Ended", notInWar: "Not in war" };

function clanInviteLink(tag) {
  return `https://link.clashofclans.com/en?action=OpenClanProfile&tag=${clean(tag)}`;
}

const slug = (name) => name.toLowerCase();
const proBySlug = (s) => PROS.find((p) => slug(p.name) === (s || "").toLowerCase());

// Town Hall icon (falls back to a text badge for levels without an image)
function thIcon(level, size = "big") {
  const n = Number(level);
  if (n >= 9 && n <= 18) {
    return size === "big"
      ? `<div class="th-img"><img src="assets/th/th${n}.png" alt="TH${n}"><span>TH${n}</span></div>`
      : `<span class="th-inline"><img class="th-mini" src="assets/th/th${n}.png" alt="TH${n}" title="TH${n}">${n}</span>`;
  }
  return size === "big"
    ? `<div class="th-badge"><div><small>TH</small><span>${level ?? "?"}</span></div></div>`
    : `${level ?? "–"}`;
}

// ---------- nav ----------
function initNav() {
  const page = document.body.dataset.page;
  document.querySelectorAll(".nav-links a").forEach((a) => {
    if (a.dataset.page === page) a.classList.add("active");
  });
  const toggle = $(".nav-toggle");
  if (toggle) toggle.addEventListener("click", () => $(".nav-links").classList.toggle("open"));
  const y = $("#year");
  if (y) y.textContent = new Date().getFullYear();
}

// ---------- roster ----------
function playerCard(p, fallbackName, rank, photo) {
  const name = p ? pick(p, "name") : fallbackName;
  const th = pick(p, "town_hall_level");
  const trophies = pick(p, "trophies");
  const legend = pick(p, "legend_trophies");
  return `
    <a class="card player-card ${rank % 2 ? "accent-blue" : "accent-red"}" href="player.html?p=${slug(fallbackName)}">
      ${photo ? `<div class="person-photo"><img src="${photo}" alt="${esc(fallbackName)}" loading="lazy"><span class="rank-chip">#${rank}</span></div>` : `<span class="rank-chip">#${rank}</span>`}
      <div class="player-top">
        ${thIcon(th)}
        <div>
          <div class="player-name display">${esc(name)}</div>
          <div class="player-sub">${esc(pick(p, "tag") || "")}</div>
        </div>
      </div>
      <div class="player-trophy">
        <span class="num">🏆 ${fmt(trophies)}</span>
        <span class="lbl">trophies</span>
      </div>
      <div class="kv">
        <div><div class="k">Best</div><div class="v">${fmt(pick(p, "best_trophies"))}</div></div>
        <div><div class="k">War Stars</div><div class="v">${fmt(pick(p, "war_stars"))}</div></div>
        <div><div class="k">Attack Wins</div><div class="v">${fmt(pick(p, "attack_wins"))}</div></div>
        <div><div class="k">Legend Best</div><div class="v">${fmt(pick(p, "legend_best_trophies"))}</div></div>
        <div><div class="k">Defense Wins</div><div class="v">${fmt(pick(p, "defense_wins"))}</div></div>
        <div><div class="k">Donations</div><div class="v">${fmt(pick(p, "donations"))}</div></div>
      </div>
      <div class="card-link">View profile →</div>
    </a>`;
}

async function loadRoster(target, { compact = false } = {}) {
  const el = $(target);
  if (!el) return;
  el.innerHTML = `<div class="loading">Loading roster…</div>`;
  const results = await Promise.allSettled(PROS.map((p) => getJSON(`/players/${clean(p.tag)}`)));
  const players = PROS.map((p, i) => ({
    meta: p,
    data: results[i].status === "fulfilled" ? results[i].value : null,
  }));
  players.sort((a, b) => (pick(b.data, "trophies") || 0) - (pick(a.data, "trophies") || 0));

  if (players.every((p) => !p.data)) {
    el.innerHTML = `<div class="error-box">Couldn't load stats right now. Please try again in a bit.</div>`;
    return;
  }
  el.innerHTML = players.map((p, i) => playerCard(p.data, p.meta.name, i + 1, p.meta.photo)).join("");

  const latest = players.map((p) => pick(p.data, "timestamp")).filter(Boolean).sort().pop();
  const up = $(target + "-updated");
  if (up && latest) up.textContent = `Stats updated ${timeAgo(latest)} · refreshes every 2 hours`;

  // home page summary numbers
  const sumEl = $("#pro-avg");
  if (sumEl) {
    const t = players.map((p) => pick(p.data, "trophies")).filter((x) => x);
    if (t.length) sumEl.textContent = fmt(Math.round(t.reduce((a, b) => a + b, 0) / t.length));
  }
}

function loadBuilders() {
  const el = $("#builders");
  if (!el) return;
  el.innerHTML = BUILDERS.map((b, i) => `
    <article class="card builder-card ${i % 2 ? "accent-blue" : "accent-red"}">
      <div class="person-photo"><img src="${b.photo}" alt="${esc(b.name)}" loading="lazy"></div>
      <div class="player-name display">${esc(b.name)}</div>
      <div class="player-sub">Base Builder</div>
    </article>`).join("");
}

// ---------- clans ----------
function warBlock(war) {
  if (!war || !war.state || war.state === "notInWar") {
    return `<div class="card war-card"><span class="war-state warEnded">Not in war</span><p class="muted" style="margin-top:10px">No active war right now. Check back soon!</p></div>`;
  }
  const attacksUsed = war.clan_attacks_used ?? (war.attacks || []).filter((a) => a.is_clan_attack).length;
  return `
    <div class="card war-card accent-red">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
        <span class="war-state ${esc(war.state)}">${WAR_LABEL[war.state] || esc(war.state)}</span>
        <span class="muted" style="font-size:.85rem">${war.team_size ? `${war.team_size} v ${war.team_size}` : ""}${war.team_size ? ` · ${fmt(attacksUsed)} attacks used` : ""}</span>
      </div>
      <div class="war-vs">
        <div class="war-side us">
          <div class="name">${esc(war.clan_name)}</div>
          <div class="stars">⭐ ${fmt(war.clan_stars)}</div>
          <div class="pct">${war.clan_destruction != null ? Number(war.clan_destruction).toFixed(1) + "%" : ""}</div>
        </div>
        <div class="vs">VS</div>
        <div class="war-side them">
          <div class="name">${esc(war.opponent_name)}</div>
          <div class="stars">⭐ ${fmt(war.opponent_stars)}</div>
          <div class="pct">${war.opponent_destruction != null ? Number(war.opponent_destruction).toFixed(1) + "%" : ""}</div>
        </div>
      </div>
    </div>`;
}

const SORTS = {
  trophies: (m) => m.trophies || 0,
  town_hall_level: (m) => m.town_hall_level || 0,
  donations: (m) => m.donations || 0,
  donations_received: (m) => m.donations_received || 0,
  exp_level: (m) => m.exp_level || 0,
};

function membersTable(members, sortKey) {
  const sorted = [...members].sort((a, b) => SORTS[sortKey](b) - SORTS[sortKey](a));
  const head = (key, label, extra = "") => `<th data-sort="${key}" class="${key === sortKey ? "sorted" : ""} ${extra}">${label}${key === sortKey ? " ▼" : ""}</th>`;
  return `
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>#</th><th>Player</th>
          ${head("town_hall_level", "TH")}
          ${head("trophies", "Trophies")}
          ${head("donations", "Donated")}
          ${head("donations_received", "Received", "hide-sm")}
          ${head("exp_level", "Level", "hide-sm")}
        </tr></thead>
        <tbody>
          ${sorted.map((m, i) => `
            <tr>
              <td class="rank">${i + 1}</td>
              <td><div>${esc(m.name)}</div><div class="role ${esc(m.role)}">${ROLE[m.role] || ""}</div></td>
              <td class="num th-cell">${thIcon(m.town_hall_level, "mini")}</td>
              <td class="num">🏆 ${fmt(m.trophies)}</td>
              <td class="num">${fmt(m.donations)}</td>
              <td class="num hide-sm">${fmt(m.donations_received)}</td>
              <td class="num hide-sm">${fmt(m.exp_level)}</td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}

async function renderClan(container, clanMeta) {
  container.innerHTML = `<div class="loading">Loading ${clanMeta.short}…</div>`;
  const [clanR, warR, lbR] = await Promise.allSettled([
    getJSON(`/clans/${clean(clanMeta.tag)}`),
    getJSON(`/clans/${clean(clanMeta.tag)}/wars/latest`),
    getJSON(`/clans/${clean(clanMeta.tag)}/leaderboard?sort_by=trophies`),
  ]);
  if (clanR.status !== "fulfilled") {
    container.innerHTML = `<div class="error-box">Couldn't load clan data right now. Please try again in a bit.</div>`;
    return;
  }
  const clan = clanR.value;
  const s = clan.latest_stats || {};
  const war = warR.status === "fulfilled" ? warR.value : null;
  const members = lbR.status === "fulfilled" ? lbR.value.members || [] : [];
  let sortKey = "trophies";

  const draw = () => {
    container.innerHTML = `
      <div class="card">
        <div class="clan-head">
          ${s.badge_url ? `<img src="${esc(s.badge_url)}" alt="${esc(clan.name)} badge">` : ""}
          <div>
            <h2 class="display">${esc(clan.name)}</h2>
            <div class="tag">${esc(clan.tag)}${s.location_name ? " · " + esc(s.location_name) : ""}${s.war_league_name ? " · " + esc(s.war_league_name) : ""}</div>
          </div>
          <a class="btn btn-ghost" style="margin-left:auto" href="${clanInviteLink(clan.tag)}" target="_blank" rel="noopener">Open in game ↗</a>
        </div>
        <div class="clan-stats">
          <div class="stat-box"><div class="num">${fmt(s.clan_level)}</div><div class="lbl">Clan Level</div></div>
          <div class="stat-box"><div class="num">${fmt(s.member_count)}/50</div><div class="lbl">Members</div></div>
          <div class="stat-box"><div class="num">${fmt(s.war_wins)}</div><div class="lbl">War Wins</div></div>
          <div class="stat-box"><div class="num">${fmt(s.war_win_streak)}</div><div class="lbl">Win Streak</div></div>
        </div>
      </div>
      <h3 class="display" style="font-size:1.5rem;margin-top:32px">Current War</h3>
      ${warBlock(war)}
      <h3 class="display" style="font-size:1.5rem;margin-top:32px">Member Leaderboard</h3>
      <p class="muted" style="font-size:.85rem">Tap a column to sort.</p>
      ${members.length ? membersTable(members, sortKey) : `<div class="error-box">Leaderboard unavailable right now.</div>`}
      <div class="updated">Updated ${timeAgo(s.timestamp || clan.last_updated)} · refreshes every 2 hours</div>`;
    container.querySelectorAll("th[data-sort]").forEach((th) =>
      th.addEventListener("click", () => { sortKey = th.dataset.sort; draw(); })
    );
  };
  draw();
}

function initClansPage() {
  const tabs = $("#clan-tabs");
  const view = $("#clan-view");
  if (!tabs || !view) return;
  const params = new URLSearchParams(location.search);
  let active = Math.max(0, CLANS.findIndex((c) => c.short.toLowerCase() === (params.get("clan") || "").toLowerCase()));
  tabs.innerHTML = CLANS.map((c, i) => `<button class="tab ${i === active ? "active" : ""}" data-i="${i}">${c.short}</button>`).join("");
  tabs.querySelectorAll(".tab").forEach((b) =>
    b.addEventListener("click", () => {
      active = Number(b.dataset.i);
      tabs.querySelectorAll(".tab").forEach((x) => x.classList.toggle("active", x === b));
      history.replaceState(null, "", `?clan=${CLANS[active].short.toLowerCase()}`);
      renderClan(view, CLANS[active]);
    })
  );
  renderClan(view, CLANS[active]);
}

// ---------- home: live clan war mini cards ----------
async function loadHomeWars() {
  const el = $("#home-wars");
  if (!el) return;
  const results = await Promise.allSettled(
    CLANS.flatMap((c) => [getJSON(`/clans/${clean(c.tag)}`), getJSON(`/clans/${clean(c.tag)}/wars/latest`)])
  );
  el.innerHTML = CLANS.map((c, i) => {
    const clan = results[i * 2].status === "fulfilled" ? results[i * 2].value : null;
    const war = results[i * 2 + 1].status === "fulfilled" ? results[i * 2 + 1].value : null;
    const s = (clan && clan.latest_stats) || {};
    const inWar = war && war.state && war.state !== "notInWar";
    return `
      <a class="card ${i ? "accent-blue" : "accent-red"}" href="clans.html?clan=${c.short.toLowerCase()}" style="display:block">
        <div class="clan-head">
          ${s.badge_url ? `<img src="${esc(s.badge_url)}" alt="" style="width:60px;height:60px">` : ""}
          <div>
            <div class="display" style="font-size:1.5rem;line-height:1">${esc(clan ? clan.name : "CB7 " + c.short)}</div>
            <div class="tag">${esc(c.tag)} · ${fmt(s.member_count)} members</div>
          </div>
        </div>
        <div style="margin-top:16px">
          ${inWar
            ? `<span class="war-state ${esc(war.state)}">${WAR_LABEL[war.state]}</span>
               <div style="margin-top:10px;font-family:Rajdhani,sans-serif;font-weight:700;font-size:1.35rem">
                 ⭐ ${fmt(war.clan_stars)} <span class="muted">vs</span> ${fmt(war.opponent_stars)}
                 <span class="muted" style="font-size:1rem"> · ${esc(war.opponent_name)}</span>
               </div>`
            : `<span class="war-state warEnded">Not in war</span>`}
        </div>
      </a>`;
  }).join("");
}

// ---------- join page ----------
async function loadJoin() {
  const el = $("#join-clans");
  if (!el) return;
  const results = await Promise.allSettled(CLANS.map((c) => getJSON(`/clans/${clean(c.tag)}`)));
  el.innerHTML = CLANS.map((c, i) => {
    const clan = results[i].status === "fulfilled" ? results[i].value : null;
    const s = (clan && clan.latest_stats) || {};
    const spots = s.member_count != null ? 50 - s.member_count : null;
    return `
      <div class="card join-card ${i ? "accent-blue" : "accent-red"}">
        <div class="clan-mini">
          ${s.badge_url ? `<img src="${esc(s.badge_url)}" alt="">` : ""}
          <div>
            <div class="display" style="font-size:1.6rem;line-height:1">${esc(clan ? clan.name : "CB7 " + c.short)}</div>
            <div class="muted" style="font-size:.85rem">${esc(c.tag)}</div>
          </div>
        </div>
        <ul>
          <li><span>Members</span><span>${fmt(s.member_count)}/50</span></li>
          <li><span>Open spots</span><span>${spots != null ? (spots > 0 ? spots : "Full") : "–"}</span></li>
          <li><span>Clan level</span><span>${fmt(s.clan_level)}</span></li>
          <li><span>War league</span><span>${esc(s.war_league_name || "–")}</span></li>
          <li><span>Location</span><span>${esc(s.location_name || "–")}</span></li>
        </ul>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <a class="btn btn-primary" href="${clanInviteLink(c.tag)}" target="_blank" rel="noopener">Open in game</a>
          <a class="btn btn-ghost" href="clans.html?clan=${c.short.toLowerCase()}">View stats</a>
        </div>
      </div>`;
  }).join("");
}

// ---------- player profile ----------
function trophyChart(history) {
  const pts = (history || [])
    .filter((h) => h && h.timestamp && h.trophies != null)
    .map((h) => ({ t: new Date(h.timestamp).getTime(), v: Number(h.trophies) }))
    .sort((a, b) => a.t - b.t);
  if (pts.length < 2) {
    return `<div class="chart-empty">The trophy graph builds up over time. Snapshots are taken every 2 hours, so check back soon.</div>`;
  }
  const narrow = window.innerWidth < 600;
  const W = narrow ? 420 : 800, H = narrow ? 240 : 260, P = { l: narrow ? 46 : 52, r: 12, t: 16, b: 34 };
  const minV = Math.min(...pts.map((p) => p.v)), maxV = Math.max(...pts.map((p) => p.v));
  const pad = Math.max(20, Math.round((maxV - minV) * 0.15));
  const lo = minV - pad, hi = maxV + pad;
  const t0 = pts[0].t, t1 = pts[pts.length - 1].t;
  const x = (t) => P.l + ((t - t0) / (t1 - t0 || 1)) * (W - P.l - P.r);
  const y = (v) => P.t + (1 - (v - lo) / (hi - lo || 1)) * (H - P.t - P.b);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(t1).toFixed(1)},${H - P.b} L${x(t0).toFixed(1)},${H - P.b} Z`;
  const ticks = [0, 0.5, 1].map((f) => Math.round(lo + (hi - lo) * f));
  const dateLbl = (t) => new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const last = pts[pts.length - 1];
  return `
    <svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Trophy history chart">
      <defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ff1f1f" stop-opacity=".35"/><stop offset="1" stop-color="#1a6bff" stop-opacity="0"/>
      </linearGradient></defs>
      ${ticks.map((v) => `<line x1="${P.l}" x2="${W - P.r}" y1="${y(v)}" y2="${y(v)}" class="grid-line"/><text x="${P.l - 8}" y="${y(v) + 4}" text-anchor="end" class="axis">${fmt(v)}</text>`).join("")}
      <path d="${area}" fill="url(#tg)"/>
      <path d="${line}" fill="none" stroke="#ff4040" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
      <circle cx="${x(last.t)}" cy="${y(last.v)}" r="5" fill="#ffc53d"/>
      <text x="${P.l}" y="${H - 10}" class="axis">${dateLbl(t0)}</text>
      <text x="${W - P.r}" y="${H - 10}" text-anchor="end" class="axis">${dateLbl(t1)}</text>
    </svg>`;
}

function heroBars(progress) {
  const heroes = (progress && progress.heroes) || [];
  if (!heroes.length) return `<p class="muted">Hero data isn't available yet.</p>`;
  return `<div class="bars">${heroes.map((h) => {
    const lvl = Number(h.level) || 0, max = Number(h.maxLevel) || lvl || 1;
    const pct = Math.min(100, Math.round((lvl / max) * 100));
    return `<div class="bar-row">
      <div class="bar-label"><span>${esc(h.name)}</span><span class="${lvl >= max ? "maxed" : "muted"}">${lvl >= max ? "MAX " : ""}${lvl} / ${max}</span></div>
      <div class="bar"><div style="width:${pct}%"></div></div>
    </div>`;
  }).join("")}</div>`;
}

async function loadProfile() {
  const el = $("#profile");
  if (!el) return;
  const pro = proBySlug(new URLSearchParams(location.search).get("p"));
  if (!pro) {
    el.innerHTML = `<div class="error-box">Player not found. <a href="roster.html" style="text-decoration:underline">Back to the roster</a></div>`;
    return;
  }
  document.title = `${pro.name} | CB7 Esports Fan Site`;
  const t = clean(pro.tag);
  const [pR, hR, wR, gR] = await Promise.allSettled([
    getJSON(`/players/${t}`),
    getJSON(`/players/${t}/history?limit=500`),
    getJSON(`/players/${t}/war-stats`),
    getJSON(`/players/${t}/progress`),
  ]);
  const p = pR.status === "fulfilled" ? pR.value : null;
  if (!p) {
    el.innerHTML = `<div class="error-box">Couldn't load ${esc(pro.name)}'s stats right now. Please try again in a bit.</div>`;
    return;
  }
  const history = hR.status === "fulfilled" ? hR.value.history || [] : [];
  const war = wR.status === "fulfilled" ? wR.value : null;
  const prog = gR.status === "fulfilled" ? gR.value : null;
  const sum = (prog && prog.summary) || {};
  const pctBox = (lbl, v) => `<div class="stat-box"><div class="num">${v != null ? Math.round(v) + "%" : "–"}</div><div class="lbl">${lbl}</div></div>`;
  const hasWar = war && Number(war.wars_participated) > 0;

  el.innerHTML = `
    <div class="profile-hero card">
      ${pro.photo ? `<div class="profile-photo"><img src="${pro.photo}" alt="${esc(pro.name)}"></div>` : ""}
      <div class="profile-info">
        <div class="eyebrow-sm">CB7 Esports · Pro Player</div>
        <h1 class="display profile-name">${esc(pro.name)}</h1>
        <div class="muted">${esc(pick(p, "name"))} · ${esc(pro.tag)}</div>
        <div class="profile-th">${thIcon(pick(p, "town_hall_level"))}
          <div class="player-trophy" style="flex:1"><span class="num">🏆 ${fmt(pick(p, "trophies"))}</span><span class="lbl">trophies</span></div>
        </div>
        <div class="kv">
          <div><div class="k">Best</div><div class="v">${fmt(pick(p, "best_trophies"))}</div></div>
          <div><div class="k">War Stars</div><div class="v">${fmt(pick(p, "war_stars"))}</div></div>
          <div><div class="k">XP Level</div><div class="v">${fmt(pick(p, "exp_level"))}</div></div>
          <div><div class="k">Attack Wins</div><div class="v">${fmt(pick(p, "attack_wins"))}</div></div>
          <div><div class="k">Defense Wins</div><div class="v">${fmt(pick(p, "defense_wins"))}</div></div>
          <div><div class="k">Legend Best</div><div class="v">${fmt(pick(p, "legend_best_trophies"))}</div></div>
        </div>
        <a class="btn btn-ghost" style="margin-top:16px" href="https://link.clashofclans.com/en?action=OpenPlayerProfile&tag=${t}" target="_blank" rel="noopener">Open in game ↗</a>
      </div>
    </div>

    <h3 class="display sub-h">Trophy History</h3>
    <div class="card">${trophyChart(history)}</div>

    <h3 class="display sub-h">Base Progress</h3>
    <div class="clan-stats" style="margin-top:0">
      ${pctBox("Heroes", sum.heroes_pct)}${pctBox("Troops", sum.troops_pct)}${pctBox("Spells", sum.spells_pct)}${pctBox("Equipment", sum.equipment_pct)}
    </div>
    <div class="card" style="margin-top:14px">${heroBars(prog)}</div>

    <h3 class="display sub-h">War Stats</h3>
    ${hasWar ? `
      <div class="clan-stats" style="margin-top:0">
        <div class="stat-box"><div class="num">${fmt(war.wars_participated)}</div><div class="lbl">Wars tracked</div></div>
        <div class="stat-box"><div class="num">${fmt(war.total_attacks)}</div><div class="lbl">Attacks</div></div>
        <div class="stat-box"><div class="num">${Number(war.avg_stars || 0).toFixed(2)}</div><div class="lbl">Avg stars</div></div>
        <div class="stat-box"><div class="num">${fmt(war.three_star_count)}</div><div class="lbl">Three-stars</div></div>
      </div>
      <p class="muted" style="font-size:.85rem;margin-top:10px">Average destruction ${Number(war.avg_destruction || 0).toFixed(1)}%. Based on wars recorded by StatHut.</p>`
    : `<div class="card"><p class="muted">No tracked wars yet. Lifetime war stars: <strong style="color:var(--text)">${fmt(pick(p, "war_stars"))}</strong>. Detailed war stats appear here once this player's wars are recorded by StatHut.</p></div>`}

    <div class="updated">Updated ${timeAgo(pick(p, "timestamp"))} · refreshes every 2 hours</div>`;
}

// ---------- combined leaderboards ----------
const LB_CATS = [
  { key: "trophies", label: "Trophies", icon: "🏆" },
  { key: "donations", label: "Donations", icon: "🎁" },
  { key: "war_stars", label: "War Stars", icon: "⭐" },
  { key: "town_hall_level", label: "Town Hall", icon: "🏰" },
];

async function loadLeaderboards() {
  const tabs = $("#lb-tabs"), table = $("#lb-table"), podium = $("#lb-podium");
  if (!tabs) return;
  table.innerHTML = `<div class="loading">Loading leaderboards…</div>`;
  const results = await Promise.allSettled(CLANS.map((c) => getJSON(`/clans/${clean(c.tag)}/leaderboard?sort_by=trophies`)));
  let all = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") (r.value.members || []).forEach((m) => all.push({ ...m, clan: CLANS[i].short }));
  });
  if (!all.length) { table.innerHTML = `<div class="error-box">Couldn't load leaderboards right now. Please try again in a bit.</div>`; return; }
  const cats = LB_CATS.filter((c) => all.some((m) => m[c.key] != null));
  let cat = cats[0];

  const draw = () => {
    tabs.innerHTML = cats.map((c) => `<button class="tab ${c === cat ? "active" : ""}" data-k="${c.key}">${c.label}</button>`).join("");
    tabs.querySelectorAll(".tab").forEach((b) => b.addEventListener("click", () => { cat = cats.find((c) => c.key === b.dataset.k); draw(); }));
    const sorted = [...all].sort((a, b) => (b[cat.key] || 0) - (a[cat.key] || 0) || (b.trophies || 0) - (a.trophies || 0));
    const val = (m) => cat.key === "town_hall_level" ? thIcon(m.town_hall_level, "mini") : `${cat.icon} ${fmt(m[cat.key])}`;
    const medals = ["🥇", "🥈", "🥉"];
    podium.innerHTML = sorted.slice(0, 3).map((m, i) => `
      <div class="card podium-card ${i === 0 ? "first" : ""}">
        <div class="medal">${medals[i]}</div>
        <div class="display podium-name">${esc(m.name)}</div>
        <div class="muted" style="font-size:.8rem">CB7 ${esc(m.clan)}</div>
        <div class="podium-val">${val(m)}</div>
      </div>`).join("");
    table.innerHTML = `
      <div class="table-wrap"><table>
        <thead><tr><th>#</th><th>Player</th><th>Clan</th><th class="sorted">${cat.label} ▼</th></tr></thead>
        <tbody>${sorted.map((m, i) => `
          <tr>
            <td class="rank">${i + 1}</td>
            <td><div>${esc(m.name)}</div><div class="role ${esc(m.role)}">${ROLE[m.role] || ""}</div></td>
            <td><span class="clan-chip ${m.clan.toLowerCase()}">${esc(m.clan)}</span></td>
            <td class="num">${val(m)}</td>
          </tr>`).join("")}</tbody>
      </table></div>`;
  };
  draw();
  $("#lb-updated").textContent = `${all.length} members across ${CLANS.length} clans · refreshes every 2 hours`;
}

// ---------- boot ----------
document.addEventListener("DOMContentLoaded", () => {
  initNav();
  const page = document.body.dataset.page;
  if (page === "home") { loadHomeWars(); loadRoster("#home-roster"); }
  if (page === "roster") { loadRoster("#roster"); loadBuilders(); }
  if (page === "clans") initClansPage();
  if (page === "join") loadJoin();
  if (page === "player") loadProfile();
  if (page === "leaderboards") loadLeaderboards();
});
