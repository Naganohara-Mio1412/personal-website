const MISSING_MARKERS = new Set(['', 'na', 'n/a', 'null', 'none', 'undefined', '-', '--'])
const TRUE_MARKERS = new Set(['true', 'yes', 'y', '1', '是', '对'])
const FALSE_MARKERS = new Set(['false', 'no', 'n', '0', '否', '错'])

function normalizeHeaders(values) {
  const seen = new Map()
  return values.map((value, index) => {
    const source = String(value ?? '')
    const base = source.trim() || `未命名字段_${index + 1}`
    const count = seen.get(base) ?? 0
    seen.set(base, count + 1)
    return count ? `${base}_${count + 1}` : base
  })
}

function parseDelimited(text, delimiter) {
  const matrix = []
  let row = []
  let field = ''
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        field += '"'
        index += 1
      } else {
        quoted = !quoted
      }
    } else if (character === delimiter && !quoted) {
      row.push(field)
      field = ''
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index += 1
      row.push(field)
      matrix.push(row)
      row = []
      field = ''
    } else {
      field += character
    }
  }

  row.push(field)
  matrix.push(row)
  while (matrix.length && matrix[matrix.length - 1].every((value) => value === '')) matrix.pop()
  if (!matrix.length) throw new Error('文件中没有可读取的数据。')

  const headers = normalizeHeaders(matrix[0])
  const rows = matrix.slice(1).map((values) => headers.map((_, index) => values[index] ?? ''))
  return { headers, rows }
}

function parseJson(text) {
  const source = JSON.parse(text)
  let records = source
  if (!Array.isArray(records) && records && typeof records === 'object') {
    const nested = Object.values(records).find(Array.isArray)
    records = nested ?? [records]
  }
  if (!Array.isArray(records)) throw new Error('JSON 需要包含对象数组或可识别的数据数组。')

  if (records.every((item) => item && typeof item === 'object' && !Array.isArray(item))) {
    const keys = [...new Set(records.flatMap((item) => Object.keys(item)))]
    const headers = normalizeHeaders(keys)
    const keyMap = new Map(keys.map((key, index) => [key, headers[index]]))
    return {
      headers,
      rows: records.map((item) => keys.map((key) => item[keyMap.has(key) ? key : headers[keyMap.get(key)]] ?? item[key] ?? '')),
    }
  }

  return { headers: ['value'], rows: records.map((value) => [value]) }
}

export async function readDataset(file) {
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (extension === 'xlsx' || extension === 'xls') {
    const error = new Error('网页轻量版暂不解析 Excel。完整 Skill 支持 XLSX 多工作表、Excel 清洗报告与离线看板。')
    error.code = 'EXCEL_REQUIRES_SKILL'
    throw error
  }

  const text = await file.text()
  if (extension === 'json') return { ...parseJson(text), name: file.name, format: 'JSON' }
  if (extension === 'tsv') return { ...parseDelimited(text, '\t'), name: file.name, format: 'TSV' }
  if (extension === 'csv') return { ...parseDelimited(text, ','), name: file.name, format: 'CSV' }
  throw new Error('请选择 CSV、TSV、JSON 或 XLSX 文件。')
}

function normalizeCell(value) {
  if (value === null || value === undefined) return { value: null, trimmed: false, normalizedMissing: true }
  if (typeof value !== 'string') return { value, trimmed: false, normalizedMissing: false }
  const trimmed = value.trim()
  const normalizedMissing = MISSING_MARKERS.has(trimmed.toLowerCase())
  return {
    value: normalizedMissing ? null : trimmed,
    trimmed: trimmed !== value,
    normalizedMissing,
  }
}

function inferColumn(values) {
  const present = values.filter((value) => value !== null && value !== undefined && value !== '')
  if (!present.length) return { type: 'empty', convert: (value) => value }

  const strings = present.map((value) => String(value).toLowerCase())
  if (strings.every((value) => TRUE_MARKERS.has(value) || FALSE_MARKERS.has(value))) {
    return {
      type: 'boolean',
      convert: (value) => {
        if (value === null) return value
        return TRUE_MARKERS.has(String(value).toLowerCase())
      },
    }
  }

  const numericPattern = /^[+-]?(?:\d{1,3}(?:,\d{3})+|\d+|\d*\.\d+)$/
  if (present.every((value) => typeof value === 'number' || numericPattern.test(String(value)))) {
    return {
      type: 'number',
      convert: (value) => {
        if (value === null || typeof value === 'number') return value
        return Number(String(value).replaceAll(',', ''))
      },
    }
  }

  return { type: 'text', convert: (value) => value }
}

function logEntry(action, reason, affectedRows, column = null) {
  return {
    timestamp: new Date().toISOString(),
    dataset: 'browser_preview',
    column,
    action,
    reason,
    affected_rows: affectedRows,
    automatic: true,
    mode: 'safe',
  }
}

export function cleanDataset(dataset) {
  const headers = normalizeHeaders(dataset.headers)
  const logs = []
  const renamed = dataset.headers.filter((header, index) => String(header ?? '') !== headers[index]).length
  if (renamed) logs.push(logEntry('rename_column', '清理字段名前后空格并处理空字段名', renamed))

  let trimmedCells = 0
  let normalizedMissing = 0
  const normalizedRows = dataset.rows.map((row) => headers.map((_, index) => {
    const normalized = normalizeCell(row[index])
    if (normalized.trimmed) trimmedCells += 1
    if (normalized.normalizedMissing) normalizedMissing += 1
    return normalized.value
  }))

  if (trimmedCells) logs.push(logEntry('trim_text', '清理文本字段前后的空格', trimmedCells))
  if (normalizedMissing) logs.push(logEntry('normalize_missing', '统一空字符串与常见空值标记', normalizedMissing))

  const nonEmptyRows = normalizedRows.filter((row) => row.some((value) => value !== null))
  const emptyRowsRemoved = normalizedRows.length - nonEmptyRows.length
  if (emptyRowsRemoved) logs.push(logEntry('remove_empty_rows', '删除完全为空的行', emptyRowsRemoved))

  const keptIndexes = headers
    .map((_, index) => index)
    .filter((index) => nonEmptyRows.some((row) => row[index] !== null))
  const emptyColumnsRemoved = headers.length - keptIndexes.length
  if (emptyColumnsRemoved) logs.push(logEntry('remove_empty_column', '删除完全为空且没有信息的列', emptyColumnsRemoved))

  const keptHeaders = keptIndexes.map((index) => headers[index])
  let rows = nonEmptyRows.map((row) => keptIndexes.map((index) => row[index]))

  keptHeaders.forEach((header, index) => {
    const inference = inferColumn(rows.map((row) => row[index]))
    if (inference.type === 'text' || inference.type === 'empty') return
    let converted = 0
    rows = rows.map((row) => {
      const next = inference.convert(row[index])
      if (next !== row[index]) converted += 1
      return row.map((value, cellIndex) => (cellIndex === index ? next : value))
    })
    if (converted) logs.push(logEntry(`convert_${inference.type}`, `明确识别并统一为${inference.type === 'number' ? '数值' : '布尔'}类型`, converted, header))
  })

  const seen = new Set()
  const uniqueRows = rows.filter((row) => {
    const key = JSON.stringify(row)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  const duplicatesRemoved = rows.length - uniqueRows.length
  if (duplicatesRemoved) logs.push(logEntry('remove_duplicate_rows', '删除完全重复的记录', duplicatesRemoved))

  const missingCells = uniqueRows.reduce(
    (total, row) => total + row.filter((value) => value === null).length,
    0,
  )

  return {
    name: dataset.name,
    format: dataset.format,
    headers: keptHeaders,
    rows: uniqueRows,
    logs,
    metrics: {
      beforeRows: dataset.rows.length,
      afterRows: uniqueRows.length,
      beforeColumns: dataset.headers.length,
      afterColumns: keptHeaders.length,
      emptyRowsRemoved,
      emptyColumnsRemoved,
      duplicatesRemoved,
      missingCells,
      changedCells: trimmedCells + normalizedMissing,
    },
  }
}

function csvCell(value) {
  if (value === null || value === undefined) return ''
  const source = typeof value === 'boolean' ? (value ? 'TRUE' : 'FALSE') : String(value)
  return /[",\r\n]/.test(source) ? `"${source.replaceAll('"', '""')}"` : source
}

export function datasetToCsv(result) {
  return `\uFEFF${[result.headers, ...result.rows].map((row) => row.map(csvCell).join(',')).join('\r\n')}`
}

export function downloadText(filename, content, type) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export function getSampleDataset() {
  return {
    name: '示例销售数据.csv',
    format: 'CSV',
    headers: [' 订单编号 ', ' 城市', '销售额', '是否会员', '备注', '空列'],
    rows: [
      ['A001', ' 重庆 ', '1,280', '是', ' 首次购买 ', ''],
      ['A002', '成都', '980', 'true', 'N/A', ''],
      ['A002', '成都', '980', 'true', 'N/A', ''],
      ['', '', '', '', '', ''],
      ['A003', ' 重庆', '1560', '否', ' 活动订单', ''],
      ['A004', '贵阳 ', 'NA', 'false', '  ', ''],
    ],
  }
}
