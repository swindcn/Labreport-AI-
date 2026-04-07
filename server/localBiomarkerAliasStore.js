import { randomUUID } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function getRuntimeDir() {
  if (process.env.API_RUNTIME_DIR) {
    return path.resolve(process.env.API_RUNTIME_DIR)
  }

  return path.join(__dirname, "data", "runtime")
}

export function getLocalBiomarkerAliasFilePath() {
  if (process.env.LOCAL_BIOMARKER_ALIAS_FILE) {
    return path.resolve(process.env.LOCAL_BIOMARKER_ALIAS_FILE)
  }

  return path.join(getRuntimeDir(), "local-biomarker-aliases.json")
}

function normalizeAlias(value) {
  return `${value ?? ""}`.trim()
}

function sanitizeAliases(aliases = []) {
  return Array.from(new Set(aliases.map(normalizeAlias).filter(Boolean)))
}

async function readExistingAliases(filePath) {
  try {
    const raw = await readFile(filePath, "utf8")
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return []
    }

    throw error
  }
}

export function readLocalBiomarkerAliasesSync() {
  const filePath = getLocalBiomarkerAliasFilePath()

  if (!existsSync(filePath)) {
    return []
  }

  try {
    const raw = readFileSync(filePath, "utf8")
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((item) => item?.active !== false) : []
  } catch {
    return []
  }
}

export async function listLocalBiomarkerAliases() {
  const filePath = getLocalBiomarkerAliasFilePath()
  const aliases = await readExistingAliases(filePath)
  return aliases.filter((item) => item?.active !== false)
}

export async function upsertLocalBiomarkerAlias({
  sourceKey,
  code,
  name,
  category,
  referenceText,
  aliases,
}) {
  const filePath = getLocalBiomarkerAliasFilePath()
  await mkdir(path.dirname(filePath), { recursive: true })

  const existingItems = await readExistingAliases(filePath)
  const nextAliases = sanitizeAliases(aliases)

  if (!code || !name || !category || nextAliases.length === 0) {
    throw new Error("Local biomarker alias requires code, name, category, and at least one alias.")
  }

  const now = new Date().toISOString()
  const existingIndex = existingItems.findIndex((item) => item.sourceKey === sourceKey && sourceKey)
  const existingItem = existingIndex >= 0 ? existingItems[existingIndex] : null

  const nextItem = {
    id: existingItem?.id ?? randomUUID(),
    sourceKey: sourceKey ?? null,
    code: `${code}`.trim(),
    name: `${name}`.trim(),
    category: `${category}`.trim(),
    referenceText: `${referenceText ?? ""}`.trim(),
    aliases: nextAliases,
    active: true,
    createdAt: existingItem?.createdAt ?? now,
    updatedAt: now,
  }

  if (existingIndex >= 0) {
    existingItems[existingIndex] = nextItem
  } else {
    existingItems.unshift(nextItem)
  }

  await writeFile(filePath, JSON.stringify(existingItems, null, 2))
  return nextItem
}
