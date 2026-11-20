import type { MechanismProfile, StageIndex } from '../types/masonry';
import { STAGE_NAMES, stageNote } from '../data/mechanisms';

function Block({ title, children }: { title: string; children: string }) {
  return (
    <section>
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      <p className="text-sm leading-relaxed text-slate-800">{children}</p>
    </section>
  );
}

export default function ExplanationPanel({
  profile,
  stage,
}: {
  profile: MechanismProfile;
  stage: StageIndex;
}) {
  const c = profile.config;
  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="mb-1 text-xs text-slate-500">Configuration {profile.id} of 16</div>
        <h2 className="text-lg font-bold leading-snug text-slate-900">{profile.title}</h2>
        <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
          {[
            c.loadingType === 'in-plane' ? 'In-plane' : 'Out-of-plane',
            `${c.precompression === 'low' ? 'Low' : 'High'} precompression`,
            `${c.mortarStrength === 'weak' ? 'Weak' : 'Strong'} mortar`,
            `${c.brickStrength === 'weak' ? 'Weak' : 'Strong'} brick`,
          ].map((t) => (
            <span key={t} className="rounded-full bg-slate-200 px-2 py-0.5 text-slate-700">
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-slate-300 bg-white p-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Stage {stage}: {STAGE_NAMES[stage]}
        </div>
        <p className="mt-1 text-sm text-slate-800">{stageNote(profile, stage)}</p>
      </div>

      <Block title="Failure mechanism">{profile.mechanismExplanation}</Block>
      <Block title="Where first damage appears">{profile.firstDamageLocation}</Block>
      <Block title="Crack and damage path">{profile.crackPath}</Block>
      <Block title="How material properties influence it">{profile.materialInfluence}</Block>
      <Block title="How axial precompression changes behaviour">{profile.precompressionInfluence}</Block>

      <p className="border-t border-slate-200 pt-3 text-xs text-slate-500">
        MasonryLab is a qualitative teaching tool. It is not a structural design calculator and it has not been
        validated against experiments.
      </p>
    </div>
  );
}
