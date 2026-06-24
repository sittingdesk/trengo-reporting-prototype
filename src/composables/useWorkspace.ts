// useWorkspace — the prototype's workspace state (the user's dashboard tabs).
//
// A module-level reactive singleton: import it anywhere and you share the same
// state (no Pinia needed for a prototype this size). Holds the open tabs, the
// demo "scenario", and whether the template gallery is open.
//
// ⚠️ Persistence is mocked: the chosen scenario is saved to localStorage and
// reseeds the tabs on load. Real per-user tab persistence needs a backend DB
// (TECH_FOUNDATION §5) that doesn't exist yet.
import { reactive, computed } from 'vue'
import {
  getTemplate,
  QUESTION_LED_TEMPLATE_IDS,
  LEGACY_REPORT_TEMPLATE_IDS,
  type Template,
} from '@/config/templates'

/** A tab = a dashboard the user created from a template. */
export interface Tab {
  id: string
  name: string
  templateId: string
}

/** Demo onboarding scenarios (prototype-only). */
export type Scenario = 'existing' | 'new'

const SCENARIO_KEY = 'trengo-scenario-v1'

function loadScenario(): Scenario {
  return localStorage.getItem(SCENARIO_KEY) === 'new' ? 'new' : 'existing'
}

const state = reactive({
  scenario: loadScenario() as Scenario,
  tabs: [] as Tab[],
  // Existing customers see a one-time welcome step (choose new vs legacy) before
  // any tabs are seeded. New customers skip it. Not persisted, so the demo
  // re-shows it on reload / scenario toggle.
  needsChoice: false,
  galleryOpen: false,
})

let counter = 0
function makeTabId(templateId: string) {
  counter += 1
  return `${templateId}-${counter}`
}

/** Build tabs from a list of template ids. */
function tabsFromTemplateIds(ids: string[]): Tab[] {
  return ids.map((templateId) => {
    const t = getTemplate(templateId)
    return { id: makeTabId(templateId), name: t?.name ?? templateId, templateId }
  })
}

/** Apply a scenario's starting state: new → seed question-led; existing → ask first. */
function applyScenario(scenario: Scenario) {
  if (scenario === 'new') {
    state.tabs = tabsFromTemplateIds(QUESTION_LED_TEMPLATE_IDS)
    state.needsChoice = false
  } else {
    state.tabs = []
    state.needsChoice = true
  }
}

// Initialise from the persisted scenario.
applyScenario(state.scenario)

/** Ensure a unique tab name ("Voice", "Voice 2", …). */
function uniqueName(base: string): string {
  const existing = new Set(state.tabs.map((t) => t.name))
  if (!existing.has(base)) return base
  let n = 2
  while (existing.has(`${base} ${n}`)) n += 1
  return `${base} ${n}`
}

export function useWorkspace() {
  const tabs = computed(() => state.tabs)
  const scenario = computed(() => state.scenario)
  const needsChoice = computed(() => state.needsChoice)
  const galleryOpen = computed(() => state.galleryOpen)

  function getTab(id: string): Tab | undefined {
    return state.tabs.find((t) => t.id === id)
  }

  function tabTemplate(id: string): Template | undefined {
    const tab = getTab(id)
    return tab ? getTemplate(tab.templateId) : undefined
  }

  /**
   * Create a tab from a template; returns the new tab (caller navigates to it).
   * An optional `name` lets the caller (the picker) use a user-typed name —
   * falling back to the template's name. Names are de-duplicated either way.
   */
  function createFromTemplate(templateId: string, name?: string): Tab {
    const t = getTemplate(templateId)
    const tab: Tab = {
      id: makeTabId(templateId),
      name: uniqueName(name?.trim() || t?.name || templateId),
      templateId,
    }
    state.tabs.push(tab)
    return tab
  }

  function removeTab(id: string) {
    state.tabs = state.tabs.filter((t) => t.id !== id)
  }

  /** Switch demo scenario — persists and applies its starting state. */
  function setScenario(next: Scenario) {
    state.scenario = next
    localStorage.setItem(SCENARIO_KEY, next)
    applyScenario(next)
  }

  /**
   * Resolve the existing-customer welcome step.
   *  - 'new'   → seed the question-led templates
   *  - 'old'   → seed the legacy reports (rebuilt)
   *  - 'later' → seed nothing (generic empty state)
   * Returns the first tab so the caller can navigate. Non-destructive: every
   * template stays available in the gallery regardless of choice.
   */
  function chooseStart(kind: 'new' | 'old' | 'later'): Tab | undefined {
    if (kind === 'new') state.tabs = tabsFromTemplateIds(QUESTION_LED_TEMPLATE_IDS)
    else if (kind === 'old') state.tabs = tabsFromTemplateIds(LEGACY_REPORT_TEMPLATE_IDS)
    else state.tabs = []
    state.needsChoice = false
    return state.tabs[0]
  }

  const openGallery = () => (state.galleryOpen = true)
  const closeGallery = () => (state.galleryOpen = false)

  return {
    tabs,
    scenario,
    needsChoice,
    galleryOpen,
    getTab,
    tabTemplate,
    createFromTemplate,
    removeTab,
    setScenario,
    chooseStart,
    openGallery,
    closeGallery,
  }
}
