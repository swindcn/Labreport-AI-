import { mkdir, readFile, writeFile } from "node:fs/promises"
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

function getUnknownBiomarkerFilePath() {
  if (process.env.UNKNOWN_BIOMARKER_FILE) {
    return path.resolve(process.env.UNKNOWN_BIOMARKER_FILE)
  }

  return path.join(getRuntimeDir(), "unknown-biomarkers.json")
}

async function readExistingItems(filePath) {
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

async function writeItems(filePath, items) {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, JSON.stringify(items, null, 2))
}

export async function listUnknownBiomarkers(profileIds = []) {
  const filePath = getUnknownBiomarkerFilePath()
  const items = await readExistingItems(filePath)

  if (!Array.isArray(profileIds) || profileIds.length === 0) {
    return items
  }

  const profileIdSet = new Set(profileIds)
  return items.filter((item) => (item.profileIds ?? []).some((profileId) => profileIdSet.has(profileId)))
}

export async function persistUnknownBiomarkers({
  provider,
  reportId,
  profileId,
  items,
}) {
  if (!Array.isArray(items) || items.length === 0) {
    return null
  }

  const filePath = getUnknownBiomarkerFilePath()
  const existingItems = await readExistingItems(filePath)
  const merged = new Map(
    existingItems.map((item) => [item.key, item]),
  )

  for (const item of items) {
    const key = `${item.code}|${item.rawName}|${item.unit}|${item.referenceText}`
    const existing = merged.get(key)
    const nextReportIds = Array.from(
      new Set([...(existing?.reportIds ?? []), reportId]),
    )
    const nextProfileIds = Array.from(
      new Set([...(existing?.profileIds ?? []), profileId]),
    )

    merged.set(key, {
      key,
      provider,
      code: item.code,
      rawName: item.rawName,
      normalizedName: item.normalizedName,
      category: item.category,
      unit: item.unit,
      referenceText: item.referenceText,
      sampleRawValue: item.rawValue,
      sampleValue: item.value,
      occurrences: (existing?.occurrences ?? 0) + (item.occurrences ?? 1),
      reportIds: nextReportIds,
      profileIds: nextProfileIds,
      firstSeenAt: existing?.firstSeenAt ?? new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      status: "pending",
      processedAt: null,
      processedReason: null,
      localAliasId: null,
    })
  }

  const payload = [...merged.values()].sort((left, right) => {
    if (right.occurrences !== left.occurrences) {
      return right.occurrences - left.occurrences
    }

    return `${left.rawName}`.localeCompare(`${right.rawName}`)
  })

  await writeItems(filePath, payload)
  return filePath
}

export async function updateUnknownBiomarker(key, patch) {
  const filePath = getUnknownBiomarkerFilePath()
  const items = await readExistingItems(filePath)
  const index = items.findIndex((item) => item.key === key)

  if (index === -1) {
    return null
  }

  const current = items[index]
  const nextStatus = patch?.status ?? current.status ?? "pending"
  const nextItem = {
    ...current,
    ...patch,
    status: nextStatus,
  }

  if (nextStatus === "processed") {
    nextItem.processedAt = patch?.processedAt ?? new Date().toISOString()
    nextItem.processedReason = patch?.processedReason ?? current.processedReason ?? "manual"
  } else {
    nextItem.processedAt = null
    nextItem.processedReason = null
    nextItem.localAliasId = null
  }

  items[index] = nextItem
  await writeItems(filePath, items)
  return nextItem
}
