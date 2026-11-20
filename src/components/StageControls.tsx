import { Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react';
import type { StageIndex } from '../types/masonry';
import { STAGE_NAMES } from '../data/mechanisms';

interface Props {
  stage: StageIndex;
  isPlaying: boolean;
  onPrev: () => void;
  onNext: () => void;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  onSelect: (s: StageIndex) => void;
}

const btn =
  'inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40';

export default function StageControls({ stage, isPlaying, onPrev, onNext, onPlay, onPause, onReset, onSelect }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btn} onClick={onPrev} disabled={stage === 0}>
          <SkipBack size={16} /> Previous stage
        </button>
        <button type="button" className={btn} onClick={onNext} disabled={stage === 4}>
          Next stage <SkipForward size={16} />
        </button>
        <button type="button" className={btn} onClick={onPlay} disabled={isPlaying}>
          <Play size={16} /> Play
        </button>
        <button type="button" className={btn} onClick={onPause} disabled={!isPlaying}>
          <Pause size={16} /> Pause
        </button>
        <button type="button" className={btn} onClick={onReset}>
          <RotateCcw size={16} /> Reset
        </button>
      </div>

      <div className="flex flex-1 items-center gap-1.5" role="group" aria-label="Stage selector">
        {([0, 1, 2, 3, 4] as StageIndex[]).map((s) => (
          <button
            key={s}
            type="button"
            title={STAGE_NAMES[s]}
            aria-pressed={stage === s}
            onClick={() => onSelect(s)}
            className={
              'flex-1 rounded-md px-2 py-2 text-center text-xs font-semibold transition ' +
              (stage === s
                ? 'bg-slate-900 text-white'
                : s < stage
                  ? 'bg-slate-300 text-slate-800 hover:bg-slate-400'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200')
            }
          >
            Stage {s}
          </button>
        ))}
      </div>
    </div>
  );
}
