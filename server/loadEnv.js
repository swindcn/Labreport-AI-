import { existsSync, readFileSync } from "node:fs"

function stripWrappingQuotes(value) {
  const trimmed = value.trim()

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1)
  }

  return trimmed
}

function parseEnvLine(line) {
  const trimmed = line.trim()

  if (!trimmed || trimmed.startsWith("#")) {
    return null
  }

  const normalized = trimmed.startsWith("export ") ? trimmed.slice(7) : trimmed
  const separatorIndex = normalized.indexOf("=")

  if (separatorIndex === -1) {
    return null
  }

  const key = normalized.slice(0, separatorIndex).trim()
  const value = stripWrappingQuotes(normalized.slice(separatorIndex + 1))

  if (!key) {
    return null
  }

  return { key, value }
}

export function loadServerEnv(filePaths) {
  for (const filePath of filePaths) {
    if (!existsSync(filePath)) {
      continue
    }

    const content = readFileSync(filePath, "utf8")

    for (const line of content.split(/\r?\n/)) {
      const entry = parseEnvLine(line)

      if (!entry || process.env[entry.key] !== undefined) {
        continue
      }

      process.env[entry.key] = entry.value
    }
  }
}
