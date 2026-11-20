import {
  BRAND_ROLES,
  createTheme,
  decodePreset,
  encodePreset,
  formatHex,
  toCSS,
  toNative,
  type BorderWidth,
  type BrandRole,
  type Density,
  type ThemeInput,
} from "@senvenli/tokens";
import { useEffect, useMemo, useState } from "react";
import { ComponentsPreview } from "./ComponentsPreview";

const PRESETS: Array<{ name: string; input: ThemeInput }> = [
  { name: "Neutral", input: {} },
  { name: "Gold", input: { primary: "#996a00" } },
  { name: "Ocean", input: { primary: "#1268ae", secondary: "#e3edf7" } },
  { name: "Violet", input: { primary: "#6e56cf", tertiary: "#e9e3fb", radius: 1 } },
  { name: "Forest", input: { primary: "#2f6f4f", radius: 0.375, density: "compact" } },
];

const ROLE_LABEL: Record<BrandRole, string> = { primary: "Primary", secondary: "Secondary", tertiary: "Tertiary" };

/** The bold fill token each brand role drives. */
const ROLE_TOKEN: Record<BrandRole, string> = {
  primary: "ds-background-brand-bold",
  secondary: "ds-background-secondary-bold",
  tertiary: "ds-background-tertiary-bold",
};

const SWATCHES = [
  "ds-surface",
  "ds-surface-raised",
  "ds-surface-sunken",
  "ds-background-neutral",
  "ds-text",
  "ds-text-subtle",
  "ds-border-focused",
  "ds-background-brand-bold",
  "ds-background-selected",
  "ds-text-brand",
  "ds-background-secondary-bold",
  "ds-background-tertiary-bold",
  "ds-background-success-bold",
  "ds-background-warning-bold",
  "ds-background-danger-bold",
  "ds-background-information-bold",
];

function readInitial(): ThemeInput {
  const code = new URLSearchParams(window.location.search).get("p");
  return (code && decodePreset(code)) || {};
}

type OutputTab = "css" | "native" | "code";

export function App() {
  const [input, setInput] = useState<ThemeInput>(readInitial);
  const [dark, setDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);
  const [tab, setTab] = useState<OutputTab>("css");
  const [copied, setCopied] = useState(false);

  const theme = useMemo(() => createTheme(input), [input]);
  const css = useMemo(() => toCSS(theme, { tailwind: true }), [theme]);
  const code = useMemo(() => encodePreset(input), [input]);
  const failing = theme.checks.filter((c) => !c.pass);

  useEffect(() => {
    let el = document.getElementById("theme-vars") as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = "theme-vars";
      document.head.appendChild(el);
    }
    el.textContent = toCSS(theme);
    const url = new URL(window.location.href);
    if (Object.keys(theme.input).length) url.searchParams.set("p", code);
    else url.searchParams.delete("p");
    window.history.replaceState(null, "", url);
  }, [theme, code]);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);

  const set = (patch: Partial<ThemeInput>) => setInput((prev) => ({ ...prev, ...patch }));
  const clearRole = (role: BrandRole) =>
    setInput((prev) => {
      const next = { ...prev };
      delete next[role];
      return next;
    });

  const output =
    tab === "css"
      ? css
      : tab === "native"
        ? `${JSON.stringify(toNative(theme), null, 2)}\n`
        : `npx senvenli-ui theme ${code}\n\n${window.location.origin}/?p=${code}\n`;

  const copy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  const mode = dark ? theme.dark : theme.light;

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          Senvenli UI
          <span className="brand-sub">Create a theme</span>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-ghost" onClick={() => setDark((d) => !d)}>
            {dark ? "Light mode" : "Dark mode"}
          </button>
        </div>
      </header>

      <main className="layout">
        <aside className="panel">
          <section className="panel-group">
            <h2>Start from</h2>
            <div className="chips">
              {PRESETS.map((p) => (
                <button key={p.name} className="chip" onClick={() => setInput(p.input)}>
                  <span
                    className="chip-dot"
                    style={{ background: formatHex(createTheme(p.input).light[ROLE_TOKEN.primary]!) }}
                    aria-hidden="true"
                  />
                  {p.name}
                </button>
              ))}
            </div>
          </section>

          <section className="panel-group">
            <h2>Colors</h2>
            <p className="hint">All optional. Leave a color empty to keep the neutral default.</p>
            {BRAND_ROLES.map((role) => {
              const value = input[role];
              const shown = value
                ? formatHex(createTheme({ [role]: value }).light[ROLE_TOKEN[role]]!)
                : formatHex(mode[ROLE_TOKEN[role]]!);
              return (
                <div className="field-row" key={role}>
                  <label className="field-label" htmlFor={`color-${role}`}>
                    {ROLE_LABEL[role]}
                    {theme.adjusted.includes(role) && <span className="tag">Adjusted for contrast</span>}
                  </label>
                  <div className="color-input">
                    <input
                      id={`color-${role}`}
                      type="color"
                      value={value?.startsWith("#") && value.length === 7 ? value : shown}
                      onChange={(e) => set({ [role]: e.target.value })}
                    />
                    <input
                      className="text-input"
                      value={value ?? ""}
                      placeholder="Default"
                      spellCheck={false}
                      onChange={(e) => (e.target.value ? set({ [role]: e.target.value }) : clearRole(role))}
                    />
                    {value && (
                      <button className="btn btn-ghost btn-sm" onClick={() => clearRole(role)}>
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </section>

          <section className="panel-group">
            <h2>Layout</h2>
            <div className="field-row">
              <label className="field-label" htmlFor="radius">
                Radius <span className="value">{theme.layout.radius}rem</span>
              </label>
              <input
                id="radius"
                type="range"
                min={0}
                max={1.5}
                step={0.125}
                value={theme.layout.radius}
                onChange={(e) => set({ radius: Number(e.target.value) })}
              />
            </div>
            <Segmented<Density>
              label="Density"
              value={theme.layout.density}
              options={["compact", "default", "comfortable"]}
              onChange={(density) => set({ density })}
            />
            <Segmented<BorderWidth>
              label="Border width"
              value={theme.layout.borderWidth}
              options={[0, 1, 2]}
              format={(v) => `${v}px`}
              onChange={(borderWidth) => set({ borderWidth })}
            />
          </section>

          <section className="panel-group">
            <h2>Contrast</h2>
            <p className={failing.length ? "status status-bad" : "status status-ok"}>
              {failing.length
                ? `${failing.length} of ${theme.checks.length} pairs below WCAG AA`
                : `All ${theme.checks.length} color pairs meet WCAG AA in light and dark`}
            </p>
          </section>
        </aside>

        <section className="preview" aria-label="Preview">
          <div className="preview-grid">
            <div className="card">
              <h3>Buttons</h3>
              <div className="row">
                <button className="btn btn-primary">Save changes</button>
                <button className="btn btn-neutral">Cancel</button>
              </div>
              <div className="row">
                <button className="btn btn-secondary">Secondary</button>
                <button className="btn btn-tertiary">Tertiary</button>
              </div>
              <div className="row">
                <button className="btn btn-soft">Soft</button>
                <button className="btn btn-outline">Outline</button>
                <button className="btn btn-ghost">Ghost</button>
                <button className="btn btn-primary" disabled>
                  Disabled
                </button>
              </div>
            </div>

            <div className="card">
              <h3>Form</h3>
              <label className="field-label" htmlFor="demo-name">
                Full name
              </label>
              <input id="demo-name" className="text-input" placeholder="Ada Lovelace" />
              <label className="field-label" htmlFor="demo-email">
                Email
              </label>
              <input id="demo-email" className="text-input" defaultValue="ada@example.com" />
              <p className="hint">Focus a field: its border takes the focus color. No outer ring.</p>
              <label className="check">
                <input type="checkbox" defaultChecked /> Send me product updates
              </label>
            </div>

            <div className="card">
              <h3>Status</h3>
              <div className="row">
                <span className="badge badge-success">Active</span>
                <span className="badge badge-warning">Pending</span>
                <span className="badge badge-danger">Failed</span>
                <span className="badge badge-info">Draft</span>
              </div>
              <div className="alert alert-info">
                <strong>New version available.</strong> Refresh to get the latest features.
              </div>
              <div className="alert alert-danger">
                <strong>Payment failed.</strong> Check your card details and try again.
              </div>
            </div>

            <div className="card">
              <h3>List</h3>
              <ul className="list">
                {["Overview", "Projects", "Members", "Settings"].map((item, i) => (
                  <li key={item} className={i === 1 ? "list-item is-selected" : "list-item"}>
                    {item}
                    <span className="muted">{[12, 4, 28, ""][i]}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card-wide">
              <ComponentsPreview />
            </div>

            <div className="card card-wide">
              <h3>Tokens</h3>
              <div className="swatches">
                {SWATCHES.map((name) => (
                  <div key={name} className="swatch">
                    <span className="swatch-color" style={{ background: `var(--${name})` }} />
                    <span className="swatch-name">{name.replace(/^ds-/, "")}</span>
                    <span className="swatch-value">{formatHex(mode[name]!)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card card-wide">
              <div className="output-head">
                <div className="tabs" role="tablist">
                  {(
                    [
                      ["css", "CSS"],
                      ["native", "Native (hex)"],
                      ["code", "Preset code"],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      role="tab"
                      aria-selected={tab === key}
                      className={tab === key ? "tab is-active" : "tab"}
                      onClick={() => setTab(key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <button className="btn btn-secondary btn-sm" onClick={copy}>
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <pre className="code">{output}</pre>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function Segmented<T extends string | number>(props: {
  label: string;
  value: T;
  options: T[];
  format?: (v: T) => string;
  onChange: (v: T) => void;
}) {
  const format = props.format ?? ((v: T) => String(v).charAt(0).toUpperCase() + String(v).slice(1));
  return (
    <div className="field-row">
      <span className="field-label">{props.label}</span>
      <div className="segmented" role="radiogroup" aria-label={props.label}>
        {props.options.map((opt) => (
          <button
            key={String(opt)}
            role="radio"
            aria-checked={props.value === opt}
            className={props.value === opt ? "seg is-active" : "seg"}
            onClick={() => props.onChange(opt)}
          >
            {format(opt)}
          </button>
        ))}
      </div>
    </div>
  );
}
