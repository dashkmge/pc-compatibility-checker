const PARTS = [
  { key: "cpu", plural: "CPUs", label: "CPU", spec: p => `${p.socket} · up to ${p.power} W` },
  { key: "motherboard", plural: "motherboards", label: "Motherboard", spec: p => `${p.socket} · ${p.chip} · ${p.ram} · ${p.slots} slots, max ${p.maxGB} GB` },
  { key: "ram", plural: "RAM kits", label: "RAM", spec: p => `${p.ram} · ${p.gb} GB (${p.kit} module${p.kit > 1 ? "s" : ""}) · ${p.mhz} MT/s` },
  { key: "gpu", plural: "graphics cards", label: "GPU", spec: p => `${p.power} W · ${p.hpwr ? "12V-2x6 connector" : p.pcie8 + "× 8-pin PCIe"} · PSU ${p.rec} W+` },
  { key: "psu", plural: "power supplies", label: "PSU", spec: p => `${p.power} W · ${p.pcie8}× 8-pin PCIe${p.hpwr ? " · native 12V-2x6" : ""}` }
];
const db = {};
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function selected() {
  const s = {};
  for (const p of PARTS) s[p.key] = db[p.key].find(i => String(i.id) === $(p.key).value);
  return s;
}

function check({ cpu, motherboard: mb, ram, gpu, psu }) {
  const r = [];
  let K = [];
  const add = (l, t, sug) => r.push({ l, t, k: K, sug });

  if (cpu && mb) {
    K = ["cpu", "motherboard"];
    if (cpu.socket !== mb.socket) add("fail", `Socket mismatch: the CPU uses ${cpu.socket}, the motherboard uses ${mb.socket}.`);
    else {
      add("ok", `Socket ${cpu.socket} matches.`);
      if (mb.bios.includes(cpu.gen)) add("warn", `${mb.chip} boards often need a BIOS update for ${cpu.gen} CPUs. Check the board's CPU support list.`);
      if (mb.vrm === 1 && cpu.power > 125) add("warn", `${mb.name} is an entry-level board. Its power delivery may throttle a ${cpu.power} W CPU.`);
    }
  }

  if (ram && mb) {
    K = ["ram", "motherboard"];
    if (ram.ram !== mb.ram) add("fail", `Memory mismatch: ${ram.ram} RAM will not fit a ${mb.ram} motherboard.`);
    else {
      add("ok", `${ram.ram} memory type matches.`);
      if (ram.kit > mb.slots) add("fail", `The kit has ${ram.kit} modules, but the board has only ${mb.slots} slots.`);
      if (ram.gb > mb.maxGB) add("fail", `${ram.gb} GB exceeds the board's ${mb.maxGB} GB limit.`);
      if (ram.kit <= mb.slots && ram.gb <= mb.maxGB) add("ok", `${ram.gb} GB in ${ram.kit} module${ram.kit > 1 ? "s" : ""} fits the board.`);
      if (ram.mhz > mb.maxMHz) add("warn", `The kit is rated ${ram.mhz} MT/s, but the board supports up to ${mb.maxMHz}. It will run slower.`);
    }
  }

  if (gpu && psu) {
    K = ["gpu", "psu"];
    if (psu.power < gpu.rec) add("fail", `${gpu.name} needs a ${gpu.rec} W power supply or better. The selected one is ${psu.power} W.`);
    if (gpu.hpwr) {
      if (psu.hpwr) add("ok", "The PSU has a native 12V-2x6 cable for this GPU.");
      else if (psu.pcie8 >= gpu.pcie8) add("warn", `The GPU needs a 12V-2x6 connector. Use the adapter that takes ${gpu.pcie8}× 8-pin PCIe cables.`);
      else add("fail", `The GPU needs ${gpu.pcie8}× 8-pin PCIe (through an adapter), but the PSU has only ${psu.pcie8}.`);
    } else if (gpu.pcie8 > psu.pcie8) add("fail", `The GPU needs ${gpu.pcie8}× 8-pin PCIe power, but the PSU has only ${psu.pcie8}.`);
    else add("ok", "The PSU has enough PCIe power connectors.");
  }

  let load = null;
  if (cpu && gpu && psu) {
    K = ["psu"];
    load = cpu.power + gpu.power + 100;
    if (psu.power < load) add("fail", `Estimated peak load is ${load} W, but the PSU provides ${psu.power} W.`);
    else if (psu.power < load * 1.1) add("warn", `The ${psu.power} W PSU is close to the ${load} W estimated peak load, so there is little headroom.`, true);
    else add("ok", `The PSU has good headroom for the ${load} W estimated load.`);
  }
  return { r, load };
}

const GROUP = { cpu: i => i.socket, motherboard: i => i.socket, ram: i => i.ram, gpu: i => i.name.split(" ")[0], psu: () => "" };
const SORT = { gpu: (a, b) => a.power - b.power, psu: (a, b) => a.power - b.power };
const byName = (a, b) => a.name.localeCompare(b.name, "en", { numeric: true });

function options(key) {
  const groups = {};
  [...db[key]].sort(SORT[key] || byName).forEach(i => (groups[GROUP[key](i)] ||= []).push(i));
  return Object.entries(groups).map(([g, items]) => {
    const o = items.map(i => `<option value="${i.id}">${esc(i.name)}</option>`).join("");
    return g ? `<optgroup label="${esc(g)}">${o}</optgroup>` : o;
  }).join("");
}

function meter({ cpu, gpu, psu }, load) {
  const cap = Math.max(psu.power, load), w = v => (v / cap * 100).toFixed(1);
  return `<div class="meter${load > psu.power ? " over" : ""}"><div class="meter-head"><span>Estimated peak load</span><b>${load} W of ${psu.power} W</b></div>
  <div class="bar"><i class="seg cpu" style="width:${w(cpu.power)}%"></i><i class="seg gpu" style="width:${w(gpu.power)}%"></i><i class="seg rest" style="width:${w(100)}%"></i><u style="left:${w(psu.power)}%"></u></div>
  <div class="legend"><span class="cpu">CPU ${cpu.power} W</span><span class="gpu">GPU ${gpu.power} W</span><span class="rest">Rest of system 100 W</span></div></div>`;
}

function render() {
  const s = selected();
  for (const p of PARTS) {
    $("spec-" + p.key).innerHTML = s[p.key] ? p.spec(s[p.key]).split(" · ").map(t => `<span>${esc(t)}</span>`).join("") : "";
    $("slot-" + p.key).classList.toggle("filled", !!s[p.key]);
  }
  const count = PARTS.filter(p => s[p.key]).length;
  const { r, load } = check(s);
  const fails = r.filter(x => x.l === "fail").length, warns = r.filter(x => x.l === "warn").length;
  let cls, title, sub;
  if (fails) [cls, title, sub] = ["bad", "Not compatible", `${fails} problem${fails > 1 ? "s" : ""} to fix. Parts that work are listed below.`];
  else if (count < 5) [cls, title, sub] = ["idle", count ? "Keep going" : "Start your build", `${count} of 5 parts selected.`];
  else if (warns) [cls, title, sub] = ["warn", "Compatible, with notes", `${warns} thing${warns > 1 ? "s" : ""} to check before you buy.`];
  else [cls, title, sub] = ["ok", "Fully compatible", "These parts will work together."];
  const icon = { ok: "✓", warn: "!", fail: "✕" };
  let html = `<div class="verdict ${cls}"><h2>${title}</h2><p>${sub}</p></div>`;
  if (load) html += meter(s, load);
  if (r.length) html += `<ul class="checks">${r.map(x => `<li class="${x.l}"><b>${icon[x.l]}</b><span>${esc(x.t)}</span></li>`).join("")}</ul>`;
  else html += `<p class="hint">Select two related parts, such as a CPU and a motherboard, to start checking.</p>`;
  $("result").innerHTML = html + suggestions(s, r);
}

function suggestions(s, r) {
  const bad = x => x.l === "fail" || x.sug;
  const keys = [...new Set(r.filter(bad).flatMap(x => x.k))];
  keys.sort((x, y) => (y === "psu") - (x === "psu"));
  let out = "";
  for (const key of keys) {
    const part = PARTS.find(p => p.key === key);
    const hasFail = r.some(x => x.l === "fail" && x.k.includes(key));
    const rank = c => check({ ...s, [key]: c }).r.filter(x => x.k.includes(key));
    const fits = [...db[key]].sort(SORT[key] || byName).filter(c => c !== s[key] && !rank(c).some(bad))
      .map(c => [c, rank(c).filter(x => x.l === "warn").length]).sort((a, b) => a[1] - b[1]);
    if (!fits.length && !hasFail) continue;
    out += `<div class="sug"><h3>${hasFail ? `${part.label} options that fit your other parts` : "Power supplies with more headroom"}</h3>`;
    if (!fits.length) out += `<p class="hint">None in the database. Try changing another part first.</p>`;
    else out += `<div class="chips">${fits.slice(0, 6).map(([c]) => `<button type="button" class="chip" data-k="${key}" data-id="${c.id}">${esc(c.name)}</button>`).join("")}</div>` + (fits.length > 6 ? `<p class="hint">${fits.length - 6} more fit. Use the list on the left.</p>` : "");
    out += "</div>";
  }
  return out;
}

async function init() {
  try {
    await Promise.all(PARTS.map(async p => {
      const res = await fetch(`data/${p.key}.json`);
      if (!res.ok) throw new Error(p.key);
      db[p.key] = await res.json();
    }));
  } catch (e) {
    $("result").innerHTML = '<div class="verdict bad"><h2>Could not load the parts data</h2><p>Open the site through a local server or GitHub Pages. Browsers block fetch on file:// pages.</p></div>';
    return;
  }
  $("parts").innerHTML = PARTS.map(p => `<div class="slot" id="slot-${p.key}"><label for="${p.key}">${p.label}</label><div class="sel"><select id="${p.key}"><option value="">Select ${p.label.toLowerCase()}</option>${options(p.key)}</select></div><div class="specs" id="spec-${p.key}"></div></div>`).join("");
  $("stats").innerHTML = PARTS.map(p => `<span><b>${db[p.key].length}</b> ${p.plural}</span>`).join("");
  PARTS.forEach(p => $(p.key).addEventListener("change", render));
  $("result").addEventListener("click", e => { const b = e.target.closest(".chip"); if (b) { $(b.dataset.k).value = b.dataset.id; render(); } });
  $("reset").addEventListener("click", () => { PARTS.forEach(p => ($(p.key).value = "")); render(); });
  render();
}
init();
