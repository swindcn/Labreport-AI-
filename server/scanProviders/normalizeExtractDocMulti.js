import { randomUUID } from "node:crypto"
import { matchBiomarkerMetadata } from "./biomarkerCatalog.js"

function normalizeFieldName(name) {
  return `${name ?? ""}`
    .replace(/[：:\s]/g, "")
    .toLowerCase()
}

function getFieldValue(fields, aliases) {
  for (const alias of aliases) {
    if (fields.has(alias)) {
      return fields.get(alias)
    }
  }

  const normalizedAliases = aliases.map((alias) => normalizeFieldName(alias))

  for (const [key, value] of fields.entries()) {
    if (normalizedAliases.includes(normalizeFieldName(key))) {
      return value
    }
  }

  return ""
}

function extractFieldsFromGroupContainer(groupContainer) {
  const groups = Array.isArray(groupContainer?.Groups)
    ? groupContainer.Groups
    : Array.isArray(groupContainer?.Lines)
      ? [groupContainer]
      : []

  return groups.map((group) => {
    const lines = Array.isArray(group?.Lines) ? group.Lines : []
    const fields = new Map()

    for (const line of lines) {
      const key =
        line?.Key?.AutoName ||
        line?.Key?.ConfigName ||
        line?.Key?.Text ||
        line?.Key?.Content ||
        ""

      const value =
        line?.Value?.AutoContent ||
        line?.Value?.Text ||
        line?.Value?.Content ||
        ""

      if (key) {
        fields.set(`${key}`.trim(), `${value}`.trim())
      }
    }

    return fields
  })
}

function cleanNumericText(value) {
  return `${value ?? ""}`
    .replace(/,/g, "")
    .replace(/[↑↓]/g, "")
    .trim()
}

function toNumber(value) {
  if (typeof value === "number") {
    return value
  }

  const normalized = cleanNumericText(value)
  const match = normalized.match(/-?\d+(\.\d+)?/)
  return match ? Number(match[0]) : null
}

function parseReferenceBounds(referenceText) {
  const normalized = `${referenceText ?? ""}`.replace(/，/g, ",").trim()
  const range = normalized.match(/(-?\d+(\.\d+)?)\s*[-~至]\s*(-?\d+(\.\d+)?)/)

  if (range) {
    return {
      type: "range",
      low: Number(range[1]),
      high: Number(range[3]),
    }
  }

  const lessThan = normalized.match(/[<≤]\s*(-?\d+(\.\d+)?)/)
  if (lessThan) {
    return {
      type: "lt",
      threshold: Number(lessThan[1]),
    }
  }

  const greaterThan = normalized.match(/[>≥]\s*(-?\d+(\.\d+)?)/)
  if (greaterThan) {
    return {
      type: "gt",
      threshold: Number(greaterThan[1]),
    }
  }

  return null
}

function inferStatus(value, referenceText, rawValue) {
  const rawText = `${rawValue ?? ""}`

  if (rawText.includes("↑")) {
    return "high"
  }

  if (rawText.includes("↓")) {
    return "low"
  }

  if (typeof value !== "number") {
    return "normal"
  }

  const bounds = parseReferenceBounds(referenceText)

  if (!bounds) {
    return "normal"
  }

  if (bounds.type === "range") {
    if (value < bounds.low) return "low"
    if (value > bounds.high) return "high"
    return "normal"
  }

  if (bounds.type === "lt") {
    return value <= bounds.threshold ? "normal" : "high"
  }

  if (bounds.type === "gt") {
    return value >= bounds.threshold ? "normal" : "low"
  }

  return "normal"
}

function resolveCodeAndName(name) {
  const metadata = matchBiomarkerMetadata(name)

  if (metadata) {
    return {
      code: metadata.code,
      name: metadata.name,
      category: metadata.category,
    }
  }

  const codeMatch = `${name}`.match(/\(([A-Z0-9-]+)\)/)
  const normalizedName = `${name}`.replace(/\s+/g, " ").trim()

  return {
    code: codeMatch?.[1] || normalizedName.toUpperCase(),
    name: normalizedName,
    category: null,
  }
}

function fallbackCategory(name, examType) {
  const text = `${name ?? ""}`.toUpperCase()

  if (/(ALT|AST|ALP|GGT|TBIL|ALB|TP|胆红素|白蛋白|总蛋白)/.test(text)) return "Liver Function"
  if (/(CRE|CR|BUN|UA|EGFR|肌酐|尿素氮|尿酸)/.test(text)) return "Kidney Function"
  if (/(GLU|HBA1C|TC|TG|LDL|HDL|血糖|葡萄糖|胆固醇)/.test(text)) return "Metabolic"
  if (/(WBC|RBC|HGB|HCT|PLT|白细胞|红细胞|血红蛋白|血小板)/.test(text)) return "Blood Count"
  if (/(TSH|FT3|FT4|甲状腺)/.test(text)) return "Endocrine"
  if (/(NA|K|CL|CA|钠|钾|氯|钙)/.test(text)) return "Electrolytes"

  return examType === "Clinical" ? "Clinical Panel" : "Routine Panel"
}

function mergeDuplicateResults(results) {
  const merged = new Map()

  for (const result of results) {
    const key = `${result.code}|${result.unit}`
    const existing = merged.get(key)

    if (!existing) {
      merged.set(key, result)
      continue
    }

    merged.set(key, {
      ...existing,
      referenceText: existing.referenceText || result.referenceText,
      status: existing.status === "normal" ? result.status : existing.status,
      value: existing.value ?? result.value,
    })
  }

  return [...merged.values()]
}

export function normalizeExtractDocMulti(rawResponse, { examType }) {
  const response = rawResponse?.Response ?? rawResponse ?? {}
  const structuralList = Array.isArray(response.StructuralList) ? response.StructuralList : []
  const rows = structuralList.flatMap((item) => extractFieldsFromGroupContainer(item))

  const results = rows
    .map((fields) => {
      const rawName = getFieldValue(fields, ["项目名称", "检查项目", "指标名称", "名称", "项目"])
      const rawValue = getFieldValue(fields, ["结果", "检测结果", "数值", "结果值"])
      const unit = getFieldValue(fields, ["单位"])
      const referenceText = getFieldValue(fields, ["参考范围", "参考值", "参考区间", "正常范围"])
      const value = toNumber(rawValue)

      if (!rawName || value === null) {
        return null
      }

      const resolved = resolveCodeAndName(rawName)

      return {
        id: `scan_${randomUUID().slice(0, 8)}`,
        code: resolved.code,
        name: resolved.name,
        category: resolved.category || fallbackCategory(rawName, examType),
        value,
        unit: `${unit}`.trim(),
        referenceText: `${referenceText}`.trim(),
        status: inferStatus(value, referenceText, rawValue),
      }
    })
    .filter(Boolean)

  return mergeDuplicateResults(results)
}
