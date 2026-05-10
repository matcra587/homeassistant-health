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
import { isNotEmpty, useForm } from "@mantine/form";
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
import { db } from "./api";
import { Avatar } from "./components/Avatar";
import { Logo } from "./components/Logo";
import { MobileTabButton } from "./nav/MobileTabButton";
import { NavLink } from "./nav/NavLink";
import { NAV_TABS } from "./nav/nav-tabs";
import { Dashboard } from "./screens/Dashboard";
import { EntriesScreen } from "./screens/EntriesScreen";
import { FirstRun } from "./screens/FirstRun";
import { HouseholdScreen } from "./screens/HouseholdScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import {
  bmiCategory,
  calcBMI,
  calcBMR,
  calcIdealWeight,
  calcPacing,
  calcStreak,
  calcTDEE,
  estBodyFat,
  hasCompleteProfile,
  progressFraction,
  trendDirection,
} from "./lib/calc";
import {
  fmtDate,
  fmtDateLong,
  formatLocalDateKey,
  initials,
  parseFormDate,
} from "./lib/format";
import {
  CM_TO_IN,
  cmToIn,
  fmtDelta,
  fmtWeight,
  KG_TO_LB,
  kgToLb,
  kgToSt,
  kgToStLb,
  lbToKg,
  stLbToKg,
  unitSuffix,
} from "./lib/units";
import { useStore } from "./store";

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

// ---- ui.jsx ----
// ui.jsx — small reusable presentation components.

const { useState, useEffect, useRef, useMemo, useCallback } = React;




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
    const date = parseFormDate(values.date);
    date.setHours(8, 0, 0, 0);
    const dateKey = formatLocalDateKey(date);
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

// ---- features.jsx ----
// features.jsx — weekly digest, add-member, first-of-month recap, empty states.

// ---------- Weekly Digest ----------
const ADD_MEMBER_STEP_FIELDS = {
  0: ["displayName", "units", "heightCm", "age", "sex", "activityLevel"],
  1: ["startWeightKg", "goalWeightKg", "targetDate"],
};

function AddMemberModal({ onAdd, onClose }) {
  const [step, setStep] = useState(0);

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
    validate: {
      displayName: isNotEmpty("Please enter a name"),
      units: isNotEmpty("Pick units"),
      sex: isNotEmpty("Pick sex"),
      activityLevel: isNotEmpty("Pick activity level"),
      heightCm: (value, values) => {
        const num = typeof value === "number" ? value : parseFloat(value);
        if (!Number.isFinite(num)) return "Required";
        const minHeight = values.units === "imperial" ? 36 : 90;
        return num < minHeight ? "Please enter a sensible height" : null;
      },
      age: (value) => {
        const num = typeof value === "number" ? value : parseFloat(value);
        if (!Number.isFinite(num)) return "Required";
        return num < 5 || num > 110 ? "Please enter a sensible age" : null;
      },
      startWeightKg: isPositiveNumber("Required"),
      goalWeightKg: isPositiveNumber("Required"),
      targetDate: (value) => {
        const date = parseFormDate(value);
        return date && !Number.isNaN(date.getTime()) ? null : "Pick a target date";
      },
    },
  });

  const v = form.values;

  function continueToStep(nextStep) {
    const fields = ADD_MEMBER_STEP_FIELDS[step];
    const results = fields.map((f) => form.validateField(f));
    if (!results.some((r) => r.hasError)) {
      setStep(nextStep);
    }
  }

  async function handleSubmit(values) {
    const heightNum =
      typeof values.heightCm === "number"
        ? values.heightCm
        : parseFloat(values.heightCm);
    const startNum =
      typeof values.startWeightKg === "number"
        ? values.startWeightKg
        : parseFloat(values.startWeightKg);
    const goalNum =
      typeof values.goalWeightKg === "number"
        ? values.goalWeightKg
        : parseFloat(values.goalWeightKg);
    const heightCm = values.units === "imperial" ? heightNum / CM_TO_IN : heightNum;
    const startKg = values.units === "imperial" ? lbToKg(startNum) : startNum;
    const goalKg = values.units === "imperial" ? lbToKg(goalNum) : goalNum;
    const target = parseFormDate(values.targetDate);
    target.setHours(8, 0, 0, 0);
    try {
      await onAdd({
        displayName: values.displayName.trim(),
        initials: values.displayName.trim().slice(0, 2).toUpperCase(),
        sex: values.sex,
        age: parseInt(values.age, 10),
        heightCm: Math.round(heightCm * 10) / 10,
        activityLevel: parseFloat(values.activityLevel),
        startWeightKg: Math.round(startKg * 10) / 10,
        goalWeightKg: Math.round(goalKg * 10) / 10,
        targetDate: target.toISOString(),
        colorIdx: values.colorIdx,
        shareDetails: values.shareDetails,
        units: values.units,
      });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not add member.";
      form.setFieldError("targetDate", message);
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
      <form onSubmit={form.onSubmit(handleSubmit)}>
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
                    type="button"
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
            <Group justify="space-between" mt="sm">
              <Button variant="subtle" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button type="button" onClick={() => continueToStep(1)}>
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
            <Group justify="space-between" mt="sm">
              <Button
                variant="subtle"
                type="button"
                onClick={() => setStep(0)}
                disabled={form.submitting}
              >
                Back
              </Button>
              <Button
                type="submit"
                loading={form.submitting}
                leftSection={<IconCheck size={16} />}
              >
                Add to household
              </Button>
            </Group>
          </Stack>
        )}
      </form>
    </MModal>
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

Object.assign(window, { AddMemberModal, AVATAR_COLORS });
// ---- app.jsx ----
// app.jsx — root, routing, state, navigation, tweaks.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "showFirstRun": false,
  "demoMilestone": false
}/*EDITMODE-END*/;

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
      case "household": return <HouseholdScreen me={me} members={state.members} entries={state.entries} units={units} onTogglePrivacy={() => db.updateMember(me.id, { shareDetails: !me.shareDetails })} onAddMember={() => setAddMemberOpen(true)} />;
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
