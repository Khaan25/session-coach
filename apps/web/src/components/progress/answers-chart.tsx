"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import type { ProgressSummary } from "@/lib/progress/progress";

const fullDay = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});
const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const answerWords = (answers: number) => `${answers} ${answers === 1 ? "answer" : "answers"}`;

/** Existing 30-day answer totals, aligned to real local calendar dates; no inferred streak score. */
export function AnswersChart({ data }: { data: ProgressSummary["answersPerDay"] }) {
  const id = useId();
  const last = Math.max(0, data.length - 1);
  const [focused, setFocused] = useState(last);
  const [inspected, setInspected] = useState(last);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const selected = data[Math.min(inspected, last)];
  const total = data.reduce((sum, { answers }) => sum + answers, 0);
  const start = data[0] ? (new Date(`${data[0].date}T00:00:00Z`).getUTCDay() + 6) % 7 : 0;

  function move(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const destinations: Record<string, number> = {
      ArrowUp: index - 1,
      ArrowDown: index + 1,
      ArrowLeft: index - 7,
      ArrowRight: index + 7,
      Home: 0,
      End: last,
    };
    if (!(event.key in destinations)) return;
    event.preventDefault();
    const next = Math.min(last, Math.max(0, destinations[event.key]!));
    buttons.current[next]?.focus();
  }

  return (
    <figure className="practice-activity" aria-labelledby={`${id}-title`}>
      <figcaption className="practice-activity-heading">
        <p className="practice-activity-caption">Practice history</p>
        <h2 id={`${id}-title`}>
          <strong>{total}</strong> {total === 1 ? "answer" : "answers"}{" "}
          <span>in {data.length} days.</span>
        </h2>
        <p className="practice-activity-range">
          {data[0]?.day} — {data.at(-1)?.day}
        </p>
        <p
          className="practice-activity-inspection"
          id={`${id}-detail`}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {selected && (
            <>
              <span>{fullDay.format(new Date(`${selected.date}T00:00:00Z`))}</span>
              <strong>{answerWords(selected.answers)}</strong>
            </>
          )}
        </p>
      </figcaption>
      <div className="practice-calendar">
        <div className="practice-calendar-weekdays" aria-hidden="true">
          {weekdays.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <ol
          className="practice-activity-days"
          data-start={start}
          aria-label="Answers per day"
          aria-describedby={`${id}-help`}
          onMouseLeave={() => setInspected(Math.min(focused, last))}
        >
          {data.map(({ date, day, answers }, index) => (
            <li key={date} data-level={answers === 0 ? 0 : answers === 1 ? 1 : answers < 4 ? 2 : 3}>
              <Button
                variant="activity"
                size="activity"
                data-static
                ref={(node) => {
                  buttons.current[index] = node;
                }}
                data-level={answers === 0 ? 0 : answers === 1 ? 1 : answers < 4 ? 2 : 3}
                data-inspected={index === inspected || undefined}
                tabIndex={index === Math.min(focused, last) ? 0 : -1}
                aria-label={`${fullDay.format(new Date(`${date}T00:00:00Z`))}: ${answerWords(answers)}`}
                onMouseEnter={() => setInspected(index)}
                onFocus={() => {
                  setFocused(index);
                  setInspected(index);
                }}
                onClick={() => {
                  setFocused(index);
                  setInspected(index);
                }}
                onKeyDown={(event) => move(event, index)}
              />
              <span className="sr-only">
                {day}: {answerWords(answers)}
              </span>
            </li>
          ))}
        </ol>
        <div className="practice-activity-key" aria-hidden="true">
          <span>Less</span>
          {[0, 1, 2, 3].map((level) => (
            <i key={level} data-level={level} />
          ))}
          <span>More</span>
        </div>
        <p id={`${id}-help`} className="sr-only">
          Use arrow keys to explore days; Home and End move to the first and last day.
        </p>
      </div>
    </figure>
  );
}
