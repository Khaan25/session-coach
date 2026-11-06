/** Product-native illustrations; the surrounding example owns the playback clock. */
export function DecisionStoryArt() {
  return (
    <svg className="decision-story-art" viewBox="0 0 720 440" fill="none" aria-hidden="true">
      <defs>
        <linearGradient
          id="decision-plane"
          x1="130"
          y1="70"
          x2="580"
          y2="370"
          gradientUnits="userSpaceOnUse"
        >
          <stop className="decision-plane-start" />
          <stop offset="1" className="decision-plane-end" />
        </linearGradient>
      </defs>
      <ellipse className="story-art-shadow" cx="360" cy="365" rx="235" ry="22" />
      <rect className="decision-context-plane" x="130" y="77" width="460" height="275" rx="12" />
      <path className="decision-frame-edge" d="M152 63h416M145 69h430" />
      <text className="story-art-meta" x="160" y="110">
        rapporteur / decision 01
      </text>
      <path className="decision-frame-edge" d="M154 129h412" />
      <g className="story-art-code">
        <text className="story-art-meta" x="161" y="167">
          transcriptParser.ts
        </text>
        <text x="161" y="220">
          import {"{ parse }"}
        </text>
        <rect className="story-art-highlight" x="343" y="236" width="66" height="35" rx="4" />
        <text x="161" y="262">
          from &quot;./parser<tspan className="story-art-choice">.js</tspan>&quot;;
        </text>
        <text className="story-art-meta" x="161" y="320">
          A choice inside the code you shipped.
        </text>
      </g>
      <g className="story-art-proof">
        <text className="story-art-meta" x="161" y="170">
          THE REASON, IN YOUR SESSION
        </text>
        <rect className="story-art-highlight" x="158" y="196" width="396" height="38" rx="4" />
        <text x="166" y="222">
          “matching resultSchema.ts’s
        </text>
        <text x="166" y="256">
          convention”
        </text>
        <path className="story-art-check" d="m164 309 6 6 12-13" />
        <text className="story-art-meta" x="199" y="315">
          Quote found in the session
        </text>
      </g>
      <g className="story-art-answer">
        <text className="story-art-meta" x="161" y="170">
          WHY THIS CHOICE?
        </text>
        <g className="decision-written-answer">
          <text x="161" y="220">
            Keep imports consistent
          </text>
          <text x="161" y="254">
            with the project.
          </text>
        </g>
        <path className="decision-writing-caret" d="M366 234v25" />
        <g className="story-art-answer-check">
          <path className="story-art-check" d="m164 309 6 6 12-13" />
          <text className="story-art-meta" x="199" y="315">
            Got it · explained in your words
          </text>
        </g>
      </g>
      <g className="story-art-recall">
        <text className="story-art-meta" x="161" y="170">
          THE SAME DECISION, REMEMBERED
        </text>
        <path className="decision-recall-track" d="M197 226H517" />
        <g className="story-art-day story-art-day-one">
          <circle className="decision-recall-stop" cx="197" cy="226" r="17" />
          <path className="story-art-check" d="m190 226 5 5 9-11" />
          <text className="story-art-meta" x="174" y="270">
            Day 1
          </text>
        </g>
        <g className="story-art-day story-art-day-two">
          <circle className="decision-recall-stop" cx="357" cy="226" r="17" />
          <path className="story-art-check" d="m350 226 5 5 9-11" />
          <text className="story-art-meta" x="334" y="270">
            Day 4
          </text>
        </g>
        <g className="story-art-day story-art-day-three">
          <circle className="decision-recall-stop" cx="517" cy="226" r="17" />
          <path className="story-art-check" d="m510 226 5 5 9-11" />
          <text className="story-art-meta" x="489" y="270">
            Day 11
          </text>
        </g>
        <g className="story-art-owned">
          <text className="story-art-meta" x="161" y="320">
            Correct on day 11. Now you own it.
          </text>
        </g>
      </g>
    </svg>
  );
}
export function EvidenceArt() {
  return (
    <svg className="support-story-art" viewBox="0 0 540 260" fill="none" aria-hidden="true">
      <g className="evidence-art-source">
        <path className="evidence-source-margin" d="M66 34V222" />
        <text className="story-art-meta" x="88" y="50">
          transcriptParser.ts / session
        </text>
        <text className="evidence-line-number" x="32" y="101">
          01
        </text>
        <path className="story-art-rule" d="M89 94h265M89 110h190" />
        <text className="evidence-line-number" x="32" y="154">
          02
        </text>
        <rect className="evidence-source-focus" x="80" y="130" width="390" height="53" rx="4" />
        <text className="story-art-meta" x="91" y="151">
          matching resultSchema.ts’s
        </text>
        <text className="story-art-meta" x="91" y="172">
          convention
        </text>
        <text className="evidence-line-number" x="32" y="216">
          03
        </text>
        <path className="story-art-rule" d="M89 209h220M89 225h300" />
      </g>
      <path className="evidence-focus-bracket" d="M482 132h12v50h-12" />
      <g className="evidence-source-confirm">
        <path className="story-art-check" d="m450 213 6 6 12-13" />
      </g>
    </svg>
  );
}
export function PrivacyArt() {
  return (
    <svg className="support-story-art" viewBox="0 0 540 260" fill="none" aria-hidden="true">
      <path className="privacy-data-thread" d="M30 130H510" />
      <g className="privacy-filter-gate">
        <path d="M183 48q-42 82 0 164M204 48q-42 82 0 164" />
        <text className="story-art-meta" x="143" y="240">
          Laptop
        </text>
      </g>
      <g className="privacy-filter-gate privacy-filter-second">
        <path d="M384 48q-42 82 0 164M405 48q-42 82 0 164" />
        <text className="story-art-meta" x="349" y="240">
          Storage
        </text>
      </g>
      <g className="privacy-sensitive-value">
        <text className="story-art-meta" x="24" y="111">
          API_KEY
        </text>
        <path className="story-art-rule" d="M24 146h91M24 161h57" />
      </g>
      <g className="privacy-filtered-value">
        <rect x="231" y="107" width="78" height="42" rx="21" />
        <text className="story-art-meta" x="248" y="134">
          ••••
        </text>
      </g>
      <g className="privacy-art-seal">
        <path className="story-art-check" d="m452 129 9 9 19-21" />
        <text className="story-art-meta" x="430" y="172">
          masked
        </text>
      </g>
    </svg>
  );
}
