import React from "react";
import "./styles.css";
import logoUrl from "../../logo.png";

// ---- fixtures.js ----
// Seeded fixtures for HomeAssistant Health.
// All weights stored in kg internally; displayed per user preference.
// To swap for real backend: replace the `db` object with typed server-action calls
// that match the same shape (see README).

(function () {
  const DAY = 86400000;
  const today = new Date();
  today.setHours(7, 30, 0, 0);

  function daysAgo(n) {
    return new Date(today.getTime() - n * DAY);
  }

  // Deterministic pseudo-random for stable fixtures across reloads.
  function rng(seed) {
    let s = seed;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  // Build a weight series: starts near `start`, drifts toward `goal`,
  // with small daily noise + occasional missed days.
  function buildSeries(memberId, startKg, goalKg, days, seed, missRate = 0.18) {
    const r = rng(seed);
    const entries = [];
    const total = days;
    let weight = startKg;
    for (let i = total; i >= 0; i--) {
      // progress fraction from start to goal as we approach today
      const p = (total - i) / total;
      const target = startKg + (goalKg - startKg) * Math.pow(p, 0.85);
      // gentle reversion toward target with noise
      weight = weight * 0.55 + target * 0.45 + (r() - 0.5) * 0.6;
      if (r() < missRate && i !== 0 && i !== total) continue; // miss some days
      const d = daysAgo(i);
      entries.push({
        id: `${memberId}-${d.toISOString().slice(0, 10)}`,
        memberId,
        date: d.toISOString(),
        weightKg: Math.round(weight * 10) / 10,
        bodyFatPct: i % 7 === 0 ? Math.round((22 + (r() - 0.5) * 4) * 10) / 10 : null,
        waistCm: i % 14 === 0 ? Math.round(82 + (r() - 0.5) * 6) : null,
        note:
          i === 0
            ? "Morning, after coffee."
            : i === 3
            ? "Skipped run yesterday — feeling it."
            : i === 14
            ? "Vacation week, holding steady."
            : null,
      });
    }
    return entries.sort((a, b) => +new Date(b.date) - +new Date(a.date));
  }

  const members = [
    {
      id: "m1",
      displayName: "Iris",
      initials: "IR",
      heightCm: 168,
      age: 38,
      sex: "F",
      activityLevel: 1.55,
      startWeightKg: 74.2,
      goalWeightKg: 66.0,
      targetDate: daysAgo(-60).toISOString(),
      units: "metric",
      shareDetails: true,
      reminderTime: "07:30",
      milestoneAlerts: true,
      resetGracePeriodDays: 1,
      isMe: true,
      tone: "iris",
      profileComplete: true,
    },
    {
      id: "m2",
      displayName: "Theo",
      initials: "TH",
      heightCm: 182,
      age: 41,
      sex: "M",
      activityLevel: 1.4,
      startWeightKg: 92.5,
      goalWeightKg: 84.0,
      targetDate: daysAgo(-90).toISOString(),
      units: "metric",
      shareDetails: false,
      reminderTime: "06:45",
      milestoneAlerts: true,
      resetGracePeriodDays: 1,
      isMe: false,
      tone: "theo",
      profileComplete: true,
    },
    {
      id: "m3",
      displayName: "Margot",
      initials: "MA",
      heightCm: 162,
      age: 67,
      sex: "F",
      activityLevel: 1.3,
      startWeightKg: 68.0,
      goalWeightKg: 65.0,
      targetDate: daysAgo(-120).toISOString(),
      units: "metric",
      shareDetails: true,
      reminderTime: "08:00",
      milestoneAlerts: false,
      resetGracePeriodDays: 2,
      isMe: false,
      tone: "margot",
      profileComplete: true,
    },
    {
      id: "m4",
      displayName: "Sam",
      initials: "SA",
      heightCm: 175,
      age: 16,
      sex: "M",
      activityLevel: 1.7,
      startWeightKg: 64.0,
      goalWeightKg: 70.0, // gaining
      targetDate: daysAgo(-180).toISOString(),
      units: "metric",
      shareDetails: false,
      reminderTime: "07:00",
      milestoneAlerts: true,
      resetGracePeriodDays: 1,
      isMe: false,
      tone: "sam",
      profileComplete: true,
    },
  ];

  const entries = [
    ...buildSeries("m1", 74.2, 67.4, 92, 17, 0.14),
    ...buildSeries("m2", 92.5, 87.1, 92, 91, 0.32), // theo: more gaps, dimmed streak
    ...buildSeries("m3", 68.0, 65.4, 92, 213, 0.10),
    ...buildSeries("m4", 64.0, 67.8, 92, 404, 0.22),
  ];

  // Force Theo's last entry to be 4 days ago to demonstrate dimmed/reset state
  const theo = entries.filter((e) => e.memberId === "m2");
  theo.slice(0, 4).forEach((e) => {
    const idx = entries.indexOf(e);
    if (idx >= 0) entries.splice(idx, 1);
  });

  const household = {
    id: "h1",
    name: "The Cravens",
    createdAt: daysAgo(220).toISOString(),
    locale: "en-CA",
  };

  window.__fixtures = { members, entries, household, today };
})();


// ---- tweaks-panel.jsx ----

// tweaks-panel.jsx
// Reusable Tweaks shell + form-control helpers.
//
// Owns the host protocol (listens for __activate_edit_mode / __deactivate_edit_mode,
// posts __edit_mode_available / __edit_mode_set_keys / __edit_mode_dismissed) so
// individual prototypes don't re-roll it. Ships a consistent set of controls so you
// don't hand-draw <input type="range">, segmented radios, steppers, etc.
//
// Usage (in an HTML file that loads React + Babel):
//
//   const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
//     "primaryColor": "#D97757",
//     "palette": ["#D97757", "#29261b", "#f6f4ef"],
//     "fontSize": 16,
//     "density": "regular",
//     "dark": false
//   }/*EDITMODE-END*/;
//
//   function App() {
//     const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
//     return (
//       <div style={{ fontSize: t.fontSize, color: t.primaryColor }}>
//         Hello
//         <TweaksPanel>
//           <TweakSection label="Typography" />
//           <TweakSlider label="Font size" value={t.fontSize} min={10} max={32} unit="px"
//                        onChange={(v) => setTweak('fontSize', v)} />
//           <TweakRadio  label="Density" value={t.density}
//                        options={['compact', 'regular', 'comfy']}
//                        onChange={(v) => setTweak('density', v)} />
//           <TweakSection label="Theme" />
//           <TweakColor  label="Primary" value={t.primaryColor}
//                        options={['#D97757', '#2A6FDB', '#1F8A5B', '#7A5AE0']}
//                        onChange={(v) => setTweak('primaryColor', v)} />
//           <TweakColor  label="Palette" value={t.palette}
//                        options={[['#D97757', '#29261b', '#f6f4ef'],
//                                  ['#475569', '#0f172a', '#f1f5f9']]}
//                        onChange={(v) => setTweak('palette', v)} />
//           <TweakToggle label="Dark mode" value={t.dark}
//                        onChange={(v) => setTweak('dark', v)} />
//         </TweaksPanel>
//       </div>
//     );
//   }
//
// ─────────────────────────────────────────────────────────────────────────────

const __TWEAKS_STYLE = `
  .twk-panel{position:fixed;right:16px;bottom:16px;z-index:2147483646;width:280px;
    max-height:calc(100vh - 32px);display:flex;flex-direction:column;
    transform:scale(var(--dc-inv-zoom,1));transform-origin:bottom right;
    background:rgba(250,249,247,.78);color:#29261b;
    -webkit-backdrop-filter:blur(24px) saturate(160%);backdrop-filter:blur(24px) saturate(160%);
    border:.5px solid rgba(255,255,255,.6);border-radius:14px;
    box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 12px 40px rgba(0,0,0,.18);
    font:11.5px/1.4 ui-sans-serif,system-ui,-apple-system,sans-serif;overflow:hidden}
  .twk-hd{display:flex;align-items:center;justify-content:space-between;
    padding:10px 8px 10px 14px;cursor:move;user-select:none}
  .twk-hd b{font-size:12px;font-weight:600;letter-spacing:.01em}
  .twk-x{appearance:none;border:0;background:transparent;color:rgba(41,38,27,.55);
    width:22px;height:22px;border-radius:6px;cursor:default;font-size:13px;line-height:1}
  .twk-x:hover{background:rgba(0,0,0,.06);color:#29261b}
  .twk-body{padding:2px 14px 14px;display:flex;flex-direction:column;gap:10px;
    overflow-y:auto;overflow-x:hidden;min-height:0;
    scrollbar-width:thin;scrollbar-color:rgba(0,0,0,.15) transparent}
  .twk-body::-webkit-scrollbar{width:8px}
  .twk-body::-webkit-scrollbar-track{background:transparent;margin:2px}
  .twk-body::-webkit-scrollbar-thumb{background:rgba(0,0,0,.15);border-radius:4px;
    border:2px solid transparent;background-clip:content-box}
  .twk-body::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,.25);
    border:2px solid transparent;background-clip:content-box}
  .twk-row{display:flex;flex-direction:column;gap:5px}
  .twk-row-h{flex-direction:row;align-items:center;justify-content:space-between;gap:10px}
  .twk-lbl{display:flex;justify-content:space-between;align-items:baseline;
    color:rgba(41,38,27,.72)}
  .twk-lbl>span:first-child{font-weight:500}
  .twk-val{color:rgba(41,38,27,.5);font-variant-numeric:tabular-nums}

  .twk-sect{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
    color:rgba(41,38,27,.45);padding:10px 0 0}
  .twk-sect:first-child{padding-top:0}

  .twk-field{appearance:none;width:100%;height:26px;padding:0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;
    background:rgba(255,255,255,.6);color:inherit;font:inherit;outline:none}
  .twk-field:focus{border-color:rgba(0,0,0,.25);background:rgba(255,255,255,.85)}
  select.twk-field{padding-right:22px;
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='rgba(0,0,0,.5)' d='M0 0h10L5 6z'/></svg>");
    background-repeat:no-repeat;background-position:right 8px center}

  .twk-slider{appearance:none;-webkit-appearance:none;width:100%;height:4px;margin:6px 0;
    border-radius:999px;background:rgba(0,0,0,.12);outline:none}
  .twk-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;
    width:14px;height:14px;border-radius:50%;background:#fff;
    border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}
  .twk-slider::-moz-range-thumb{width:14px;height:14px;border-radius:50%;
    background:#fff;border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}

  .twk-seg{position:relative;display:flex;padding:2px;border-radius:8px;
    background:rgba(0,0,0,.06);user-select:none}
  .twk-seg-thumb{position:absolute;top:2px;bottom:2px;border-radius:6px;
    background:rgba(255,255,255,.9);box-shadow:0 1px 2px rgba(0,0,0,.12);
    transition:left .15s cubic-bezier(.3,.7,.4,1),width .15s}
  .twk-seg.dragging .twk-seg-thumb{transition:none}
  .twk-seg button{appearance:none;position:relative;z-index:1;flex:1;border:0;
    background:transparent;color:inherit;font:inherit;font-weight:500;min-height:22px;
    border-radius:6px;cursor:default;padding:4px 6px;line-height:1.2;
    overflow-wrap:anywhere}

  .twk-toggle{position:relative;width:32px;height:18px;border:0;border-radius:999px;
    background:rgba(0,0,0,.15);transition:background .15s;cursor:default;padding:0}
  .twk-toggle[data-on="1"]{background:#34c759}
  .twk-toggle i{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;
    background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s}
  .twk-toggle[data-on="1"] i{transform:translateX(14px)}

  .twk-num{display:flex;align-items:center;height:26px;padding:0 0 0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;background:rgba(255,255,255,.6)}
  .twk-num-lbl{font-weight:500;color:rgba(41,38,27,.6);cursor:ew-resize;
    user-select:none;padding-right:8px}
  .twk-num input{flex:1;min-width:0;height:100%;border:0;background:transparent;
    font:inherit;font-variant-numeric:tabular-nums;text-align:right;padding:0 8px 0 0;
    outline:none;color:inherit;-moz-appearance:textfield}
  .twk-num input::-webkit-inner-spin-button,.twk-num input::-webkit-outer-spin-button{
    -webkit-appearance:none;margin:0}
  .twk-num-unit{padding-right:8px;color:rgba(41,38,27,.45)}

  .twk-btn{appearance:none;height:26px;padding:0 12px;border:0;border-radius:7px;
    background:rgba(0,0,0,.78);color:#fff;font:inherit;font-weight:500;cursor:default}
  .twk-btn:hover{background:rgba(0,0,0,.88)}
  .twk-btn.secondary{background:rgba(0,0,0,.06);color:inherit}
  .twk-btn.secondary:hover{background:rgba(0,0,0,.1)}

  .twk-swatch{appearance:none;-webkit-appearance:none;width:56px;height:22px;
    border:.5px solid rgba(0,0,0,.1);border-radius:6px;padding:0;cursor:default;
    background:transparent;flex-shrink:0}
  .twk-swatch::-webkit-color-swatch-wrapper{padding:0}
  .twk-swatch::-webkit-color-swatch{border:0;border-radius:5.5px}
  .twk-swatch::-moz-color-swatch{border:0;border-radius:5.5px}

  .twk-chips{display:flex;gap:6px}
  .twk-chip{position:relative;appearance:none;flex:1;min-width:0;height:46px;
    padding:0;border:0;border-radius:6px;overflow:hidden;cursor:default;
    box-shadow:0 0 0 .5px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.06);
    transition:transform .12s cubic-bezier(.3,.7,.4,1),box-shadow .12s}
  .twk-chip:hover{transform:translateY(-1px);
    box-shadow:0 0 0 .5px rgba(0,0,0,.18),0 4px 10px rgba(0,0,0,.12)}
  .twk-chip[data-on="1"]{box-shadow:0 0 0 1.5px rgba(0,0,0,.85),
    0 2px 6px rgba(0,0,0,.15)}
  .twk-chip>span{position:absolute;top:0;bottom:0;right:0;width:34%;
    display:flex;flex-direction:column;box-shadow:-1px 0 0 rgba(0,0,0,.1)}
  .twk-chip>span>i{flex:1;box-shadow:0 -1px 0 rgba(0,0,0,.1)}
  .twk-chip>span>i:first-child{box-shadow:none}
  .twk-chip svg{position:absolute;top:6px;left:6px;width:13px;height:13px;
    filter:drop-shadow(0 1px 1px rgba(0,0,0,.3))}
`;

// ── useTweaks ───────────────────────────────────────────────────────────────
// Single source of truth for tweak values. setTweak persists via the host
// (__edit_mode_set_keys → host rewrites the EDITMODE block on disk).
function useTweaks(defaults) {
  const [values, setValues] = React.useState(defaults);
  // Accepts either setTweak('key', value) or setTweak({ key: value, ... }) so a
  // useState-style call doesn't write a "[object Object]" key into the persisted
  // JSON block.
  const setTweak = React.useCallback((keyOrEdits, val) => {
    const edits = typeof keyOrEdits === 'object' && keyOrEdits !== null
      ? keyOrEdits : { [keyOrEdits]: val };
    setValues((prev) => ({ ...prev, ...edits }));
    window.parent.postMessage({ type: '__edit_mode_set_keys', edits }, '*');
    // Same-window signal so in-page listeners (deck-stage rail thumbnails)
    // can react — the parent message only reaches the host, not peers.
    window.dispatchEvent(new CustomEvent('tweakchange', { detail: edits }));
  }, []);
  return [values, setTweak];
}

// ── TweaksPanel ─────────────────────────────────────────────────────────────
// Floating shell. Registers the protocol listener BEFORE announcing
// availability — if the announce ran first, the host's activate could land
// before our handler exists and the toolbar toggle would silently no-op.
// The close button posts __edit_mode_dismissed so the host's toolbar toggle
// flips off in lockstep; the host echoes __deactivate_edit_mode back which
// is what actually hides the panel.
function TweaksPanel({ title = 'Tweaks', noDeckControls = false, children }) {
  const [open, setOpen] = React.useState(false);
  const dragRef = React.useRef(null);
  // Auto-inject a rail toggle when a <deck-stage> is on the page. The
  // toggle drives the deck's per-viewer _railVisible via window message;
  // state is mirrored from the same localStorage key the deck reads so
  // the control reflects reality across reloads. The mechanism is the
  // message — authors who want custom placement can post it directly
  // and pass noDeckControls to suppress this one.
  const hasDeckStage = React.useMemo(
    () => typeof document !== 'undefined' && !!document.querySelector('deck-stage'),
    [],
  );
  // Hide the toggle until the host has actually enabled the rail (the
  // __omelette_rail_enabled window message, posted only when the
  // omelette_deck_rail_enabled flag is on for this user). The initial read
  // covers TweaksPanel mounting after the message already arrived; the
  // listener covers the common case of mounting first.
  const [railEnabled, setRailEnabled] = React.useState(
    () => hasDeckStage && !!document.querySelector('deck-stage')?._railEnabled,
  );
  React.useEffect(() => {
    if (!hasDeckStage || railEnabled) return undefined;
    const onMsg = (e) => {
      if (e.data && e.data.type === '__omelette_rail_enabled') setRailEnabled(true);
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [hasDeckStage, railEnabled]);
  const [railVisible, setRailVisible] = React.useState(() => {
    try { return localStorage.getItem('deck-stage.railVisible') !== '0'; } catch (e) { return true; }
  });
  const toggleRail = (on) => {
    setRailVisible(on);
    window.postMessage({ type: '__deck_rail_visible', on }, '*');
  };
  const offsetRef = React.useRef({ x: 16, y: 16 });
  const PAD = 16;

  const clampToViewport = React.useCallback(() => {
    const panel = dragRef.current;
    if (!panel) return;
    const w = panel.offsetWidth, h = panel.offsetHeight;
    const maxRight = Math.max(PAD, window.innerWidth - w - PAD);
    const maxBottom = Math.max(PAD, window.innerHeight - h - PAD);
    offsetRef.current = {
      x: Math.min(maxRight, Math.max(PAD, offsetRef.current.x)),
      y: Math.min(maxBottom, Math.max(PAD, offsetRef.current.y)),
    };
    panel.style.right = offsetRef.current.x + 'px';
    panel.style.bottom = offsetRef.current.y + 'px';
  }, []);

  React.useEffect(() => {
    if (!open) return;
    clampToViewport();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', clampToViewport);
      return () => window.removeEventListener('resize', clampToViewport);
    }
    const ro = new ResizeObserver(clampToViewport);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, [open, clampToViewport]);

  React.useEffect(() => {
    const onMsg = (e) => {
      const t = e?.data?.type;
      if (t === '__activate_edit_mode') setOpen(true);
      else if (t === '__deactivate_edit_mode') setOpen(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const dismiss = () => {
    setOpen(false);
    window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*');
  };

  const onDragStart = (e) => {
    const panel = dragRef.current;
    if (!panel) return;
    const r = panel.getBoundingClientRect();
    const sx = e.clientX, sy = e.clientY;
    const startRight = window.innerWidth - r.right;
    const startBottom = window.innerHeight - r.bottom;
    const move = (ev) => {
      offsetRef.current = {
        x: startRight - (ev.clientX - sx),
        y: startBottom - (ev.clientY - sy),
      };
      clampToViewport();
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  if (!open) return null;
  return (
    <>
      <style>{__TWEAKS_STYLE}</style>
      <div ref={dragRef} className="twk-panel" data-noncommentable=""
           style={{ right: offsetRef.current.x, bottom: offsetRef.current.y }}>
        <div className="twk-hd" onMouseDown={onDragStart}>
          <b>{title}</b>
          <button className="twk-x" aria-label="Close tweaks"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={dismiss}>✕</button>
        </div>
        <div className="twk-body">
          {children}
          {hasDeckStage && railEnabled && !noDeckControls && (
            <TweakSection label="Deck">
              <TweakToggle label="Thumbnail rail" value={railVisible} onChange={toggleRail} />
            </TweakSection>
          )}
        </div>
      </div>
    </>
  );
}

// ── Layout helpers ──────────────────────────────────────────────────────────

function TweakSection({ label, children }) {
  return (
    <>
      <div className="twk-sect">{label}</div>
      {children}
    </>
  );
}

function TweakRow({ label, value, children, inline = false }) {
  return (
    <div className={inline ? 'twk-row twk-row-h' : 'twk-row'}>
      <div className="twk-lbl">
        <span>{label}</span>
        {value != null && <span className="twk-val">{value}</span>}
      </div>
      {children}
    </div>
  );
}

// ── Controls ────────────────────────────────────────────────────────────────

function TweakSlider({ label, value, min = 0, max = 100, step = 1, unit = '', onChange }) {
  return (
    <TweakRow label={label} value={`${value}${unit}`}>
      <input type="range" className="twk-slider" min={min} max={max} step={step}
             value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </TweakRow>
  );
}

function TweakToggle({ label, value, onChange }) {
  return (
    <div className="twk-row twk-row-h">
      <div className="twk-lbl"><span>{label}</span></div>
      <button type="button" className="twk-toggle" data-on={value ? '1' : '0'}
              role="switch" aria-checked={!!value}
              onClick={() => onChange(!value)}><i /></button>
    </div>
  );
}

function TweakRadio({ label, value, options, onChange }) {
  const trackRef = React.useRef(null);
  const [dragging, setDragging] = React.useState(false);
  // The active value is read by pointer-move handlers attached for the lifetime
  // of a drag — ref it so a stale closure doesn't fire onChange for every move.
  const valueRef = React.useRef(value);
  valueRef.current = value;

  // Segments wrap mid-word once per-segment width runs out. The track is
  // ~248px (280 panel − 28 body pad − 4 seg pad), each button loses 12px
  // to its own padding, and 11.5px system-ui averages ~6.3px/char — so 2
  // options fit ~16 chars each, 3 fit ~10. Past that (or >3 options), fall
  // back to a dropdown rather than wrap.
  const labelLen = (o) => String(typeof o === 'object' ? o.label : o).length;
  const maxLen = options.reduce((m, o) => Math.max(m, labelLen(o)), 0);
  const fitsAsSegments = maxLen <= ({ 2: 16, 3: 10 }[options.length] ?? 0);
  if (!fitsAsSegments) {
    // <select> emits strings — map back to the original option value so the
    // fallback stays type-preserving (numbers, booleans) like the segment path.
    const resolve = (s) => {
      const m = options.find((o) => String(typeof o === 'object' ? o.value : o) === s);
      return m === undefined ? s : typeof m === 'object' ? m.value : m;
    };
    return <TweakSelect label={label} value={value} options={options}
                        onChange={(s) => onChange(resolve(s))} />;
  }
  const opts = options.map((o) => (typeof o === 'object' ? o : { value: o, label: o }));
  const idx = Math.max(0, opts.findIndex((o) => o.value === value));
  const n = opts.length;

  const segAt = (clientX) => {
    const r = trackRef.current.getBoundingClientRect();
    const inner = r.width - 4;
    const i = Math.floor(((clientX - r.left - 2) / inner) * n);
    return opts[Math.max(0, Math.min(n - 1, i))].value;
  };

  const onPointerDown = (e) => {
    setDragging(true);
    const v0 = segAt(e.clientX);
    if (v0 !== valueRef.current) onChange(v0);
    const move = (ev) => {
      if (!trackRef.current) return;
      const v = segAt(ev.clientX);
      if (v !== valueRef.current) onChange(v);
    };
    const up = () => {
      setDragging(false);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <TweakRow label={label}>
      <div ref={trackRef} role="radiogroup" onPointerDown={onPointerDown}
           className={dragging ? 'twk-seg dragging' : 'twk-seg'}>
        <div className="twk-seg-thumb"
             style={{ left: `calc(2px + ${idx} * (100% - 4px) / ${n})`,
                      width: `calc((100% - 4px) / ${n})` }} />
        {opts.map((o) => (
          <button key={o.value} type="button" role="radio" aria-checked={o.value === value}>
            {o.label}
          </button>
        ))}
      </div>
    </TweakRow>
  );
}

function TweakSelect({ label, value, options, onChange }) {
  return (
    <TweakRow label={label}>
      <select className="twk-field" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => {
          const v = typeof o === 'object' ? o.value : o;
          const l = typeof o === 'object' ? o.label : o;
          return <option key={v} value={v}>{l}</option>;
        })}
      </select>
    </TweakRow>
  );
}

function TweakText({ label, value, placeholder, onChange }) {
  return (
    <TweakRow label={label}>
      <input className="twk-field" type="text" value={value} placeholder={placeholder}
             onChange={(e) => onChange(e.target.value)} />
    </TweakRow>
  );
}

function TweakNumber({ label, value, min, max, step = 1, unit = '', onChange }) {
  const clamp = (n) => {
    if (min != null && n < min) return min;
    if (max != null && n > max) return max;
    return n;
  };
  const startRef = React.useRef({ x: 0, val: 0 });
  const onScrubStart = (e) => {
    e.preventDefault();
    startRef.current = { x: e.clientX, val: value };
    const decimals = (String(step).split('.')[1] || '').length;
    const move = (ev) => {
      const dx = ev.clientX - startRef.current.x;
      const raw = startRef.current.val + dx * step;
      const snapped = Math.round(raw / step) * step;
      onChange(clamp(Number(snapped.toFixed(decimals))));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return (
    <div className="twk-num">
      <span className="twk-num-lbl" onPointerDown={onScrubStart}>{label}</span>
      <input type="number" value={value} min={min} max={max} step={step}
             onChange={(e) => onChange(clamp(Number(e.target.value)))} />
      {unit && <span className="twk-num-unit">{unit}</span>}
    </div>
  );
}

// Relative-luminance contrast pick — checkmarks drawn over a swatch need to
// read on both #111 and #fafafa without per-option configuration. Hex input
// only (#rgb / #rrggbb); named or rgb()/hsl() colors fall through to "light".
function __twkIsLight(hex) {
  const h = String(hex).replace('#', '');
  const x = h.length === 3 ? h.replace(/./g, (c) => c + c) : h.padEnd(6, '0');
  const n = parseInt(x.slice(0, 6), 16);
  if (Number.isNaN(n)) return true;
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return r * 299 + g * 587 + b * 114 > 148000;
}

const __TwkCheck = ({ light }) => (
  <svg viewBox="0 0 14 14" aria-hidden="true">
    <path d="M3 7.2 5.8 10 11 4.2" fill="none" strokeWidth="2.2"
          strokeLinecap="round" strokeLinejoin="round"
          stroke={light ? 'rgba(0,0,0,.78)' : '#fff'} />
  </svg>
);

// TweakColor — curated color/palette picker. Each option is either a single
// hex string or an array of 1-5 hex strings; the card adapts — a lone color
// renders solid, a palette renders colors[0] as the hero (left ~2/3) with the
// rest stacked in a sharp column on the right. onChange emits the
// option in the shape it was passed (string stays string, array stays array).
// Without options it falls back to the native color input for back-compat.
function TweakColor({ label, value, options, onChange }) {
  if (!options || !options.length) {
    return (
      <div className="twk-row twk-row-h">
        <div className="twk-lbl"><span>{label}</span></div>
        <input type="color" className="twk-swatch" value={value}
               onChange={(e) => onChange(e.target.value)} />
      </div>
    );
  }
  // Native <input type=color> emits lowercase hex per the HTML spec, so
  // compare case-insensitively. String() guards JSON.stringify(undefined),
  // which returns the primitive undefined (no .toLowerCase).
  const key = (o) => String(JSON.stringify(o)).toLowerCase();
  const cur = key(value);
  return (
    <TweakRow label={label}>
      <div className="twk-chips" role="radiogroup">
        {options.map((o, i) => {
          const colors = Array.isArray(o) ? o : [o];
          const [hero, ...rest] = colors;
          const sup = rest.slice(0, 4);
          const on = key(o) === cur;
          return (
            <button key={i} type="button" className="twk-chip" role="radio"
                    aria-checked={on} data-on={on ? '1' : '0'}
                    aria-label={colors.join(', ')} title={colors.join(' · ')}
                    style={{ background: hero }}
                    onClick={() => onChange(o)}>
              {sup.length > 0 && (
                <span>
                  {sup.map((c, j) => <i key={j} style={{ background: c }} />)}
                </span>
              )}
              {on && <__TwkCheck light={__twkIsLight(hero)} />}
            </button>
          );
        })}
      </div>
    </TweakRow>
  );
}

function TweakButton({ label, onClick, secondary = false }) {
  return (
    <button type="button" className={secondary ? 'twk-btn secondary' : 'twk-btn'}
            onClick={onClick}>{label}</button>
  );
}

Object.assign(window, {
  useTweaks, TweaksPanel, TweakSection, TweakRow,
  TweakSlider, TweakToggle, TweakRadio, TweakSelect,
  TweakText, TweakNumber, TweakColor, TweakButton,
});


// ---- lib.jsx ----
// lib.jsx — calc, format, and stub data layer.
// Swap window.db.* with real server actions; signatures match.

const KG_TO_LB = 2.2046226218;
const CM_TO_IN = 0.3937007874;

function kgToLb(kg) { return kg * KG_TO_LB; }
function lbToKg(lb) { return lb / KG_TO_LB; }
function cmToIn(cm) { return cm * CM_TO_IN; }
function kgToSt(kg) { return kgToLb(kg) / 14; }
function stLbToKg(st, lb) { return ((st || 0) * 14 + (lb || 0)) / KG_TO_LB; }
function kgToStLb(kg) {
  const totalLb = kgToLb(kg);
  const st = Math.floor(totalLb / 14);
  const lb = totalLb - st * 14;
  return { st, lb };
}

function fmtWeight(kg, units, opts = {}) {
  if (kg == null || isNaN(kg)) return "—";
  if (units === "uk") {
    if (opts.unitless) return kgToSt(kg).toFixed(opts.dp ?? 1);
    const { st, lb } = kgToStLb(kg);
    return `${st} st ${lb.toFixed(opts.lbDp ?? 1)} lb`;
  }
  const v = units === "imperial" ? kgToLb(kg) : kg;
  const dp = opts.dp ?? 1;
  const num = v.toFixed(dp);
  const u = units === "imperial" ? "lb" : "kg";
  return opts.unitless ? num : `${num} ${u}`;
}

function unitSuffix(units) {
  return units === "imperial" ? "lb" : units === "uk" ? "st" : "kg";
}

function fmtHeight(cm, units) {
  if (units === "imperial" || units === "uk") {
    const totalIn = cmToIn(cm);
    const ft = Math.floor(totalIn / 12);
    const inch = Math.round(totalIn - ft * 12);
    return `${ft}′${inch}″`;
  }
  return `${cm} cm`;
}

function fmtDelta(kg, units, opts = {}) {
  if (kg == null || isNaN(kg)) return "—";
  const sign = kg > 0 ? "+" : kg < 0 ? "−" : "±";
  if (units === "uk") {
    const lb = Math.abs(kgToLb(kg));
    return `${sign}${lb.toFixed(opts.dp ?? 1)} lb`;
  }
  const v = Math.abs(units === "imperial" ? kgToLb(kg) : kg);
  return `${sign}${v.toFixed(opts.dp ?? 1)} ${units === "imperial" ? "lb" : "kg"}`;
}

function fmtDate(d, opts = {}) {
  const date = new Date(d);
  const today = window.__fixtures.today;
  const daysDiff = Math.round((+today - +date) / 86400000);
  if (opts.relative) {
    if (daysDiff === 0) return "Today";
    if (daysDiff === 1) return "Yesterday";
    if (daysDiff < 7) return `${daysDiff} days ago`;
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: opts.year ? "numeric" : undefined });
}

function fmtDateLong(d) {
  return new Date(d).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

// BMI = kg / m^2
function calcBMI(kg, heightCm) {
  if (!kg || !heightCm) return null;
  const m = heightCm / 100;
  return kg / (m * m);
}

function bmiCategory(bmi) {
  if (bmi == null) return null;
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Healthy";
  if (bmi < 30) return "Overweight";
  return "Obese";
}

// Mifflin–St Jeor BMR
function calcBMR(kg, heightCm, age, sex) {
  if (!kg || !heightCm || !age) return null;
  const base = 10 * kg + 6.25 * heightCm - 5 * age;
  return sex === "M" ? base + 5 : base - 161;
}

function calcTDEE(kg, heightCm, age, sex, activity) {
  const bmr = calcBMR(kg, heightCm, age, sex);
  return bmr ? bmr * activity : null;
}

// Deurenberg body-fat estimate
function estBodyFat(kg, heightCm, age, sex) {
  const bmi = calcBMI(kg, heightCm);
  if (!bmi) return null;
  const sexFactor = sex === "M" ? 1 : 0;
  return 1.20 * bmi + 0.23 * age - 10.8 * sexFactor - 5.4;
}

// Robinson ideal body weight
function calcIdealWeight(heightCm, sex) {
  if (!heightCm) return null;
  const inchesOver5ft = (heightCm / 2.54) - 60;
  if (inchesOver5ft <= 0) return sex === "M" ? 52 : 49;
  return (sex === "M" ? 52 : 49) + (sex === "M" ? 1.9 : 1.7) * inchesOver5ft;
}

// Streak: consecutive days with at least one entry, counted from most recent entry day.
// If most recent entry is older than `gracePeriodDays + 1`, streak is 0 (reset).
function calcStreak(entries, gracePeriodDays = 1) {
  if (!entries.length) return { length: 0, lastEntry: null, broken: false };
  const sorted = [...entries].sort((a, b) => +new Date(b.date) - +new Date(a.date));
  const today = window.__fixtures.today;
  const dayKey = (d) => new Date(d).toISOString().slice(0, 10);
  const todayKey = dayKey(today);

  const lastEntryDate = new Date(sorted[0].date);
  const daysSinceLast = Math.floor((+today - +lastEntryDate) / 86400000);
  const broken = daysSinceLast > gracePeriodDays;
  if (broken) return { length: 0, lastEntry: sorted[0], broken: true };

  // Walk back through days
  const set = new Set(sorted.map((e) => dayKey(e.date)));
  let count = 0;
  let cursor = new Date(today);
  // Allow today to not have an entry yet (within grace window)
  if (!set.has(todayKey)) {
    cursor = new Date(+today - 86400000);
  }
  while (set.has(dayKey(cursor))) {
    count++;
    cursor = new Date(+cursor - 86400000);
  }
  return { length: count, lastEntry: sorted[0], broken: false };
}

function trendDirection(entries, days = 14) {
  if (entries.length < 3) return { direction: "flat", deltaKg: 0 };
  const cutoff = +window.__fixtures.today - days * 86400000;
  const recent = entries.filter((e) => +new Date(e.date) >= cutoff).sort((a, b) => +new Date(a.date) - +new Date(b.date));
  if (recent.length < 2) return { direction: "flat", deltaKg: 0 };
  const first = recent[0].weightKg;
  const last = recent[recent.length - 1].weightKg;
  const delta = last - first;
  if (Math.abs(delta) < 0.3) return { direction: "flat", deltaKg: delta };
  return { direction: delta > 0 ? "up" : "down", deltaKg: delta };
}

function progressFraction(member, latestKg) {
  if (!member || latestKg == null) return 0;
  const span = member.startWeightKg - member.goalWeightKg;
  if (Math.abs(span) < 0.1) return 1;
  const done = member.startWeightKg - latestKg;
  return Math.max(0, Math.min(1, done / span));
}

// ---- API-backed data layer ----------------------------------------------
const api = {
  async request(path, options = {}) {
    const response = await fetch(path, {
      ...options,
      headers: {
        "content-type": "application/json",
        ...(options.headers || {}),
      },
      body: options.body == null ? undefined : JSON.stringify(options.body),
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || `Request failed: ${response.status}`);
    }
    if (response.status === 204) return null;
    return response.json();
  },
};

function applyBootstrap(payload) {
  if (!payload || !window.__app) return;
  window.__fixtures.household = payload.household || window.__fixtures.household;
  window.__fixtures.today = payload.today ? new Date(payload.today) : window.__fixtures.today;
  window.__app.state.members = payload.members || [];
  window.__app.state.entries = payload.entries || [];
  window.__app.notify();
}

function hasCompleteProfile(member) {
  return Boolean(
    member &&
    member.displayName?.trim() &&
    Number.isFinite(member.heightCm) &&
    Number.isFinite(member.age) &&
    (member.sex === "F" || member.sex === "M") &&
    Number.isFinite(member.activityLevel) &&
    Number.isFinite(member.startWeightKg) &&
    Number.isFinite(member.goalWeightKg) &&
    member.targetDate &&
    member.units
  );
}

const db = {
  async bootstrap() {
    const payload = await api.request("/api/bootstrap", { method: "GET", body: null });
    applyBootstrap(payload);
    return payload;
  },
  async listMembers() { return window.__app.state.members; },
  async getMember(id) { return window.__app.state.members.find((m) => m.id === id) || null; },
  async listEntries(memberId) {
    return window.__app.state.entries.filter((e) => e.memberId === memberId);
  },
  async listAllEntries() { return window.__app.state.entries; },
  async upsertEntry(entry) {
    const list = window.__app.state.entries;
    const idx = list.findIndex((e) => e.id === entry.id);
    if (idx >= 0) list[idx] = entry; else list.unshift(entry);
    window.__app.notify();
    api.request("/api/entries", { method: "POST", body: entry }).catch((error) => console.error("Failed to save entry", error));
    return entry;
  },
  async deleteEntry(id) {
    const list = window.__app.state.entries;
    const idx = list.findIndex((e) => e.id === id);
    if (idx >= 0) list.splice(idx, 1);
    window.__app.notify();
    api.request("/api/entries", { method: "DELETE", body: { id } }).catch((error) => console.error("Failed to delete entry", error));
  },
  async updateMember(id, patch, options = {}) {
    let saved;
    try {
      saved = await api.request("/api/members", { method: "PATCH", body: { id, patch } });
    } catch (error) {
      console.error("Failed to update member", error);
      if (options.throwOnError) throw error;
      return window.__app.state.members.find((x) => x.id === id) || null;
    }
    const m = window.__app.state.members.find((x) => x.id === id);
    if (m) {
      Object.assign(m, saved || patch);
      m.profileComplete = hasCompleteProfile(m);
    }
    window.__app.notify();
    return m;
  },
  async addMember(profile) {
    const id = "m_" + Math.random().toString(36).slice(2, 9);
    const member = {
      id,
      isMe: false,
      shareDetails: false,
      milestoneAlerts: true,
      reminderTime: "08:00",
      resetGracePeriodDays: 1,
      colorIdx: window.__app.state.members.length % 6,
      tone: "sam",
      ...profile,
    };
    member.profileComplete = hasCompleteProfile(member);
    const savedMember = await api.request("/api/members", { method: "POST", body: member });
    window.__app.state.members.push(savedMember || member);
    window.__app.notify();
    return savedMember || member;
  },
  async removeMember(id) {
    window.__app.state.members = window.__app.state.members.filter((m) => m.id !== id);
    window.__app.state.entries = window.__app.state.entries.filter((e) => e.memberId !== id);
    window.__app.notify();
    api.request("/api/members", { method: "DELETE", body: { id } }).catch((error) => console.error("Failed to remove member", error));
  },
};

// Goal pacing — expected vs actual progress.
function calcPacing(member, entries) {
  if (!entries.length) return null;
  const sorted = [...entries].sort((a, b) => +new Date(a.date) - +new Date(b.date));
  const startDate = new Date(sorted[0].date);
  const targetDate = new Date(member.targetDate);
  const today = window.__fixtures.today;
  const totalMs = +targetDate - +startDate;
  if (totalMs <= 0) return null;
  const elapsedFrac = Math.max(0, Math.min(1, (+today - +startDate) / totalMs));
  const expectedKg = member.startWeightKg + (member.goalWeightKg - member.startWeightKg) * elapsedFrac;
  const actualKg = sorted[sorted.length - 1].weightKg;
  // Days ahead/behind: how far does actual lie along the line vs today's mark
  const losing = member.startWeightKg > member.goalWeightKg;
  const totalDelta = member.goalWeightKg - member.startWeightKg;
  const actualFrac = totalDelta === 0 ? 0 : (actualKg - member.startWeightKg) / totalDelta;
  const aheadDays = Math.round((actualFrac - elapsedFrac) * (totalMs / 86400000));
  // Projected goal date at current pace
  const daysSoFar = (+today - +startDate) / 86400000;
  const ratePerDay = daysSoFar > 0 ? (actualKg - member.startWeightKg) / daysSoFar : 0;
  let projectedDate = null;
  if (ratePerDay !== 0 && Math.sign(ratePerDay) === Math.sign(totalDelta)) {
    const remainingDays = (member.goalWeightKg - actualKg) / ratePerDay;
    if (isFinite(remainingDays) && remainingDays > 0 && remainingDays < 365 * 3) {
      projectedDate = new Date(+today + remainingDays * 86400000);
    }
  }
  return {
    startDate, targetDate, expectedKg, actualKg,
    aheadDays, projectedDate, losing,
    onTrack: Math.abs(aheadDays) <= 3,
  };
}

Object.assign(window, {
  KG_TO_LB, CM_TO_IN, kgToLb, lbToKg, cmToIn, kgToSt, stLbToKg, kgToStLb, unitSuffix,
  fmtWeight, fmtHeight, fmtDelta, fmtDate, fmtDateLong,
  calcBMI, bmiCategory, calcBMR, calcTDEE, estBodyFat, calcIdealWeight,
  calcStreak, trendDirection, progressFraction, calcPacing,
  db,
});


// ---- ui.jsx ----
// ui.jsx — small reusable presentation components.

const { useState, useEffect, useRef, useMemo, useCallback } = React;

function Avatar({ member, size = 40 }) {
  return (
    <span
      className="avatar"
      data-tone={member.tone}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-label={member.displayName}
    >
      {member.initials}
    </span>
  );
}

function Stat({ label, value, sub, large, mono = true }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-3)", fontWeight: 500 }}>
        {label}
      </div>
      <div
        className={mono ? "num" : ""}
        style={{
          fontFamily: large ? "var(--serif)" : "var(--sans)",
          fontSize: large ? 44 : 22,
          fontWeight: large ? 400 : 500,
          letterSpacing: large ? "-0.02em" : "-0.01em",
          color: "var(--ink)",
          lineHeight: 1.05,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 12.5, color: "var(--ink-3)" }}>{sub}</div>
      )}
    </div>
  );
}

function IconBtn({ children, label, onClick, danger }) {
  return (
    <button
      className="btn-ghost focus-ring"
      aria-label={label}
      title={label}
      onClick={onClick}
      style={{
        width: 36, height: 36, padding: 0,
        background: "transparent", border: 0,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        borderRadius: 8, cursor: "pointer",
        color: danger ? "var(--terracotta)" : "var(--ink-2)",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--paper-2)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {children}
    </button>
  );
}

// Inline icons, hand-tuned 20px stroke set
const Icon = {
  Plus: (p) => <svg width="20" height="20" viewBox="0 0 20 20" fill="none" {...p}><path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  Pencil: (p) => <svg width="18" height="18" viewBox="0 0 20 20" fill="none" {...p}><path d="M14 3l3 3-9.5 9.5L4 16l.5-3.5L14 3z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>,
  Trash: (p) => <svg width="18" height="18" viewBox="0 0 20 20" fill="none" {...p}><path d="M4 6h12M8 6V4h4v2M6 6l1 11h6l1-11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Check: (p) => <svg width="18" height="18" viewBox="0 0 20 20" fill="none" {...p}><path d="M4 10l4 4 8-8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  X: (p) => <svg width="18" height="18" viewBox="0 0 20 20" fill="none" {...p}><path d="M5 5l10 10M15 5l-10 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  Home: (p) => <svg width="20" height="20" viewBox="0 0 20 20" fill="none" {...p}><path d="M3 9l7-5 7 5v8h-5v-5H8v5H3V9z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>,
  List: (p) => <svg width="20" height="20" viewBox="0 0 20 20" fill="none" {...p}><path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  People: (p) => <svg width="20" height="20" viewBox="0 0 20 20" fill="none" {...p}><circle cx="7.5" cy="7" r="2.6" stroke="currentColor" strokeWidth="1.4"/><circle cx="13.5" cy="8" r="2" stroke="currentColor" strokeWidth="1.4"/><path d="M2.5 16c0-2.5 2.2-4.4 5-4.4s5 1.9 5 4.4M12 16.5c.4-2 2-3.4 4-3.4 1.2 0 2.2.5 3 1.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  Profile: (p) => <svg width="20" height="20" viewBox="0 0 20 20" fill="none" {...p}><circle cx="10" cy="7.5" r="3" stroke="currentColor" strokeWidth="1.4"/><path d="M3.5 17c0-3 3-5 6.5-5s6.5 2 6.5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  Up: (p) => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" {...p}><path d="M3 9l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Down: (p) => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" {...p}><path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Flame: (p) => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" {...p}><path d="M7 1c1 2.4-1.4 3.4-1.4 5.4 0 1.6 1.1 2.6 1.4 2.6.3 0 1.4-1 1.4-2.6 0-.7-.2-1.3-.4-1.8C9 6 10.4 7.6 10.4 9.4c0 2-1.5 3.6-3.4 3.6S3.6 11.4 3.6 9.4C3.6 6.4 7 5.4 7 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>,
  Sparkle: (p) => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" {...p}><path d="M8 2l1.4 4.6L14 8l-4.6 1.4L8 14l-1.4-4.6L2 8l4.6-1.4L8 2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>,
  Lock: (p) => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" {...p}><rect x="3" y="6" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="1.3"/><path d="M5 6V4a2 2 0 014 0v2" stroke="currentColor" strokeWidth="1.3"/></svg>,
  Settings: (p) => <svg width="20" height="20" viewBox="0 0 20 20" fill="none" {...p}><circle cx="10" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.4"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.4 4.4l1.4 1.4M14.2 14.2l1.4 1.4M4.4 15.6l1.4-1.4M14.2 5.8l1.4-1.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
};

function Field({ label, hint, error, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 12.5, color: "var(--ink-2)", fontWeight: 500, letterSpacing: "0.01em" }}>
        {label}
      </span>
      {children}
      {hint && !error && (
        <span style={{ fontSize: 12, color: "var(--ink-3)" }}>{hint}</span>
      )}
      {error && (
        <span style={{ fontSize: 12, color: "var(--terracotta)" }}>{error}</span>
      )}
    </label>
  );
}

const inputStyle = {
  background: "var(--card)",
  border: "1px solid var(--rule)",
  padding: "10px 12px",
  borderRadius: 10,
  color: "var(--ink)",
  fontSize: 14,
  outline: "none",
  transition: "border-color 160ms ease, background 160ms ease",
  width: "100%",
};

function TextInput({ value, onChange, type = "text", ...rest }) {
  return (
    <input
      type={type}
      value={value ?? ""}
      onChange={(e) => onChange?.(e.target.value)}
      style={inputStyle}
      onFocus={(e) => (e.currentTarget.style.borderColor = "var(--sage)")}
      onBlur={(e) => (e.currentTarget.style.borderColor = "var(--rule)")}
      {...rest}
    />
  );
}

function Select({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      style={{ ...inputStyle, appearance: "none", backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'><path d='M5 8l5 5 5-5' stroke='%23686460' stroke-width='1.4' fill='none' stroke-linecap='round'/></svg>\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center", paddingRight: 32 }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function Switch({ checked, onChange, label }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange?.(!checked)}
      className="switch focus-ring"
      data-on={checked}
      style={{ border: 0 }}
    />
  );
}

function ProgressBar({ fraction, color }) {
  const pct = Math.round(fraction * 100);
  return (
    <div style={{ position: "relative", height: 6, background: "var(--rule-soft)", borderRadius: 999, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute", inset: 0,
          width: `${pct}%`,
          background: color || "var(--sage)",
          borderRadius: 999,
          transition: "width 600ms cubic-bezier(.2,.8,.2,1)",
        }}
      />
    </div>
  );
}

function Logo({ size = 22, width }) {
  return (
    <span
      aria-label="Home Assistant Health"
      role="img"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: width ?? size * 2.5,
        height: size,
      }}
    >
      <img src={logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
    </span>
  );
}

Object.assign(window, { Avatar, Stat, IconBtn, Icon, Field, TextInput, Select, Switch, ProgressBar, Logo, inputStyle });


// ---- chart.jsx ----
// chart.jsx — quiet hand-drawn line chart with range toggles + sparkline.

const RANGE_DAYS = { "1W": 7, "1M": 30, "3M": 90, "6M": 180, "1Y": 365, "All": Infinity };

function filterByRange(entries, range) {
  const days = RANGE_DAYS[range];
  if (days === Infinity) return entries;
  const cutoff = +window.__fixtures.today - days * 86400000;
  return entries.filter((e) => +new Date(e.date) >= cutoff);
}

function WeightChart({ entries, member, units, height = 280, pacing = null }) {
  const [range, setRange] = useState("3M");
  const [hover, setHover] = useState(null);
  const wrapRef = useRef(null);

  const data = useMemo(() => {
    const filtered = filterByRange(entries, range)
      .slice()
      .sort((a, b) => +new Date(a.date) - +new Date(b.date));
    return filtered;
  }, [entries, range]);

  if (entries.length < 3) {
    return (
      <div className="card" style={{ padding: "48px 32px", textAlign: "center" }}>
        <div className="serif" style={{ fontSize: 24, color: "var(--ink-2)", marginBottom: 8 }}>
          Not enough yet to draw a line.
        </div>
        <div style={{ color: "var(--ink-3)", fontSize: 14, maxWidth: 360, margin: "0 auto" }}>
          A few more days of entries and the trend will appear here. Keep at it — quietly.
        </div>
      </div>
    );
  }

  const W = 800, H = height, padX = 40, padY = 30;
  const xs = data.map((d) => +new Date(d.date));
  const ys = data.map((d) => d.weightKg);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys, member.goalWeightKg) - 0.8;
  const maxY = Math.max(...ys, member.goalWeightKg) + 0.8;

  const scaleX = (x) => padX + ((x - minX) / (maxX - minX || 1)) * (W - padX * 2);
  const scaleY = (y) => H - padY - ((y - minY) / (maxY - minY || 1)) * (H - padY * 2);

  // Smoothed catmull-rom path for soft, hand-drawn feel
  const points = data.map((d) => [scaleX(+new Date(d.date)), scaleY(d.weightKg)]);
  function smoothPath(pts) {
    if (pts.length < 2) return "";
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;
      const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
      const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
      const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
      const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2[0]} ${p2[1]}`;
    }
    return d;
  }
  const linePath = smoothPath(points);
  const areaPath = `${linePath} L ${points[points.length - 1][0]} ${H - padY} L ${points[0][0]} ${H - padY} Z`;

  const goalY = scaleY(member.goalWeightKg);

  // Y-axis ticks: 4 evenly spaced
  const ticks = [];
  for (let i = 0; i <= 3; i++) {
    const v = minY + ((maxY - minY) / 3) * (3 - i);
    ticks.push({ y: scaleY(v), v });
  }

  // X-axis labels: first, middle, last
  const xLabels = [data[0], data[Math.floor(data.length / 2)], data[data.length - 1]].filter(Boolean);

  function onMove(e) {
    const rect = wrapRef.current.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let nearest = 0, best = Infinity;
    points.forEach((p, i) => {
      const dx = Math.abs(p[0] - px);
      if (dx < best) { best = dx; nearest = i; }
    });
    setHover({ idx: nearest, x: points[nearest][0], y: points[nearest][1] });
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
          <span style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-3)", fontWeight: 500 }}>
            Weight over time
          </span>
          <span className="serif-it" style={{ color: "var(--ink-3)", fontSize: 14 }}>
            {data.length} entries · {range}
          </span>
        </div>
        <div className="range-bar no-scrollbar" role="tablist" aria-label="Time range">
          {Object.keys(RANGE_DAYS).map((k) => (
            <button key={k} data-active={range === k} onClick={() => setRange(k)} aria-pressed={range === k}>
              {k}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={wrapRef}
        className="card"
        style={{ padding: 16, position: "relative", overflow: "hidden" }}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: "block" }}>
          <defs>
            <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--sage)" stopOpacity="0.18" />
              <stop offset="100%" stopColor="var(--sage)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Y-grid */}
          {ticks.map((t, i) => (
            <g key={i}>
              <line x1={padX} x2={W - padX} y1={t.y} y2={t.y} stroke="var(--rule-soft)" strokeDasharray={i === 0 || i === ticks.length - 1 ? "0" : "2 4"} strokeWidth="1" />
              <text x={padX - 6} y={t.y + 4} fontSize="11" textAnchor="end" fill="var(--ink-3)" fontFamily="var(--mono)">
                {fmtWeight(t.v, units, { dp: 0, unitless: true })}
              </text>
            </g>
          ))}

          {/* Pacing line */}
          {pacing && (() => {
            const start = +pacing.startDate;
            const end = +pacing.targetDate;
            // Clip to current visible x range
            const chartStart = Math.max(start, minX);
            const chartEnd = Math.min(end, maxX);
            if (chartEnd <= chartStart) return null;
            const startKgPace = member.startWeightKg + (member.goalWeightKg - member.startWeightKg) * ((chartStart - start) / (end - start));
            const endKgPace = member.startWeightKg + (member.goalWeightKg - member.startWeightKg) * ((chartEnd - start) / (end - start));
            const x1 = scaleX(chartStart), x2 = scaleX(chartEnd);
            const y1 = scaleY(startKgPace), y2 = scaleY(endKgPace);
            return (
              <g opacity="0.55">
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--md-on-surface-variant)" strokeWidth="1" strokeDasharray="3 5" />
                <text x={x2} y={y2 - 6} fontSize="10" textAnchor="end" fill="var(--md-on-surface-variant)" fontFamily="var(--font-mono)" letterSpacing="0.05em">PACE</text>
              </g>
            );
          })()}
          {/* Goal line */}
          <line x1={padX} x2={W - padX} y1={goalY} y2={goalY} stroke="var(--terracotta)" strokeWidth="1.2" strokeDasharray="4 4" opacity="0.6" />
          <text x={W - padX} y={goalY - 6} fontSize="10.5" textAnchor="end" fill="var(--terracotta)" fontFamily="var(--mono)" letterSpacing="0.05em">
            GOAL · {fmtWeight(member.goalWeightKg, units, { unitless: true })}
          </text>

          {/* Area + line */}
          <path d={areaPath} fill="url(#areaFill)" />
          <path
            d={linePath}
            fill="none"
            stroke="var(--sage)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ filter: "drop-shadow(0 1px 0 oklch(0% 0 0 / 0.04))" }}
          />

          {/* Dots — small */}
          {points.map((p, i) => (
            <circle key={i} cx={p[0]} cy={p[1]} r={hover?.idx === i ? 4 : 1.8} fill="var(--card)" stroke="var(--sage)" strokeWidth="1.5" />
          ))}

          {/* X labels */}
          {xLabels.map((d, i) => (
            <text
              key={i}
              x={scaleX(+new Date(d.date))}
              y={H - 8}
              fontSize="11"
              textAnchor={i === 0 ? "start" : i === xLabels.length - 1 ? "end" : "middle"}
              fill="var(--ink-3)"
              fontFamily="var(--mono)"
            >
              {fmtDate(d.date)}
            </text>
          ))}

          {/* Hover */}
          {hover && (
            <g>
              <line x1={hover.x} x2={hover.x} y1={padY} y2={H - padY} stroke="var(--ink-3)" strokeWidth="1" strokeDasharray="2 3" opacity="0.5" />
              <circle cx={hover.x} cy={hover.y} r="6" fill="var(--card)" stroke="var(--sage)" strokeWidth="2" />
            </g>
          )}
        </svg>

        {hover && data[hover.idx] && (
          <div
            style={{
              position: "absolute",
              left: `${(hover.x / W) * 100}%`,
              top: 16,
              transform: "translateX(-50%)",
              background: "var(--ink)",
              color: "var(--paper)",
              padding: "6px 10px",
              borderRadius: 8,
              fontSize: 12.5,
              whiteSpace: "nowrap",
              pointerEvents: "none",
              boxShadow: "var(--shadow-md)",
            }}
          >
            <span className="num" style={{ fontWeight: 500 }}>
              {fmtWeight(data[hover.idx].weightKg, units)}
            </span>
            <span style={{ opacity: 0.7, marginLeft: 8 }}>{fmtDate(data[hover.idx].date)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function Sparkline({ entries, width = 100, height = 30, color = "var(--sage)" }) {
  if (entries.length < 2) {
    return <div style={{ width, height, display: "flex", alignItems: "center", color: "var(--ink-4)", fontSize: 11, fontStyle: "italic", fontFamily: "var(--serif)" }}>just starting</div>;
  }
  const sorted = [...entries].sort((a, b) => +new Date(a.date) - +new Date(b.date));
  const ys = sorted.map((e) => e.weightKg);
  const min = Math.min(...ys), max = Math.max(...ys);
  const span = max - min || 1;
  const pts = sorted.map((e, i) => [
    (i / (sorted.length - 1)) * width,
    height - ((e.weightKg - min) / span) * (height - 4) - 2,
  ]);
  const d = pts.reduce((acc, p, i) => acc + (i === 0 ? `M ${p[0]} ${p[1]}` : ` L ${p[0]} ${p[1]}`), "");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <path d={d} fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

Object.assign(window, { WeightChart, Sparkline, RANGE_DAYS });


// ---- screens.jsx ----
// screens.jsx — the four core screens.

// ---------- Dashboard ----------
function Dashboard({ me, entries, units, onLogToday, onEditEntry }) {
  const [dismissedMonth, setDismissedMonth] = useState(false);
  const myEntries = entries.filter((e) => e.memberId === me.id);
  if (myEntries.length < 3) return <EmptyDashboard me={me} entries={entries} onLogToday={onLogToday} />;
  const sorted = [...myEntries].sort((a, b) => +new Date(b.date) - +new Date(a.date));
  const latest = sorted[0];
  const pacing = calcPacing(me, myEntries);
  const previous = sorted[1];
  const streak = calcStreak(myEntries, me.resetGracePeriodDays);
  const trend = trendDirection(myEntries, 14);
  const progress = progressFraction(me, latest?.weightKg);
  const bmi = calcBMI(latest?.weightKg, me.heightCm);
  const bmr = calcBMR(latest?.weightKg, me.heightCm, me.age, me.sex);
  const tdee = calcTDEE(latest?.weightKg, me.heightCm, me.age, me.sex, me.activityLevel);
  const bf = estBodyFat(latest?.weightKg, me.heightCm, me.age, me.sex);
  const ideal = calcIdealWeight(me.heightCm, me.sex);

  const today = window.__fixtures.today;
  const loggedToday = sorted[0] && new Date(sorted[0].date).toDateString() === today.toDateString();

  const dayDelta = previous ? latest.weightKg - previous.weightKg : 0;
  const fromGoal = latest ? latest.weightKg - me.goalWeightKg : 0;

  // Greeting
  const hour = today.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div style={{ animation: "fadeIn 320ms ease both" }}>
      {/* Header */}
      <header style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 13, color: "var(--ink-3)", letterSpacing: "0.04em" }}>
          {fmtDateLong(today)}
        </div>
        <h1 className="serif" style={{ fontSize: "clamp(32px, 4.6vw, 48px)", fontWeight: 400, letterSpacing: "-0.02em", margin: "8px 0 0 0", lineHeight: 1.1 }}>
          {greeting}, <span className="serif-it">{me.displayName}.</span>
        </h1>
        <p style={{ color: "var(--ink-3)", fontSize: 15, margin: "10px 0 0 0", maxWidth: 520 }}>
          {loggedToday
            ? "You're set for the day. Quietly progressing."
            : streak.broken
            ? "A new day, a new entry. Begin again whenever you like."
            : "When you're ready, log today's weight below."}
        </p>
      </header>

      {!dismissedMonth && <FirstOfMonthCard me={me} entries={entries} units={units} onDismiss={() => setDismissedMonth(true)} />}

      {pacing && (
        <div className="card" style={{ padding: "14px 18px", marginBottom: 18, display: "flex", alignItems: "center", gap: 14, background: "var(--md-surface-container-low)", borderLeft: `3px solid ${pacing.onTrack ? "var(--md-primary)" : pacing.aheadDays > 0 ? "var(--md-tertiary)" : "var(--md-secondary)"}` }}>
          <span className="material-symbols-outlined" style={{ color: "var(--md-on-surface-variant)", fontSize: 22 }}>{pacing.onTrack ? "schedule" : pacing.aheadDays > 0 ? "trending_down" : "rocket_launch"}</span>
          <div style={{ flex: 1, fontSize: 13.5, color: "var(--md-on-surface)" }}>
            {pacing.onTrack
              ? <>You're <span style={{ fontWeight: 500 }}>on pace</span> for your target date.</>
              : pacing.aheadDays > 0
              ? <><span style={{ fontWeight: 500 }} className="num">{pacing.aheadDays}</span> day{pacing.aheadDays === 1 ? "" : "s"} ahead of pace{pacing.projectedDate && <> · projected goal {fmtDate(pacing.projectedDate)}</>}</>
              : <><span style={{ fontWeight: 500 }} className="num">{Math.abs(pacing.aheadDays)}</span> day{pacing.aheadDays === -1 ? "" : "s"} behind pace{pacing.projectedDate && <> · projected goal {fmtDate(pacing.projectedDate)}</>}</>}
          </div>
        </div>
      )}

      {/* Top row */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 18, marginBottom: 18 }}>
        <div className="card" style={{ padding: 24, gridColumn: "auto / span 1" }}>
          <Stat
            label="Current weight"
            value={
              <span>
                <span className="num">{fmtWeight(latest.weightKg, units, { unitless: true })}</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 18, color: "var(--ink-3)", marginLeft: 6, letterSpacing: 0 }}>
                  {units === "imperial" ? "lb" : "kg"}
                </span>
              </span>
            }
            sub={
              previous ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  {dayDelta > 0 ? <Icon.Up /> : dayDelta < 0 ? <Icon.Down /> : null}
                  <span className="num">{fmtDelta(dayDelta, units)}</span> from last entry
                </span>
              ) : null
            }
            large
          />
        </div>

        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-3)", fontWeight: 500 }}>
              Streak
            </span>
            {!streak.broken && streak.length >= 7 && (
              <span className="chip chip-sage"><Icon.Flame /> on a roll</span>
            )}
          </div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 44, fontWeight: 400, lineHeight: 1.05, letterSpacing: "-0.02em" }}>
            <span className="num">{streak.length}</span>
            <span className="serif-it" style={{ fontSize: 22, color: "var(--ink-3)", marginLeft: 8 }}>
              {streak.length === 1 ? "day" : "days"}
            </span>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 6 }}>
            {streak.broken
              ? `Last entry ${fmtDate(streak.lastEntry.date, { relative: true })}.`
              : streak.lastEntry
              ? `Last logged ${fmtDate(streak.lastEntry.date, { relative: true }).toLowerCase()}.`
              : "Start with today."}
          </div>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-3)", fontWeight: 500, marginBottom: 10 }}>
            Toward goal
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
            <span className="serif num" style={{ fontSize: 36, letterSpacing: "-0.02em" }}>
              {Math.round(progress * 100)}%
            </span>
            <span className="serif-it" style={{ color: "var(--ink-3)", fontSize: 14 }}>
              of the way there
            </span>
          </div>
          <ProgressBar fraction={progress} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 12, color: "var(--ink-3)" }}>
            <span className="num mono">start {fmtWeight(me.startWeightKg, units, { unitless: true })}</span>
            <span className="num mono">{Math.abs(fromGoal) < 0.1 ? "at goal" : `${fmtDelta(fromGoal, units)} to go`}</span>
            <span className="num mono">goal {fmtWeight(me.goalWeightKg, units, { unitless: true })}</span>
          </div>
        </div>
      </section>

      {/* Chart */}
      <section style={{ marginBottom: 28 }}>
        <WeightChart entries={myEntries} member={me} units={units} pacing={pacing} />
      </section>

      {/* Derived stats */}
      <section style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 14 }}>
          <h2 className="serif" style={{ fontSize: 22, fontWeight: 400, margin: 0, letterSpacing: "-0.01em" }}>
            <span className="serif-it">Derived</span> stats
          </h2>
          <span style={{ color: "var(--ink-3)", fontSize: 12.5 }}>estimated from your latest entry</span>
        </div>
        <div className="card" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
          {[
            { label: "BMI", value: bmi?.toFixed(1), sub: bmiCategory(bmi) },
            { label: "BMR", value: Math.round(bmr), sub: "kcal at rest" },
            { label: "TDEE", value: Math.round(tdee), sub: "kcal estimated" },
            { label: "Body-fat est.", value: bf?.toFixed(1) + "%", sub: "Deurenberg" },
            { label: "Ideal weight", value: fmtWeight(ideal, units, { unitless: true }), sub: units === "imperial" ? "lb · Robinson" : "kg · Robinson" },
          ].map((s, i, arr) => (
            <div key={s.label} style={{
              padding: "20px 24px",
              borderRight: i < arr.length - 1 ? "1px solid var(--rule-soft)" : "none",
              borderBottom: "none",
            }}>
              <Stat {...s} />
            </div>
          ))}
        </div>
      </section>

      {/* FAB */}
      <button
        onClick={onLogToday}
        className="focus-ring"
        style={{
          position: "fixed",
          right: 24,
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 96px)",
          background: "var(--md-primary-container)",
          color: "var(--md-on-primary-container)",
          border: 0,
          borderRadius: 16,
          padding: "0 20px",
          height: 56,
          fontSize: 14,
          fontWeight: 500,
          letterSpacing: "0.1px",
          fontFamily: "var(--sans)",
          display: "inline-flex",
          alignItems: "center",
          gap: 12,
          cursor: "pointer",
          boxShadow: "var(--md-elev-3)",
          zIndex: 50,
          transition: "box-shadow 200ms ease, transform 160ms ease",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "var(--md-elev-4)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "var(--md-elev-3)"; }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{loggedToday ? "edit" : "add"}</span>
        {loggedToday ? "Edit today's entry" : "Log today's weight"}
      </button>
    </div>
  );
}

// ---------- Entries ----------
function EntriesScreen({ me, entries, units, onEdit, onBackfill }) {
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [view, setView] = useState("list");

  const myEntries = entries
    .filter((e) => e.memberId === me.id)
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));

  // Group by month
  const groups = useMemo(() => {
    const g = {};
    myEntries.forEach((e) => {
      const key = new Date(e.date).toLocaleDateString("en-US", { month: "long", year: "numeric" });
      (g[key] ||= []).push(e);
    });
    return g;
  }, [myEntries]);

  // For calendar: build month buckets covering all months from first entry to today.
  const calMonths = useMemo(() => {
    if (!myEntries.length) return [];
    const today = window.__fixtures.today;
    const last = new Date(today.getFullYear(), today.getMonth(), 1);
    const firstEntry = myEntries[myEntries.length - 1];
    const first = new Date(new Date(firstEntry.date).getFullYear(), new Date(firstEntry.date).getMonth(), 1);
    const months = [];
    let cur = new Date(last);
    while (+cur >= +first) {
      months.push(new Date(cur));
      cur = new Date(cur.getFullYear(), cur.getMonth() - 1, 1);
    }
    return months;
  }, [myEntries]);

  const entryByDate = useMemo(() => {
    const m = {};
    myEntries.forEach((e) => { m[e.date.slice(0, 10)] = e; });
    return m;
  }, [myEntries]);

  return (
    <div style={{ animation: "fadeIn 320ms ease both" }}>
      <header style={{ marginBottom: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <h1 className="serif" style={{ fontSize: "clamp(28px, 3.6vw, 40px)", fontWeight: 400, margin: 0, letterSpacing: "-0.02em" }}>
            <span className="serif-it">Entries</span>
          </h1>
          <button className="btn" onClick={() => onBackfill()}>
            <Icon.Plus /> Backfill a day
          </button>
        </div>
        <p style={{ color: "var(--ink-3)", fontSize: 14, margin: "6px 0 0 0" }}>
          {myEntries.length} entries · backfill any day that's missing.
        </p>
        <div style={{ marginTop: 18 }}>
          <div className="range-bar" role="tablist" aria-label="Entries view">
            <button role="tab" aria-selected={view === "list"} data-active={view === "list"} onClick={() => setView("list")}>List</button>
            <button role="tab" aria-selected={view === "calendar"} data-active={view === "calendar"} onClick={() => setView("calendar")}>Calendar</button>
          </div>
        </div>
      </header>

      {view === "list" && Object.entries(groups).map(([month, list]) => (
        <section key={month} style={{ marginBottom: 36 }}>
          <h2 className="serif-it" style={{ fontSize: 14, fontWeight: 400, color: "var(--ink-3)", letterSpacing: "0.04em", margin: "0 0 12px 4px" }}>
            {month}
          </h2>
          <div className="card">
            {list.map((e, i) => {
              const next = list[i + 1];
              const delta = next ? e.weightKg - next.weightKg : null;
              const isOpen = confirmDelete === e.id;
              return (
                <article
                  key={e.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto 1fr auto",
                    alignItems: "center",
                    gap: 16,
                    padding: "16px 22px",
                    borderBottom: i < list.length - 1 ? "1px solid var(--rule-soft)" : "none",
                    transition: "background 160ms ease",
                  }}
                  onMouseEnter={(ev) => ev.currentTarget.style.background = "var(--paper-2)"}
                  onMouseLeave={(ev) => ev.currentTarget.style.background = "transparent"}
                >
                  <div style={{ minWidth: 90 }}>
                    <div className="serif" style={{ fontSize: 22, lineHeight: 1.1, color: "var(--ink)" }}>
                      {new Date(e.date).getDate()}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--ink-3)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      {new Date(e.date).toLocaleDateString("en-US", { weekday: "short" })}
                    </div>
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                      <span className="num serif" style={{ fontSize: 22, color: "var(--ink)" }}>
                        {fmtWeight(e.weightKg, units, { unitless: true })}
                        <span style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--ink-3)", marginLeft: 4 }}>
                          {units === "imperial" ? "lb" : "kg"}
                        </span>
                      </span>
                      {delta != null && Math.abs(delta) > 0.05 && (
                        <span className="num mono" style={{
                          fontSize: 12,
                          color: delta < 0 ? "var(--sage-2)" : "var(--terracotta)",
                          background: delta < 0 ? "var(--sage-tint)" : "var(--terracotta-tint)",
                          padding: "2px 8px",
                          borderRadius: 999,
                        }}>
                          {fmtDelta(delta, units)}
                        </span>
                      )}
                      {e.bodyFatPct && (
                        <span className="chip num mono">{e.bodyFatPct}% bf</span>
                      )}
                      {e.waistCm && (
                        <span className="chip num mono">{units === "imperial" ? `${cmToIn(e.waistCm).toFixed(1)} in waist` : `${e.waistCm} cm waist`}</span>
                      )}
                    </div>
                    {e.note && (
                      <div className="serif-it" style={{ color: "var(--ink-3)", fontSize: 14, marginTop: 4 }}>
                        “{e.note}”
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    {!isOpen ? (
                      <>
                        <IconBtn label={`Edit entry on ${fmtDate(e.date)}`} onClick={() => onEdit(e)}>
                          <Icon.Pencil />
                        </IconBtn>
                        <IconBtn label={`Delete entry on ${fmtDate(e.date)}`} danger onClick={() => setConfirmDelete(e.id)}>
                          <Icon.Trash />
                        </IconBtn>
                      </>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 4, animation: "fadeIn 160ms ease both" }}>
                        <span className="serif-it" style={{ fontSize: 13, color: "var(--ink-3)", marginRight: 6 }}>delete?</span>
                        <button
                          className="btn-ghost focus-ring"
                          onClick={async () => { await db.deleteEntry(e.id); setConfirmDelete(null); }}
                          style={{ padding: "6px 12px", border: "1px solid var(--terracotta)", color: "var(--terracotta)", background: "transparent", borderRadius: 999, fontSize: 13, cursor: "pointer" }}
                        >
                          yes, delete
                        </button>
                        <IconBtn label="Cancel" onClick={() => setConfirmDelete(null)}>
                          <Icon.X />
                        </IconBtn>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}

      {view === "calendar" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%", maxWidth: 460, marginLeft: "auto", marginRight: "auto" }}>
          {calMonths.map((monthDate) => {
            const today = window.__fixtures.today;
            const monthName = monthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
            const startOffset = monthDate.getDay();
            const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
            const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
            const monthEntries = myEntries.filter((e) => {
              const d = new Date(e.date);
              return d.getFullYear() === monthDate.getFullYear() && d.getMonth() === monthDate.getMonth();
            });
            // Days that are "expected" (past or today, this month)
            let expectedDays = 0;
            for (let dn = 1; dn <= daysInMonth; dn++) {
              const d = new Date(monthDate.getFullYear(), monthDate.getMonth(), dn);
              if (+d <= +today) expectedDays++;
            }
            const missed = expectedDays - monthEntries.length;
            return (
              <section key={monthName}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "0 4px 12px" }}>
                  <h2 className="serif-it" style={{ fontSize: 14, fontWeight: 400, color: "var(--ink-3)", letterSpacing: "0.04em", margin: 0 }}>
                    {monthName}
                  </h2>
                  <div style={{ fontSize: 11, color: "var(--ink-3)", letterSpacing: "0.04em" }}>
                    <span className="num mono" style={{ color: "var(--md-on-surface)" }}>{monthEntries.length}</span> logged
                    {missed > 0 && <> · <span className="num mono">{missed}</span> missed</>}
                  </div>
                </div>
                <div className="card" style={{ padding: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 6 }}>
                    {["S","M","T","W","T","F","S"].map((d, i) => (
                      <div key={i} style={{ fontSize: 10, textAlign: "center", color: "var(--ink-3)", letterSpacing: "0.06em", textTransform: "uppercase" }}>{d}</div>
                    ))}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
                    {Array.from({ length: totalCells }).map((_, idx) => {
                      const dn = idx - startOffset + 1;
                      if (dn < 1 || dn > daysInMonth) return <div key={idx} />;
                      const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), dn);
                      const dateKey = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(dn).padStart(2,"0")}`;
                      const entry = entryByDate[dateKey];
                      const isToday = date.toDateString() === today.toDateString();
                      const isFuture = +date > +today;
                      const logged = !!entry;
                      const display = entry ? fmtWeight(entry.weightKg, units, { unitless: true }) : null;
                      return (
                        <button
                          key={idx}
                          className="focus-ring"
                          disabled={isFuture}
                          onClick={() => {
                            if (isFuture) return;
                            if (entry) onEdit(entry);
                            else onBackfill(date.toISOString());
                          }}
                          title={entry ? `Edit ${fmtDate(date)}` : isFuture ? "" : `Log ${fmtDate(date)}`}
                          style={{
                            aspectRatio: "1 / 1",
                            border: isToday ? "1.5px solid var(--md-primary)" : "1px solid var(--rule-soft)",
                            background: logged ? "var(--md-secondary-container)" : "transparent",
                            color: logged ? "var(--md-on-secondary-container)" : isFuture ? "var(--md-outline)" : "var(--ink-2)",
                            opacity: isFuture ? 0.4 : 1,
                            borderRadius: 6,
                            padding: 2,
                            cursor: isFuture ? "default" : "pointer",
                            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1,
                            transition: "background 140ms ease, transform 120ms ease",
                            fontFamily: "var(--sans)",
                            position: "relative",
                          }}
                          onMouseEnter={(ev) => { if (!isFuture && !logged) ev.currentTarget.style.background = "var(--paper-2)"; }}
                          onMouseLeave={(ev) => { if (!isFuture && !logged) ev.currentTarget.style.background = "transparent"; }}
                        >
                          <span className="num" style={{ fontSize: 11, fontWeight: logged ? 500 : 400, lineHeight: 1 }}>{dn}</span>
                          {display && (
                            <span className="num mono" style={{ fontSize: 8.5, opacity: 0.85, lineHeight: 1 }}>{display}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------- Household ----------
function HouseholdScreen({ me, members, entries, units, onTogglePrivacy, onAddMember }) {
  return (
    <div style={{ animation: "fadeIn 320ms ease both" }}>
      <header style={{ marginBottom: 28 }}>
        <h1 className="serif" style={{ fontSize: "clamp(28px, 3.6vw, 40px)", fontWeight: 400, margin: 0, letterSpacing: "-0.02em" }}>
          <span className="serif-it">The</span> household
        </h1>
        <p style={{ color: "var(--ink-3)", fontSize: 14, margin: "6px 0 0 0", maxWidth: 540 }}>
          Everyone's quiet progress, in one view. Exact numbers stay private unless a member chooses to share them.
        </p>
        {onAddMember && (
          <button className="btn btn-tonal" onClick={onAddMember} style={{ marginTop: 14 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>person_add</span> Add a member
          </button>
        )}
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 18 }}>
        {members.map((m) => {
          const memberEntries = entries.filter((e) => e.memberId === m.id);
          const sorted = [...memberEntries].sort((a, b) => +new Date(b.date) - +new Date(a.date));
          const latest = sorted[0];
          const streak = calcStreak(memberEntries, m.resetGracePeriodDays);
          const progress = progressFraction(m, latest?.weightKg);
          const trend = trendDirection(memberEntries, 14);
          const broken = streak.broken;
          const isMe = m.id === me.id;
          const showDetails = m.shareDetails || isMe;
          const sinceLast = streak.lastEntry ? Math.floor((+window.__fixtures.today - +new Date(streak.lastEntry.date)) / 86400000) : null;

          return (
            <article
              key={m.id}
              className="card"
              style={{
                padding: 22,
                opacity: broken ? 0.66 : 1,
                position: "relative",
                transition: "opacity 200ms ease, transform 200ms ease",
              }}
            >
              {isMe && (
                <span className="chip" style={{ position: "absolute", top: 14, right: 14, fontSize: 10.5 }}>you</span>
              )}
              <header style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
                <Avatar member={m} size={48} />
                <div>
                  <div className="serif" style={{ fontSize: 22, lineHeight: 1.1, letterSpacing: "-0.01em" }}>
                    {m.displayName}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2, display: "flex", alignItems: "center", gap: 8 }}>
                    {broken ? (
                      <span className="chip chip-warn" style={{ fontSize: 10.5 }}>streak reset · {sinceLast}d ago</span>
                    ) : streak.length > 0 ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <Icon.Flame /> <span className="num mono">{streak.length}</span>-day streak
                      </span>
                    ) : (
                      <span className="serif-it">just starting out</span>
                    )}
                    {!showDetails && !isMe && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "var(--ink-4)" }}>
                        <Icon.Lock /> private
                      </span>
                    )}
                  </div>
                </div>
              </header>

              {/* Progress block */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                  <span style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-3)", fontWeight: 500 }}>
                    Toward goal
                  </span>
                  <span className="serif" style={{ fontSize: 18 }}>
                    <span className="num">{Math.round(progress * 100)}</span>
                    <span style={{ fontSize: 13, color: "var(--ink-3)" }}>%</span>
                  </span>
                </div>
                <ProgressBar fraction={progress} />
              </div>

              {/* Detail / private */}
              {showDetails ? (
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 14, marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-3)", fontWeight: 500 }}>Now</div>
                    <div className="num serif" style={{ fontSize: 20 }}>
                      {fmtWeight(latest?.weightKg, units, { unitless: true })}
                      <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)", marginLeft: 4 }}>
                        {units === "imperial" ? "lb" : "kg"}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-3)", fontWeight: 500 }}>Goal</div>
                    <div className="num serif" style={{ fontSize: 20, color: "var(--ink-2)" }}>
                      {fmtWeight(m.goalWeightKg, units, { unitless: true })}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-3)", fontWeight: 500 }}>BMI</div>
                    <div className="num serif" style={{ fontSize: 20 }}>{calcBMI(latest?.weightKg, m.heightCm)?.toFixed(1)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-3)", fontWeight: 500 }}>14-day</div>
                    <div className="num serif" style={{ fontSize: 20, color: trend.direction === "down" ? "var(--sage-2)" : trend.direction === "up" ? "var(--terracotta)" : "var(--ink-2)" }}>
                      {fmtDelta(trend.deltaKg, units)}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ marginBottom: 14, padding: "12px 14px", background: "var(--paper-2)", borderRadius: 12, fontSize: 13, color: "var(--ink-3)" }}>
                  <div className="serif-it">Sharing relative progress only.</div>
                  <div style={{ marginTop: 4, fontSize: 12 }}>
                    {trend.direction === "down" ? "Trending downward" : trend.direction === "up" ? "Trending upward" : "Holding steady"} this fortnight.
                  </div>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--rule-soft)", paddingTop: 14 }}>
                <Sparkline entries={memberEntries} width={120} height={28} />
                {isMe && (
                  <button
                    className="btn-ghost focus-ring"
                    onClick={onTogglePrivacy}
                    style={{ padding: "4px 10px", border: 0, background: "transparent", color: "var(--ink-3)", fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
                  >
                    <Icon.Lock />
                    {m.shareDetails ? "Sharing details" : "Hiding details"}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Profile & Settings ----------
function ProfileScreen({ me, units, onUpdate, onUnits }) {
  const [form, setForm] = useState({ ...me });
  const [savedAt, setSavedAt] = useState(null);

  function update(patch) {
    const next = { ...form, ...patch };
    setForm(next);
    onUpdate(patch);
    setSavedAt(Date.now());
  }

  const goalKgInput = units === "imperial" ? kgToLb(form.goalWeightKg) : form.goalWeightKg;
  const heightInput = units === "imperial" ? cmToIn(form.heightCm) : form.heightCm;

  return (
    <div style={{ animation: "fadeIn 320ms ease both" }}>
      <header style={{ marginBottom: 28 }}>
        <h1 className="serif" style={{ fontSize: "clamp(28px, 3.6vw, 40px)", fontWeight: 400, margin: 0, letterSpacing: "-0.02em" }}>
          <span className="serif-it">Profile</span> & settings
        </h1>
        <p style={{ color: "var(--ink-3)", fontSize: 14, margin: "6px 0 0 0" }}>
          Change anything below. It saves as you go.
          {savedAt && <span className="serif-it" style={{ marginLeft: 10, color: "var(--sage-2)" }}>· saved</span>}
        </p>
      </header>

      <Section title="You" subtitle="Used to estimate your derived stats.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
          <Field label="Display name">
            <TextInput value={form.displayName} onChange={(v) => update({ displayName: v, initials: v.slice(0, 2).toUpperCase() })} />
          </Field>
          <Field label={units === "imperial" ? "Height (in)" : "Height (cm)"}>
            <TextInput
              type="number"
              value={Math.round(heightInput)}
              onChange={(v) => update({ heightCm: units === "imperial" ? Math.round(parseFloat(v) / CM_TO_IN) : parseFloat(v) })}
            />
          </Field>
          <Field label="Age">
            <TextInput type="number" value={form.age} onChange={(v) => update({ age: parseInt(v, 10) || 0 })} />
          </Field>
          <Field label="Sex (for estimates)">
            <Select value={form.sex} onChange={(v) => update({ sex: v })} options={[{ value: "F", label: "Female" }, { value: "M", label: "Male" }]} />
          </Field>
          <Field label="Activity level">
            <Select
              value={String(form.activityLevel)}
              onChange={(v) => update({ activityLevel: parseFloat(v) })}
              options={[
                { value: "1.2", label: "Sedentary" },
                { value: "1.4", label: "Light (1–3 days/wk)" },
                { value: "1.55", label: "Moderate (3–5 days/wk)" },
                { value: "1.7", label: "Active (6–7 days/wk)" },
                { value: "1.9", label: "Very active" },
              ]}
            />
          </Field>
        </div>
      </Section>

      <Section title="Goal" subtitle="Where you're headed, and by when.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
          <Field label={units === "imperial" ? "Target weight (lb)" : "Target weight (kg)"}>
            <TextInput
              type="number"
              step="0.1"
              value={goalKgInput.toFixed(1)}
              onChange={(v) => update({ goalWeightKg: units === "imperial" ? lbToKg(parseFloat(v)) : parseFloat(v) })}
            />
          </Field>
          <Field label="Target date">
            <TextInput type="date" value={new Date(form.targetDate).toISOString().slice(0, 10)} onChange={(v) => update({ targetDate: new Date(v).toISOString() })} />
          </Field>
        </div>
      </Section>

      <Section title="Preferences">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
          <Field label="Units">
            <Select value={units} onChange={onUnits} options={[{ value: "metric", label: "Metric (kg, cm)" }, { value: "imperial", label: "Imperial (lb, in)" }]} />
          </Field>
          <Field label="Daily reminder">
            <TextInput type="time" value={form.reminderTime} onChange={(v) => update({ reminderTime: v })} />
          </Field>
          <Field label="Streak grace (days)" hint="Miss this many days and your streak resets.">
            <Select
              value={String(form.resetGracePeriodDays)}
              onChange={(v) => update({ resetGracePeriodDays: parseInt(v, 10) })}
              options={[
                { value: "0", label: "None — strict" },
                { value: "1", label: "1 day" },
                { value: "2", label: "2 days" },
                { value: "3", label: "3 days" },
              ]}
            />
          </Field>
        </div>
        <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          <ToggleRow
            label="Share exact numbers in Household"
            sub="Off keeps your weight, BMI and goal hidden. Streak and trend are always visible."
            checked={form.shareDetails}
            onChange={(v) => update({ shareDetails: v })}
          />
          <ToggleRow
            label="Milestone alerts"
            sub="A small celebration when you hit goal, halfway, or a 30-day streak."
            checked={form.milestoneAlerts}
            onChange={(v) => update({ milestoneAlerts: v })}
          />
        </div>
      </Section>

      <Section title="Household" subtitle="Shared by everyone on this device.">
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button className="btn">Add a member</button>
          <button className="btn btn-ghost">Export all data</button>
          <button className="btn btn-danger">Sign out of this device</button>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <section style={{ marginBottom: 36 }}>
      <header style={{ marginBottom: 16 }}>
        <h2 className="serif" style={{ fontSize: 22, fontWeight: 400, margin: 0, letterSpacing: "-0.01em" }}>
          {title}
        </h2>
        {subtitle && <p style={{ color: "var(--ink-3)", fontSize: 13, margin: "4px 0 0 0" }}>{subtitle}</p>}
      </header>
      <div className="card" style={{ padding: 22 }}>{children}</div>
    </section>
  );
}

function ToggleRow({ label, sub, checked, onChange }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{label}</div>
        {sub && <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 2, maxWidth: 460 }}>{sub}</div>}
      </div>
      <Switch checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

Object.assign(window, { Dashboard, EntriesScreen, HouseholdScreen, ProfileScreen, Section, ToggleRow });


// ---- modals.jsx ----
// modals.jsx — log weight, milestone celebration, first-run.

function Modal({ children, onClose, maxWidth = 460 }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);
  return (
    <div className="scrim" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(92vw, " + maxWidth + "px)",
          background: "var(--card)",
          borderRadius: 22,
          border: "1px solid var(--rule-soft)",
          boxShadow: "var(--shadow-lg)",
          padding: 28,
          maxHeight: "90vh",
          overflow: "auto",
          animation: "scaleIn 200ms cubic-bezier(.2,1,.4,1) both",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ---------- Log weight ----------
function LogWeightModal({ me, units, existingEntry, onSave, onClose }) {
  const today = window.__fixtures.today;
  const initialDate = existingEntry?.date || today.toISOString();
  const initialKg = existingEntry?.weightKg ?? null;
  const [dateStr, setDateStr] = useState(new Date(initialDate).toISOString().slice(0, 10));
  const [weightStr, setWeightStr] = useState(
    initialKg != null
      ? (units === "imperial" ? kgToLb(initialKg).toFixed(1) : initialKg.toFixed(1))
      : ""
  );
  const [bodyFat, setBodyFat] = useState(existingEntry?.bodyFatPct ?? "");
  const [waist, setWaist] = useState(existingEntry?.waistCm != null ? (units === "imperial" ? cmToIn(existingEntry.waistCm).toFixed(1) : existingEntry.waistCm) : "");
  const [note, setNote] = useState(existingEntry?.note ?? "");
  const [error, setError] = useState(null);

  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select(); }, []);

  function validate() {
    const v = parseFloat(weightStr);
    if (isNaN(v)) return "Please enter a weight.";
    const kg = units === "imperial" ? lbToKg(v) : v;
    if (kg < 25 || kg > 300) return units === "imperial" ? "Should be between 55 and 660 lb." : "Should be between 25 and 300 kg.";
    return null;
  }

  function submit(e) {
    e?.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    const v = parseFloat(weightStr);
    const kg = units === "imperial" ? lbToKg(v) : v;
    const waistCm = waist ? (units === "imperial" ? parseFloat(waist) / CM_TO_IN : parseFloat(waist)) : null;
    const date = new Date(dateStr);
    date.setHours(8, 0, 0, 0);
    onSave({
      id: existingEntry?.id || `${me.id}-${dateStr}`,
      memberId: me.id,
      date: date.toISOString(),
      weightKg: Math.round(kg * 10) / 10,
      bodyFatPct: bodyFat ? parseFloat(bodyFat) : null,
      waistCm: waistCm ? Math.round(waistCm) : null,
      note: note || null,
    });
  }

  return (
    <Modal onClose={onClose} maxWidth={520}>
      <header style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)", fontWeight: 500 }}>
          {existingEntry?.weightKg != null ? "Edit entry" : "Log entry"}
        </div>
        <h2 className="serif" style={{ fontSize: 30, margin: "6px 0 0 0", fontWeight: 400, letterSpacing: "-0.02em" }}>
          <span className="serif-it">How are you</span> today?
        </h2>
      </header>

      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Field label={`Weight (${units === "imperial" ? "lb" : "kg"})`} error={error}>
          <input
            ref={inputRef}
            type="number"
            step="0.1"
            inputMode="decimal"
            value={weightStr}
            onChange={(e) => { setWeightStr(e.target.value); setError(null); }}
            placeholder="—"
            style={{
              ...inputStyle,
              fontFamily: "var(--serif)",
              fontSize: 36,
              padding: "16px 18px",
              textAlign: "center",
              borderColor: error ? "var(--terracotta)" : "var(--rule)",
              fontVariantNumeric: "tabular-nums",
            }}
            onFocus={(e) => !error && (e.currentTarget.style.borderColor = "var(--sage)")}
            onBlur={(e) => !error && (e.currentTarget.style.borderColor = "var(--rule)")}
          />
        </Field>

        <Field label="Date">
          <TextInput type="date" value={dateStr} onChange={setDateStr} />
        </Field>

        <details style={{ borderTop: "1px solid var(--rule-soft)", paddingTop: 14 }}>
          <summary style={{ cursor: "pointer", fontSize: 13, color: "var(--ink-3)", listStyle: "none", display: "flex", alignItems: "center", gap: 6 }}>
            <Icon.Plus /> Optional measurements
          </summary>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 12, marginTop: 12 }}>
            <Field label="Body fat (%)">
              <TextInput type="number" step="0.1" value={bodyFat} onChange={setBodyFat} placeholder="—" />
            </Field>
            <Field label={units === "imperial" ? "Waist (in)" : "Waist (cm)"}>
              <TextInput type="number" step="0.1" value={waist} onChange={setWaist} placeholder="—" />
            </Field>
          </div>
          <div style={{ marginTop: 12 }}>
            <Field label="A small note (optional)">
              <TextInput value={note} onChange={setNote} placeholder="Anything to remember about today..." />
            </Field>
          </div>
        </details>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary">
            <Icon.Check /> {existingEntry?.weightKg != null ? "Save changes" : "Log entry"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ---------- Milestone celebration ----------
function MilestoneModal({ kind, member, onSetNewGoal, onMaintain, onClose }) {
  // confetti pieces
  const pieces = useMemo(() =>
    Array.from({ length: 24 }).map((_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 600,
      hue: ["var(--sage)", "var(--sage-2)", "var(--terracotta)", "var(--ink-2)"][i % 4],
      size: 6 + Math.random() * 6,
      rot: Math.random() * 360,
    })), []);

  const title = kind === "goal" ? "You reached your goal." : kind === "halfway" ? "Halfway there." : "30 days running.";
  const body = kind === "goal"
    ? "Quietly remarkable. What's next is up to you — set a new target, or shift to maintenance."
    : kind === "halfway"
    ? "Half the distance, behind you. Keep your rhythm."
    : "A month of small daily steps. You're building something.";

  return (
    <Modal onClose={onClose} maxWidth={480}>
      {/* Confetti */}
      <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", borderRadius: 22 }}>
        {pieces.map((p, i) => (
          <span
            key={i}
            style={{
              position: "absolute",
              top: -20,
              left: `${p.left}%`,
              width: p.size,
              height: p.size * 1.6,
              background: p.hue,
              borderRadius: 1,
              transform: `rotate(${p.rot}deg)`,
              animation: `confetti 1800ms cubic-bezier(.3,.7,.4,1) ${p.delay}ms both`,
            }}
          />
        ))}
      </div>

      <div style={{ position: "relative", textAlign: "center", padding: "8px 6px" }}>
        <Icon.Sparkle style={{ color: "var(--sage)" }} width="32" height="32" />
        <h2 className="serif" style={{ fontSize: 36, margin: "12px 0 8px 0", fontWeight: 400, letterSpacing: "-0.02em", lineHeight: 1.05 }}>
          <span className="serif-it">{title}</span>
        </h2>
        <p style={{ color: "var(--ink-2)", fontSize: 15, margin: "0 auto 24px auto", maxWidth: 360 }}>
          {body}
        </p>
        {kind === "goal" ? (
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button className="btn btn-primary" onClick={onSetNewGoal}>Set a new goal</button>
            <button className="btn" onClick={onMaintain}>Switch to maintenance</button>
          </div>
        ) : (
          <button className="btn btn-primary" onClick={onClose}>Carry on</button>
        )}
      </div>
    </Modal>
  );
}

// ---------- First-run ----------
function FirstRun({ profile, onDone }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(profile?.displayName ?? "");
  const [units, setUnits] = useState(profile?.units ?? "");
  const [height, setHeight] = useState(profile?.heightCm ?? "");
  const [age, setAge] = useState(profile?.age ?? "");
  const [sex, setSex] = useState(profile?.sex ?? "");
  const [activityLevel, setActivityLevel] = useState(profile?.activityLevel ? String(profile.activityLevel) : "");
  const [start, setStart] = useState(profile?.startWeightKg ?? "");
  const [goal, setGoal] = useState(profile?.goalWeightKg ?? "");
  const [targetDate, setTargetDate] = useState(profile?.targetDate ? new Date(profile.targetDate).toISOString().slice(0, 10) : "");
  const [error, setError] = useState(null);

  const steps = ["Welcome", "About you", "Where you're starting"];
  const usingImperial = units === "imperial";

  function validNumber(value) {
    return Number.isFinite(parseFloat(value));
  }

  function aboutComplete() {
    return Boolean(name.trim() && units && validNumber(height) && validNumber(age) && sex && activityLevel);
  }

  function startComplete() {
    return Boolean(validNumber(start) && validNumber(goal) && targetDate);
  }

  async function complete() {
    setError(null);
    const heightCm = usingImperial ? parseFloat(height) / CM_TO_IN : parseFloat(height);
    const startKg = usingImperial ? lbToKg(parseFloat(start)) : parseFloat(start);
    const goalKg = usingImperial ? lbToKg(parseFloat(goal)) : parseFloat(goal);
    const date = new Date(targetDate);
    date.setHours(8, 0, 0, 0);
    try {
      await onDone({
        displayName: name.trim(),
        initials: name.trim().slice(0, 2).toUpperCase(),
        heightCm: Math.round(heightCm * 10) / 10,
        age: parseInt(age, 10),
        sex,
        activityLevel: parseFloat(activityLevel),
        startWeightKg: Math.round(startKg * 10) / 10,
        goalWeightKg: Math.round(goalKg * 10) / 10,
        targetDate: date.toISOString(),
        units,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profile.");
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      background: "linear-gradient(180deg, var(--paper) 0%, var(--paper-2) 100%)",
    }}>
      <div className="card" style={{ padding: "40px 36px", maxWidth: 520, width: "100%", animation: "slideUp 280ms ease both" }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
          {steps.map((_, i) => (
            <span key={i} style={{ height: 3, flex: 1, borderRadius: 999, background: i <= step ? "var(--sage)" : "var(--rule-soft)", transition: "background 280ms ease" }} />
          ))}
        </div>

        {step === 0 && (
          <div>
            <Logo size={28} />
            <h1 className="serif" style={{ fontSize: 38, margin: "20px 0 12px 0", fontWeight: 400, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
              <span className="serif-it">Welcome.</span>
            </h1>
            <p style={{ color: "var(--ink-2)", fontSize: 15, margin: "0 0 28px 0", maxWidth: 420 }}>
              A small, calm space for your household to track weight together. Add the required fields once, then start logging.
            </p>
            <button className="btn btn-primary" onClick={() => setStep(1)}>Begin</button>
          </div>
        )}

        {step === 1 && (
          <div>
            <h1 className="serif" style={{ fontSize: 28, margin: "0 0 6px 0", fontWeight: 400 }}>
              <span className="serif-it">About</span> you
            </h1>
            <p style={{ color: "var(--ink-3)", fontSize: 14, margin: "0 0 22px 0" }}>
              Used only to estimate your derived stats.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 12 }}>
              <Field label="Display name"><TextInput value={name} onChange={setName} placeholder="Display name" /></Field>
              <Field label="Units">
                <Select value={units} onChange={setUnits} options={[{ value: "", label: "Select units" }, { value: "metric", label: "Metric" }, { value: "imperial", label: "Imperial" }]} />
              </Field>
              <Field label={usingImperial ? "Height (in)" : "Height (cm)"}><TextInput type="number" value={height} onChange={setHeight} /></Field>
              <Field label="Age"><TextInput type="number" value={age} onChange={setAge} /></Field>
              <Field label="Sex (for estimates)">
                <Select value={sex} onChange={setSex} options={[{ value: "", label: "Select" }, { value: "F", label: "Female" }, { value: "M", label: "Male" }]} />
              </Field>
              <Field label="Activity level">
                <Select
                  value={activityLevel}
                  onChange={setActivityLevel}
                  options={[
                    { value: "", label: "Select activity" },
                    { value: "1.2", label: "Sedentary" },
                    { value: "1.4", label: "Light" },
                    { value: "1.55", label: "Moderate" },
                    { value: "1.7", label: "Active" },
                    { value: "1.9", label: "Very active" },
                  ]}
                />
              </Field>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
              <button className="btn btn-ghost" onClick={() => setStep(0)}>Back</button>
              <button className="btn btn-primary" disabled={!aboutComplete()} onClick={() => setStep(2)}>Continue</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h1 className="serif" style={{ fontSize: 28, margin: "0 0 6px 0", fontWeight: 400 }}>
              <span className="serif-it">Where</span> you're starting
            </h1>
            <p style={{ color: "var(--ink-3)", fontSize: 14, margin: "0 0 22px 0" }}>
              These fields are required before the dashboard can calculate progress.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 12 }}>
              <Field label={usingImperial ? "Today's weight (lb)" : "Today's weight (kg)"}>
                <TextInput type="number" step="0.1" value={start} onChange={setStart} />
              </Field>
              <Field label={usingImperial ? "Target weight (lb)" : "Target weight (kg)"}>
                <TextInput type="number" step="0.1" value={goal} onChange={setGoal} />
              </Field>
              <Field label="Target date">
                <TextInput type="date" value={targetDate} onChange={setTargetDate} />
              </Field>
            </div>
            {error && <p style={{ color: "var(--terracotta)", fontSize: 13, margin: "14px 0 0" }}>{error}</p>}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
              <button className="btn btn-ghost" onClick={() => setStep(1)}>Back</button>
              <button className="btn btn-primary" disabled={!startComplete()} onClick={complete}>Begin tracking</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { Modal, LogWeightModal, MilestoneModal, FirstRun });


// ---- features.jsx ----
// features.jsx — weekly digest, add-member, first-of-month recap, empty states.

// ---------- Weekly Digest ----------
function WeeklyDigestScreen({ members, entries, units }) {
  const today = window.__fixtures.today;
  // "Week" = past 7 days ending today
  const weekStart = new Date(+today - 6 * 86400000);
  weekStart.setHours(0, 0, 0, 0);
  const prevStart = new Date(+weekStart - 7 * 86400000);

  function inRange(d, start, end) {
    const t = +new Date(d);
    return t >= +start && t < +end;
  }

  const weekEnd = new Date(+today + 86400000);

  function summarizeMember(m) {
    const all = entries.filter((e) => e.memberId === m.id).sort((a, b) => +new Date(a.date) - +new Date(b.date));
    const thisWeek = all.filter((e) => inRange(e.date, weekStart, weekEnd));
    const lastWeek = all.filter((e) => inRange(e.date, prevStart, weekStart));
    const startOfWeek = lastWeek[lastWeek.length - 1] || thisWeek[0];
    const endOfWeek = thisWeek[thisWeek.length - 1];
    const delta = startOfWeek && endOfWeek ? endOfWeek.weightKg - startOfWeek.weightKg : null;
    const streak = calcStreak(all, m.resetGracePeriodDays);
    const lowest = thisWeek.length ? Math.min(...thisWeek.map((e) => e.weightKg)) : null;
    const consistency = thisWeek.length / 7;
    return { m, thisWeek, lastWeek, delta, streak, lowest, endOfWeek, consistency };
  }

  const summaries = members.map(summarizeMember);
  const householdConsistency = summaries.reduce((a, s) => a + s.consistency, 0) / summaries.length;

  function encouragement(s, units) {
    if (!s.thisWeek.length) return "A quiet week. Tomorrow's a clean page.";
    if (!s.delta) return s.thisWeek.length === 1 ? "First entry of the week — a beginning." : "Holding steady this week.";
    const losing = s.m.startWeightKg > s.m.goalWeightKg;
    const trendingTowardGoal = (losing && s.delta < 0) || (!losing && s.delta > 0);
    const dKg = Math.abs(s.delta);
    if (dKg < 0.15) return "Just about even — the kind of week that builds patience.";
    if (trendingTowardGoal) {
      if (s.consistency >= 0.85) return "Steady, considered, on the move.";
      return "Quiet progress in the right direction.";
    }
    return "A small bounce. Most weeks have one.";
  }

  return (
    <div style={{ animation: "fadeIn 320ms ease both", maxWidth: 880 }}>
      <header style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--md-on-surface-variant)", fontWeight: 500 }}>
          Sunday recap
        </div>
        <h1 className="display" style={{ fontSize: "clamp(28px, 3.6vw, 40px)", margin: "8px 0 0 0" }}>
          The week of <span style={{ fontStyle: "italic" }}>{fmtDateLong(weekStart)}</span>
        </h1>
        <p style={{ color: "var(--md-on-surface-variant)", fontSize: 14.5, margin: "8px 0 0 0", maxWidth: 600 }}>
          Together the household logged{" "}
          <span className="num" style={{ color: "var(--md-on-surface)" }}>
            {summaries.reduce((a, s) => a + s.thisWeek.length, 0)}
          </span>{" "}
          {summaries.reduce((a, s) => a + s.thisWeek.length, 0) === 1 ? "entry" : "entries"}
          {" · "}
          {Math.round(householdConsistency * 100)}% of days covered.
        </p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        {summaries.map(({ m, thisWeek, delta, streak, lowest, consistency, endOfWeek }) => {
          const showDetails = m.shareDetails || m.isMe;
          const positive = delta != null && ((m.startWeightKg > m.goalWeightKg && delta < 0) || (m.startWeightKg < m.goalWeightKg && delta > 0));
          return (
            <article key={m.id} className="card" style={{ padding: 22, position: "relative" }}>
              <header style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                <Avatar member={m} size={44} />
                <div>
                  <div className="display" style={{ fontSize: 20, lineHeight: 1.1 }}>{m.displayName}</div>
                  <div style={{ fontSize: 12, color: "var(--md-on-surface-variant)" }}>
                    {thisWeek.length}/7 days · {streak.broken ? "streak reset" : `${streak.length}-day streak`}
                  </div>
                </div>
              </header>

              {/* Week dots */}
              <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
                {Array.from({ length: 7 }).map((_, i) => {
                  const day = new Date(+weekStart + i * 86400000);
                  const dayKey = day.toISOString().slice(0, 10);
                  const has = thisWeek.find((e) => e.date.slice(0, 10) === dayKey);
                  const isToday = day.toDateString() === today.toDateString();
                  return (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      <div title={fmtDate(day)} style={{
                        width: "100%", height: 8, borderRadius: 999,
                        background: has ? "var(--md-primary)" : "var(--md-surface-container-highest)",
                        opacity: has ? 1 : isToday ? 0.55 : 0.35,
                        boxShadow: isToday && !has ? `inset 0 0 0 1.5px var(--md-primary)` : "none",
                        transition: "background 240ms ease",
                      }} />
                      <div style={{ fontSize: 10, color: "var(--md-on-surface-variant)", letterSpacing: "0.04em" }}>
                        {day.toLocaleDateString("en-US", { weekday: "narrow" })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Numbers */}
              <div style={{ display: "grid", gridTemplateColumns: showDetails ? "1fr 1fr 1fr" : "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <DigestStat label="Days logged" value={`${thisWeek.length}/7`} />
                {showDetails ? (
                  <>
                    <DigestStat
                      label="This week"
                      value={delta != null ? fmtDelta(delta, units) : "—"}
                      tone={delta == null ? null : positive ? "good" : Math.abs(delta) < 0.15 ? null : "warn"}
                    />
                    <DigestStat
                      label="Lowest"
                      value={lowest != null ? fmtWeight(lowest, units, { unitless: true }) : "—"}
                    />
                  </>
                ) : (
                  <DigestStat
                    label="Direction"
                    value={delta == null ? "—" : Math.abs(delta) < 0.15 ? "steady" : positive ? "↓ toward goal" : "↑ slight"}
                    tone={delta == null ? null : positive ? "good" : null}
                  />
                )}
              </div>

              <div style={{
                fontStyle: "italic",
                fontFamily: "var(--font-display)",
                fontSize: 15,
                color: "var(--md-on-surface)",
                lineHeight: 1.45,
                paddingTop: 14,
                borderTop: "1px solid var(--md-outline-variant)",
              }}>
                {encouragement({ m, thisWeek, delta, consistency }, units)}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function DigestStat({ label, value, tone }) {
  const toneColor = tone === "good" ? "var(--md-primary)" : tone === "warn" ? "var(--md-error)" : "var(--md-on-surface)";
  return (
    <div>
      <div style={{ fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--md-on-surface-variant)", fontWeight: 500 }}>
        {label}
      </div>
      <div className="num display" style={{ fontSize: 22, marginTop: 4, color: toneColor, lineHeight: 1.1, letterSpacing: "-0.01em" }}>
        {value}
      </div>
    </div>
  );
}

// ---------- Add Member Modal ----------
function AddMemberModal({ onAdd, onClose }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    displayName: "",
    sex: "",
    age: "",
    heightCm: "",
    activityLevel: "",
    startWeightKg: "",
    goalWeightKg: "",
    targetDate: "",
    colorIdx: 2,
    shareDetails: false,
  });
  const [units, setUnits] = useState("");
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, [step]);

  function update(patch) { setForm({ ...form, ...patch }); setError(null); }
  function updateUnits(value) { setUnits(value); setError(null); }

  function validNumber(value) {
    return Number.isFinite(parseFloat(value));
  }

  function validateBasics() {
    if (!form.displayName.trim()) return "Please enter a name.";
    if (!units) return "Please select units.";
    if (!validNumber(form.heightCm) || parseFloat(form.heightCm) < (units === "imperial" ? 36 : 90)) return "Please enter a height.";
    if (!validNumber(form.age) || parseFloat(form.age) < 5 || parseFloat(form.age) > 110) return "Please enter a sensible age.";
    if (!form.sex) return "Please select sex.";
    if (!form.activityLevel) return "Please select activity level.";
    return null;
  }

  function validateWeights() {
    if (!validNumber(form.startWeightKg)) return "Please enter today's weight.";
    if (!validNumber(form.goalWeightKg)) return "Please enter a target weight.";
    if (!form.targetDate || Number.isNaN(new Date(form.targetDate).getTime())) return "Please select a target date.";
    return null;
  }

  async function commit() {
    const err = validateBasics() || validateWeights();
    if (err) { setError(err); return; }
    const heightCm = units === "imperial" ? parseFloat(form.heightCm) / CM_TO_IN : parseFloat(form.heightCm);
    const startKg = units === "imperial" ? lbToKg(parseFloat(form.startWeightKg)) : parseFloat(form.startWeightKg);
    const goalKg = units === "imperial" ? lbToKg(parseFloat(form.goalWeightKg)) : parseFloat(form.goalWeightKg);
    const targetDate = new Date(form.targetDate);
    targetDate.setHours(8, 0, 0, 0);
    try {
      await onAdd({
        displayName: form.displayName.trim(),
        initials: form.displayName.trim().slice(0, 2).toUpperCase(),
        sex: form.sex,
        age: parseInt(form.age, 10),
        heightCm: Math.round(heightCm * 10) / 10,
        activityLevel: parseFloat(form.activityLevel),
        startWeightKg: Math.round(startKg * 10) / 10,
        goalWeightKg: Math.round(goalKg * 10) / 10,
        targetDate: targetDate.toISOString(),
        colorIdx: form.colorIdx,
        shareDetails: form.shareDetails,
        units,
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not add member.");
    }
  }

  const palette = [0, 1, 2, 3, 4, 5];
  const startWeightError = error?.includes("today") ? error : null;
  const targetWeightError = error?.includes("target") ? error : null;
  const targetDateError = error?.includes("date") ? error : null;
  const stepOneError = error && !startWeightError && !targetWeightError && !targetDateError ? error : null;

  return (
    <Modal onClose={onClose} maxWidth={520}>
      <header style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--md-on-surface-variant)", fontWeight: 500 }}>
          New household member
        </div>
        <h2 className="display" style={{ fontSize: 28, margin: "6px 0 0 0", lineHeight: 1.1, letterSpacing: "-0.01em" }}>
          Welcome <span style={{ fontStyle: "italic" }}>them in.</span>
        </h2>
      </header>

      {step === 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Display name" error={error}>
            <input ref={inputRef} className="md-input" value={form.displayName} onChange={(e) => update({ displayName: e.target.value })} placeholder="Casey" />
          </Field>
          <Field label="Avatar tint">
            <div style={{ display: "flex", gap: 10 }}>
              {palette.map((i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Tint ${i + 1}`}
                  onClick={() => update({ colorIdx: i })}
                  style={{
                    width: 36, height: 36, borderRadius: 9999,
                    background: AVATAR_COLORS[i],
                    border: form.colorIdx === i ? "2px solid var(--md-on-surface)" : "2px solid transparent",
                    boxShadow: form.colorIdx === i ? "0 0 0 2px var(--md-surface)" : "none",
                    cursor: "pointer", transition: "transform 160ms ease",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.08)"}
                  onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                />
              ))}
            </div>
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 12 }}>
            <Field label="Age">
              <input className="md-input" type="number" value={form.age} onChange={(e) => update({ age: e.target.value })} />
            </Field>
            <Field label="Sex (for estimates)">
              <Select value={form.sex} onChange={(v) => update({ sex: v })} options={[{ value: "", label: "Select" }, { value: "F", label: "Female" }, { value: "M", label: "Male" }]} />
            </Field>
          </div>
          <Field label="Units">
            <Select value={units} onChange={updateUnits} options={[{ value: "", label: "Select units" }, { value: "metric", label: "Metric (kg, cm)" }, { value: "imperial", label: "Imperial (lb, in)" }]} />
          </Field>
          <Field label={units === "imperial" ? "Height (in)" : "Height (cm)"}>
            <input className="md-input" type="number" step="0.1" value={form.heightCm} onChange={(e) => update({ heightCm: e.target.value })} />
          </Field>
          <Field label="Activity level">
            <Select
              value={form.activityLevel}
              onChange={(v) => update({ activityLevel: v })}
              options={[
                { value: "", label: "Select activity" },
                { value: "1.2", label: "Sedentary" },
                { value: "1.4", label: "Light" },
                { value: "1.55", label: "Moderate" },
                { value: "1.7", label: "Active" },
                { value: "1.9", label: "Very active" },
              ]}
            />
          </Field>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, gap: 12 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={() => { const err = validateBasics(); if (err) { setError(err); return; } setStep(1); }}>
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={{ color: "var(--md-on-surface-variant)", fontSize: 13.5, margin: 0 }}>
            Add a starting point and target so progress cards have real context.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 12 }}>
            <Field label={units === "imperial" ? "Today's weight (lb)" : "Today's weight (kg)"} error={startWeightError}>
              <input className="md-input" type="number" step="0.1" value={form.startWeightKg} onChange={(e) => update({ startWeightKg: e.target.value })} placeholder="—" />
            </Field>
            <Field label={units === "imperial" ? "Target weight (lb)" : "Target weight (kg)"} error={targetWeightError}>
              <input className="md-input" type="number" step="0.1" value={form.goalWeightKg} onChange={(e) => update({ goalWeightKg: e.target.value })} placeholder="—" />
            </Field>
            <Field label="Target date" error={targetDateError}>
              <input className="md-input" type="date" value={form.targetDate} onChange={(e) => update({ targetDate: e.target.value })} />
            </Field>
          </div>
          {stepOneError && <p style={{ color: "var(--md-error)", fontSize: 13, margin: 0 }}>{stepOneError}</p>}
          <ToggleRow
            label="Share exact numbers in Household"
            sub="Off by default. Each member can change this themselves later."
            checked={form.shareDetails}
            onChange={(v) => update({ shareDetails: v })}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setStep(0)}>Back</button>
            <button type="button" className="btn btn-primary" onClick={commit}>
              <Icon.Check /> Add to household
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ---------- First-of-month recap ----------
function FirstOfMonthCard({ me, entries, units, onDismiss }) {
  const today = window.__fixtures.today;
  const dayOfMonth = today.getDate();
  if (dayOfMonth > 7) return null; // only show first week of month

  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const myEntries = entries.filter((e) => e.memberId === me.id);
  const lastMonthEntries = myEntries.filter((e) => {
    const d = new Date(e.date);
    return d >= lastMonth && d < thisMonthStart;
  }).sort((a, b) => +new Date(a.date) - +new Date(b.date));

  if (lastMonthEntries.length < 2) return null;

  const start = lastMonthEntries[0];
  const end = lastMonthEntries[lastMonthEntries.length - 1];
  const delta = end.weightKg - start.weightKg;
  const losing = me.startWeightKg > me.goalWeightKg;
  const positive = (losing && delta < 0) || (!losing && delta > 0);
  const daysInMonth = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
  const consistency = lastMonthEntries.length / daysInMonth;

  return (
    <section className="card" style={{
      padding: 22,
      marginBottom: 24,
      background: "linear-gradient(180deg, var(--md-secondary-container) 0%, var(--md-surface-container-low) 100%)",
      border: "1px solid var(--md-outline-variant)",
      animation: "fadeIn 280ms ease both",
      position: "relative",
      overflow: "hidden",
    }}>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onDismiss}
        style={{ position: "absolute", top: 14, right: 14, background: "transparent", border: 0, color: "var(--md-on-surface-variant)", cursor: "pointer", padding: 4, borderRadius: 9999 }}
      >
        <Icon.X />
      </button>
      <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--md-on-surface-variant)", fontWeight: 500 }}>
        A new month
      </div>
      <h3 className="display" style={{ fontSize: 24, margin: "6px 0 12px 0", letterSpacing: "-0.01em", lineHeight: 1.15 }}>
        Looking back on <span style={{ fontStyle: "italic" }}>{lastMonth.toLocaleDateString("en-US", { month: "long" })}</span>
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 18, marginBottom: 12 }}>
        <DigestStat label="Days logged" value={`${lastMonthEntries.length}/${daysInMonth}`} />
        <DigestStat
          label="Net change"
          value={fmtDelta(delta, units)}
          tone={Math.abs(delta) < 0.2 ? null : positive ? "good" : "warn"}
        />
        <DigestStat label="Consistency" value={`${Math.round(consistency * 100)}%`} />
      </div>
      <p style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 15, color: "var(--md-on-surface)", margin: 0, lineHeight: 1.5 }}>
        {Math.abs(delta) < 0.2
          ? "A steady month. Maintenance is its own kind of progress."
          : positive
          ? consistency > 0.7 ? "A considered month — consistent and quietly downward." : "Real progress, even with a few quiet days."
          : "Not the direction you wanted, but the honest record matters more than the number."}
      </p>
    </section>
  );
}

// ---------- Empty/first-entry dashboard state ----------
function EmptyDashboard({ me, entries, onLogToday }) {
  const myEntries = entries.filter((e) => e.memberId === me.id);
  const count = myEntries.length;
  const today = window.__fixtures.today;
  const hour = today.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div style={{ animation: "fadeIn 320ms ease both", maxWidth: 720 }}>
      <header style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 13, color: "var(--md-on-surface-variant)", letterSpacing: "0.04em" }}>
          {fmtDateLong(today)}
        </div>
        <h1 className="display" style={{ fontSize: "clamp(32px, 4.6vw, 48px)", margin: "8px 0 0 0", lineHeight: 1.1, letterSpacing: "-0.02em" }}>
          {greeting}, <span style={{ fontStyle: "italic" }}>{me.displayName}.</span>
        </h1>
      </header>

      <section className="card" style={{ padding: "44px 36px", marginBottom: 18, position: "relative", overflow: "hidden" }}>
        <div aria-hidden style={{
          position: "absolute", inset: 0, opacity: 0.4, pointerEvents: "none",
          background: "radial-gradient(circle at 100% 0%, var(--md-secondary-container) 0%, transparent 50%)",
        }} />
        <div style={{ position: "relative" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "4px 12px", borderRadius: 9999, background: "var(--md-surface-container-high)", fontSize: 11.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--md-on-surface-variant)", marginBottom: 18 }}>
            <Icon.Sparkle width="14" height="14" /> Just getting started
          </div>
          <h2 className="display" style={{ fontSize: 32, margin: "0 0 12px 0", letterSpacing: "-0.02em", lineHeight: 1.15 }}>
            {count === 0 ? (
              <>One <span style={{ fontStyle: "italic" }}>small step</span> begins it.</>
            ) : (
              <>You've made <span style={{ fontStyle: "italic" }}>a beginning.</span></>
            )}
          </h2>
          <p style={{ color: "var(--md-on-surface-variant)", fontSize: 15.5, lineHeight: 1.55, maxWidth: 460, margin: "0 0 24px 0" }}>
            {count === 0
              ? "Log today's weight to start your record. The chart and stats appear once you've a few days behind you — usually three or four."
              : `${count} entr${count === 1 ? "y" : "ies"} so far. ${3 - count > 0 ? `${3 - count} more day${3 - count === 1 ? "" : "s"} and your trend line will appear.` : "Your trend line is on its way."}`}
          </p>
          <button className="btn btn-primary btn-large" onClick={onLogToday}>
            <Icon.Plus /> Log today's weight
          </button>
        </div>
      </section>

      {count > 0 && (
        <section style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--md-on-surface-variant)", fontWeight: 500, marginBottom: 12 }}>
            Your entries so far
          </div>
          <div className="card">
            {myEntries.slice(0, 3).map((e, i, arr) => (
              <div key={e.id} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "16px 22px",
                borderBottom: i < arr.length - 1 ? "1px solid var(--md-outline-variant)" : "none",
              }}>
                <div>
                  <div className="display" style={{ fontSize: 18, lineHeight: 1.1 }}>
                    {fmtDate(e.date, { relative: true })}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--md-on-surface-variant)" }}>
                    {fmtDateLong(e.date)}
                  </div>
                </div>
                <div className="num display" style={{ fontSize: 22 }}>
                  {fmtWeight(e.weightKg, "metric")}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
        <HintCard
          icon={<Icon.People />}
          title="Bring others in"
          body="Add household members from Profile → Household. Everyone gets their own dashboard."
        />
        <HintCard
          icon={<Icon.List />}
          title="Backfill old entries"
          body="If you've been weighing for a while, paste in past dates from Entries."
        />
      </section>
    </div>
  );
}

function HintCard({ icon, title, body }) {
  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--md-on-surface-variant)", marginBottom: 8 }}>
        {icon}
        <span style={{ fontSize: 11.5, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 500 }}>{title}</span>
      </div>
      <div style={{ fontSize: 13.5, color: "var(--md-on-surface)", lineHeight: 1.5 }}>{body}</div>
    </div>
  );
}

// Avatar tint palette (must match Avatar in lib)
const AVATAR_COLORS = [
  "oklch(72% 0.10 80)",   // amber
  "oklch(70% 0.09 25)",   // terracotta
  "oklch(70% 0.08 145)",  // sage
  "oklch(70% 0.10 230)",  // blue
  "oklch(72% 0.10 305)",  // violet
  "oklch(74% 0.06 60)",   // sand
];

Object.assign(window, {
  WeeklyDigestScreen, AddMemberModal, FirstOfMonthCard, EmptyDashboard, HintCard,
  AVATAR_COLORS,
});


// ---- household.jsx ----
// household.jsx — unified Household screen with Now / This week / This month modes.
// Replaces the previous standalone HouseholdScreen + WeeklyDigestScreen tabs.

const { useState: useStateH, useMemo: useMemoH } = React;

function HouseholdScreenUnified({ me, members, entries, units, onTogglePrivacy, onAddMember }) {
  const [mode, setMode] = useStateH("now"); // "now" | "week" | "month"
  const today = window.__fixtures.today;

  // Range bounds per mode
  const ranges = useMemoH(() => {
    const weekStart = new Date(+today - 6 * 86400000); weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(+today + 86400000);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const daysInMonth = Math.round((+monthEnd - +monthStart) / 86400000);
    return { weekStart, weekEnd, monthStart, monthEnd, daysInMonth };
  }, [+today]);

  const summaries = useMemoH(() => members.map((m) => summarize(m, entries, ranges)), [members, entries, ranges]);
  const totalThisWeek = summaries.reduce((a, s) => a + s.weekEntries.length, 0);
  const totalThisMonth = summaries.reduce((a, s) => a + s.monthEntries.length, 0);
  const householdWeekConsistency = summaries.reduce((a, s) => a + s.weekEntries.length / 7, 0) / Math.max(1, summaries.length);
  const householdMonthConsistency = summaries.reduce((a, s) => a + s.monthEntries.length / ranges.daysInMonth, 0) / Math.max(1, summaries.length);

  return (
    <div style={{ animation: "fadeIn 320ms ease both" }}>
      <header style={{ marginBottom: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <h1 className="serif" style={{ fontSize: "clamp(28px, 3.6vw, 40px)", fontWeight: 400, margin: 0, letterSpacing: "-0.02em" }}>
            {mode === "now" && (<><span className="serif-it">The</span> household</>)}
            {mode === "week" && (<>Week of <span className="serif-it">{ranges.weekStart.toLocaleDateString("en-US", { month: "long", day: "numeric" })}</span></>)}
            {mode === "month" && (<>Month of <span className="serif-it">{ranges.monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span></>)}
          </h1>
          {onAddMember && (
            <button className="btn" onClick={onAddMember}>
              <Icon.Plus /> Add a member
            </button>
          )}
        </div>
        <p style={{ color: "var(--md-on-surface-variant)", fontSize: 14, margin: "6px 0 0 0", maxWidth: 580 }}>
          {mode === "now" && "Everyone's quiet progress, in one view. Exact numbers stay private unless a member chooses to share them."}
          {mode === "week" && (<>Together the household logged <span className="num" style={{ color: "var(--md-on-surface)" }}>{totalThisWeek}</span> {totalThisWeek === 1 ? "entry" : "entries"} · {Math.round(householdWeekConsistency * 100)}% of days covered.</>)}
          {mode === "month" && (<>Together: <span className="num" style={{ color: "var(--md-on-surface)" }}>{totalThisMonth}</span> {totalThisMonth === 1 ? "entry" : "entries"} across {ranges.daysInMonth} days · {Math.round(householdMonthConsistency * 100)}% covered.</>)}
        </p>
        <div style={{ marginTop: 18 }}>
          <ModeToggle value={mode} onChange={setMode} />
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 18 }}>
        {summaries.map((s) => (
          <MemberCard
            key={s.m.id}
            mode={mode}
            summary={s}
            ranges={ranges}
            entries={entries.filter((e) => e.memberId === s.m.id)}
            me={me}
            units={units}
            onTogglePrivacy={onTogglePrivacy}
          />
        ))}
      </div>
    </div>
  );
}

function ModeToggle({ value, onChange }) {
  const opts = [
    { id: "now", label: "Now" },
    { id: "week", label: "This week" },
    { id: "month", label: "This month" },
  ];
  return (
    <div className="range-bar" role="tablist" aria-label="Household timeframe">
      {opts.map((o) => (
        <button
          key={o.id}
          role="tab"
          aria-selected={value === o.id}
          data-active={value === o.id}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function summarize(m, allEntries, ranges) {
  const list = allEntries.filter((e) => e.memberId === m.id).sort((a, b) => +new Date(a.date) - +new Date(b.date));
  const inRange = (e, start, end) => { const t = +new Date(e.date); return t >= +start && t < +end; };
  const weekEntries = list.filter((e) => inRange(e, ranges.weekStart, ranges.weekEnd));
  const monthEntries = list.filter((e) => inRange(e, ranges.monthStart, ranges.monthEnd));
  const prevWeekStart = new Date(+ranges.weekStart - 7 * 86400000);
  const prevWeekEntries = list.filter((e) => inRange(e, prevWeekStart, ranges.weekStart));
  const prevMonthStart = new Date(ranges.monthStart.getFullYear(), ranges.monthStart.getMonth() - 1, 1);
  const prevMonthEntries = list.filter((e) => inRange(e, prevMonthStart, ranges.monthStart));

  const latest = list[list.length - 1];
  const streak = calcStreak(list, m.resetGracePeriodDays);

  // Week delta: bridge from last entry of prior week (or first this week)
  const weekStartRef = prevWeekEntries[prevWeekEntries.length - 1] || weekEntries[0];
  const weekEndRef = weekEntries[weekEntries.length - 1];
  const weekDelta = weekStartRef && weekEndRef ? weekEndRef.weightKg - weekStartRef.weightKg : null;
  const weekLowest = weekEntries.length ? Math.min(...weekEntries.map((e) => e.weightKg)) : null;

  // Month delta
  const monthStartRef = prevMonthEntries[prevMonthEntries.length - 1] || monthEntries[0];
  const monthEndRef = monthEntries[monthEntries.length - 1];
  const monthDelta = monthStartRef && monthEndRef ? monthEndRef.weightKg - monthStartRef.weightKg : null;
  const monthLowest = monthEntries.length ? Math.min(...monthEntries.map((e) => e.weightKg)) : null;
  const monthHighest = monthEntries.length ? Math.max(...monthEntries.map((e) => e.weightKg)) : null;
  const monthSwing = monthLowest != null && monthHighest != null ? monthHighest - monthLowest : null;

  return { m, list, latest, streak, weekEntries, monthEntries, weekDelta, weekLowest, monthDelta, monthLowest, monthSwing };
}

function MemberCard({ mode, summary, ranges, entries, me, units, onTogglePrivacy }) {
  const { m, latest, streak } = summary;
  const isMe = m.id === me.id;
  const showDetails = m.shareDetails || isMe;
  const broken = streak.broken;
  const sinceLast = streak.lastEntry ? Math.floor((+window.__fixtures.today - +new Date(streak.lastEntry.date)) / 86400000) : null;

  return (
    <article
      className="card"
      style={{
        padding: 22,
        opacity: broken ? 0.66 : 1,
        position: "relative",
        transition: "opacity 200ms ease",
      }}
    >
      {isMe && (
        <span className="chip" style={{ position: "absolute", top: 14, right: 14, fontSize: 10.5 }}>you</span>
      )}
      <header style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
        <Avatar member={m} size={48} />
        <div>
          <div className="serif" style={{ fontSize: 22, lineHeight: 1.1, letterSpacing: "-0.01em" }}>
            {m.displayName}
          </div>
          <div style={{ fontSize: 12, color: "var(--md-on-surface-variant)", marginTop: 2, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {broken ? (
              <span className="chip chip-warn" style={{ fontSize: 10.5 }}>streak reset · {sinceLast}d ago</span>
            ) : streak.length > 0 ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Icon.Flame /> <span className="num mono">{streak.length}</span>-day streak
              </span>
            ) : (
              <span className="serif-it">just starting out</span>
            )}
            {!showDetails && !isMe && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "var(--md-outline)" }}>
                <Icon.Lock /> private
              </span>
            )}
          </div>
        </div>
      </header>

      {mode === "now" && <NowBody summary={summary} entries={entries} units={units} showDetails={showDetails} />}
      {mode === "week" && <WeekBody summary={summary} ranges={ranges} units={units} showDetails={showDetails} />}
      {mode === "month" && <MonthBody summary={summary} ranges={ranges} units={units} showDetails={showDetails} />}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--md-outline-variant)", paddingTop: 14, marginTop: 14 }}>
        <Sparkline entries={entries} width={120} height={28} />
        {isMe && (
          <button
            className="btn-ghost focus-ring"
            onClick={onTogglePrivacy}
            style={{ padding: "4px 10px", border: 0, background: "transparent", color: "var(--md-on-surface-variant)", fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Icon.Lock />
            {m.shareDetails ? "Sharing details" : "Hiding details"}
          </button>
        )}
      </div>
    </article>
  );
}

// ----- Now -----
function NowBody({ summary, entries, units, showDetails }) {
  const { m, latest } = summary;
  const progress = progressFraction(m, latest?.weightKg);
  const trend = trendDirection(entries, 14);

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
          <span className="md-label-s" style={{ textTransform: "uppercase", color: "var(--md-on-surface-variant)" }}>Toward goal</span>
          <span className="serif" style={{ fontSize: 18 }}>
            <span className="num">{Math.round(progress * 100)}</span>
            <span style={{ fontSize: 13, color: "var(--md-on-surface-variant)" }}>%</span>
          </span>
        </div>
        <ProgressBar fraction={progress} />
      </div>

      {showDetails ? (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 14 }}>
          <Stat label="Now" value={fmtWeight(latest?.weightKg, units, { unitless: true })} suffix={unitSuffix(units)} />
          <Stat label="Goal" value={fmtWeight(m.goalWeightKg, units, { unitless: true })} dim />
          <Stat label="BMI" value={calcBMI(latest?.weightKg, m.heightCm)?.toFixed(1)} />
          <Stat
            label="14-day"
            value={fmtDelta(trend.deltaKg, units)}
            tone={trend.direction === "down" ? "good" : trend.direction === "up" ? "warn" : null}
          />
        </div>
      ) : (
        <div style={{ padding: "12px 14px", background: "var(--md-surface-container)", borderRadius: 12, fontSize: 13, color: "var(--md-on-surface-variant)" }}>
          <div className="serif-it">Sharing relative progress only.</div>
          <div style={{ marginTop: 4, fontSize: 12 }}>
            {trend.direction === "down" ? "Trending downward" : trend.direction === "up" ? "Trending upward" : "Holding steady"} this fortnight.
          </div>
        </div>
      )}
    </>
  );
}

// ----- Week -----
function WeekBody({ summary, ranges, units, showDetails }) {
  const { m, weekEntries, weekDelta, weekLowest } = summary;
  const today = window.__fixtures.today;
  const positive = weekDelta != null && ((m.startWeightKg > m.goalWeightKg && weekDelta < 0) || (m.startWeightKg < m.goalWeightKg && weekDelta > 0));
  const consistency = weekEntries.length / 7;

  return (
    <>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {Array.from({ length: 7 }).map((_, i) => {
          const day = new Date(+ranges.weekStart + i * 86400000);
          const dayKey = day.toISOString().slice(0, 10);
          const has = weekEntries.find((e) => e.date.slice(0, 10) === dayKey);
          const isToday = day.toDateString() === today.toDateString();
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div title={fmtDate(day)} style={{
                width: "100%", height: 8, borderRadius: 999,
                background: has ? "var(--md-primary)" : "var(--md-surface-container-highest)",
                opacity: has ? 1 : isToday ? 0.55 : 0.35,
                boxShadow: isToday && !has ? `inset 0 0 0 1.5px var(--md-primary)` : "none",
              }} />
              <div style={{ fontSize: 10, color: "var(--md-on-surface-variant)", letterSpacing: "0.04em" }}>
                {day.toLocaleDateString("en-US", { weekday: "narrow" })}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: showDetails ? "1fr 1fr 1fr" : "1fr 1fr", gap: 14 }}>
        <Stat label="Days" value={`${weekEntries.length}/7`} />
        {showDetails ? (
          <>
            <Stat label="Delta" value={weekDelta != null ? fmtDelta(weekDelta, units) : "—"} tone={weekDelta == null ? null : positive ? "good" : Math.abs(weekDelta) < 0.15 ? null : "warn"} />
            <Stat label="Lowest" value={weekLowest != null ? fmtWeight(weekLowest, units, { unitless: true }) : "—"} />
          </>
        ) : (
          <Stat
            label="Direction"
            value={weekDelta == null ? "—" : Math.abs(weekDelta) < 0.15 ? "steady" : positive ? "↓ on track" : "↑ slight"}
            tone={weekDelta == null ? null : positive ? "good" : null}
          />
        )}
      </div>

      <Encouragement copy={weekCopy({ weekEntries, weekDelta, consistency, positive })} />
    </>
  );
}

// ----- Month -----
function MonthBody({ summary, ranges, units, showDetails }) {
  const { m, monthEntries, monthDelta, monthLowest, monthSwing } = summary;
  const today = window.__fixtures.today;
  const positive = monthDelta != null && ((m.startWeightKg > m.goalWeightKg && monthDelta < 0) || (m.startWeightKg < m.goalWeightKg && monthDelta > 0));
  const consistency = monthEntries.length / ranges.daysInMonth;
  const dayKeys = new Set(monthEntries.map((e) => e.date.slice(0, 10)));

  // Build a calendar-shaped grid: weeks of 7 dots starting from the first day of the month.
  // Pad leading days to align Mon-Sun; we use Sun-Sat (US default) for compactness.
  const firstDay = new Date(ranges.monthStart);
  const startOffset = firstDay.getDay(); // 0..6 Sun-Sat
  const totalCells = Math.ceil((startOffset + ranges.daysInMonth) / 7) * 7;
  const cells = Array.from({ length: totalCells }).map((_, idx) => {
    const dayNum = idx - startOffset + 1;
    if (dayNum < 1 || dayNum > ranges.daysInMonth) return { empty: true };
    const date = new Date(ranges.monthStart.getFullYear(), ranges.monthStart.getMonth(), dayNum);
    const key = date.toISOString().slice(0, 10);
    return {
      empty: false,
      date,
      has: dayKeys.has(key),
      isToday: date.toDateString() === today.toDateString(),
      isFuture: +date > +today,
    };
  });

  return (
    <>
      {/* Calendar dot grid */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 6 }}>
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div key={i} style={{ fontSize: 9.5, textAlign: "center", color: "var(--md-on-surface-variant)", letterSpacing: "0.06em" }}>{d}</div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {cells.map((c, i) => {
            if (c.empty) return <div key={i} style={{ aspectRatio: "1 / 1" }} />;
            const bg = c.has ? "var(--md-primary)" : "var(--md-surface-container-highest)";
            const op = c.has ? 1 : c.isFuture ? 0.18 : c.isToday ? 0.55 : 0.45;
            return (
              <div
                key={i}
                title={fmtDate(c.date)}
                style={{
                  aspectRatio: "1 / 1",
                  borderRadius: 4,
                  background: bg,
                  opacity: op,
                  boxShadow: c.isToday && !c.has ? "inset 0 0 0 1.5px var(--md-primary)" : "none",
                }}
              />
            );
          })}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: showDetails ? "1fr 1fr 1fr" : "1fr 1fr", gap: 14 }}>
        <Stat label="Days" value={`${monthEntries.length}/${ranges.daysInMonth}`} />
        {showDetails ? (
          <>
            <Stat label="Delta" value={monthDelta != null ? fmtDelta(monthDelta, units) : "—"} tone={monthDelta == null ? null : positive ? "good" : Math.abs(monthDelta) < 0.3 ? null : "warn"} />
            <Stat label="Swing" value={monthSwing != null ? fmtDelta(monthSwing, units) : "—"} dim />
          </>
        ) : (
          <Stat
            label="Direction"
            value={monthDelta == null ? "—" : Math.abs(monthDelta) < 0.3 ? "steady" : positive ? "↓ on track" : "↑ drifting"}
            tone={monthDelta == null ? null : positive ? "good" : null}
          />
        )}
      </div>

      <Encouragement copy={monthCopy({ monthEntries, monthDelta, consistency, positive, daysInMonth: ranges.daysInMonth })} />
    </>
  );
}

// ----- Shared bits -----
function Stat({ label, value, tone, dim, suffix }) {
  const color = tone === "good" ? "var(--md-primary)" : tone === "warn" ? "var(--md-error)" : dim ? "var(--md-on-surface-variant)" : "var(--md-on-surface)";
  return (
    <div>
      <div className="md-label-s" style={{ textTransform: "uppercase", color: "var(--md-on-surface-variant)" }}>{label}</div>
      <div className="num serif" style={{ fontSize: 20, marginTop: 4, color, lineHeight: 1.15, letterSpacing: "-0.01em" }}>
        {value}
        {suffix && <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--md-on-surface-variant)", marginLeft: 4 }}>{suffix}</span>}
      </div>
    </div>
  );
}

function Encouragement({ copy }) {
  return (
    <div style={{
      fontStyle: "italic",
      fontFamily: "var(--serif)",
      fontSize: 14.5,
      color: "var(--md-on-surface)",
      lineHeight: 1.45,
      paddingTop: 14,
      marginTop: 14,
      borderTop: "1px dashed var(--md-outline-variant)",
    }}>
      {copy}
    </div>
  );
}

function weekCopy({ weekEntries, weekDelta, consistency, positive }) {
  if (!weekEntries.length) return "A quiet week. Tomorrow's a clean page.";
  if (!weekDelta) return weekEntries.length === 1 ? "First entry of the week — a beginning." : "Holding steady this week.";
  if (Math.abs(weekDelta) < 0.15) return "Just about even — the kind of week that builds patience.";
  if (positive) return consistency >= 0.85 ? "Steady, considered, on the move." : "Quiet progress in the right direction.";
  return "A small bounce. Most weeks have one.";
}

function monthCopy({ monthEntries, monthDelta, consistency, positive, daysInMonth }) {
  if (!monthEntries.length) return "A quiet month. The page is still open.";
  if (consistency >= 0.9 && positive) return "A patient month — and it shows.";
  if (consistency >= 0.7 && positive) return "Steady weighing, slow movement, real progress.";
  if (consistency >= 0.7 && !positive && Math.abs(monthDelta || 0) < 0.5) return "Almost flat. Sometimes that's the work.";
  if (consistency < 0.4) return "Light on entries this month — that's allowed.";
  if (positive) return "Trending the right way. The month is what it is.";
  if (monthDelta != null && Math.abs(monthDelta) > 1) return "A drift this month. Next page begins on the 1st.";
  return "Holding the line.";
}

Object.assign(window, { HouseholdScreenUnified });


// ---- app.jsx ----
// app.jsx — root, routing, state, navigation, tweaks.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "system",
  "showFirstRun": false,
  "demoMilestone": false
}/*EDITMODE-END*/;

// Centralized app store
const __store = {
  state: {
    members: window.__fixtures.members,
    entries: window.__fixtures.entries,
  },
  listeners: new Set(),
  notify() { this.listeners.forEach((fn) => fn()); },
};
window.__app = __store;

function useStore() {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    __store.listeners.add(fn);
    return () => __store.listeners.delete(fn);
  }, []);
  return __store.state;
}

function NavRail({ tab, onTab, me }) {
  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: <Icon.Home /> },
    { id: "entries", label: "Entries", icon: <Icon.List /> },
    { id: "household", label: "Household", icon: <Icon.People /> },
    { id: "profile", label: "Profile", icon: <Icon.Profile /> },
  ];
  return (
    <aside style={{
      display: "flex", flexDirection: "column",
      padding: "24px 12px",
      background: "var(--md-surface-container-low)",
      position: "sticky", top: 0, height: "100vh",
      width: 240,
    }}>
      <div style={{ marginBottom: 24, padding: "0 16px 8px", width: "100%" }}>
        <Logo size={82} width="100%" />
      </div>
      <nav style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => onTab(t.id)}
            className="focus-ring"
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "0 16px",
              height: 56,
              border: 0,
              borderRadius: 9999,
              background: tab === t.id ? "var(--md-secondary-container)" : "transparent",
              color: tab === t.id ? "var(--md-on-secondary-container)" : "var(--md-on-surface-variant)",
              fontSize: 14, fontWeight: tab === t.id ? 500 : 500,
              letterSpacing: "0.1px",
              cursor: "pointer",
              textAlign: "left",
              transition: "background 160ms cubic-bezier(.2,0,0,1), color 160ms ease",
              fontFamily: "var(--sans)",
            }}
            onMouseEnter={(e) => { if (tab !== t.id) e.currentTarget.style.background = "rgba(0,0,0,0.04)"; }}
            onMouseLeave={(e) => { if (tab !== t.id) e.currentTarget.style.background = "transparent"; }}
          >
            <span style={{ display: "inline-flex", color: tab === t.id ? "var(--md-on-secondary-container)" : "var(--md-on-surface-variant)" }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>

      {/* Member chip */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", marginTop: 12, borderTop: "1px solid var(--md-outline-variant)" }}>
        <Avatar member={me} size={36} />
        <div style={{ minWidth: 0 }}>
          <div className="md-title-s" style={{ color: "var(--md-on-surface)" }}>{me.displayName}</div>
          <div className="md-body-s" style={{ color: "var(--md-on-surface-variant)" }}>{window.__fixtures.household.name}</div>
        </div>
      </div>
    </aside>
  );
}

function MobileNav({ tab, onTab }) {
  const tabs = [
    { id: "dashboard", label: "Today", icon: <Icon.Home /> },
    { id: "entries", label: "Entries", icon: <Icon.List /> },
    { id: "household", label: "Household", icon: <Icon.People /> },
    { id: "profile", label: "Profile", icon: <Icon.Profile /> },
  ];
  return (
    <nav style={{
      position: "fixed",
      left: 0, right: 0, bottom: 0,
      background: "var(--md-surface-container)",
      borderTop: "0",
      padding: "12px 8px calc(env(safe-area-inset-bottom, 0px) + 16px) 8px",
      display: "flex",
      justifyContent: "space-around",
      zIndex: 40,
      height: 80,
      boxShadow: "var(--md-elev-2)",
    }}>
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onTab(t.id)}
          className="focus-ring"
          style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            padding: "0",
            border: 0, background: "transparent",
            color: tab === t.id ? "var(--md-on-surface)" : "var(--md-on-surface-variant)",
            fontSize: 12, fontWeight: 500,
            letterSpacing: "0.5px",
            cursor: "pointer",
            fontFamily: "var(--sans)",
            flex: 1,
          }}
        >
          <span style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 64, height: 32,
            borderRadius: 9999,
            background: tab === t.id ? "var(--md-secondary-container)" : "transparent",
            color: tab === t.id ? "var(--md-on-secondary-container)" : "var(--md-on-surface-variant)",
            transition: "background 200ms cubic-bezier(.2,0,0,1)",
          }}>{t.icon}</span>
          {t.label}
        </button>
      ))}
    </nav>
  );
}

function MobileHeader({ me, tab }) {
  const titles = { dashboard: "Today", entries: "Entries", household: "Household", profile: "Profile" };
  void titles;
  return (
    <header style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "12px 16px",
      position: "sticky", top: 0,
      background: "var(--md-surface-container)",
      zIndex: 30,
      height: 64,
    }}>
      <Logo size={28} width={70} />
      <Avatar member={me} size={32} />
    </header>
  );
}

function App() {
  const state = useStore();
  const [tab, setTab] = useState("dashboard");
  const [units, setUnits] = useState("metric");
  const [logModal, setLogModal] = useState(null);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [milestone, setMilestone] = useState(null);
  const [tweaks, setTweaks] = useTweaks(TWEAK_DEFAULTS);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 900);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [bootstrapError, setBootstrapError] = useState(null);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    let active = true;
    db.bootstrap()
      .catch((error) => {
        if (active) setBootstrapError(error);
      })
      .finally(() => {
        if (active) setBootstrapped(true);
      });
    return () => {
      active = false;
    };
  }, []);

  // Apply theme
  useEffect(() => {
    const t = tweaks.theme;
    if (t === "light" || !t) document.documentElement.removeAttribute("data-theme");
    else document.documentElement.dataset.theme = t;
  }, [tweaks.theme]);

  const me = state.members.find((m) => m.isMe);

  useEffect(() => {
    if (me?.units) setUnits(me.units);
  }, [me?.units]);

  function handleSaveEntry(entry) {
    db.upsertEntry(entry);
    // Detect milestone
    const myAfter = state.entries.filter((e) => e.memberId === me.id);
    const sorted = [...myAfter].sort((a, b) => +new Date(b.date) - +new Date(a.date));
    const latest = sorted[0];
    const reachedGoal =
      (me.startWeightKg > me.goalWeightKg && latest.weightKg <= me.goalWeightKg) ||
      (me.startWeightKg < me.goalWeightKg && latest.weightKg >= me.goalWeightKg);
    if (reachedGoal && me.milestoneAlerts) setMilestone({ kind: "goal" });
    setLogModal(null);
  }

  // Demo trigger via tweak
  useEffect(() => {
    if (tweaks.demoMilestone) {
      setMilestone({ kind: "goal" });
      setTweaks("demoMilestone", false);
    }
  }, [tweaks.demoMilestone]);

  if (!bootstrapped) {
    return (
      <div className="app-shell" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <Logo size={34} />
      </div>
    );
  }

  if (bootstrapError) {
    return (
      <div className="app-shell" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
        <section className="card" style={{ maxWidth: 420, padding: 28, textAlign: "center" }}>
          <Logo size={34} />
          <h1 className="md-title-l" style={{ margin: "20px 0 8px" }}>Home Assistant sign-in required</h1>
          <p className="md-body-m" style={{ color: "var(--md-on-surface-variant)", margin: 0 }}>
            Open this add-on through Home Assistant ingress to load your health profile.
          </p>
        </section>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="app-shell" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
        <section className="card" style={{ maxWidth: 420, padding: 28, textAlign: "center" }}>
          <Logo size={34} />
          <h1 className="md-title-l" style={{ margin: "20px 0 8px" }}>Profile unavailable</h1>
          <p className="md-body-m" style={{ color: "var(--md-on-surface-variant)", margin: 0 }}>
            Home Assistant Health could not load your profile.
          </p>
        </section>
      </div>
    );
  }

  if (tweaks.showFirstRun || !me.profileComplete) {
    return (
      <FirstRun
        profile={me}
        onDone={async (profile) => {
          await db.updateMember(me.id, profile, { throwOnError: true });
          setUnits(profile.units);
          setTweaks("showFirstRun", false);
        }}
      />
    );
  }

  // Memoize the entries view so the EntriesScreen edits route through modal
  function openEdit(entry) { setLogModal({ existing: entry }); }
  function openBackfill(dateISO) { setLogModal({ existing: dateISO ? { date: dateISO } : null, backfill: true }); }
  function openToday() {
    const myEntries = state.entries.filter((e) => e.memberId === me.id);
    const today = window.__fixtures.today;
    const todayKey = today.toISOString().slice(0, 10);
    const existing = myEntries.find((e) => e.date.slice(0, 10) === todayKey);
    setLogModal({ existing: existing || null });
  }

  const screen = (() => {
    switch (tab) {
      case "dashboard": return <Dashboard me={me} entries={state.entries} units={units} onLogToday={openToday} onEditEntry={openEdit} />;
      case "entries": return <EntriesScreen me={me} entries={state.entries} units={units} onEdit={openEdit} onBackfill={openBackfill} />;
      case "household": return <HouseholdScreenUnified me={me} members={state.members} entries={state.entries} units={units} onTogglePrivacy={() => db.updateMember(me.id, { shareDetails: !me.shareDetails })} onAddMember={() => setAddMemberOpen(true)} />;
      case "profile": return <ProfileScreen me={me} units={units} onUpdate={(patch) => db.updateMember(me.id, patch)} onUnits={setUnits} />;
    }
  })();

  return (
    <>
      <div className="app-shell">
        {!isMobile && <NavRail tab={tab} onTab={setTab} me={me} />}
        <main style={{
          padding: isMobile ? "0 0 100px 0" : "44px 56px 80px 56px",
          minWidth: 0,
          overflowX: "hidden",
        }}>
          {isMobile && <MobileHeader me={me} tab={tab} />}
          <div style={{ padding: isMobile ? "20px 18px 24px" : 0, maxWidth: 1180 }}>
            {screen}
          </div>
        </main>
        {isMobile && <MobileNav tab={tab} onTab={setTab} />}
      </div>

      {logModal && (
        <LogWeightModal
          me={me}
          units={units}
          existingEntry={logModal.existing}
          onSave={handleSaveEntry}
          onClose={() => setLogModal(null)}
        />
      )}

      {milestone && (
        <MilestoneModal
          kind={milestone.kind}
          member={me}
          onSetNewGoal={() => { setMilestone(null); setTab("profile"); }}
          onMaintain={() => { db.updateMember(me.id, { goalWeightKg: me.goalWeightKg }); setMilestone(null); }}
          onClose={() => setMilestone(null)}
        />
      )}

      {addMemberOpen && (
        <AddMemberModal
          onAdd={async (profile) => { await db.addMember(profile); setAddMemberOpen(false); }}
          onClose={() => setAddMemberOpen(false)}
        />
      )}

      <TweaksPanel title="Tweaks">
        <TweakSection label="Theme">
          <TweakSelect
            label="Color scheme"
            value={tweaks.theme}
            onChange={(v) => setTweaks("theme", v)}
            options={[
              { value: "system", label: "System" },
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ]}
          />
        </TweakSection>
        <TweakSection label="States">
          <TweakButton label="Show first-run setup" onClick={() => setTweaks("showFirstRun", true)} />
          <TweakButton label="Trigger goal celebration" onClick={() => setTweaks("demoMilestone", true)} />
          <TweakButton label="Open log-weight modal" onClick={openToday} />
        </TweakSection>
        <TweakSection label="Units">
          <TweakRadio
            label="Display units"
            value={units}
            onChange={setUnits}
            options={[
              { value: "metric", label: "Metric" },
              { value: "imperial", label: "Imperial" },
              { value: "uk", label: "Stones" },
            ]}
          />
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

export { App };
