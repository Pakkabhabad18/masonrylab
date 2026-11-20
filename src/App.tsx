import { useEffect, useState } from 'react';
import ControlPanel from './components/ControlPanel';
import ExplanationPanel from './components/ExplanationPanel';
import MasonryWallView from './components/MasonryWallView';
import StageControls from './components/StageControls';
import { getMechanismProfile } from './data/mechanisms';
import type { MasonryConfig, StageIndex } from './types/masonry';
import { useTween } from './useTween';

const PLAY_INTERVAL_MS = 1100; // time between stages while playing

export default function App() {
  const [config, setConfig] = useState<MasonryConfig>({
    loadingType: 'in-plane',
    precompression: 'low',
    mortarStrength: 'weak',
    brickStrength: 'weak',
  });
  const [stage, setStage] = useState<StageIndex>(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const profile = getMechanismProfile(config);
  const shownStage = useTween(stage); // fractional stage used for smooth drawing

  // Playback: advance one stage per interval and stop at Stage 4
  useEffect(() => {
    if (!isPlaying) return;
    if (stage >= 4) {
      setIsPlaying(false);
      return;
    }
    const id = window.setTimeout(() => setStage((s) => (Math.min(4, s + 1) as StageIndex)), PLAY_INTERVAL_MS);
    return () => window.clearTimeout(id);
  }, [isPlaying, stage]);

  const play = () => {
    if (stage >= 4) setStage(0);
    setIsPlaying(true);
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-baseline gap-3 border-b border-slate-300 bg-white px-5 py-3">
        <h1 className="text-lg font-bold tracking-tight">MasonryLab</h1>
        <span className="text-sm text-slate-500">Interactive 2D masonry wall behaviour and failure visualizer</span>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-auto lg:grid-cols-[250px_minmax(0,1fr)_370px] lg:overflow-hidden">
        <aside className="overflow-y-auto border-b border-slate-300 bg-slate-100 p-4 lg:border-b-0 lg:border-r">
          <ControlPanel config={config} onChange={setConfig} />
        </aside>

        <section className="flex min-h-[420px] items-center justify-center bg-white p-2">
          <MasonryWallView config={config} stage={shownStage} />
        </section>

        <aside className="overflow-y-auto border-t border-slate-300 bg-slate-50 p-4 lg:border-l lg:border-t-0">
          <ExplanationPanel profile={profile} stage={stage} />
        </aside>
      </main>

      <footer className="border-t border-slate-300 bg-slate-100 px-5 py-3">
        <StageControls
          stage={stage}
          isPlaying={isPlaying}
          onPrev={() => setStage((s) => (Math.max(0, s - 1) as StageIndex))}
          onNext={() => setStage((s) => (Math.min(4, s + 1) as StageIndex))}
          onPlay={play}
          onPause={() => setIsPlaying(false)}
          onReset={() => {
            setIsPlaying(false);
            setStage(0);
          }}
          onSelect={(s) => {
            setIsPlaying(false);
            setStage(s);
          }}
        />
      </footer>
    </div>
  );
}
