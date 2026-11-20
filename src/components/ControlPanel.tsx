import type { MasonryConfig } from '../types/masonry';

interface Group {
  title: string;
  key: keyof MasonryConfig;
  options: { value: string; label: string }[];
}

const GROUPS: Group[] = [
  {
    title: 'A. Loading type',
    key: 'loadingType',
    options: [
      { value: 'in-plane', label: 'In-plane' },
      { value: 'out-of-plane', label: 'Out-of-plane' },
    ],
  },
  {
    title: 'B. Axial precompression',
    key: 'precompression',
    options: [
      { value: 'low', label: 'Low' },
      { value: 'high', label: 'High' },
    ],
  },
  {
    title: 'C. Mortar strength',
    key: 'mortarStrength',
    options: [
      { value: 'weak', label: 'Weak' },
      { value: 'strong', label: 'Strong' },
    ],
  },
  {
    title: 'D. Brick strength',
    key: 'brickStrength',
    options: [
      { value: 'weak', label: 'Weak' },
      { value: 'strong', label: 'Strong' },
    ],
  },
];

export default function ControlPanel({
  config,
  onChange,
}: {
  config: MasonryConfig;
  onChange: (c: MasonryConfig) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      {GROUPS.map((g) => (
        <fieldset key={g.key}>
          <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{g.title}</legend>
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-200 p-1">
            {g.options.map((o) => {
              const active = config[g.key] === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChange({ ...config, [g.key]: o.value } as MasonryConfig)}
                  className={
                    'rounded-md px-2 py-2 text-sm font-medium transition ' +
                    (active ? 'bg-slate-900 text-white shadow' : 'text-slate-700 hover:bg-white')
                  }
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-600">
        <div className="mb-2 font-semibold uppercase tracking-wide text-slate-500">Key</div>
        <ul className="space-y-1.5">
          <li className="flex items-center gap-2">
            <span className="inline-block h-3 w-5 rounded-sm" style={{ background: '#e2b595' }} /> Weak brick (light)
          </li>
          <li className="flex items-center gap-2">
            <span className="inline-block h-3 w-5 rounded-sm" style={{ background: '#a5462d' }} /> Strong brick (dark)
          </li>
          <li className="flex items-center gap-2">
            <span className="inline-block h-3 w-5 rounded-sm border border-slate-300" style={{ background: '#ebe6da' }} /> Weak mortar (light)
          </li>
          <li className="flex items-center gap-2">
            <span className="inline-block h-3 w-5 rounded-sm" style={{ background: '#6c6963' }} /> Strong mortar (dark)
          </li>
          <li className="flex items-center gap-2">
            <span className="inline-block h-0.5 w-5" style={{ background: '#d4001f' }} /> Crack along mortar joints
          </li>
          <li className="flex items-center gap-2">
            <span className="inline-block h-0.5 w-5" style={{ background: '#111827' }} /> Crack through bricks
          </li>
          <li className="flex items-center gap-2">
            <span className="inline-block h-3 w-5 rounded-sm" style={{ background: '#5b1a10' }} /> Crushed / spalled zone
          </li>
          <li className="flex items-center gap-2">
            <span className="inline-block h-0.5 w-5" style={{ background: '#1d4ed8' }} /> Lateral load / pressure
          </li>
          <li className="flex items-center gap-2">
            <span className="inline-block h-0.5 w-5" style={{ background: '#b45309' }} /> Axial precompression
          </li>
        </ul>
      </div>
    </div>
  );
}
