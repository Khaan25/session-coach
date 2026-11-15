// /cli/approve's words for a code that is already settled, shared by the page and the pending request.

/** The copy for each settled code state, by `codeState`. */
export const SETTLED_COPY = {
  expired: {
    word: "Expired",
    title: "This code expired",
    message: "Run session-coach login again for a new one.",
  },
  approved: {
    word: "Approved",
    title: "Already approved",
    message: "Go back to your terminal; it signs in on its next check.",
  },
  used: {
    word: "Used",
    title: "Already used",
    message:
      "That login already has its token. Run session-coach login again to connect another computer.",
  },
  denied: {
    word: "Denied",
    title: "This login was denied",
    message: "Run session-coach login again if you meant to connect.",
  },
} as const;
