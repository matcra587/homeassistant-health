import React from "react";
import {
  Accordion,
  ActionIcon,
  Affix,
  AppShell,
  Avatar as MAvatar,
  Badge,
  Box,
  Burger,
  Button,
  Center,
  ColorSwatch,
  Divider,
  Group,
  Modal as MModal,
  NumberInput,
  Paper,
  SegmentedControl,
  Select as MSelect,
  SimpleGrid,
  Stack,
  Switch as MSwitch,
  Text,
  TextInput as MTextInput,
  Title,
  Tooltip,
  UnstyledButton,
  useMantineColorScheme,
} from "@mantine/core";
import { LineChart } from "@mantine/charts";
import { DateInput as MDateInput, TimeInput as MTimeInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { useMediaQuery } from "@mantine/hooks";
import {
  IconCheck,
  IconChartLine,
  IconFlame,
  IconHome,
  IconList,
  IconLock,
  IconPencil,
  IconPlus,
  IconSparkles,
  IconTrash,
  IconUser,
  IconUsers,
  IconX,
} from "@tabler/icons-react";
import "./styles.css";
import iconUrl from "../../icon.png";
import { apiUrl } from "./api-url";

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
      theme: "system",
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
      theme: "system",
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
      theme: "system",
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
      theme: "system",
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
    const response = await fetch(apiUrl(path), {
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
    const localMember = window.__app.state.members.find((x) => x.id === id) || null;
    if (localMember?.isMe && /^m\d+$/.test(id)) {
      await db.bootstrap();
      const currentMember = window.__app.state.members.find((x) => x.isMe) || null;
      if (currentMember?.id && currentMember.id !== id) {
        return db.updateMember(currentMember.id, patch, options);
      }
    }
    try {
      saved = await api.request("/api/members", { method: "PATCH", body: { id, patch } });
    } catch (error) {
      if (error instanceof Error && error.message === "Member not found" && localMember?.isMe) {
        await db.bootstrap();
        const currentMember = window.__app.state.members.find((x) => x.isMe) || null;
        if (currentMember?.id && currentMember.id !== id) {
          return db.updateMember(currentMember.id, patch, options);
        }
      }
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
      theme: "system",
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


function ProgressBar({ fraction, color }) {
  const pct = Math.round(fraction * 100);
  return (
    <div
      style={{
        position: "relative",
        height: 6,
        background: "var(--mantine-color-default-border)",
        borderRadius: 999,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          width: `${pct}%`,
          background: color || "var(--mantine-primary-color-filled)",
          borderRadius: 999,
          transition: "width 600ms cubic-bezier(.2,.8,.2,1)",
        }}
      />
    </div>
  );
}

function Logo({ size = 22, width }) {
  const resolvedWidth = width ?? size;
  return (
    <span
      aria-label="Home Assistant Health"
      role="img"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: resolvedWidth,
        height: size,
      }}
    >
      <img src={iconUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
    </span>
  );
}

Object.assign(window, { Avatar, ProgressBar, Logo });


// ---- chart.jsx ----
// chart.jsx — quiet hand-drawn line chart with range toggles + sparkline.

const RANGE_DAYS = { "1W": 7, "1M": 30, "3M": 90, "6M": 180, "1Y": 365, "All": Infinity };

function filterByRange(entries, range) {
  const days = RANGE_DAYS[range];
  if (days === Infinity) return entries;
  const cutoff = +window.__fixtures.today - days * 86400000;
  return entries.filter((e) => +new Date(e.date) >= cutoff);
}

function WeightChart({ entries, member, units, height = 280 }) {
  const [range, setRange] = useState("3M");

  const data = useMemo(() => {
    return filterByRange(entries, range)
      .slice()
      .sort((a, b) => +new Date(a.date) - +new Date(b.date))
      .map((e) => ({
        date: fmtDate(e.date),
        weight: units === "imperial" ? kgToLb(e.weightKg) : e.weightKg,
      }));
  }, [entries, range, units]);

  if (entries.length < 3) {
    return (
      <Paper withBorder radius="md" p="xl">
        <Stack align="center" gap="xs">
          <Title order={3} fz={20} fw={500} c="dimmed">
            Not enough yet to draw a line.
          </Title>
          <Text c="dimmed" fz="sm" maw={360} ta="center">
            A few more days of entries and the trend will appear here. Keep at
            it — quietly.
          </Text>
        </Stack>
      </Paper>
    );
  }

  const goalDisplay = units === "imperial" ? kgToLb(member.goalWeightKg) : member.goalWeightKg;
  const unitLabel = units === "imperial" ? "lb" : "kg";

  return (
    <Stack gap="md">
      <Group justify="space-between" wrap="wrap" gap="md">
        <Group gap="md" align="baseline">
          <Text fz="xs" c="dimmed" fw={500} tt="uppercase" lts="0.08em">
            Weight over time
          </Text>
          <Text c="dimmed" fz="sm">
            {data.length} entries · {range}
          </Text>
        </Group>
        <SegmentedControl
          size="xs"
          value={range}
          onChange={setRange}
          data={Object.keys(RANGE_DAYS).map((k) => ({ value: k, label: k }))}
        />
      </Group>

      <Paper withBorder radius="md" p="md">
        <LineChart
          h={height}
          data={data}
          dataKey="date"
          series={[{ name: "weight", color: "github-blue.5", label: `Weight (${unitLabel})` }]}
          curveType="natural"
          withDots={data.length < 30}
          withLegend={false}
          referenceLines={[
            {
              y: goalDisplay,
              label: `goal · ${goalDisplay.toFixed(1)} ${unitLabel}`,
              color: "github-red.6",
            },
          ]}
          valueFormatter={(value) => `${value.toFixed(1)} ${unitLabel}`}
          gridAxis="y"
          tickLine="none"
          xAxisProps={{ minTickGap: 50 }}
        />
      </Paper>
    </Stack>
  );
}

function Sparkline({ entries, width = 100, height = 30, color = "var(--mantine-primary-color-filled)" }) {
  if (entries.length < 2) {
    return (
      <div
        style={{
          width,
          height,
          display: "flex",
          alignItems: "center",
          color: "var(--mantine-color-dimmed)",
          fontSize: 11,
          fontStyle: "italic",
        }}
      >
        just starting
      </div>
    );
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

  const pacingColor = pacing
    ? pacing.onTrack
      ? "github-blue"
      : pacing.aheadDays > 0
        ? "github-green"
        : "github-gray"
    : null;

  return (
    <Box>
      <Box mb="xl">
        <Text fz="sm" c="dimmed">{fmtDateLong(today)}</Text>
        <Title order={1} fz={{ base: 32, sm: 44 }} fw={500} mt={6} lh={1.1}>
          {greeting}, {me.displayName}.
        </Title>
        <Text c="dimmed" fz="md" mt="sm" maw={520}>
          {loggedToday
            ? "You're set for the day. Quietly progressing."
            : streak.broken
              ? "A new day, a new entry. Begin again whenever you like."
              : "When you're ready, log today's weight below."}
        </Text>
      </Box>

      {!dismissedMonth && (
        <FirstOfMonthCard
          me={me}
          entries={entries}
          units={units}
          onDismiss={() => setDismissedMonth(true)}
        />
      )}

      {pacing && (
        <Paper
          withBorder
          radius="md"
          p="md"
          mb="md"
          style={{ borderLeft: `3px solid var(--mantine-color-${pacingColor}-filled)` }}
        >
          <Text fz="sm">
            {pacing.onTrack ? (
              <>
                You're <Text component="span" fw={500}>on pace</Text> for your target date.
              </>
            ) : pacing.aheadDays > 0 ? (
              <>
                <Text component="span" fw={500}>{pacing.aheadDays}</Text>{" "}
                day{pacing.aheadDays === 1 ? "" : "s"} ahead of pace
                {pacing.projectedDate && <> · projected goal {fmtDate(pacing.projectedDate)}</>}
              </>
            ) : (
              <>
                <Text component="span" fw={500}>{Math.abs(pacing.aheadDays)}</Text>{" "}
                day{pacing.aheadDays === -1 ? "" : "s"} behind pace
                {pacing.projectedDate && <> · projected goal {fmtDate(pacing.projectedDate)}</>}
              </>
            )}
          </Text>
        </Paper>
      )}

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md" mb="md">
        <Paper withBorder radius="md" p="lg">
          <Text fz="xs" c="dimmed" fw={500} tt="uppercase" lts="0.08em">
            Current weight
          </Text>
          <Group gap={6} align="baseline" mt="xs">
            <Title order={2} fz={44} fw={500} lh={1.05} style={{ fontVariantNumeric: "tabular-nums" }}>
              {fmtWeight(latest.weightKg, units, { unitless: true })}
            </Title>
            <Text ff="monospace" fz="lg" c="dimmed">
              {units === "imperial" ? "lb" : "kg"}
            </Text>
          </Group>
          {previous && (
            <Text c="dimmed" fz="sm" mt={6}>
              <Text component="span" style={{ fontVariantNumeric: "tabular-nums" }}>
                {fmtDelta(dayDelta, units)}
              </Text>{" "}
              from last entry
            </Text>
          )}
        </Paper>

        <Paper withBorder radius="md" p="lg">
          <Group justify="space-between" align="center" mb="xs">
            <Text fz="xs" c="dimmed" fw={500} tt="uppercase" lts="0.08em">
              Streak
            </Text>
            {!streak.broken && streak.length >= 7 && (
              <Badge
                size="sm"
                variant="light"
                color="github-green"
                leftSection={<IconFlame size={12} />}
              >
                on a roll
              </Badge>
            )}
          </Group>
          <Group gap={8} align="baseline">
            <Title order={2} fz={44} fw={500} lh={1.05} style={{ fontVariantNumeric: "tabular-nums" }}>
              {streak.length}
            </Title>
            <Text c="dimmed" fz="lg">
              {streak.length === 1 ? "day" : "days"}
            </Text>
          </Group>
          <Text c="dimmed" fz="sm" mt={6}>
            {streak.broken
              ? `Last entry ${fmtDate(streak.lastEntry.date, { relative: true })}.`
              : streak.lastEntry
                ? `Last logged ${fmtDate(streak.lastEntry.date, { relative: true }).toLowerCase()}.`
                : "Start with today."}
          </Text>
        </Paper>

        <Paper withBorder radius="md" p="lg">
          <Text fz="xs" c="dimmed" fw={500} tt="uppercase" lts="0.08em" mb="sm">
            Toward goal
          </Text>
          <Group gap="xs" align="baseline" mb="sm">
            <Title order={2} fz={36} fw={500} style={{ fontVariantNumeric: "tabular-nums" }}>
              {Math.round(progress * 100)}%
            </Title>
            <Text c="dimmed" fz="sm">of the way there</Text>
          </Group>
          <ProgressBar fraction={progress} />
          <Group justify="space-between" mt="sm" gap="xs">
            <Text c="dimmed" fz="xs" ff="monospace">
              start {fmtWeight(me.startWeightKg, units, { unitless: true })}
            </Text>
            <Text c="dimmed" fz="xs" ff="monospace">
              {Math.abs(fromGoal) < 0.1 ? "at goal" : `${fmtDelta(fromGoal, units)} to go`}
            </Text>
            <Text c="dimmed" fz="xs" ff="monospace">
              goal {fmtWeight(me.goalWeightKg, units, { unitless: true })}
            </Text>
          </Group>
        </Paper>
      </SimpleGrid>

      <Box mb="xl">
        <WeightChart entries={myEntries} member={me} units={units} pacing={pacing} />
      </Box>

      <Stack gap="sm" mb="xl">
        <Group gap="md" align="baseline">
          <Title order={2} fz={22} fw={500}>Derived stats</Title>
          <Text c="dimmed" fz="sm">estimated from your latest entry</Text>
        </Group>
        <SimpleGrid cols={{ base: 2, sm: 3, lg: 5 }} spacing="md">
          {[
            { label: "BMI", value: bmi?.toFixed(1), sub: bmiCategory(bmi) },
            { label: "BMR", value: Math.round(bmr), sub: "kcal at rest" },
            { label: "TDEE", value: Math.round(tdee), sub: "kcal estimated" },
            { label: "Body-fat est.", value: bf ? `${bf.toFixed(1)}%` : "—", sub: "Deurenberg" },
            {
              label: "Ideal weight",
              value: fmtWeight(ideal, units, { unitless: true }),
              sub: units === "imperial" ? "lb · Robinson" : "kg · Robinson",
            },
          ].map((s) => (
            <Box key={s.label}>
              <Text fz="xs" c="dimmed" fw={500} tt="uppercase" lts="0.08em">
                {s.label}
              </Text>
              <Text fz={22} fw={500} mt={4} style={{ fontVariantNumeric: "tabular-nums" }}>
                {s.value ?? "—"}
              </Text>
              {s.sub && (
                <Text c="dimmed" fz="xs" mt={2}>{s.sub}</Text>
              )}
            </Box>
          ))}
        </SimpleGrid>
      </Stack>

      <Affix position={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 96px)", right: 24 }} zIndex={50}>
        <Button
          size="lg"
          radius="lg"
          leftSection={loggedToday ? <IconPencil size={18} /> : <IconPlus size={18} />}
          onClick={onLogToday}
        >
          {loggedToday ? "Edit today's entry" : "Log today's weight"}
        </Button>
      </Affix>
    </Box>
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
    <Box>
      <Stack gap="md" mb="xl">
        <Group justify="space-between" wrap="wrap" gap="md">
          <Title order={1} fz={{ base: 28, sm: 36 }} fw={500}>Entries</Title>
          <Button
            variant="default"
            leftSection={<IconPlus size={16} />}
            onClick={() => onBackfill()}
          >
            Backfill a day
          </Button>
        </Group>
        <Text c="dimmed" fz="sm">
          {myEntries.length} entries · backfill any day that's missing.
        </Text>
        <SegmentedControl
          value={view}
          onChange={setView}
          data={[
            { value: "list", label: "List" },
            { value: "calendar", label: "Calendar" },
          ]}
          maw={240}
        />
      </Stack>

      {view === "list" &&
        Object.entries(groups).map(([month, list]) => (
          <Stack key={month} gap="xs" mb="xl">
            <Text c="dimmed" fz="sm" fw={500} ml={4}>
              {month}
            </Text>
            <Paper withBorder radius="md">
              {list.map((e, i) => {
                const next = list[i + 1];
                const delta = next ? e.weightKg - next.weightKg : null;
                const isOpen = confirmDelete === e.id;
                return (
                  <Box key={e.id}>
                    <Group
                      align="center"
                      justify="space-between"
                      gap="md"
                      px="lg"
                      py="md"
                      wrap="nowrap"
                    >
                      <Box miw={64}>
                        <Title order={3} fz={22} fw={500} lh={1.1}>
                          {new Date(e.date).getDate()}
                        </Title>
                        <Text fz={11} c="dimmed" tt="uppercase" lts="0.06em">
                          {new Date(e.date).toLocaleDateString("en-US", { weekday: "short" })}
                        </Text>
                      </Box>
                      <Box style={{ flex: 1, minWidth: 0 }}>
                        <Group gap="sm" wrap="wrap" align="baseline">
                          <Text fz={22} fw={500} style={{ fontVariantNumeric: "tabular-nums" }}>
                            {fmtWeight(e.weightKg, units, { unitless: true })}
                            <Text component="span" ff="monospace" fz={13} c="dimmed" ml={4}>
                              {units === "imperial" ? "lb" : "kg"}
                            </Text>
                          </Text>
                          {delta != null && Math.abs(delta) > 0.05 && (
                            <Badge
                              size="sm"
                              variant="light"
                              color={delta < 0 ? "github-green" : "github-red"}
                            >
                              {fmtDelta(delta, units)}
                            </Badge>
                          )}
                          {e.bodyFatPct && (
                            <Badge size="sm" variant="default">{e.bodyFatPct}% bf</Badge>
                          )}
                          {e.waistCm && (
                            <Badge size="sm" variant="default">
                              {units === "imperial"
                                ? `${cmToIn(e.waistCm).toFixed(1)} in waist`
                                : `${e.waistCm} cm waist`}
                            </Badge>
                          )}
                        </Group>
                        {e.note && (
                          <Text fz="sm" c="dimmed" fs="italic" mt={4}>
                            “{e.note}”
                          </Text>
                        )}
                      </Box>
                      <Group gap={4} wrap="nowrap">
                        {!isOpen ? (
                          <>
                            <Tooltip label="Edit entry">
                              <ActionIcon
                                variant="subtle"
                                color="gray"
                                onClick={() => onEdit(e)}
                                aria-label={`Edit entry on ${fmtDate(e.date)}`}
                              >
                                <IconPencil size={16} />
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip label="Delete entry">
                              <ActionIcon
                                variant="subtle"
                                color="red"
                                onClick={() => setConfirmDelete(e.id)}
                                aria-label={`Delete entry on ${fmtDate(e.date)}`}
                              >
                                <IconTrash size={16} />
                              </ActionIcon>
                            </Tooltip>
                          </>
                        ) : (
                          <Group gap={4} wrap="nowrap">
                            <Text fz="sm" c="dimmed">delete?</Text>
                            <Button
                              size="compact-sm"
                              color="red"
                              variant="outline"
                              onClick={async () => {
                                await db.deleteEntry(e.id);
                                setConfirmDelete(null);
                              }}
                            >
                              yes, delete
                            </Button>
                            <ActionIcon
                              variant="subtle"
                              color="gray"
                              onClick={() => setConfirmDelete(null)}
                              aria-label="Cancel delete"
                            >
                              <IconX size={16} />
                            </ActionIcon>
                          </Group>
                        )}
                      </Group>
                    </Group>
                    {i < list.length - 1 && <Divider />}
                  </Box>
                );
              })}
            </Paper>
          </Stack>
        ))}

      {view === "calendar" && (
        <Stack gap="xl" maw={460} mx="auto">
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
            let expectedDays = 0;
            for (let dn = 1; dn <= daysInMonth; dn++) {
              const d = new Date(monthDate.getFullYear(), monthDate.getMonth(), dn);
              if (+d <= +today) expectedDays++;
            }
            const missed = expectedDays - monthEntries.length;
            return (
              <Stack key={monthName} gap="xs">
                <Group justify="space-between" align="baseline" px={4}>
                  <Text c="dimmed" fz="sm" fw={500}>{monthName}</Text>
                  <Text c="dimmed" fz={11}>
                    <Text component="span" ff="monospace">{monthEntries.length}</Text> logged
                    {missed > 0 && (
                      <>
                        {" · "}
                        <Text component="span" ff="monospace">{missed}</Text> missed
                      </>
                    )}
                  </Text>
                </Group>
                <Paper withBorder radius="md" p="xs">
                  <SimpleGrid cols={7} spacing={4} mb={6}>
                    {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                      <Text
                        key={i}
                        ta="center"
                        fz={10}
                        c="dimmed"
                        tt="uppercase"
                        lts="0.06em"
                      >
                        {d}
                      </Text>
                    ))}
                  </SimpleGrid>
                  <SimpleGrid cols={7} spacing={4}>
                    {Array.from({ length: totalCells }).map((_, idx) => {
                      const dn = idx - startOffset + 1;
                      if (dn < 1 || dn > daysInMonth) return <Box key={idx} />;
                      const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), dn);
                      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(dn).padStart(2, "0")}`;
                      const entry = entryByDate[dateKey];
                      const isToday = date.toDateString() === today.toDateString();
                      const isFuture = +date > +today;
                      const logged = !!entry;
                      const display = entry ? fmtWeight(entry.weightKg, units, { unitless: true }) : null;
                      return (
                        <UnstyledButton
                          key={idx}
                          disabled={isFuture}
                          onClick={() => {
                            if (isFuture) return;
                            if (entry) onEdit(entry);
                            else onBackfill(date.toISOString());
                          }}
                          title={entry ? `Edit ${fmtDate(date)}` : isFuture ? "" : `Log ${fmtDate(date)}`}
                          style={{
                            aspectRatio: "1 / 1",
                            border: isToday
                              ? "1.5px solid var(--mantine-primary-color-filled)"
                              : "1px solid var(--mantine-color-default-border)",
                            background: logged
                              ? "var(--mantine-color-github-blue-light)"
                              : "transparent",
                            color: logged
                              ? "var(--mantine-color-github-blue-light-color)"
                              : "var(--mantine-color-dimmed)",
                            opacity: isFuture ? 0.4 : 1,
                            borderRadius: 6,
                            padding: 2,
                            cursor: isFuture ? "default" : "pointer",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 1,
                            transition: "background 140ms ease",
                          }}
                        >
                          <Text
                            fz={11}
                            fw={logged ? 500 : 400}
                            lh={1}
                            style={{ fontVariantNumeric: "tabular-nums" }}
                          >
                            {dn}
                          </Text>
                          {display && (
                            <Text
                              ff="monospace"
                              fz={8.5}
                              lh={1}
                              opacity={0.85}
                              style={{ fontVariantNumeric: "tabular-nums" }}
                            >
                              {display}
                            </Text>
                          )}
                        </UnstyledButton>
                      );
                    })}
                  </SimpleGrid>
                </Paper>
              </Stack>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}

// ---------- Household ----------
// ---------- Profile ----------
function ProfileScreen({ me, units, theme, onUpdate, onUnits, onTheme }) {
  const [form, setForm] = useState({ ...me });
  const [savedAt, setSavedAt] = useState(null);

  function update(patch) {
    setForm((prev) => ({ ...prev, ...patch }));
    onUpdate(patch);
    setSavedAt(Date.now());
  }

  function updateUnits(value) {
    if (!value) return;
    onUnits(value);
    update({ units: value });
  }

  function updateTheme(value) {
    if (!value) return;
    onTheme(value);
    update({ theme: value });
  }

  const goalKgDisplay = units === "imperial" ? kgToLb(form.goalWeightKg) : form.goalWeightKg;
  const heightDisplay = units === "imperial" ? cmToIn(form.heightCm) : form.heightCm;
  const targetDateValue = form.targetDate ? new Date(form.targetDate) : null;

  function ProfileSection({ title, subtitle, children }) {
    return (
      <Stack gap="sm" mb="xl">
        <Box>
          <Title order={2} fz={22} fw={500}>{title}</Title>
          {subtitle && (
            <Text c="dimmed" fz="sm" mt={4}>{subtitle}</Text>
          )}
        </Box>
        <Paper withBorder radius="md" p="lg">{children}</Paper>
      </Stack>
    );
  }

  return (
    <Box>
      <Box mb="xl">
        <Title order={1} fz={{ base: 28, sm: 36 }} fw={500}>
          Profile &amp; settings
        </Title>
        <Group gap={8} mt={4}>
          <Text c="dimmed" fz="sm">Change anything below. It saves as you go.</Text>
          {savedAt && (
            <Text c="github-green.5" fz="sm">· saved</Text>
          )}
        </Group>
      </Box>

      <ProfileSection title="You" subtitle="Used to estimate your derived stats.">
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
          <MTextInput
            label="Display name"
            value={form.displayName ?? ""}
            onChange={(e) => {
              const value = e.currentTarget.value;
              update({
                displayName: value,
                initials: value.slice(0, 2).toUpperCase(),
              });
            }}
          />
          <NumberInput
            label={units === "imperial" ? "Height (in)" : "Height (cm)"}
            min={0}
            allowDecimal={false}
            value={Math.round(heightDisplay) || ""}
            onChange={(value) => {
              const num = typeof value === "number" ? value : parseFloat(value);
              if (!Number.isFinite(num)) return;
              update({
                heightCm: units === "imperial" ? Math.round(num / CM_TO_IN) : num,
              });
            }}
          />
          <NumberInput
            label="Age"
            min={0}
            allowDecimal={false}
            value={form.age ?? ""}
            onChange={(value) => {
              const num = typeof value === "number" ? value : parseInt(value, 10);
              if (!Number.isFinite(num)) return;
              update({ age: num });
            }}
          />
          <MSelect
            label="Sex (for estimates)"
            value={form.sex}
            onChange={(value) => value && update({ sex: value })}
            data={[
              { value: "F", label: "Female" },
              { value: "M", label: "Male" },
            ]}
          />
          <MSelect
            label="Activity level"
            value={String(form.activityLevel)}
            onChange={(value) => value && update({ activityLevel: parseFloat(value) })}
            data={[
              { value: "1.2", label: "Sedentary" },
              { value: "1.4", label: "Light (1–3 days/wk)" },
              { value: "1.55", label: "Moderate (3–5 days/wk)" },
              { value: "1.7", label: "Active (6–7 days/wk)" },
              { value: "1.9", label: "Very active" },
            ]}
          />
        </SimpleGrid>
      </ProfileSection>

      <ProfileSection title="Goal" subtitle="Where you're headed, and by when.">
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <NumberInput
            label={units === "imperial" ? "Target weight (lb)" : "Target weight (kg)"}
            min={0}
            step={0.1}
            decimalScale={1}
            value={Number(goalKgDisplay.toFixed(1)) || ""}
            onChange={(value) => {
              const num = typeof value === "number" ? value : parseFloat(value);
              if (!Number.isFinite(num)) return;
              update({
                goalWeightKg: units === "imperial" ? lbToKg(num) : num,
              });
            }}
          />
          <MDateInput
            label="Target date"
            placeholder="Pick a date"
            value={targetDateValue}
            onChange={(value) => {
              if (!value) return;
              const date = new Date(value);
              date.setHours(8, 0, 0, 0);
              update({ targetDate: date.toISOString() });
            }}
          />
        </SimpleGrid>
      </ProfileSection>

      <ProfileSection title="Preferences">
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <MSelect
            label="Units"
            value={units}
            onChange={updateUnits}
            data={[
              { value: "metric", label: "Metric (kg, cm)" },
              { value: "imperial", label: "Imperial (lb, in)" },
            ]}
          />
          <MSelect
            label="Theme"
            value={theme}
            onChange={updateTheme}
            data={[
              { value: "system", label: "System" },
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ]}
          />
          <MTimeInput
            label="Daily reminder"
            value={form.reminderTime ?? ""}
            onChange={(e) => update({ reminderTime: e.currentTarget.value })}
          />
          <MSelect
            label="Streak grace (days)"
            description="Miss this many days and your streak resets."
            value={String(form.resetGracePeriodDays)}
            onChange={(value) => value && update({ resetGracePeriodDays: parseInt(value, 10) })}
            data={[
              { value: "0", label: "None — strict" },
              { value: "1", label: "1 day" },
              { value: "2", label: "2 days" },
              { value: "3", label: "3 days" },
            ]}
          />
        </SimpleGrid>
        <Stack gap="md" mt="lg">
          <MSwitch
            label="Share exact numbers in Household"
            description="Off keeps your weight, BMI and goal hidden. Streak and trend are always visible."
            checked={!!form.shareDetails}
            onChange={(e) => update({ shareDetails: e.currentTarget.checked })}
          />
          <MSwitch
            label="Milestone alerts"
            description="A small celebration when you hit goal, halfway, or a 30-day streak."
            checked={!!form.milestoneAlerts}
            onChange={(e) => update({ milestoneAlerts: e.currentTarget.checked })}
          />
        </Stack>
      </ProfileSection>
    </Box>
  );
}

// ---------- Log weight ----------
function LogWeightModal({ me, units, existingEntry, onSave, onClose }) {
  const today = window.__fixtures.today;
  const initialDate = existingEntry?.date ? new Date(existingEntry.date) : new Date(today);
  const initialKg = existingEntry?.weightKg ?? null;
  const initialWeight =
    initialKg != null
      ? units === "imperial"
        ? Number(kgToLb(initialKg).toFixed(1))
        : Number(initialKg.toFixed(1))
      : "";
  const initialWaist =
    existingEntry?.waistCm != null
      ? units === "imperial"
        ? Number(cmToIn(existingEntry.waistCm).toFixed(1))
        : existingEntry.waistCm
      : "";
  const isEdit = existingEntry?.weightKg != null;

  const form = useForm({
    mode: "controlled",
    initialValues: {
      weight: initialWeight,
      date: initialDate,
      bodyFat: existingEntry?.bodyFatPct ?? "",
      waist: initialWaist,
      note: existingEntry?.note ?? "",
    },
    validate: {
      weight: (value) => {
        const num = typeof value === "number" ? value : parseFloat(value);
        if (!Number.isFinite(num)) return "Please enter a weight.";
        const kg = units === "imperial" ? lbToKg(num) : num;
        if (kg < 25 || kg > 300) {
          return units === "imperial"
            ? "Should be between 55 and 660 lb."
            : "Should be between 25 and 300 kg.";
        }
        return null;
      },
    },
  });

  function handleSubmit(values) {
    const num = typeof values.weight === "number" ? values.weight : parseFloat(values.weight);
    const kg = units === "imperial" ? lbToKg(num) : num;
    const waistRaw = typeof values.waist === "number" ? values.waist : parseFloat(values.waist);
    const waistCm = Number.isFinite(waistRaw)
      ? units === "imperial"
        ? waistRaw / CM_TO_IN
        : waistRaw
      : null;
    const bodyFatNum = typeof values.bodyFat === "number" ? values.bodyFat : parseFloat(values.bodyFat);
    const date = new Date(values.date);
    date.setHours(8, 0, 0, 0);
    const dateKey = date.toISOString().slice(0, 10);
    onSave({
      id: existingEntry?.id || `${me.id}-${dateKey}`,
      memberId: me.id,
      date: date.toISOString(),
      weightKg: Math.round(kg * 10) / 10,
      bodyFatPct: Number.isFinite(bodyFatNum) ? bodyFatNum : null,
      waistCm: waistCm != null ? Math.round(waistCm) : null,
      note: values.note || null,
    });
  }

  return (
    <MModal opened onClose={onClose} title={isEdit ? "Edit entry" : "Log entry"} centered size="lg">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <NumberInput
            label={`Weight (${units === "imperial" ? "lb" : "kg"})`}
            placeholder="—"
            min={0}
            step={0.1}
            decimalScale={1}
            size="xl"
            data-autofocus
            styles={{ input: { fontVariantNumeric: "tabular-nums", textAlign: "center" } }}
            {...form.getInputProps("weight")}
          />

          <MDateInput
            label="Date"
            placeholder="Pick a date"
            {...form.getInputProps("date")}
          />

          <Accordion variant="separated" radius="md">
            <Accordion.Item value="optional">
              <Accordion.Control>Optional measurements</Accordion.Control>
              <Accordion.Panel>
                <Stack gap="md">
                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    <NumberInput
                      label="Body fat (%)"
                      placeholder="—"
                      min={0}
                      step={0.1}
                      decimalScale={1}
                      {...form.getInputProps("bodyFat")}
                    />
                    <NumberInput
                      label={units === "imperial" ? "Waist (in)" : "Waist (cm)"}
                      placeholder="—"
                      min={0}
                      step={0.1}
                      decimalScale={1}
                      {...form.getInputProps("waist")}
                    />
                  </SimpleGrid>
                  <MTextInput
                    label="A small note (optional)"
                    placeholder="Anything to remember about today..."
                    {...form.getInputProps("note")}
                  />
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>

          <Group justify="flex-end" gap="sm" mt="sm">
            <Button variant="subtle" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button type="submit" leftSection={<IconCheck size={16} />}>
              {isEdit ? "Save changes" : "Log entry"}
            </Button>
          </Group>
        </Stack>
      </form>
    </MModal>
  );
}

// ---------- Milestone celebration ----------
function MilestoneModal({ kind, member, onSetNewGoal, onMaintain, onClose }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 24 }).map((_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 600,
        hue: [
          "var(--mantine-color-github-blue-5)",
          "var(--mantine-color-github-green-5)",
          "var(--mantine-color-github-red-5)",
          "var(--mantine-color-github-gray-6)",
        ][i % 4],
        size: 6 + Math.random() * 6,
        rot: Math.random() * 360,
      })),
    [],
  );

  const title =
    kind === "goal"
      ? "You reached your goal."
      : kind === "halfway"
        ? "Halfway there."
        : "30 days running.";
  const body =
    kind === "goal"
      ? "Quietly remarkable. What's next is up to you — set a new target, or shift to maintenance."
      : kind === "halfway"
        ? "Half the distance, behind you. Keep your rhythm."
        : "A month of small daily steps. You're building something.";

  return (
    <MModal opened onClose={onClose} centered withCloseButton={false} size="md">
      <Box pos="relative" style={{ overflow: "hidden", borderRadius: 8 }}>
        <Box
          aria-hidden
          pos="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          style={{ overflow: "hidden", pointerEvents: "none" }}
        >
          {pieces.map((p, i) => (
            <Box
              key={i}
              pos="absolute"
              top={-20}
              w={p.size}
              h={p.size * 1.6}
              style={{
                left: `${p.left}%`,
                background: p.hue,
                borderRadius: 1,
                transform: `rotate(${p.rot}deg)`,
                animation: `confetti 1800ms cubic-bezier(.3,.7,.4,1) ${p.delay}ms both`,
              }}
            />
          ))}
        </Box>

        <Stack pos="relative" align="center" gap="md" py="md" px="xs">
          <IconSparkles size={32} color="var(--mantine-primary-color-filled)" />
          <Title order={2} ta="center" fz={32} fw={500} lh={1.1}>
            {title}
          </Title>
          <Text c="dimmed" ta="center" maw={360}>
            {body}
          </Text>
          {kind === "goal" ? (
            <Group justify="center" gap="sm" mt="sm">
              <Button onClick={onSetNewGoal}>Set a new goal</Button>
              <Button variant="default" onClick={onMaintain}>
                Switch to maintenance
              </Button>
            </Group>
          ) : (
            <Button mt="sm" onClick={onClose}>
              Carry on
            </Button>
          )}
        </Stack>
      </Box>
    </MModal>
  );
}

// ---------- First-run ----------
function FirstRun({ profile, onDone }) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const form = useForm({
    mode: "controlled",
    initialValues: {
      displayName: profile?.displayName ?? "",
      units: profile?.units ?? "",
      height: profile?.heightCm ?? "",
      age: profile?.age ?? "",
      sex: profile?.sex ?? "",
      activityLevel: profile?.activityLevel ? String(profile.activityLevel) : "",
      startWeight: profile?.startWeightKg ?? "",
      goalWeight: profile?.goalWeightKg ?? "",
      targetDate: profile?.targetDate ? new Date(profile.targetDate) : null,
    },
  });

  const usingImperial = form.values.units === "imperial";
  const isNum = (v) => Number.isFinite(typeof v === "number" ? v : parseFloat(v));

  const aboutComplete =
    Boolean(form.values.displayName.trim()) &&
    Boolean(form.values.units) &&
    isNum(form.values.height) &&
    isNum(form.values.age) &&
    Boolean(form.values.sex) &&
    Boolean(form.values.activityLevel);

  const startComplete =
    isNum(form.values.startWeight) &&
    isNum(form.values.goalWeight) &&
    form.values.targetDate instanceof Date;

  async function complete() {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const v = form.values;
      const heightNum = typeof v.height === "number" ? v.height : parseFloat(v.height);
      const startNum = typeof v.startWeight === "number" ? v.startWeight : parseFloat(v.startWeight);
      const goalNum = typeof v.goalWeight === "number" ? v.goalWeight : parseFloat(v.goalWeight);
      const heightCm = usingImperial ? heightNum / CM_TO_IN : heightNum;
      const startKg = usingImperial ? lbToKg(startNum) : startNum;
      const goalKg = usingImperial ? lbToKg(goalNum) : goalNum;
      const target = new Date(v.targetDate);
      target.setHours(8, 0, 0, 0);
      await onDone({
        displayName: v.displayName.trim(),
        initials: v.displayName.trim().slice(0, 2).toUpperCase(),
        heightCm: Math.round(heightCm * 10) / 10,
        age: parseInt(v.age, 10),
        sex: v.sex,
        activityLevel: parseFloat(v.activityLevel),
        startWeightKg: Math.round(startKg * 10) / 10,
        goalWeightKg: Math.round(goalKg * 10) / 10,
        targetDate: target.toISOString(),
        units: v.units,
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not save profile.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Center mih="100vh" p="md">
      <Paper shadow="sm" radius="lg" p="xl" maw={520} w="100%" withBorder>
        <Group gap={6} mb="xl" wrap="nowrap">
          {[0, 1, 2].map((i) => (
            <Box
              key={i}
              h={3}
              style={{
                flex: 1,
                borderRadius: 999,
                background:
                  i <= step
                    ? "var(--mantine-primary-color-filled)"
                    : "var(--mantine-color-default-border)",
                transition: "background 280ms ease",
              }}
            />
          ))}
        </Group>

        {step === 0 && (
          <Stack gap="lg" align="flex-start">
            <Logo size={56} />
            <Title order={1} fz={38} fw={400} lh={1.1}>
              Welcome.
            </Title>
            <Text c="dimmed" maw={420}>
              A small, calm space for your household to track weight together.
              Add the required fields once, then start logging.
            </Text>
            <Button onClick={() => setStep(1)}>Begin</Button>
          </Stack>
        )}

        {step === 1 && (
          <Stack gap="lg">
            <Box>
              <Title order={1} fz={28} fw={400}>About you</Title>
              <Text c="dimmed" fz="sm" mt={4}>
                Used only to estimate your derived stats.
              </Text>
            </Box>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <MTextInput
                label="Display name"
                placeholder="Display name"
                {...form.getInputProps("displayName")}
              />
              <MSelect
                label="Units"
                placeholder="Select units"
                data={[
                  { value: "metric", label: "Metric" },
                  { value: "imperial", label: "Imperial" },
                ]}
                {...form.getInputProps("units")}
              />
              <NumberInput
                label={usingImperial ? "Height (in)" : "Height (cm)"}
                min={0}
                {...form.getInputProps("height")}
              />
              <NumberInput
                label="Age"
                min={0}
                allowDecimal={false}
                {...form.getInputProps("age")}
              />
              <MSelect
                label="Sex (for estimates)"
                placeholder="Select"
                data={[
                  { value: "F", label: "Female" },
                  { value: "M", label: "Male" },
                ]}
                {...form.getInputProps("sex")}
              />
              <MSelect
                label="Activity level"
                placeholder="Select activity"
                data={[
                  { value: "1.2", label: "Sedentary" },
                  { value: "1.4", label: "Light" },
                  { value: "1.55", label: "Moderate" },
                  { value: "1.7", label: "Active" },
                  { value: "1.9", label: "Very active" },
                ]}
                {...form.getInputProps("activityLevel")}
              />
            </SimpleGrid>
            <Group justify="space-between" mt="md">
              <Button variant="subtle" onClick={() => setStep(0)}>Back</Button>
              <Button disabled={!aboutComplete} onClick={() => setStep(2)}>
                Continue
              </Button>
            </Group>
          </Stack>
        )}

        {step === 2 && (
          <Stack gap="lg">
            <Box>
              <Title order={1} fz={28} fw={400}>Where you're starting</Title>
              <Text c="dimmed" fz="sm" mt={4}>
                These fields are required before the dashboard can calculate progress.
              </Text>
            </Box>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <NumberInput
                label={usingImperial ? "Today's weight (lb)" : "Today's weight (kg)"}
                min={0}
                step={0.1}
                decimalScale={1}
                {...form.getInputProps("startWeight")}
              />
              <NumberInput
                label={usingImperial ? "Target weight (lb)" : "Target weight (kg)"}
                min={0}
                step={0.1}
                decimalScale={1}
                {...form.getInputProps("goalWeight")}
              />
              <MDateInput
                label="Target date"
                placeholder="Pick a date"
                clearable
                {...form.getInputProps("targetDate")}
              />
            </SimpleGrid>
            {submitError && (
              <Text c="red" fz="sm">{submitError}</Text>
            )}
            <Group justify="space-between" mt="md">
              <Button variant="subtle" onClick={() => setStep(1)} disabled={submitting}>
                Back
              </Button>
              <Button
                disabled={!startComplete}
                loading={submitting}
                onClick={complete}
              >
                Begin tracking
              </Button>
            </Group>
          </Stack>
        )}
      </Paper>
    </Center>
  );
}

Object.assign(window, { LogWeightModal, MilestoneModal, FirstRun });


// ---- features.jsx ----
// features.jsx — weekly digest, add-member, first-of-month recap, empty states.

// ---------- Weekly Digest ----------
function AddMemberModal({ onAdd, onClose }) {
  const [step, setStep] = useState(0);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm({
    mode: "controlled",
    initialValues: {
      displayName: "",
      sex: "",
      age: "",
      units: "",
      heightCm: "",
      activityLevel: "",
      startWeightKg: "",
      goalWeightKg: "",
      targetDate: null,
      colorIdx: 2,
      shareDetails: false,
    },
  });

  const v = form.values;
  const isNum = (val) =>
    Number.isFinite(typeof val === "number" ? val : parseFloat(val));

  function validateBasics() {
    if (!v.displayName.trim()) return "Please enter a name.";
    if (!v.units) return "Please select units.";
    const minHeight = v.units === "imperial" ? 36 : 90;
    if (!isNum(v.heightCm) || parseFloat(v.heightCm) < minHeight)
      return "Please enter a height.";
    const ageNum = parseFloat(v.age);
    if (!isNum(v.age) || ageNum < 5 || ageNum > 110)
      return "Please enter a sensible age.";
    if (!v.sex) return "Please select sex.";
    if (!v.activityLevel) return "Please select activity level.";
    return null;
  }

  function validateWeights() {
    if (!isNum(v.startWeightKg)) return "Please enter today's weight.";
    if (!isNum(v.goalWeightKg)) return "Please enter a target weight.";
    if (!(v.targetDate instanceof Date)) return "Please select a target date.";
    return null;
  }

  async function commit() {
    setError(null);
    const err = validateBasics() || validateWeights();
    if (err) {
      setError(err);
      return;
    }
    setSubmitting(true);
    try {
      const heightNum =
        typeof v.heightCm === "number" ? v.heightCm : parseFloat(v.heightCm);
      const startNum =
        typeof v.startWeightKg === "number"
          ? v.startWeightKg
          : parseFloat(v.startWeightKg);
      const goalNum =
        typeof v.goalWeightKg === "number"
          ? v.goalWeightKg
          : parseFloat(v.goalWeightKg);
      const heightCm = v.units === "imperial" ? heightNum / CM_TO_IN : heightNum;
      const startKg = v.units === "imperial" ? lbToKg(startNum) : startNum;
      const goalKg = v.units === "imperial" ? lbToKg(goalNum) : goalNum;
      const target = new Date(v.targetDate);
      target.setHours(8, 0, 0, 0);
      await onAdd({
        displayName: v.displayName.trim(),
        initials: v.displayName.trim().slice(0, 2).toUpperCase(),
        sex: v.sex,
        age: parseInt(v.age, 10),
        heightCm: Math.round(heightCm * 10) / 10,
        activityLevel: parseFloat(v.activityLevel),
        startWeightKg: Math.round(startKg * 10) / 10,
        goalWeightKg: Math.round(goalKg * 10) / 10,
        targetDate: target.toISOString(),
        colorIdx: v.colorIdx,
        shareDetails: v.shareDetails,
        units: v.units,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not add member.");
    } finally {
      setSubmitting(false);
    }
  }

  const palette = [0, 1, 2, 3, 4, 5];

  return (
    <MModal
      opened
      onClose={onClose}
      centered
      size="lg"
      title="New household member"
    >
      {step === 0 && (
        <Stack gap="md">
          <MTextInput
            label="Display name"
            placeholder="Casey"
            data-autofocus
            {...form.getInputProps("displayName")}
          />
          <Box>
            <Text fz="sm" fw={500} mb={6}>Avatar tint</Text>
            <Group gap="sm">
              {palette.map((i) => (
                <UnstyledButton
                  key={i}
                  aria-label={`Tint ${i + 1}`}
                  aria-pressed={v.colorIdx === i}
                  onClick={() => form.setFieldValue("colorIdx", i)}
                  style={{ borderRadius: 9999 }}
                >
                  <ColorSwatch
                    color={AVATAR_COLORS[i]}
                    size={36}
                    withShadow={false}
                    style={{
                      cursor: "pointer",
                      outline:
                        v.colorIdx === i
                          ? "2px solid var(--mantine-color-text)"
                          : "2px solid transparent",
                      outlineOffset: 2,
                    }}
                  />
                </UnstyledButton>
              ))}
            </Group>
          </Box>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <NumberInput
              label="Age"
              min={0}
              allowDecimal={false}
              {...form.getInputProps("age")}
            />
            <MSelect
              label="Sex (for estimates)"
              placeholder="Select"
              data={[
                { value: "F", label: "Female" },
                { value: "M", label: "Male" },
              ]}
              {...form.getInputProps("sex")}
            />
          </SimpleGrid>
          <MSelect
            label="Units"
            placeholder="Select units"
            data={[
              { value: "metric", label: "Metric (kg, cm)" },
              { value: "imperial", label: "Imperial (lb, in)" },
            ]}
            {...form.getInputProps("units")}
          />
          <NumberInput
            label={v.units === "imperial" ? "Height (in)" : "Height (cm)"}
            min={0}
            step={0.1}
            decimalScale={1}
            {...form.getInputProps("heightCm")}
          />
          <MSelect
            label="Activity level"
            placeholder="Select activity"
            data={[
              { value: "1.2", label: "Sedentary" },
              { value: "1.4", label: "Light" },
              { value: "1.55", label: "Moderate" },
              { value: "1.7", label: "Active" },
              { value: "1.9", label: "Very active" },
            ]}
            {...form.getInputProps("activityLevel")}
          />
          {error && <Text c="red" fz="sm">{error}</Text>}
          <Group justify="space-between" mt="sm">
            <Button variant="subtle" onClick={onClose}>Cancel</Button>
            <Button
              onClick={() => {
                const err = validateBasics();
                if (err) {
                  setError(err);
                  return;
                }
                setError(null);
                setStep(1);
              }}
            >
              Continue
            </Button>
          </Group>
        </Stack>
      )}

      {step === 1 && (
        <Stack gap="md">
          <Text c="dimmed" fz="sm">
            Add a starting point and target so progress cards have real context.
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <NumberInput
              label={v.units === "imperial" ? "Today's weight (lb)" : "Today's weight (kg)"}
              placeholder="—"
              min={0}
              step={0.1}
              decimalScale={1}
              {...form.getInputProps("startWeightKg")}
            />
            <NumberInput
              label={v.units === "imperial" ? "Target weight (lb)" : "Target weight (kg)"}
              placeholder="—"
              min={0}
              step={0.1}
              decimalScale={1}
              {...form.getInputProps("goalWeightKg")}
            />
            <MDateInput
              label="Target date"
              placeholder="Pick a date"
              clearable
              {...form.getInputProps("targetDate")}
            />
          </SimpleGrid>
          <MSwitch
            label="Share exact numbers in Household"
            description="Off by default. Each member can change this themselves later."
            {...form.getInputProps("shareDetails", { type: "checkbox" })}
          />
          {error && <Text c="red" fz="sm">{error}</Text>}
          <Group justify="space-between" mt="sm">
            <Button variant="subtle" onClick={() => setStep(0)} disabled={submitting}>
              Back
            </Button>
            <Button
              onClick={commit}
              loading={submitting}
              leftSection={<IconCheck size={16} />}
            >
              Add to household
            </Button>
          </Group>
        </Stack>
      )}
    </MModal>
  );
}

// ---------- First-of-month recap ----------
function FirstOfMonthCard({ me, entries, units, onDismiss }) {
  const today = window.__fixtures.today;
  const dayOfMonth = today.getDate();
  if (dayOfMonth > 7) return null;

  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const myEntries = entries.filter((e) => e.memberId === me.id);
  const lastMonthEntries = myEntries
    .filter((e) => {
      const d = new Date(e.date);
      return d >= lastMonth && d < thisMonthStart;
    })
    .sort((a, b) => +new Date(a.date) - +new Date(b.date));

  if (lastMonthEntries.length < 2) return null;

  const start = lastMonthEntries[0];
  const end = lastMonthEntries[lastMonthEntries.length - 1];
  const delta = end.weightKg - start.weightKg;
  const losing = me.startWeightKg > me.goalWeightKg;
  const positive = (losing && delta < 0) || (!losing && delta > 0);
  const daysInMonth = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
  const consistency = lastMonthEntries.length / daysInMonth;

  return (
    <Paper withBorder radius="md" p="lg" mb="lg" pos="relative">
      <ActionIcon
        variant="subtle"
        color="gray"
        pos="absolute"
        top={12}
        right={12}
        onClick={onDismiss}
        aria-label="Dismiss"
      >
        <IconX size={16} />
      </ActionIcon>
      <Text fz="xs" c="dimmed" fw={500} tt="uppercase" lts="0.08em">
        A new month
      </Text>
      <Title order={3} fz={22} fw={500} mt={6} mb="md">
        Looking back on{" "}
        {lastMonth.toLocaleDateString("en-US", { month: "long" })}
      </Title>
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" mb="md">
        <Stat label="Days logged" value={`${lastMonthEntries.length}/${daysInMonth}`} />
        <Stat
          label="Net change"
          value={fmtDelta(delta, units)}
          tone={Math.abs(delta) < 0.2 ? null : positive ? "good" : "warn"}
        />
        <Stat label="Consistency" value={`${Math.round(consistency * 100)}%`} />
      </SimpleGrid>
      <Text fs="italic" fz="sm" c="dimmed">
        {Math.abs(delta) < 0.2
          ? "A steady month. Maintenance is its own kind of progress."
          : positive
            ? consistency > 0.7
              ? "A considered month — consistent and quietly downward."
              : "Real progress, even with a few quiet days."
            : "Not the direction you wanted, but the honest record matters more than the number."}
      </Text>
    </Paper>
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
    <Box maw={720}>
      <Box mb="xl">
        <Text fz="sm" c="dimmed">{fmtDateLong(today)}</Text>
        <Title order={1} fz={{ base: 32, sm: 44 }} fw={500} mt={6} lh={1.1}>
          {greeting}, {me.displayName}.
        </Title>
      </Box>

      <Paper withBorder radius="md" p="xl" mb="md">
        <Badge
          variant="light"
          size="sm"
          leftSection={<IconSparkles size={12} />}
          mb="md"
        >
          Just getting started
        </Badge>
        <Title order={2} fz={28} fw={500} lh={1.15} mb="xs">
          {count === 0 ? "One small step begins it." : "You've made a beginning."}
        </Title>
        <Text c="dimmed" fz="md" lh={1.55} mb="lg" maw={460}>
          {count === 0
            ? "Log today's weight to start your record. The chart and stats appear once you've a few days behind you — usually three or four."
            : `${count} entr${count === 1 ? "y" : "ies"} so far. ${3 - count > 0 ? `${3 - count} more day${3 - count === 1 ? "" : "s"} and your trend line will appear.` : "Your trend line is on its way."}`}
        </Text>
        <Button
          size="md"
          leftSection={<IconPlus size={16} />}
          onClick={onLogToday}
        >
          Log today's weight
        </Button>
      </Paper>

      {count > 0 && (
        <Stack gap="sm" mb="md">
          <Text fz="xs" c="dimmed" fw={500} tt="uppercase" lts="0.1em">
            Your entries so far
          </Text>
          <Paper withBorder radius="md">
            {myEntries.slice(0, 3).map((e, i, arr) => (
              <Box key={e.id}>
                <Group justify="space-between" align="center" px="lg" py="md">
                  <Box>
                    <Text fz="md" fw={500} lh={1.1}>
                      {fmtDate(e.date, { relative: true })}
                    </Text>
                    <Text c="dimmed" fz="xs">
                      {fmtDateLong(e.date)}
                    </Text>
                  </Box>
                  <Text fz={22} fw={500} style={{ fontVariantNumeric: "tabular-nums" }}>
                    {fmtWeight(e.weightKg, "metric")}
                  </Text>
                </Group>
                {i < arr.length - 1 && <Divider />}
              </Box>
            ))}
          </Paper>
        </Stack>
      )}

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <HintCard
          icon={<IconUsers size={14} />}
          title="Bring others in"
          body="Add household members from Profile → Household. Everyone gets their own dashboard."
        />
        <HintCard
          icon={<IconList size={14} />}
          title="Backfill old entries"
          body="If you've been weighing for a while, paste in past dates from Entries."
        />
      </SimpleGrid>
    </Box>
  );
}

function HintCard({ icon, title, body }) {
  return (
    <Paper withBorder radius="md" p="md">
      <Group gap={8} c="dimmed" mb={6}>
        {icon}
        <Text fz="xs" fw={500} tt="uppercase" lts="0.08em">{title}</Text>
      </Group>
      <Text fz="sm" lh={1.5}>{body}</Text>
    </Paper>
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
  AddMemberModal, FirstOfMonthCard, EmptyDashboard, HintCard,
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
    <Box>
      <Stack gap="sm" mb="xl">
        <Group justify="space-between" wrap="wrap" gap="md">
          <Title order={1} fz={{ base: 28, sm: 36 }} fw={500}>
            {mode === "now" && "The household"}
            {mode === "week" && `Week of ${ranges.weekStart.toLocaleDateString("en-US", { month: "long", day: "numeric" })}`}
            {mode === "month" && `Month of ${ranges.monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`}
          </Title>
          {onAddMember && (
            <Button
              variant="default"
              leftSection={<IconPlus size={16} />}
              onClick={onAddMember}
            >
              Add a member
            </Button>
          )}
        </Group>
        <Text c="dimmed" fz="sm" maw={580}>
          {mode === "now" &&
            "Everyone's quiet progress, in one view. Exact numbers stay private unless a member chooses to share them."}
          {mode === "week" && (
            <>
              Together the household logged{" "}
              <Text component="span" c="text">{totalThisWeek}</Text>{" "}
              {totalThisWeek === 1 ? "entry" : "entries"} ·{" "}
              {Math.round(householdWeekConsistency * 100)}% of days covered.
            </>
          )}
          {mode === "month" && (
            <>
              Together:{" "}
              <Text component="span" c="text">{totalThisMonth}</Text>{" "}
              {totalThisMonth === 1 ? "entry" : "entries"} across{" "}
              {ranges.daysInMonth} days ·{" "}
              {Math.round(householdMonthConsistency * 100)}% covered.
            </>
          )}
        </Text>
        <SegmentedControl
          value={mode}
          onChange={setMode}
          data={[
            { value: "now", label: "Now" },
            { value: "week", label: "This week" },
            { value: "month", label: "This month" },
          ]}
          maw={360}
        />
      </Stack>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
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
      </SimpleGrid>
    </Box>
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
  const { m, streak } = summary;
  const isMe = m.id === me.id;
  const showDetails = m.shareDetails || isMe;
  const broken = streak.broken;
  const sinceLast = streak.lastEntry
    ? Math.floor(
        (+window.__fixtures.today - +new Date(streak.lastEntry.date)) / 86400000,
      )
    : null;

  return (
    <Paper
      withBorder
      radius="md"
      p="lg"
      pos="relative"
      style={{ opacity: broken ? 0.66 : 1, transition: "opacity 200ms ease" }}
    >
      {isMe && (
        <Badge
          size="xs"
          variant="default"
          pos="absolute"
          top={12}
          right={12}
        >
          you
        </Badge>
      )}
      <Group align="center" gap="md" mb="md" wrap="nowrap">
        <Avatar member={m} size={48} />
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text fz={20} fw={500} lh={1.1} truncate>
            {m.displayName}
          </Text>
          <Group gap={6} mt={2} fz="xs" c="dimmed" wrap="wrap">
            {broken ? (
              <Badge size="xs" variant="light" color="github-gray">
                streak reset · {sinceLast}d ago
              </Badge>
            ) : streak.length > 0 ? (
              <Group gap={4} align="center">
                <IconFlame size={12} />
                <Text fz="xs" ff="monospace">{streak.length}</Text>
                <Text fz="xs">-day streak</Text>
              </Group>
            ) : (
              <Text fz="xs" fs="italic">just starting out</Text>
            )}
            {!showDetails && !isMe && (
              <Group gap={3} align="center" c="dimmed">
                <IconLock size={11} />
                <Text fz="xs">private</Text>
              </Group>
            )}
          </Group>
        </Box>
      </Group>

      {mode === "now" && (
        <NowBody summary={summary} entries={entries} units={units} showDetails={showDetails} />
      )}
      {mode === "week" && (
        <WeekBody summary={summary} ranges={ranges} units={units} showDetails={showDetails} />
      )}
      {mode === "month" && (
        <MonthBody summary={summary} ranges={ranges} units={units} showDetails={showDetails} />
      )}

      <Divider mt="md" mb="md" />
      <Group justify="space-between" align="center">
        <Sparkline entries={entries} width={120} height={28} />
        {isMe && (
          <Button
            variant="subtle"
            color="gray"
            size="compact-sm"
            leftSection={<IconLock size={12} />}
            onClick={onTogglePrivacy}
          >
            {m.shareDetails ? "Sharing details" : "Hiding details"}
          </Button>
        )}
      </Group>
    </Paper>
  );
}

// ----- Now -----
function NowBody({ summary, entries, units, showDetails }) {
  const { m, latest } = summary;
  const progress = progressFraction(m, latest?.weightKg);
  const trend = trendDirection(entries, 14);

  return (
    <Stack gap="md">
      <Box>
        <Group justify="space-between" align="baseline" mb={8}>
          <Text fz="xs" c="dimmed" fw={500} tt="uppercase" lts="0.06em">
            Toward goal
          </Text>
          <Text fz={18} fw={500} style={{ fontVariantNumeric: "tabular-nums" }}>
            {Math.round(progress * 100)}
            <Text component="span" fz={13} c="dimmed">%</Text>
          </Text>
        </Group>
        <ProgressBar fraction={progress} />
      </Box>

      {showDetails ? (
        <SimpleGrid cols={2} spacing="sm">
          <Stat label="Now" value={fmtWeight(latest?.weightKg, units, { unitless: true })} suffix={unitSuffix(units)} />
          <Stat label="Goal" value={fmtWeight(m.goalWeightKg, units, { unitless: true })} dim />
          <Stat label="BMI" value={calcBMI(latest?.weightKg, m.heightCm)?.toFixed(1)} />
          <Stat
            label="14-day"
            value={fmtDelta(trend.deltaKg, units)}
            tone={trend.direction === "down" ? "good" : trend.direction === "up" ? "warn" : null}
          />
        </SimpleGrid>
      ) : (
        <Paper bg="var(--mantine-color-default-hover)" p="sm" radius="md">
          <Text fz="sm" fs="italic" c="dimmed">
            Sharing relative progress only.
          </Text>
          <Text fz="xs" c="dimmed" mt={4}>
            {trend.direction === "down"
              ? "Trending downward"
              : trend.direction === "up"
                ? "Trending upward"
                : "Holding steady"}{" "}
            this fortnight.
          </Text>
        </Paper>
      )}
    </Stack>
  );
}

// ----- Week -----
function WeekBody({ summary, ranges, units, showDetails }) {
  const { m, weekEntries, weekDelta, weekLowest } = summary;
  const today = window.__fixtures.today;
  const positive =
    weekDelta != null &&
    ((m.startWeightKg > m.goalWeightKg && weekDelta < 0) ||
      (m.startWeightKg < m.goalWeightKg && weekDelta > 0));
  const consistency = weekEntries.length / 7;

  return (
    <Stack gap="md">
      <Group gap={6} wrap="nowrap">
        {Array.from({ length: 7 }).map((_, i) => {
          const day = new Date(+ranges.weekStart + i * 86400000);
          const dayKey = day.toISOString().slice(0, 10);
          const has = weekEntries.find((e) => e.date.slice(0, 10) === dayKey);
          const isToday = day.toDateString() === today.toDateString();
          return (
            <Stack key={i} gap={6} align="center" style={{ flex: 1 }}>
              <Box
                title={fmtDate(day)}
                w="100%"
                h={8}
                style={{
                  borderRadius: 999,
                  background: has
                    ? "var(--mantine-primary-color-filled)"
                    : "var(--mantine-color-default-border)",
                  opacity: has ? 1 : isToday ? 0.55 : 0.35,
                  boxShadow:
                    isToday && !has
                      ? "inset 0 0 0 1.5px var(--mantine-primary-color-filled)"
                      : "none",
                }}
              />
              <Text fz={10} c="dimmed" lts="0.04em">
                {day.toLocaleDateString("en-US", { weekday: "narrow" })}
              </Text>
            </Stack>
          );
        })}
      </Group>

      <SimpleGrid cols={showDetails ? 3 : 2} spacing="sm">
        <Stat label="Days" value={`${weekEntries.length}/7`} />
        {showDetails ? (
          <>
            <Stat
              label="Delta"
              value={weekDelta != null ? fmtDelta(weekDelta, units) : "—"}
              tone={
                weekDelta == null
                  ? null
                  : positive
                    ? "good"
                    : Math.abs(weekDelta) < 0.15
                      ? null
                      : "warn"
              }
            />
            <Stat
              label="Lowest"
              value={weekLowest != null ? fmtWeight(weekLowest, units, { unitless: true }) : "—"}
            />
          </>
        ) : (
          <Stat
            label="Direction"
            value={
              weekDelta == null
                ? "—"
                : Math.abs(weekDelta) < 0.15
                  ? "steady"
                  : positive
                    ? "↓ on track"
                    : "↑ slight"
            }
            tone={weekDelta == null ? null : positive ? "good" : null}
          />
        )}
      </SimpleGrid>

      <Encouragement copy={weekCopy({ weekEntries, weekDelta, consistency, positive })} />
    </Stack>
  );
}

// ----- Month -----
function MonthBody({ summary, ranges, units, showDetails }) {
  const { m, monthEntries, monthDelta, monthLowest, monthSwing } = summary;
  const today = window.__fixtures.today;
  const positive =
    monthDelta != null &&
    ((m.startWeightKg > m.goalWeightKg && monthDelta < 0) ||
      (m.startWeightKg < m.goalWeightKg && monthDelta > 0));
  const consistency = monthEntries.length / ranges.daysInMonth;
  const dayKeys = new Set(monthEntries.map((e) => e.date.slice(0, 10)));

  const firstDay = new Date(ranges.monthStart);
  const startOffset = firstDay.getDay();
  const totalCells = Math.ceil((startOffset + ranges.daysInMonth) / 7) * 7;
  const cells = Array.from({ length: totalCells }).map((_, idx) => {
    const dayNum = idx - startOffset + 1;
    if (dayNum < 1 || dayNum > ranges.daysInMonth) return { empty: true };
    const date = new Date(
      ranges.monthStart.getFullYear(),
      ranges.monthStart.getMonth(),
      dayNum,
    );
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
    <Stack gap="md">
      <Box>
        <SimpleGrid cols={7} spacing={4} mb={6}>
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <Text key={i} fz={9.5} ta="center" c="dimmed" lts="0.06em">
              {d}
            </Text>
          ))}
        </SimpleGrid>
        <SimpleGrid cols={7} spacing={4}>
          {cells.map((c, i) => {
            if (c.empty) return <Box key={i} style={{ aspectRatio: "1 / 1" }} />;
            const bg = c.has
              ? "var(--mantine-primary-color-filled)"
              : "var(--mantine-color-default-border)";
            const op = c.has ? 1 : c.isFuture ? 0.18 : c.isToday ? 0.55 : 0.45;
            return (
              <Box
                key={i}
                title={fmtDate(c.date)}
                style={{
                  aspectRatio: "1 / 1",
                  borderRadius: 4,
                  background: bg,
                  opacity: op,
                  boxShadow:
                    c.isToday && !c.has
                      ? "inset 0 0 0 1.5px var(--mantine-primary-color-filled)"
                      : "none",
                }}
              />
            );
          })}
        </SimpleGrid>
      </Box>

      <SimpleGrid cols={showDetails ? 3 : 2} spacing="sm">
        <Stat label="Days" value={`${monthEntries.length}/${ranges.daysInMonth}`} />
        {showDetails ? (
          <>
            <Stat
              label="Delta"
              value={monthDelta != null ? fmtDelta(monthDelta, units) : "—"}
              tone={
                monthDelta == null
                  ? null
                  : positive
                    ? "good"
                    : Math.abs(monthDelta) < 0.3
                      ? null
                      : "warn"
              }
            />
            <Stat
              label="Swing"
              value={monthSwing != null ? fmtDelta(monthSwing, units) : "—"}
              dim
            />
          </>
        ) : (
          <Stat
            label="Direction"
            value={
              monthDelta == null
                ? "—"
                : Math.abs(monthDelta) < 0.3
                  ? "steady"
                  : positive
                    ? "↓ on track"
                    : "↑ drifting"
            }
            tone={monthDelta == null ? null : positive ? "good" : null}
          />
        )}
      </SimpleGrid>

      <Encouragement
        copy={monthCopy({
          monthEntries,
          monthDelta,
          consistency,
          positive,
          daysInMonth: ranges.daysInMonth,
        })}
      />
    </Stack>
  );
}

// ----- Shared bits -----
function Stat({ label, value, tone, dim, suffix }) {
  const color =
    tone === "good"
      ? "var(--mantine-color-github-green-text)"
      : tone === "warn"
        ? "var(--mantine-color-github-red-text)"
        : dim
          ? "var(--mantine-color-dimmed)"
          : undefined;
  return (
    <Box>
      <Text fz="xs" c="dimmed" fw={500} tt="uppercase" lts="0.06em">
        {label}
      </Text>
      <Text
        fz={20}
        fw={500}
        mt={4}
        lh={1.15}
        c={color}
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {value}
        {suffix && (
          <Text component="span" ff="monospace" fz={11} c="dimmed" ml={4}>
            {suffix}
          </Text>
        )}
      </Text>
    </Box>
  );
}

function Encouragement({ copy }) {
  return (
    <Text
      fs="italic"
      fz="sm"
      lh={1.45}
      pt="md"
      mt="md"
      style={{ borderTop: "1px dashed var(--mantine-color-default-border)" }}
    >
      {copy}
    </Text>
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
  "showFirstRun": false,
  "demoMilestone": false
}/*EDITMODE-END*/;

// Centralized app store
const __store = {
  state: {
    members: [],
    entries: [],
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

const NAV_TABS = [
  { id: "dashboard", label: "Dashboard", mobileLabel: "Today", icon: IconHome },
  { id: "entries", label: "Entries", mobileLabel: "Entries", icon: IconList },
  { id: "household", label: "Household", mobileLabel: "Household", icon: IconUsers },
  { id: "profile", label: "Profile", mobileLabel: "Profile", icon: IconUser },
];

function NavLink({ active, label, icon: Icon, onClick }) {
  return (
    <UnstyledButton
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "0 16px",
        height: 48,
        borderRadius: 8,
        background: active ? "var(--mantine-color-default-hover)" : "transparent",
        color: active ? "var(--mantine-color-text)" : "var(--mantine-color-dimmed)",
        fontSize: 14,
        fontWeight: 500,
        width: "100%",
        cursor: "pointer",
      }}
    >
      <Icon size={18} />
      {label}
    </UnstyledButton>
  );
}

function MobileTabButton({ active, label, icon: Icon, onClick }) {
  return (
    <UnstyledButton
      onClick={onClick}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        color: active ? "var(--mantine-color-text)" : "var(--mantine-color-dimmed)",
        cursor: "pointer",
        padding: "8px 0",
      }}
    >
      <Box
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 56,
          height: 28,
          borderRadius: 9999,
          background: active ? "var(--mantine-color-default-hover)" : "transparent",
          transition: "background 160ms ease",
        }}
      >
        <Icon size={18} />
      </Box>
      <Text fz={11} fw={500}>
        {label}
      </Text>
    </UnstyledButton>
  );
}

function App() {
  const state = useStore();
  const { setColorScheme } = useMantineColorScheme();
  const isMobile = useMediaQuery("(max-width: 767px)") ?? false;
  const [tab, setTab] = useState("dashboard");
  const [units, setUnits] = useState("metric");
  const [logModal, setLogModal] = useState(null);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [milestone, setMilestone] = useState(null);
  const [theme, setTheme] = useState("system");
  const [tweaks, setTweaks] = useTweaks(TWEAK_DEFAULTS);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [bootstrapError, setBootstrapError] = useState(null);

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

  useEffect(() => {
    setColorScheme(theme === "system" ? "auto" : theme);
  }, [theme, setColorScheme]);

  const me = state.members.find((m) => m.isMe);

  useEffect(() => {
    if (me?.units) setUnits(me.units);
  }, [me?.units]);

  useEffect(() => {
    if (me?.theme) setTheme(me.theme);
  }, [me?.theme]);

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
      <Center mih="100vh">
        <Logo size={40} />
      </Center>
    );
  }

  if (bootstrapError) {
    return (
      <Center mih="100vh" p="md">
        <Paper withBorder radius="lg" maw={420} p="xl" ta="center">
          <Logo size={40} />
          <Title order={1} fz={22} fw={500} mt="md">
            Home Assistant sign-in required
          </Title>
          <Text c="dimmed" fz="sm" mt="xs">
            Open this add-on through Home Assistant ingress to load your health
            profile.
          </Text>
        </Paper>
      </Center>
    );
  }

  if (!me) {
    return (
      <Center mih="100vh" p="md">
        <Paper withBorder radius="lg" maw={420} p="xl" ta="center">
          <Logo size={40} />
          <Title order={1} fz={22} fw={500} mt="md">
            Profile unavailable
          </Title>
          <Text c="dimmed" fz="sm" mt="xs">
            Home Assistant Health could not load your profile.
          </Text>
        </Paper>
      </Center>
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
      case "profile": return <ProfileScreen me={me} units={units} theme={theme} onUpdate={(patch) => db.updateMember(me.id, patch)} onUnits={setUnits} onTheme={setTheme} />;
    }
  })();

  return (
    <>
      <AppShell
        navbar={{ width: 240, breakpoint: "md", collapsed: { mobile: true } }}
        header={{ height: 60, collapsed: !isMobile }}
        footer={{ height: 80, collapsed: !isMobile }}
        padding={{ base: "md", md: "xl" }}
      >
        <AppShell.Header>
          <Group h="100%" px="md" justify="space-between">
            <Logo size={36} />
            <Avatar member={me} size={32} />
          </Group>
        </AppShell.Header>

        <AppShell.Navbar p="md">
          <AppShell.Section mb="lg">
            <Center>
              <Logo size={72} />
            </Center>
          </AppShell.Section>
          <AppShell.Section grow>
            <Stack gap={4}>
              {NAV_TABS.map((t) => (
                <NavLink
                  key={t.id}
                  active={tab === t.id}
                  label={t.label}
                  icon={t.icon}
                  onClick={() => setTab(t.id)}
                />
              ))}
            </Stack>
          </AppShell.Section>
          <AppShell.Section>
            <Divider mb="sm" />
            <Group gap="sm" wrap="nowrap">
              <Avatar member={me} size={36} />
              <Box style={{ minWidth: 0, flex: 1 }}>
                <Text fz="sm" fw={500} truncate>{me.displayName}</Text>
                <Text fz="xs" c="dimmed" truncate>
                  {window.__fixtures.household.name}
                </Text>
              </Box>
            </Group>
          </AppShell.Section>
        </AppShell.Navbar>

        <AppShell.Main>
          <Box maw={1180} mx="auto">
            {screen}
          </Box>
        </AppShell.Main>

        <AppShell.Footer>
          <Group h="100%" gap={0} grow wrap="nowrap" px="xs">
            {NAV_TABS.map((t) => (
              <MobileTabButton
                key={t.id}
                active={tab === t.id}
                label={t.mobileLabel}
                icon={t.icon}
                onClick={() => setTab(t.id)}
              />
            ))}
          </Group>
        </AppShell.Footer>
      </AppShell>

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
