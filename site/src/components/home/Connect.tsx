import { Icon, type IconName } from "@senvenli/react/display";

/** Where an agent runs. Generic icons, plain names. */
const CLIENTS: { name: string; icon: IconName }[] = [
  { name: "Claude Code", icon: "terminal" },
  { name: "Cursor", icon: "mouse-pointer-2" },
  { name: "VS Code", icon: "code-xml" },
  { name: "Any MCP client", icon: "bot" },
];

// The drawing space of a wire: as tall as the four client tiles (44px each, 12px apart), so a line ends at the
// middle of each tile; its width stretches to the room there is.
const WIDTH = 96;
const ROW = 44;
const GAP = 12;
const HEIGHT = CLIENTS.length * ROW + (CLIENTS.length - 1) * GAP;
const MIDDLE = HEIGHT / 2;
const ENDS = CLIENTS.map((_, index) => index * (ROW + GAP) + ROW / 2);

/** The lines between two columns: each drawn once at rest, and once more as the short pulse that travels along it. */
function Wire({ paths, part }: { paths: string[]; part: "trunk" | "fan" }) {
  return (
    <svg className="home-wire h-full min-w-6 flex-1 sm:max-w-36" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" focusable="false">
      {paths.map((d) => (
        <path key={d} d={d} className="home-wire-line" />
      ))}
      {paths.map((d) => (
        <path key={d} d={d} pathLength={100} className={`home-wire-pulse home-wire-pulse-${part}`} />
      ))}
    </svg>
  );
}

/** A label under a tile, out of the flow, so the tile itself stays on the middle line. */
function Caption({ children }: { children: React.ReactNode }) {
  return <span className="absolute start-1/2 top-full mt-ds-100 -translate-x-1/2 text-body-small font-medium whitespace-nowrap text-ds-text-subtle rtl:translate-x-1/2">{children}</span>;
}

/**
 * How the library reaches an agent, as one picture: the library, a line to its MCP server, and the server fanning out
 * to where agents run. It is an image with one name (the parts inside are not announced one by one); a short pulse
 * travels along the lines (styles.css; off under reduced motion). Under 640px the client tiles are icons alone and
 * their names are the line under the picture.
 */
export function Connect() {
  const names = CLIENTS.map((client) => client.name);
  return (
    <div className="flex w-full flex-col items-center gap-ds-300">
      <div
        role="img"
        aria-label={`Senvenli UI connects through its MCP server to ${names.slice(0, -1).join(", ")} or ${names.at(-1)!.toLowerCase()}`}
        className="flex w-full max-w-2xl items-center justify-center pb-ds-400"
        style={{ height: `calc(${HEIGHT}px + var(--spacing-ds-400, 2rem))` }}
      >
        <span className="relative grid size-14 shrink-0 place-items-center rounded-ds-large bg-ds-background-brand-bold text-ds-text-on-brand shadow-ds-overlay sm:size-20">
          <Icon name="component" size="large" />
          <Caption>Senvenli UI</Caption>
        </span>
        <Wire part="trunk" paths={[`M0 ${MIDDLE} H${WIDTH}`]} />
        <span className="relative grid size-12 shrink-0 place-items-center rounded-ds-large bg-ds-surface-raised text-ds-text shadow-ds-raised sm:size-14">
          <Icon name="server" />
          <Caption>MCP server</Caption>
        </span>
        <Wire part="fan" paths={ENDS.map((y) => `M0 ${MIDDLE} C${WIDTH / 2} ${MIDDLE} ${WIDTH / 2} ${y} ${WIDTH} ${y}`)} />
        <span className="flex shrink-0 flex-col" style={{ gap: GAP }}>
          {CLIENTS.map((client) => (
            <span
              key={client.name}
              className="flex items-center justify-center gap-ds-100 rounded-ds-medium bg-ds-surface-raised text-body-small font-medium text-ds-text shadow-ds-raised max-sm:w-11 sm:justify-start sm:px-ds-150"
              style={{ height: ROW }}
            >
              <Icon name={client.icon} color="subtle" />
              <span className="whitespace-nowrap max-sm:hidden">{client.name}</span>
            </span>
          ))}
        </span>
      </div>
      <p className="m-0 text-body-small text-ds-text-subtle sm:hidden">{names.join(" · ")}</p>
    </div>
  );
}
