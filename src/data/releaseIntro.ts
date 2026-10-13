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
  // No AI agents yet: Analytics has no AI-agent metrics in this release (Jeff, 2026-10-12).
  lead: 'A clearer view of how your team and channels are doing.',
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
      // Was "AI in the picture" — there are no AI-agent metrics in Analytics yet. Voice is
      // the honest third reason: the current reporting has no call reporting at all.
      icon: 'Phone',
      tint: 'purple',
      title: 'Calls next to your tickets',
      body: 'Call volume, wait times and missed calls, alongside chat and email.',
    },
  ] satisfies ReleaseIntroRow[],
  // One sentence, no title (Jeff, 2026-10-12: the banner took too much of the modal). It
  // keeps the two jobs that matter — nothing is taken away, and a number that differs from
  // the old report is expected, not a bug. No feedback pointer: where feedback goes is
  // still undecided (the header's tag is now just "Beta").
  note: 'Your current reports stay available. Some numbers may differ, as a few metrics are now calculated more precisely.',
  secondary: 'Not now',
  primary: 'Try the new Analytics',
} as const

/** The grey "Beta" tag beside the dashboard title (BetaBadge). */
export const BETA_BADGE = 'Beta'
