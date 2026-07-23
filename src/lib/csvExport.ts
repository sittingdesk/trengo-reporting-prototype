// Per-widget CSV export (prototype). Builds a .csv from a widget's on-screen
// sample data, reflecting the active filters in the rows + filename.
// Only chart/table widgets are exportable (see canExportWidget).
import type { MetricDef } from '@/data/metrics'
import type { MetricSample } from '@/lib/mock'

export interface ExportFilters {
  channels: string // e.g. 'all' or 'whatsapp+email'
  teams: string
  rangeLabel: string // e.g. 'Last 7 days' or 'Jun 17 – Jun 23'
}

type Row = Record<string, string | number>

/** Which widgets get an export icon: ready charts & tables only. */
export function canExportWidget(metric: MetricDef): boolean {
  return (
    metric.status === 'ready' &&
    (metric.resultType === 'histogram' ||
      metric.resultType === 'time_series' ||
      metric.resultType === 'breakdown' ||
      metric.resultType === 'donut' ||
      metric.resultType === 'funnel' ||
      metric.resultType === 'table')
  )
}

// --- CSV helpers ---
function csvEscape(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return ''
  const s = String(val)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function toCSV(rows: Row[]): string {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const lines = [headers.map(csvEscape).join(',')]
  for (const row of rows) lines.push(headers.map((h) => csvEscape(row[h])).join(','))
  return lines.join('\n')
}

function slug(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'all'
  )
}

function buildFilename(metricId: string, f: ExportFilters): string {
  return `${metricId.replace(/_/g, '-')}_${slug(f.channels)}_${slug(f.teams)}_${slug(f.rangeLabel)}.csv`
}

function downloadCSV(filename: string, csv: string): void {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** Assemble rows from the widget's live sample, by result type. */
function widgetRows(metric: MetricDef, sample: MetricSample): Row[] {
  if (metric.resultType === 'histogram' && sample.series) {
    // Generic headers so the by-hour widget works for conversations, calls, etc.
    return sample.series.map((today, h) => ({
      hour_of_day_utc: h,
      count_today: today,
      avg_per_day: sample.average?.[h] ?? '',
    }))
  }

  if (metric.resultType === 'time_series' && sample.lines && sample.labels) {
    return sample.labels.map((date, i) => {
      const row: Row = { date }
      for (const line of sample.lines!) row[line.csvKey ?? line.name.toLowerCase()] = line.data[i] ?? ''
      return row
    })
  }

  if (metric.resultType === 'breakdown' && sample.labels) {
    // Two-series (over time) → one column per series; single-series → category,count.
    if (sample.lines) {
      return sample.labels.map((label, i) => {
        const row: Row = { label }
        for (const line of sample.lines!) row[line.name.toLowerCase()] = line.data[i] ?? ''
        return row
      })
    }
    return sample.labels.map((label, i) => ({ category: label, count: sample.series?.[i] ?? '' }))
  }

  if (metric.resultType === 'donut' && sample.donut) {
    return sample.donut.map((s) => ({ segment: s.label, count: s.value }))
  }

  if (metric.resultType === 'funnel' && sample.funnel) {
    return sample.funnel.map((s) => ({ stage: s.stage, count: s.count }))
  }

  if (metric.resultType === 'table' && sample.table) {
    const { columns, rows } = sample.table
    return rows.map((r) => {
      const out: Row = {}
      for (const col of columns) {
        // Badge columns (e.g. SLA "In development") export blank, never the label.
        out[col.label] = col.badge ? '' : r[col.key]
      }
      return out
    })
  }

  return []
}

export function exportWidgetCSV(metric: MetricDef, sample: MetricSample, filters: ExportFilters): void {
  if (!canExportWidget(metric)) return
  const rows = widgetRows(metric, sample)
  if (!rows.length) return
  downloadCSV(buildFilename(metric.id, filters), toCSV(rows))
}
