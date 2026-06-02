// kundali-match plugin UI.
//
// Built by this repo's own Vite as an IIFE (`dist/ui.js`) and streamed to
// tele's dashboard by `GET /api/applications/<uuid>/ui.js`. Tele's PluginSlot
// injects the script tag at runtime and polls for the self-registration
// below; React is shared via `window.React` (set by PluginSlot before script
// injection), so this file marks react/react-dom as Rollup externals.
//
// Classic JSX runtime: JSX compiles to React.createElement(...), which IS on
// window.React's namespace. The default `import React from "react"` (NOT
// `import * as React`) is required by the classic runtime.
//
// The plugin uses bare `fetch` (with `credentials: "include"` to match the
// host's same-origin cookie flow) and bare `useState`/`useEffect`. It cannot
// import `@tele/shared`, `@tele/web`, or TanStack Query because kundali is a
// standalone npm project that must build independently of tele. The
// `ApplicationProfileResponse` shape is re-declared inline below; keep this
// in lockstep with `packages/shared/src/types.ts`.
//
// v2 introduces internal nav with two tabs: Settings (the existing profile
// form, behavior-preserved) and Kundali Matching (Person B form +
// client-side Ashtakoot computation against Person A loaded from the saved
// profile). All matching compute is fully client-side — no network call.
//
// Known v1 regression vs the previous tele-bundled ProfileEditor: Telegram
// `/set-profile` updates do NOT live-refresh either tab (no WS subscription).
// In the Matching tab, Person A is loaded once on mount and does NOT
// live-refresh on Telegram `/set-profile` updates — reload the tab to see
// external changes.

import React, { useEffect, useState } from "react";
import { calculateAshtakoot } from "./engine/ashtakoot.js";
import { mangalDosha, nadiDosha, rajjuPorutham } from "./engine/doshas.js";
import type { BirthDetails, KootaScore } from "./types.js";

type ApplicationProfileResponse = {
  profile: object | null;
  source: "override" | "seed" | "none";
};

function narrowGender(raw: unknown): "male" | "female" | "other" {
  const s = typeof raw === "string" ? raw : "";
  return s === "male" ? "male" : s === "female" ? "female" : "other";
}

function SettingsPanel({ appId }: { appId: string }) {
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [tob, setTob] = useState("");
  const [pob, setPob] = useState("");
  const [tz, setTz] = useState("");
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [gender, setGender] = useState("female");
  const [notes, setNotes] = useState("");
  const [source, setSource] = useState<
    "override" | "seed" | "none" | null
  >(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // appId-only dep so in-flight typing isn't clobbered by background refetches.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/applications/${appId}/profile`, {
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`GET profile failed: ${res.status}`);
        return (await res.json()) as ApplicationProfileResponse;
      })
      .then((data) => {
        if (cancelled) return;
        const p = (data.profile ?? {}) as Record<string, unknown>;
        setName(String(p.name ?? ""));
        setDob(String(p.dob ?? ""));
        setTob(String(p.tob ?? ""));
        setPob(String(p.pob ?? ""));
        setTz(String(p.tz ?? ""));
        setLat(p.lat != null ? String(p.lat) : "");
        setLon(p.lon != null ? String(p.lon) : "");
        setGender(String(p.gender ?? "female"));
        setNotes(String(p.notes ?? ""));
        setSource(data.source);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [appId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const body: Record<string, unknown> = {
      name,
      dob,
      gender,
    };
    if (tob.trim()) body.tob = tob.trim();
    if (pob.trim()) body.pob = pob.trim();
    if (tz.trim()) body.tz = tz.trim();
    if (lat.trim()) {
      const v = parseFloat(lat);
      if (!Number.isNaN(v)) body.lat = v;
    }
    if (lon.trim()) {
      const v = parseFloat(lon);
      if (!Number.isNaN(v)) body.lon = v;
    }
    if (notes.trim()) body.notes = notes.trim();
    try {
      const res = await fetch(`/api/applications/${appId}/profile`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        let msg = `PUT profile failed: ${res.status}`;
        try {
          const j = (await res.json()) as { error?: string };
          if (j.error) msg = j.error;
        } catch {
          /* non-json body */
        }
        throw new Error(msg);
      }
      const data = (await res.json()) as { source?: ApplicationProfileResponse["source"] };
      if (data.source) setSource(data.source);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  const sourceBadge =
    source === "override" ? (
      <span className="rounded bg-emerald-900/60 px-2 py-0.5 text-xs text-emerald-200">
        override
      </span>
    ) : source === "seed" ? (
      <span className="rounded bg-yellow-900/60 px-2 py-0.5 text-xs text-yellow-200">
        seed
      </span>
    ) : (
      <span className="rounded bg-slate-700 px-2 py-0.5 text-xs text-slate-300">
        {source ?? "loading"}
      </span>
    );

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-xs text-slate-400">Profile source:</span>
        {sourceBadge}
      </div>
      <form onSubmit={handleSave} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-slate-400">Name *</label>
            <input
              className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Date of Birth * (YYYY-MM-DD)
            </label>
            <input
              className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              placeholder="1990-01-15"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Gender *
            </label>
            <select
              className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
            >
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Time of Birth (HH:MM)
            </label>
            <input
              className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm"
              value={tob}
              onChange={(e) => setTob(e.target.value)}
              placeholder="14:30"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Place of Birth
            </label>
            <input
              className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm"
              value={pob}
              onChange={(e) => setPob(e.target.value)}
              placeholder="Mumbai, India"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Timezone (IANA)
            </label>
            <input
              className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm"
              value={tz}
              onChange={(e) => setTz(e.target.value)}
              placeholder="Asia/Kolkata"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Latitude
            </label>
            <input
              type="number"
              step="any"
              className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Longitude
            </label>
            <input
              type="number"
              step="any"
              className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm"
              value={lon}
              onChange={(e) => setLon(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">
            Notes (max 1000 chars)
          </label>
          <textarea
            className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm"
            rows={3}
            maxLength={1000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        {error && <p className="text-xs text-rose-400">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium hover:bg-indigo-500 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Profile"}
        </button>
      </form>
      <p className="mt-3 text-xs text-slate-500">
        This overrides the seed profile shipped with the plugin. The AI uses
        this on every turn. Uninstalling the application does NOT delete this
        file — reinstall picks it back up. v1 is heuristic/demo-grade (no live
        ephemeris).
      </p>
    </div>
  );
}

function MatchingPanel({ appId }: { appId: string }) {
  const [personA, setPersonA] = useState<BirthDetails | null>(null);
  const [loadingA, setLoadingA] = useState(true);
  const [personAError, setPersonAError] = useState<string | null>(null);

  const [bName, setBName] = useState("");
  const [bDob, setBDob] = useState("");
  const [bTob, setBTob] = useState("");
  const [bPob, setBPob] = useState("");
  const [bGender, setBGender] = useState<"male" | "female" | "other">("female");

  const [result, setResult] = useState<
    | {
        total: number;
        max: number;
        kootas: KootaScore[];
        fixedMangal: boolean;
        candidateMangal: boolean;
        nadi: boolean;
        rajju: boolean;
      }
    | null
  >(null);
  const [computeError, setComputeError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingA(true);
    setPersonAError(null);
    fetch(`/api/applications/${appId}/profile`, {
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`GET profile failed: ${res.status}`);
        return (await res.json()) as ApplicationProfileResponse;
      })
      .then((data) => {
        if (cancelled) return;
        const p = (data.profile ?? null) as Record<string, unknown> | null;
        const name = p && typeof p.name === "string" ? p.name : "";
        const dob = p && typeof p.dob === "string" ? p.dob : "";
        const genderRaw = p ? p.gender : undefined;
        if (!p || !name || !dob || typeof genderRaw !== "string") {
          setPersonA(null);
          setPersonAError(
            "Person A profile incomplete — open the Settings tab and save at least Name, DOB, and Gender.",
          );
          return;
        }
        const a: BirthDetails = {
          name,
          dob,
          gender: narrowGender(genderRaw),
        };
        if (typeof p.tob === "string") a.tob = p.tob;
        if (typeof p.pob === "string") a.pob = p.pob;
        if (typeof p.tz === "string") a.tz = p.tz;
        if (typeof p.notes === "string") a.notes = p.notes;
        if (typeof p.lat === "number") a.lat = p.lat;
        if (typeof p.lon === "number") a.lon = p.lon;
        setPersonA(a);
      })
      .catch((err) => {
        if (cancelled) return;
        setPersonA(null);
        setPersonAError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (cancelled) return;
        setLoadingA(false);
      });
    return () => {
      cancelled = true;
    };
  }, [appId]);

  function handleCompute(e: React.FormEvent) {
    e.preventDefault();
    setComputeError(null);
    if (!personA) {
      setComputeError("Person A not loaded yet.");
      return;
    }
    if (!bName.trim() || !bDob.trim()) {
      setComputeError("Person B requires Name and Date of Birth.");
      return;
    }
    const personB: BirthDetails = {
      name: bName.trim(),
      dob: bDob.trim(),
      gender: bGender,
      ...(bTob.trim() ? { tob: bTob.trim() } : {}),
      ...(bPob.trim() ? { pob: bPob.trim() } : {}),
    };
    const { total, max, kootas } = calculateAshtakoot(personA, personB);
    const fixedMangal = mangalDosha(personA);
    const candidateMangal = mangalDosha(personB);
    const nadi = nadiDosha(personA, personB);
    const rajju = rajjuPorutham(personA, personB);
    setResult({ total, max, kootas, fixedMangal, candidateMangal, nadi, rajju });
  }

  const formDisabled = !personA;
  const ratio = result ? result.total / result.max : 0;
  const verdict = result
    ? ratio >= 0.77
      ? { label: "Excellent match", cls: "bg-emerald-900/60 text-emerald-200" }
      : ratio >= 0.5
        ? { label: "Acceptable match", cls: "bg-yellow-900/60 text-yellow-200" }
        : { label: "Caution advised", cls: "bg-rose-900/60 text-rose-200" }
    : null;

  let mangalLine: string;
  if (result && result.fixedMangal && result.candidateMangal) {
    mangalLine = "Both partners have Mangal Dosha — mutually neutralized.";
  } else if (result && result.fixedMangal) {
    mangalLine = "Mangal Dosha present (Person A).";
  } else if (result && result.candidateMangal) {
    mangalLine = "Mangal Dosha present (Person B).";
  } else {
    mangalLine = "No Mangal Dosha.";
  }

  return (
    <div className="space-y-4">
      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-200">
          Person A (saved profile)
        </h3>
        {loadingA && (
          <p className="text-xs text-slate-400">Loading Person A…</p>
        )}
        {personAError && (
          <div className="rounded border border-rose-700 bg-rose-900/40 px-3 py-2 text-sm text-rose-100">
            {personAError}
          </div>
        )}
        {personA && (
          <div className="rounded border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-200">
            <div>
              <span className="text-slate-400">Name:</span> {personA.name}
            </div>
            <div>
              <span className="text-slate-400">DOB:</span> {personA.dob}
            </div>
            <div>
              <span className="text-slate-400">Gender:</span> {personA.gender}
            </div>
            {personA.tob && (
              <div>
                <span className="text-slate-400">TOB:</span> {personA.tob}
              </div>
            )}
            {personA.pob && (
              <div>
                <span className="text-slate-400">POB:</span> {personA.pob}
              </div>
            )}
            {personA.tz && (
              <div>
                <span className="text-slate-400">TZ:</span> {personA.tz}
              </div>
            )}
            {personA.lat != null && (
              <div>
                <span className="text-slate-400">Lat:</span> {personA.lat}
              </div>
            )}
            {personA.lon != null && (
              <div>
                <span className="text-slate-400">Lon:</span> {personA.lon}
              </div>
            )}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-200">
          Person B (partner)
        </h3>
        <form onSubmit={handleCompute} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-slate-400">Name *</label>
              <input
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm disabled:opacity-50"
                value={bName}
                onChange={(e) => setBName(e.target.value)}
                disabled={formDisabled}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                Date of Birth * (YYYY-MM-DD)
              </label>
              <input
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm disabled:opacity-50"
                value={bDob}
                onChange={(e) => setBDob(e.target.value)}
                placeholder="1990-01-15"
                disabled={formDisabled}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                Gender *
              </label>
              <select
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm disabled:opacity-50"
                value={bGender}
                onChange={(e) =>
                  setBGender(narrowGender(e.target.value))
                }
                disabled={formDisabled}
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                Time of Birth (HH:MM)
              </label>
              <input
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm disabled:opacity-50"
                value={bTob}
                onChange={(e) => setBTob(e.target.value)}
                placeholder="14:30"
                disabled={formDisabled}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                Place of Birth
              </label>
              <input
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm disabled:opacity-50"
                value={bPob}
                onChange={(e) => setBPob(e.target.value)}
                placeholder="Mumbai, India"
                disabled={formDisabled}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={formDisabled}
            className="rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium hover:bg-indigo-500 disabled:opacity-50"
          >
            Compute Match
          </button>
          {computeError && (
            <p className="text-xs text-rose-400">{computeError}</p>
          )}
        </form>
      </section>

      {result && verdict && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span
              className={`rounded px-2 py-0.5 text-xs font-medium ${verdict.cls}`}
            >
              {verdict.label}
            </span>
            <span className="text-xs text-slate-400">
              {result.total}/{result.max}
            </span>
          </div>
          <div>
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Ashtakoot Kootas (8)
            </h4>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400">
                  <th className="py-1 pr-2 font-normal">Koota</th>
                  <th className="py-1 pr-2 font-normal">Score</th>
                  <th className="py-1 font-normal">Notes</th>
                </tr>
              </thead>
              <tbody>
                {result.kootas.map((k) => (
                  <tr key={k.name} className="border-t border-slate-800">
                    <td className="py-1 pr-2 text-slate-200">{k.name}</td>
                    <td className="py-1 pr-2 text-slate-300">
                      {k.score}/{k.max}
                    </td>
                    <td className="py-1 text-slate-400">{k.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Doshas
            </h4>
            <ul className="space-y-0.5 text-sm text-slate-200">
              <li>
                <span className="text-slate-400">Mangal:</span> {mangalLine}
              </li>
              <li>
                <span className="text-slate-400">Nadi:</span>{" "}
                {result.nadi
                  ? "Same Nadi (mismatch)"
                  : "Different Nadi (compatible)"}
              </li>
              <li>
                <span className="text-slate-400">Rajju:</span>{" "}
                {result.rajju ? "Compatible" : "Incompatible"}
              </li>
            </ul>
          </div>
          <p className="text-xs italic text-slate-500">
            v1 heuristic — no live ephemeris. For demonstration only.
          </p>
        </section>
      )}
    </div>
  );
}

export default function KundaliProfileUI({
  appId,
}: {
  appId: string;
  registrySlug: string;
}) {
  const [view, setView] = useState<"settings" | "matching">("settings");
  const navBtn = (
    active: boolean,
  ): string =>
    `rounded px-3 py-1.5 text-sm font-medium ${
      active
        ? "bg-indigo-600 text-white"
        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
    }`;
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <button
          type="button"
          className={navBtn(view === "settings")}
          onClick={() => setView("settings")}
        >
          Settings
        </button>
        <button
          type="button"
          className={navBtn(view === "matching")}
          onClick={() => setView("matching")}
        >
          Kundali Matching
        </button>
      </div>
      {view === "settings" ? (
        <SettingsPanel appId={appId} />
      ) : (
        <MatchingPanel appId={appId} />
      )}
    </div>
  );
}

// Register with tele's PluginSlot runtime loader. PluginSlot polls
// window.__TELE_PLUGIN_UI__[slug] after injecting the <script>. The key
// MUST equal the registry slug ("kundali-match") AND the manifest.slug —
// validateInstalledPlugin asserts the registry-vs-manifest match at install
// time, but the window-key match here is by convention.
if (typeof window !== "undefined") {
  const w = window as unknown as {
    __TELE_PLUGIN_UI__?: Record<string, typeof KundaliProfileUI>;
  };
  w.__TELE_PLUGIN_UI__ = w.__TELE_PLUGIN_UI__ || {};
  w.__TELE_PLUGIN_UI__["kundali-match"] = KundaliProfileUI;
}
