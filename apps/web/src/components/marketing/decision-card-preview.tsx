import sample from "@session-coach/shared/fixtures/session.sample.json";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// The hero's product object: card 0 of the shared sample session, built from the real components. The answer key
// (model_answer) stays off the page, as it does for learners. Two blank cards behind it make the stack a deck.
const card = sample.cards[0];
const { session } = sample;
const reviewDays = [1, 3, 7];

export function DecisionCardPreview() {
  return (
    <div className="relative mx-auto w-full max-w-md text-start">
      <div aria-hidden className="absolute inset-0 translate-x-3 translate-y-4 rotate-3">
        <Card className="h-full" />
      </div>
      <div aria-hidden className="absolute inset-0 -translate-x-2 translate-y-2 -rotate-2">
        <Card className="h-full" />
      </div>
      <div className="relative">
        <Card size="lg">
          <CardHeader>
            <CardTitle>{session.title}</CardTitle>
            <CardDescription>
              <span className="flex flex-wrap gap-x-3">
                <span className="type-code-sm">{session.repo}</span>
                <span>{session.duration_min} min session</span>
              </span>
            </CardDescription>
            <CardAction>
              <Badge>
                Card {card.position + 1} of {sample.cards.length}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="type-heading-sm text-pretty text-text-1">{card.decision}</p>
            <p className="text-text-2">{card.why}</p>
            <figure className="flex flex-col gap-2 rounded-soft well p-3">
              <blockquote className="type-body-sm text-text-1">
                &ldquo;{card.evidence[0].quote}&rdquo;
              </blockquote>
              <figcaption className="flex flex-wrap items-center gap-2 type-body-sm text-text-2">
                <Badge variant="outline">{card.source === "stated" ? "Stated" : "Inferred"}</Badge>
                <span className="type-code-sm break-all">{card.files[0]}</span>
              </figcaption>
            </figure>
          </CardContent>
          <CardFooter>
            <div className="flex flex-col items-start gap-3 py-2">
              <p className="type-label text-text-1">{card.question}</p>
              <ul className="flex flex-wrap gap-2" aria-label="Explain it back on">
                {reviewDays.map((day) => (
                  <li key={day}>
                    <Badge variant="outline">Day {day}</Badge>
                  </li>
                ))}
              </ul>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
