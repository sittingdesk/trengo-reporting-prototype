// Copy for the beta heads-up modal (ReleaseIntroDialog) — kept in one place so it can be
// reviewed and localised without touching the component, like emptyStates.ts's COPY.
//
// The beta moment only (decided with Jeff, 2026-10-05): new Analytics is offered NEXT TO
// the current reporting, to a small group first. The switch-over ("your old reporting
// retires on …") is a different message and gets its own design when its date is known.
//
// The four jobs, in order: say what this is · remove the fear of losing current reports ·
// pre-empt "the numbers don't match" (several definitions changed, and wrong numbers were
// the kickoff's #1 customer pain) · ask for feedback, which the whole rollout runs on.

export interface ReleaseIntroRow {
  icon: string
  /** Picks a full class string in the component — never build a class from this. */
  tint: 'leaf' | 'sky' | 'purple'
  title: string
  body: string
}

export const RELEASE_INTRO = {
  badge: 'Beta',
  title: 'Meet the new Analytics',
  lead: 'A clearer view of how your team, channels and AI agents are doing.',
  rows: [
    {
      icon: 'Apperture',
      tint: 'leaf',
      title: 'Built around your questions',
      body: 'Overview, Understand, Operate, Improve and Automate.',
    },
    {
      icon: 'Info',
      tint: 'sky',
      title: 'Every number explained',
      body: 'Hover the info icon on a metric to see exactly what it counts.',
    },
    {
      icon: 'Chatbot',
      tint: 'purple',
      title: 'AI in the picture',
      body: 'See how much work AI agents take on, and where they hand over.',
    },
  ] satisfies ReleaseIntroRow[],
  note: {
    // The line a beta user needs most, so it leads the note in bold.
    title: 'Your current reports stay where they are.',
    body: 'Use both side by side while we keep improving Analytics. Some numbers may differ: a few metrics are now calculated more precisely.',
    // Says WHERE feedback goes without asking for it: they haven't used it yet.
    feedback: 'Spotted something off? Use Share feedback at the top of any page.',
  },
  secondary: 'Not now',
  primary: 'Try the new Analytics',
} as const

/** The "Beta · Share feedback" pill beside the dashboard title — Analytics' standing
 *  feedback route for as long as the beta runs. */
export const BETA_FEEDBACK = {
  badge: 'Beta',
  label: 'Share feedback',
  // The prototype has nowhere to send feedback, so the pill says so rather than pretend.
  // ⚠️ Decide the destination (Intercom? a form? a feedback board?) before release — the
  // modal, this pill and any later prompts should all lead to the same place.
  prototypeNote:
    'In the product this opens the feedback form. Where feedback goes is still to be decided.',
} as const
