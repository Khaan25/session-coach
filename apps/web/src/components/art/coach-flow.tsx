import { LearningMark } from "@/components/art/engineering-illustrations";
import { CodeIcon, ChatTextIcon, PathIcon, CheckIcon } from "@phosphor-icons/react/ssr";
const journey = [
  { name: "From your work", Icon: CodeIcon },
  { name: "Explain the why", Icon: ChatTextIcon },
  { name: "Come back", Icon: PathIcon },
  { name: "Make it yours", Icon: CheckIcon },
];
/** A diagram of existing learning stages, never a claim that a stage is complete. */
export function CoachFlow() {
  return (
    <ol className="coach-flow" aria-label="How your work becomes understanding">
      {journey.map(({ name, Icon }) => (
        <li key={name}>
          <span aria-hidden>
            <Icon />
          </span>
          <p>{name}</p>
        </li>
      ))}
    </ol>
  );
}
export function ProjectGlyph({ owned, total }: { owned: number; total: number }) {
  return (
    <svg className="coach-project-glyph" viewBox="0 0 96 88" aria-hidden="true">
      <path className="coach-glyph-back" d="m23 10 55 10-6 59-55-10z" />
      <path className="coach-glyph-front" d="M12 25h59v52H12z" />
      <path className="coach-glyph-rule" d="M25 40h32M25 48h25" />
      <path className="coach-glyph-progress-track" d="M25 61h32" />
      <path
        className="coach-glyph-progress"
        d="M25 61h32"
        pathLength="100"
        strokeDasharray={`${total ? Math.min(100, (owned / total) * 100) : 0} 100`}
      />
      <path className="coach-glyph-fold" d="m59 25 12 12H59z" />
    </svg>
  );
}
export function DefenseStages() {
  return (
    <ol className="coach-defense-stages">
      <li>
        <LearningMark kind="explain" />
        <div>
          <h2>Make your case</h2>
          <p>3 minutes, in your own words.</p>
        </div>
      </li>
      <li>
        <LearningMark kind="defend" />
        <div>
          <h2>Meet the pushback</h2>
          <p>2 minutes for a reviewer’s follow-up.</p>
        </div>
      </li>
    </ol>
  );
}
