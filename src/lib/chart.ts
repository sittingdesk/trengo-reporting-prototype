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
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Filler,
} from 'chart.js'

Chart.register(
  LineController,
  BarController,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Filler,
)

export { Chart }
