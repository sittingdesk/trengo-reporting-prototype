/**
 * Chart.js registration — done once and imported by chart components.
 *
 * Chart.js is the deliberate, site-wide charting choice (TECH_FOUNDATION.md §2).
 * Do NOT introduce a second charting library.
 */
import {
  Chart,
  LineController,
  BarController,
  DoughnutController,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'

Chart.register(
  LineController,
  BarController,
  DoughnutController,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
)

/**
 * Tooltip key dots: 8px, set once here so every chart (bar, line, combo, donut) agrees.
 * Chart.js sizes the swatch from the body font by default, which made a 12px circle — as
 * tall as the text beside it, so it read as a second element rather than a key. 8px is
 * the legend dots' size elsewhere in the app (`size-2` in MetricBox's header legends), so
 * the tooltip and the legend now draw the same mark. 4px between dot and label, off
 * design.md's gap scale.
 */
Chart.defaults.plugins.tooltip.boxWidth = 8
Chart.defaults.plugins.tooltip.boxHeight = 8
Chart.defaults.plugins.tooltip.boxPadding = 4

export { Chart }

/**
 * Canonical chart-body height (px) — the single source of truth for how tall a
 * chart renders inside a MetricBox. Every chart type (bar/line/donut/funnel) uses
 * this so two chart widgets sharing a row are always the same height, regardless of
 * type. Do NOT hard-code per-widget heights — import this instead.
 *
 * Dynamic-layout note: this is the base "one row-unit" height. When drag-to-resize
 * lands, a widget's card height becomes `rows × CHART_HEIGHT`; chart bodies already
 * fill their container (maintainAspectRatio:false), so they scale with no per-type
 * bookkeeping.
 */
export const CHART_HEIGHT = 200
