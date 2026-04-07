import { createServer } from "node:http"
import { randomUUID } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { loadServerEnv } from "./loadEnv.js"
import { createLocalAssetStore } from "./assetStore.js"
import { createMockUploadedReport, retryMockScanReport } from "./scanService.js"
import { mapScanErrorToReport, runReportScan } from "./scanProviders/reportScanProvider.js"
import { CURRENT_SCAN_PARSER_VERSION } from "./scanProviders/scanParserVersion.js"
import { upsertLocalBiomarkerAlias } from "./localBiomarkerAliasStore.js"
import { listUnknownBiomarkers, updateUnknownBiomarker } from "./unknownBiomarkerStore.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
loadServerEnv([path.join(__dirname, ".env.api")])
const configuredDataDir = process.env.API_DATA_DIR
const configuredRuntimeDir = process.env.API_RUNTIME_DIR
const configuredSeedPath = process.env.API_SEED_PATH
const configuredDbPath = process.env.API_DB_PATH
const dataDir = configuredDataDir ? path.resolve(configuredDataDir) : path.join(__dirname, "data")
const runtimeDir = configuredRuntimeDir ? path.resolve(configuredRuntimeDir) : path.join(dataDir, "runtime")
const assetsDir = path.join(runtimeDir, "assets")
const seedPath = configuredSeedPath ? path.resolve(configuredSeedPath) : path.join(dataDir, "seed.json")
const dbPath = configuredDbPath ? path.resolve(configuredDbPath) : path.join(runtimeDir, "health-db.json")
const port = Number(process.env.API_PORT ?? 8787)

function buildAssetContentUrl(request, assetId) {
  const host = request.headers.host ?? `127.0.0.1:${port}`
  return `http://${host}/api/assets/${encodeURIComponent(assetId)}/content`
}

const assetStore = createLocalAssetStore({
  assetsDir,
  buildAssetUrl: buildAssetContentUrl,
})

function json(response, statusCode, payload, extraHeaders = {}) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    ...extraHeaders,
  })
  response.end(JSON.stringify(payload))
}

function noContent(response, extraHeaders = {}) {
  response.writeHead(204, extraHeaders)
  response.end()
}

function notFound(response, extraHeaders = {}) {
  json(response, 404, { error: "Not found" }, extraHeaders)
}

function unauthorized(response, extraHeaders = {}) {
  json(response, 401, { error: "Unauthorized" }, extraHeaders)
}

function badRequest(response, message, extraHeaders = {}) {
  json(response, 400, { error: message }, extraHeaders)
}

function conflict(response, message, extraHeaders = {}) {
  json(response, 409, { error: message }, extraHeaders)
}

function serverError(response, error, extraHeaders = {}) {
  json(
    response,
    500,
    {
      error: "Internal server error",
      detail: error instanceof Error ? error.message : "Unknown error",
    },
    extraHeaders,
  )
}

function parseCookies(cookieHeader) {
  return (cookieHeader ?? "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((cookies, pair) => {
      const separatorIndex = pair.indexOf("=")

      if (separatorIndex === -1) {
        return cookies
      }

      const key = pair.slice(0, separatorIndex)
      const value = pair.slice(separatorIndex + 1)
      cookies[key] = decodeURIComponent(value)
      return cookies
    }, {})
}

function buildCorsHeaders(request) {
  const origin = request.headers.origin ?? "http://localhost:5173"

  return {
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Origin": origin,
    Vary: "Origin",
  }
}

function createSessionCookie(token) {
  return `vitalis_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`
}

function clearSessionCookie() {
  return "vitalis_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
}

function normalizePath(urlString) {
  const pathname = new URL(urlString, "http://localhost").pathname
  return pathname.startsWith("/api/") ? pathname.slice(4) : pathname === "/api" ? "/" : pathname
}

function initialsFromName(name) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "ME"
  )
}

function safeUserIdFromEmail(email) {
  return `user_${email.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "new"}`
}

function createMemberId() {
  return `VC-${randomUUID().slice(0, 8).toUpperCase()}`
}

async function readJsonFile(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"))
}

async function ensureDatabase() {
  await mkdir(runtimeDir, { recursive: true })
  await assetStore.ensureReady()

  try {
    await readFile(dbPath, "utf8")
  } catch {
    const seed = await readFile(seedPath, "utf8")
    await writeFile(dbPath, seed)
  }
}

async function loadDb() {
  await ensureDatabase()
  const db = await readJsonFile(dbPath)
  db.assets = Array.isArray(db.assets) ? db.assets : []
  db.preferencesByUserId = db.preferencesByUserId ?? {}
  return db
}

async function saveDb(db) {
  await writeFile(dbPath, JSON.stringify(db, null, 2))
}

async function readBody(request) {
  const chunks = []

  for await (const chunk of request) {
    chunks.push(chunk)
  }

  if (chunks.length === 0) {
    return {}
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"))
}

function getCurrentUserId(request, db) {
  const cookies = parseCookies(request.headers.cookie)
  const sessionToken = cookies.vitalis_session

  if (!sessionToken) {
    return null
  }

  return db.sessions[sessionToken] ?? null
}

function listProfilesForUser(db, userId) {
  return db.profiles.filter((profile) => profile.userId === userId)
}

function listReportsForUser(db, userId) {
  const profileIds = new Set(listProfilesForUser(db, userId).map((profile) => profile.id))

  return db.reports
    .filter((report) => profileIds.has(report.profileId))
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
}

function getPreferencesForUser(db, userId) {
  return db.preferencesByUserId[userId] ?? {
    activeProfileId: listProfilesForUser(db, userId)[0]?.id ?? "",
    selectedReportId: listReportsForUser(db, userId)[0]?.id ?? null,
  }
}

function findOwnedProfile(db, userId, profileId) {
  return db.profiles.find((profile) => profile.id === profileId && profile.userId === userId) ?? null
}

function findOwnedReport(db, userId, reportId) {
  const report = db.reports.find((item) => item.id === reportId) ?? null

  if (!report) {
    return null
  }

  return findOwnedProfile(db, userId, report.profileId) ? report : null
}

function getReportActionId(pathname, actionSuffix) {
  if (!pathname.startsWith("/reports/") || !pathname.endsWith(actionSuffix)) {
    return null
  }

  return decodeURIComponent(pathname.slice("/reports/".length, -actionSuffix.length))
}

function getReportResultAction(pathname) {
  const match = pathname.match(/^\/reports\/([^/]+)\/results\/([^/]+)$/)

  if (!match) {
    return null
  }

  return {
    reportId: decodeURIComponent(match[1]),
    resultId: decodeURIComponent(match[2]),
  }
}

function getUnknownBiomarkerActionKey(pathname, suffix = "") {
  const pattern = suffix
    ? new RegExp(`^/scan/unknown-biomarkers/([^/]+)${suffix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`)
    : /^\/scan\/unknown-biomarkers\/([^/]+)$/
  const match = pathname.match(pattern)

  if (!match) {
    return null
  }

  return decodeURIComponent(match[1])
}

function buildUpdatedReportSource(report, input) {
  const nextSource = createMockUploadedReport({
    profileId: report.profileId,
    batchId: report.batchId,
    fileName: input.fileName ?? "",
    examType: input.examType ?? report.examType ?? "Routine",
    sourceType: input.sourceType === "pdf" ? "pdf" : "image",
  })

  return {
    ...report,
    title: nextSource.title,
    date: nextSource.date,
    location: nextSource.location,
    sceneType: nextSource.sceneType,
    sourceType: nextSource.sourceType,
    status: nextSource.status,
    examType: nextSource.examType,
    aiAccuracy: nextSource.aiAccuracy,
    results: nextSource.results,
    scanScenario: nextSource.scanScenario,
    scanFailureCode: undefined,
    scanFailureMessage: undefined,
    sourceFile: report.sourceFile ?? null,
    sourceUpdatedAt: nextSource.sourceUpdatedAt,
    resultsGeneratedAt: undefined,
    scanParserVersion: undefined,
  }
}

function createDraftReport(input) {
  const examType = input.examType ?? "Routine"

  return {
    id: `report_upload_${randomUUID().slice(0, 8)}`,
    profileId: input.profileId,
    batchId: input.batchId,
    isSaved: false,
    title: "Pending Upload",
    date: new Date().toISOString(),
    location: "Awaiting Source",
    sceneType: examType === "Clinical" ? "INPATIENT" : "ROUTINE",
    sourceType: "image",
    status: "processing",
    examType,
    aiAccuracy: 0,
    results: [],
    isFavorite: false,
    resultsGeneratedAt: undefined,
    scanParserVersion: undefined,
  }
}

function getSelectionAfterDelete(db, userId, deletedProfileId) {
  const profiles = listProfilesForUser(db, userId)
  const currentPreferences = getPreferencesForUser(db, userId)
  const nextActiveProfileId =
    currentPreferences.activeProfileId &&
    currentPreferences.activeProfileId !== deletedProfileId &&
    profiles.some((profile) => profile.id === currentPreferences.activeProfileId)
      ? currentPreferences.activeProfileId
      : profiles[0]?.id ?? ""
  const selectedReportId =
    db.reports
      .filter((report) => report.profileId === nextActiveProfileId)
      .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())[0]?.id ?? null

  return {
    activeProfileId: nextActiveProfileId,
    selectedReportId,
  }
}

function getSelectionAfterReportDelete(db, userId, deletedReportId) {
  const currentPreferences = getPreferencesForUser(db, userId)

  if (currentPreferences.selectedReportId && currentPreferences.selectedReportId !== deletedReportId) {
    return currentPreferences.selectedReportId
  }

  return db.reports
    .filter((report) => report.profileId === currentPreferences.activeProfileId)
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())[0]?.id ?? null
}

async function handleLogin(request, response, corsHeaders, db) {
  const body = await readBody(request)
  const user = db.users.find((item) => item.email === body.email && item.password === body.password)

  if (!user) {
    unauthorized(response, corsHeaders)
    return
  }

  const sessionToken = randomUUID()
  db.sessions[sessionToken] = user.id
  await saveDb(db)

  json(
    response,
    200,
    { currentUserId: user.id },
    {
      ...corsHeaders,
      "Set-Cookie": createSessionCookie(sessionToken),
    },
  )
}

async function handleRegister(request, response, corsHeaders, db) {
  const body = await readBody(request)

  if (!body.email || !body.password) {
    badRequest(response, "Email and password are required", corsHeaders)
    return
  }

  if (db.users.some((user) => user.email === body.email)) {
    conflict(response, "User already exists", corsHeaders)
    return
  }

  const userId = safeUserIdFromEmail(body.email)
  const displayName = body.email.split("@")[0].replace(/[._-]+/g, " ")
  const profileId = `profile_${randomUUID().slice(0, 8)}`
  const user = {
    id: userId,
    email: body.email,
    password: body.password,
    name: displayName,
  }

  db.users.push(user)
  db.profiles.push({
    id: profileId,
    userId,
    name: displayName,
    relation: "Me",
    initials: initialsFromName(displayName),
    memberId: createMemberId(),
    birthDate: "",
    gender: "",
    note: "",
    avatarUrl: "",
  })
  db.preferencesByUserId[userId] = {
    activeProfileId: profileId,
    selectedReportId: null,
  }

  const sessionToken = randomUUID()
  db.sessions[sessionToken] = userId
  await saveDb(db)

  json(
    response,
    200,
    { currentUserId: userId },
    {
      ...corsHeaders,
      "Set-Cookie": createSessionCookie(sessionToken),
    },
  )
}

async function handleLogout(request, response, corsHeaders, db) {
  const cookies = parseCookies(request.headers.cookie)
  const sessionToken = cookies.vitalis_session

  if (sessionToken) {
    delete db.sessions[sessionToken]
    await saveDb(db)
  }

  noContent(response, {
    ...corsHeaders,
    "Set-Cookie": clearSessionCookie(),
  })
}

async function requestListener(request, response) {
  const corsHeaders = buildCorsHeaders(request)

  if (request.method === "OPTIONS") {
    noContent(response, corsHeaders)
    return
  }

  try {
    const pathname = normalizePath(request.url ?? "/")
    const db = await loadDb()
    const currentUserId = getCurrentUserId(request, db)

    if (request.method === "GET" && pathname === "/auth/session") {
      json(response, 200, { currentUserId }, corsHeaders)
      return
    }

    if (request.method === "POST" && pathname === "/auth/login") {
      await handleLogin(request, response, corsHeaders, db)
      return
    }

    if (request.method === "POST" && pathname === "/auth/register") {
      await handleRegister(request, response, corsHeaders, db)
      return
    }

    if (request.method === "DELETE" && pathname === "/auth/session") {
      await handleLogout(request, response, corsHeaders, db)
      return
    }

    if (request.method === "GET" && pathname.startsWith("/assets/") && pathname.endsWith("/content")) {
      if (!currentUserId) {
        unauthorized(response, corsHeaders)
        return
      }

      const assetId = decodeURIComponent(pathname.slice("/assets/".length, -"/content".length))
      const asset = assetStore.findOwned(db, currentUserId, assetId)

      if (!asset) {
        notFound(response, corsHeaders)
        return
      }

      const content = await readFile(asset.filePath)
      response.writeHead(200, {
        ...corsHeaders,
        "Content-Type": asset.mimeType,
        "Content-Length": content.byteLength,
        "Cache-Control": "no-store",
      })
      response.end(content)
      return
    }

    if (request.method === "GET" && pathname === "/profiles") {
      json(
        response,
        200,
        {
          items: currentUserId ? listProfilesForUser(db, currentUserId) : [],
        },
        corsHeaders,
      )
      return
    }

    if (request.method === "POST" && pathname === "/profiles") {
      if (!currentUserId) {
        unauthorized(response, corsHeaders)
        return
      }

      const body = await readBody(request)

      if (!body.name || !body.relation) {
        badRequest(response, "Profile name and relation are required", corsHeaders)
        return
      }

      const profile = {
        id: `profile_${randomUUID().slice(0, 8)}`,
        userId: currentUserId,
        name: body.name,
        relation: body.relation,
        initials: initialsFromName(body.name),
        memberId: createMemberId(),
        birthDate: body.birthDate ?? "",
        gender: body.gender ?? "",
        note: body.note ?? "",
        avatarUrl: body.avatarUrl ?? "",
      }

      db.profiles.push(profile)

      const currentPreferences = getPreferencesForUser(db, currentUserId)
      const nextPreferences = currentPreferences.activeProfileId
        ? currentPreferences
        : {
            ...currentPreferences,
            activeProfileId: profile.id,
          }

      db.preferencesByUserId[currentUserId] = nextPreferences
      await saveDb(db)
      json(response, 201, profile, corsHeaders)
      return
    }

    if (request.method === "POST" && pathname.startsWith("/profiles/") && pathname.endsWith("/avatar")) {
      if (!currentUserId) {
        unauthorized(response, corsHeaders)
        return
      }

      const profileId = decodeURIComponent(pathname.slice("/profiles/".length, -"/avatar".length))
      const profile = db.profiles.find((item) => item.id === profileId && item.userId === currentUserId)

      if (!profile) {
        notFound(response, corsHeaders)
        return
      }

      const body = await readBody(request)

      if (!body.dataUrl) {
        badRequest(response, "Avatar image payload is required", corsHeaders)
        return
      }

      if (profile.avatarAsset?.assetId) {
        await assetStore.remove(db, profile.avatarAsset.assetId)
      }

      const avatarAsset = await assetStore.create(request, db, {
        ownerUserId: currentUserId,
        entityType: "profile_avatar",
        entityId: profile.id,
        fileName: body.fileName ?? `${profile.name || "avatar"}.jpg`,
        mimeType: body.mimeType,
        sizeBytes: body.sizeBytes,
        dataUrl: body.dataUrl,
      })

      profile.avatarAsset = avatarAsset
      profile.avatarUrl = avatarAsset.url
      await saveDb(db)
      json(response, 200, profile, corsHeaders)
      return
    }

    if (request.method === "DELETE" && pathname.startsWith("/profiles/") && pathname.endsWith("/avatar")) {
      if (!currentUserId) {
        unauthorized(response, corsHeaders)
        return
      }

      const profileId = decodeURIComponent(pathname.slice("/profiles/".length, -"/avatar".length))
      const profile = db.profiles.find((item) => item.id === profileId && item.userId === currentUserId)

      if (!profile) {
        notFound(response, corsHeaders)
        return
      }

      if (profile.avatarAsset?.assetId) {
        await assetStore.remove(db, profile.avatarAsset.assetId)
      }

      profile.avatarAsset = null
      profile.avatarUrl = ""
      await saveDb(db)
      json(response, 200, profile, corsHeaders)
      return
    }

    if (
      request.method === "PATCH" &&
      pathname.startsWith("/profiles/") &&
      !pathname.endsWith("/avatar")
    ) {
      if (!currentUserId) {
        unauthorized(response, corsHeaders)
        return
      }

      const profileId = decodeURIComponent(pathname.slice("/profiles/".length))
      const profile = db.profiles.find((item) => item.id === profileId && item.userId === currentUserId)

      if (!profile) {
        notFound(response, corsHeaders)
        return
      }

      const body = await readBody(request)
      const allowedPatch = {
        name: body.name ?? profile.name,
        relation: body.relation ?? profile.relation,
        birthDate: body.birthDate ?? profile.birthDate,
        gender: body.gender ?? profile.gender,
        note: body.note ?? profile.note,
        avatarUrl: body.avatarUrl ?? profile.avatarUrl ?? "",
        initials: body.initials ?? profile.initials,
      }

      Object.assign(profile, allowedPatch)
      await saveDb(db)
      json(response, 200, profile, corsHeaders)
      return
    }

    if (request.method === "DELETE" && pathname.startsWith("/profiles/")) {
      if (!currentUserId) {
        unauthorized(response, corsHeaders)
        return
      }

      const profileId = decodeURIComponent(pathname.slice("/profiles/".length))
      const profile = findOwnedProfile(db, currentUserId, profileId)

      if (!profile) {
        notFound(response, corsHeaders)
        return
      }

      const ownedProfiles = listProfilesForUser(db, currentUserId)

      if (ownedProfiles.length <= 1) {
        conflict(response, "At least one profile must remain", corsHeaders)
        return
      }

      if (profile.avatarAsset?.assetId) {
        await assetStore.remove(db, profile.avatarAsset.assetId)
      }

      const profileReportAssets = db.reports
        .filter((report) => report.profileId === profileId && report.sourceFile?.assetId)
        .map((report) => report.sourceFile.assetId)

      for (const assetId of profileReportAssets) {
        await assetStore.remove(db, assetId)
      }

      db.profiles = db.profiles.filter((item) => item.id !== profileId)
      db.reports = db.reports.filter((report) => report.profileId !== profileId)

      const nextPreferences = getSelectionAfterDelete(db, currentUserId, profileId)
      db.preferencesByUserId[currentUserId] = nextPreferences

      await saveDb(db)
      json(
        response,
        200,
        {
          deletedProfileId: profileId,
          activeProfileId: nextPreferences.activeProfileId,
          selectedReportId: nextPreferences.selectedReportId,
        },
        corsHeaders,
      )
      return
    }

    if (request.method === "GET" && pathname === "/reports") {
      json(
        response,
        200,
        {
          items: currentUserId ? listReportsForUser(db, currentUserId) : [],
        },
        corsHeaders,
      )
      return
    }

    if (request.method === "GET" && pathname === "/scan/unknown-biomarkers") {
      if (!currentUserId) {
        unauthorized(response, corsHeaders)
        return
      }

      const profileIds = listProfilesForUser(db, currentUserId).map((profile) => profile.id)
      const items = await listUnknownBiomarkers(profileIds)
      json(
        response,
        200,
        {
          items,
        },
        corsHeaders,
      )
      return
    }

    if (request.method === "PATCH" && pathname.startsWith("/scan/unknown-biomarkers/")) {
      if (!currentUserId) {
        unauthorized(response, corsHeaders)
        return
      }

      const itemKey = getUnknownBiomarkerActionKey(pathname)
      const body = await readBody(request)
      const nextStatus = body.status === "processed" ? "processed" : body.status === "pending" ? "pending" : null

      if (!itemKey || !nextStatus) {
        badRequest(response, "Unknown biomarker key or status is invalid", corsHeaders)
        return
      }

      const profileIds = listProfilesForUser(db, currentUserId).map((profile) => profile.id)
      const ownedItem = (await listUnknownBiomarkers(profileIds)).find((item) => item.key === itemKey)

      if (!ownedItem) {
        notFound(response, corsHeaders)
        return
      }

      const updated = await updateUnknownBiomarker(itemKey, {
        status: nextStatus,
        processedReason: nextStatus === "processed" ? "manual" : null,
      })

      if (!updated) {
        notFound(response, corsHeaders)
        return
      }

      json(response, 200, updated, corsHeaders)
      return
    }

    if (request.method === "POST" && pathname.startsWith("/scan/unknown-biomarkers/") && pathname.endsWith("/local-alias")) {
      if (!currentUserId) {
        unauthorized(response, corsHeaders)
        return
      }

      const itemKey = getUnknownBiomarkerActionKey(pathname, "/local-alias")

      if (!itemKey) {
        badRequest(response, "Unknown biomarker key is invalid", corsHeaders)
        return
      }

      const profileIds = listProfilesForUser(db, currentUserId).map((profile) => profile.id)
      const item = (await listUnknownBiomarkers(profileIds)).find((entry) => entry.key === itemKey)

      if (!item) {
        notFound(response, corsHeaders)
        return
      }

      const body = await readBody(request)
      const aliases = Array.from(
        new Set(
          [
            ...(Array.isArray(body.aliases) ? body.aliases : []),
            item.rawName,
            item.normalizedName,
            item.code,
          ]
            .map((alias) => `${alias ?? ""}`.trim())
            .filter(Boolean),
        ),
      )

      const localAlias = await upsertLocalBiomarkerAlias({
        sourceKey: item.key,
        code: `${body.code ?? item.code}`.trim(),
        name: `${body.name ?? item.normalizedName ?? item.rawName}`.trim(),
        category: `${body.category ?? item.category ?? "Other"}`.trim(),
        referenceText: `${body.referenceText ?? item.referenceText ?? ""}`.trim(),
        aliases,
      })

      const updated = await updateUnknownBiomarker(itemKey, {
        status: "processed",
        processedReason: "local_alias",
        localAliasId: localAlias.id,
      })

      json(
        response,
        201,
        {
          alias: localAlias,
          item: updated,
        },
        corsHeaders,
      )
      return
    }

    if (request.method === "POST" && pathname === "/reports") {
      if (!currentUserId) {
        unauthorized(response, corsHeaders)
        return
      }

      const body = await readBody(request)
      const profile = db.profiles.find((item) => item.id === body.profileId && item.userId === currentUserId)

      if (!profile) {
        badRequest(response, "Profile does not belong to current user", corsHeaders)
        return
      }

      const report =
        typeof body.fileName === "string" && body.fileName.trim() !== ""
          ? createMockUploadedReport({
              profileId: profile.id,
              batchId: body.batchId,
              fileName: body.fileName ?? "",
              examType: body.examType ?? "Routine",
              sourceType: body.sourceType === "pdf" ? "pdf" : "image",
            })
          : createDraftReport({
              profileId: profile.id,
              batchId: body.batchId,
              examType: body.examType ?? "Routine",
            })

      db.reports.unshift(report)
      const currentPreferences = getPreferencesForUser(db, currentUserId)
      db.preferencesByUserId[currentUserId] = {
        ...currentPreferences,
        activeProfileId: profile.id,
        selectedReportId: report.id,
      }
      await saveDb(db)
      json(response, 201, report, corsHeaders)
      return
    }

    if (request.method === "POST" && pathname.startsWith("/reports/") && pathname.endsWith("/files")) {
      if (!currentUserId) {
        unauthorized(response, corsHeaders)
        return
      }

      const reportId = getReportActionId(pathname, "/files")
      const report = reportId ? findOwnedReport(db, currentUserId, reportId) : null

      if (!report) {
        notFound(response, corsHeaders)
        return
      }

      const body = await readBody(request)

      if (!body.dataUrl) {
        badRequest(response, "Report file payload is required", corsHeaders)
        return
      }

      if (report.sourceFile?.assetId) {
        await assetStore.remove(db, report.sourceFile.assetId)
      }

      const sourceFile = await assetStore.create(request, db, {
        ownerUserId: currentUserId,
        entityType: "report_source",
        entityId: report.id,
        fileName: body.fileName ?? `${report.title || "report"}.jpg`,
        mimeType: body.mimeType,
        sizeBytes: body.sizeBytes,
        dataUrl: body.dataUrl,
      })

      report.sourceFile = sourceFile
      await saveDb(db)
      json(response, 200, report, corsHeaders)
      return
    }

    if (request.method === "DELETE" && pathname.startsWith("/reports/") && pathname.endsWith("/files")) {
      if (!currentUserId) {
        unauthorized(response, corsHeaders)
        return
      }

      const reportId = getReportActionId(pathname, "/files")
      const report = reportId ? findOwnedReport(db, currentUserId, reportId) : null

      if (!report) {
        notFound(response, corsHeaders)
        return
      }

      if (report.sourceFile?.assetId) {
        await assetStore.remove(db, report.sourceFile.assetId)
      }

      report.sourceFile = null
      await saveDb(db)
      json(response, 200, report, corsHeaders)
      return
    }

    if (request.method === "GET" && pathname.startsWith("/reports/") && !pathname.endsWith("/results")) {
      if (!currentUserId) {
        unauthorized(response, corsHeaders)
        return
      }

      const reportId = decodeURIComponent(pathname.slice("/reports/".length))
      const report = findOwnedReport(db, currentUserId, reportId)

      if (!report) {
        notFound(response, corsHeaders)
        return
      }

      json(response, 200, report, corsHeaders)
      return
    }

    if (
      request.method === "PATCH" &&
      pathname.startsWith("/reports/") &&
      pathname.includes("/results/")
    ) {
      if (!currentUserId) {
        unauthorized(response, corsHeaders)
        return
      }

      const action = getReportResultAction(pathname)
      const report = action ? findOwnedReport(db, currentUserId, action.reportId) : null

      if (!action || !report) {
        notFound(response, corsHeaders)
        return
      }

      const result = report.results.find((item) => item.id === action.resultId)

      if (!result) {
        notFound(response, corsHeaders)
        return
      }

      const body = await readBody(request)

      Object.assign(result, {
        code: typeof body.code === "string" && body.code.trim() !== "" ? body.code.trim() : result.code,
        name: typeof body.name === "string" && body.name.trim() !== "" ? body.name.trim() : result.name,
        category: typeof body.category === "string" && body.category.trim() !== "" ? body.category.trim() : result.category,
        value: Number.isFinite(Number(body.value)) ? Number(body.value) : result.value,
        unit: typeof body.unit === "string" && body.unit.trim() !== "" ? body.unit.trim() : result.unit,
        referenceText:
          typeof body.referenceText === "string" && body.referenceText.trim() !== ""
            ? body.referenceText.trim()
            : result.referenceText,
        status:
          body.status === "normal" || body.status === "high" || body.status === "low"
            ? body.status
            : result.status,
      })

      await saveDb(db)
      json(response, 200, report, corsHeaders)
      return
    }

    if (
      request.method === "PATCH" &&
      pathname.startsWith("/reports/") &&
      !pathname.endsWith("/files") &&
      !pathname.endsWith("/source") &&
      !pathname.endsWith("/favorite") &&
      !pathname.endsWith("/scan") &&
      !pathname.endsWith("/complete") &&
      !pathname.endsWith("/retry") &&
      !pathname.endsWith("/results")
    ) {
      if (!currentUserId) {
        unauthorized(response, corsHeaders)
        return
      }

      const reportId = decodeURIComponent(pathname.slice("/reports/".length))
      const report = findOwnedReport(db, currentUserId, reportId)

      if (!report) {
        notFound(response, corsHeaders)
        return
      }

      const body = await readBody(request)
      const allowedPatch = {
        title: typeof body.title === "string" && body.title.trim() !== "" ? body.title.trim() : report.title,
        location:
          typeof body.location === "string" && body.location.trim() !== ""
            ? body.location.trim()
            : report.location,
        isSaved: typeof body.isSaved === "boolean" ? body.isSaved : report.isSaved,
      }

      Object.assign(report, allowedPatch)
      await saveDb(db)
      json(response, 200, report, corsHeaders)
      return
    }

    if (
      request.method === "DELETE" &&
      pathname.startsWith("/reports/") &&
      !pathname.endsWith("/source") &&
      !pathname.endsWith("/favorite") &&
      !pathname.endsWith("/scan") &&
      !pathname.endsWith("/complete") &&
      !pathname.endsWith("/retry") &&
      !pathname.endsWith("/results")
    ) {
      if (!currentUserId) {
        unauthorized(response, corsHeaders)
        return
      }

      const reportId = decodeURIComponent(pathname.slice("/reports/".length))
      const report = findOwnedReport(db, currentUserId, reportId)

      if (!report) {
        notFound(response, corsHeaders)
        return
      }

      if (report.sourceFile?.assetId) {
        await assetStore.remove(db, report.sourceFile.assetId)
      }

      db.reports = db.reports.filter((item) => item.id !== reportId)
      const currentPreferences = getPreferencesForUser(db, currentUserId)
      const nextSelectedReportId = getSelectionAfterReportDelete(db, currentUserId, reportId)
      db.preferencesByUserId[currentUserId] = {
        ...currentPreferences,
        selectedReportId: nextSelectedReportId,
      }
      await saveDb(db)
      json(
        response,
        200,
        {
          deletedReportId: reportId,
          selectedReportId: nextSelectedReportId,
        },
        corsHeaders,
      )
      return
    }

    if (request.method === "POST" && pathname.startsWith("/reports/") && pathname.endsWith("/source")) {
      if (!currentUserId) {
        unauthorized(response, corsHeaders)
        return
      }

      const reportId = getReportActionId(pathname, "/source")
      const report = reportId ? findOwnedReport(db, currentUserId, reportId) : null

      if (!report) {
        notFound(response, corsHeaders)
        return
      }

      const body = await readBody(request)
      Object.assign(report, buildUpdatedReportSource(report, body))
      await saveDb(db)
      json(response, 200, report, corsHeaders)
      return
    }

    if (request.method === "POST" && pathname.startsWith("/reports/") && pathname.endsWith("/favorite")) {
      if (!currentUserId) {
        unauthorized(response, corsHeaders)
        return
      }

      const reportId = getReportActionId(pathname, "/favorite")
      const report = reportId ? findOwnedReport(db, currentUserId, reportId) : null

      if (!report) {
        notFound(response, corsHeaders)
        return
      }

      const body = await readBody(request)
      report.isFavorite = Boolean(body.isFavorite)
      await saveDb(db)
      json(response, 200, report, corsHeaders)
      return
    }

    if (
      request.method === "POST" &&
      pathname.startsWith("/reports/") &&
      (pathname.endsWith("/scan") || pathname.endsWith("/complete"))
    ) {
      if (!currentUserId) {
        unauthorized(response, corsHeaders)
        return
      }

      const reportId = pathname.endsWith("/scan")
        ? getReportActionId(pathname, "/scan")
        : getReportActionId(pathname, "/complete")
      const report = findOwnedReport(db, currentUserId, reportId)

      if (!report) {
        notFound(response, corsHeaders)
        return
      }

      try {
        Object.assign(report, await runReportScan(db, report))
      } catch (error) {
        Object.assign(report, mapScanErrorToReport(report, error))
      }

      await saveDb(db)
      json(response, 200, report, corsHeaders)
      return
    }

    if (request.method === "POST" && pathname.startsWith("/reports/") && pathname.endsWith("/retry")) {
      if (!currentUserId) {
        unauthorized(response, corsHeaders)
        return
      }

      const reportId = getReportActionId(pathname, "/retry")
      const report = findOwnedReport(db, currentUserId, reportId)

      if (!report) {
        notFound(response, corsHeaders)
        return
      }

      Object.assign(report, retryMockScanReport(report))
      await saveDb(db)
      json(response, 200, report, corsHeaders)
      return
    }

    if (request.method === "GET" && pathname.startsWith("/reports/") && pathname.endsWith("/results")) {
      if (!currentUserId) {
        unauthorized(response, corsHeaders)
        return
      }

      const reportId = getReportActionId(pathname, "/results")
      const report = findOwnedReport(db, currentUserId, reportId)

      if (!report) {
        notFound(response, corsHeaders)
        return
      }

      json(
        response,
        200,
        {
          items: report.results,
        },
        corsHeaders,
      )
      return
    }

    if (request.method === "POST" && pathname === "/reports/manual") {
      if (!currentUserId) {
        unauthorized(response, corsHeaders)
        return
      }

      const body = await readBody(request)
      const profile = db.profiles.find((item) => item.id === body.profileId && item.userId === currentUserId)

      if (!profile) {
        badRequest(response, "Profile does not belong to current user", corsHeaders)
        return
      }

      const generatedAt = new Date().toISOString()
      const report = {
        id: `report_manual_${Date.now()}`,
        profileId: profile.id,
        isSaved: true,
        title: body.title ?? "Manual Entry",
        date: new Date(body.date ?? new Date().toISOString()).toISOString(),
        location: "Manual Entry",
        sceneType: body.examType === "Clinical" ? "INPATIENT" : "ROUTINE",
        sourceType: "manual",
        status: "ready",
        examType: body.examType ?? "Routine",
        aiAccuracy: 100,
        results: Array.isArray(body.results) ? body.results : [],
        isFavorite: false,
        sourceUpdatedAt: generatedAt,
        resultsGeneratedAt: generatedAt,
        scanParserVersion: CURRENT_SCAN_PARSER_VERSION,
      }

      db.reports.unshift(report)
      const currentPreferences = getPreferencesForUser(db, currentUserId)
      db.preferencesByUserId[currentUserId] = {
        ...currentPreferences,
        activeProfileId: profile.id,
        selectedReportId: report.id,
      }
      await saveDb(db)
      json(response, 200, report, corsHeaders)
      return
    }

    if (request.method === "GET" && pathname === "/users/me/preferences") {
      json(
        response,
        200,
        currentUserId
          ? getPreferencesForUser(db, currentUserId)
          : {
              activeProfileId: "",
              selectedReportId: null,
            },
        corsHeaders,
      )
      return
    }

    if (request.method === "PATCH" && pathname === "/users/me/preferences") {
      if (!currentUserId) {
        unauthorized(response, corsHeaders)
        return
      }

      const body = await readBody(request)
      const currentPreferences = getPreferencesForUser(db, currentUserId)
      const nextPreferences = {
        activeProfileId: body.activeProfileId ?? currentPreferences.activeProfileId,
        selectedReportId: body.selectedReportId ?? currentPreferences.selectedReportId,
      }

      db.preferencesByUserId[currentUserId] = nextPreferences
      await saveDb(db)
      json(response, 200, nextPreferences, corsHeaders)
      return
    }

    notFound(response, corsHeaders)
  } catch (error) {
    serverError(response, error, buildCorsHeaders(request))
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  createServer(requestListener).listen(port, () => {
    console.log(`Vitalis Core API listening on http://127.0.0.1:${port}`)
  })
}

export { requestListener }
