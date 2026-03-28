import { createServer } from "node:http"
import { randomUUID } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataDir = path.join(__dirname, "data")
const runtimeDir = path.join(dataDir, "runtime")
const seedPath = path.join(dataDir, "seed.json")
const dbPath = path.join(runtimeDir, "health-db.json")
const port = Number(process.env.API_PORT ?? 8787)

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
  json(response, 500, {
    error: "Internal server error",
    detail: error instanceof Error ? error.message : "Unknown error",
  }, extraHeaders)
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
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "ME"
}

function safeUserIdFromEmail(email) {
  return `user_${email.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "new"}`
}

function createMemberId() {
  return `VC-${randomUUID().slice(0, 8).toUpperCase()}`
}

function createSimulatedScanResults(examType) {
  if (examType === "Clinical") {
    return [
      {
        id: `scan_alt_${randomUUID().slice(0, 8)}`,
        code: "ALT",
        name: "ALT (Alanine Aminotransferase)",
        category: "Liver Function",
        value: 42,
        unit: "U/L",
        referenceText: "Ref < 40 U/L",
        status: "high",
      },
      {
        id: `scan_ast_${randomUUID().slice(0, 8)}`,
        code: "AST",
        name: "AST (Aspartate Aminotransferase)",
        category: "Liver Function",
        value: 34,
        unit: "U/L",
        referenceText: "Ref 10 - 35 U/L",
        status: "normal",
      },
      {
        id: `scan_cre_${randomUUID().slice(0, 8)}`,
        code: "CRE",
        name: "Creatinine",
        category: "Kidney Function",
        value: 1.08,
        unit: "mg/dL",
        referenceText: "Ref 0.7 - 1.3 mg/dL",
        status: "normal",
      },
      {
        id: `scan_hba1c_${randomUUID().slice(0, 8)}`,
        code: "HBA1C",
        name: "HbA1c",
        category: "Metabolic",
        value: 5.7,
        unit: "%",
        referenceText: "Ref 4.0 - 5.6%",
        status: "high",
      },
    ]
  }

  return [
    {
      id: `scan_hgb_${randomUUID().slice(0, 8)}`,
      code: "HGB",
      name: "Hemoglobin",
      category: "Blood Count",
      value: 13.9,
      unit: "g/dL",
      referenceText: "Ref 13.5 - 17.5 g/dL",
      status: "normal",
    },
    {
      id: `scan_wbc_${randomUUID().slice(0, 8)}`,
      code: "WBC",
      name: "White Blood Cells",
      category: "Blood Count",
      value: 6.2,
      unit: "10^9/L",
      referenceText: "Ref 4.0 - 11.0 10^9/L",
      status: "normal",
    },
    {
      id: `scan_glu_${randomUUID().slice(0, 8)}`,
      code: "GLU",
      name: "Glucose",
      category: "Metabolic",
      value: 102,
      unit: "mg/dL",
      referenceText: "Ref 70 - 99 mg/dL",
      status: "high",
    },
    {
      id: `scan_bun_${randomUUID().slice(0, 8)}`,
      code: "BUN",
      name: "Blood Urea Nitrogen",
      category: "Kidney Function",
      value: 14,
      unit: "mg/dL",
      referenceText: "Ref 7 - 20 mg/dL",
      status: "normal",
    },
  ]
}

function stripExtension(fileName) {
  return `${fileName ?? ""}`.replace(/\.[^/.]+$/, "").trim()
}

function inferScanScenario(fileName) {
  const normalized = `${fileName ?? ""}`.toLowerCase()

  if (/(corrupt|damaged|broken|invalid)/.test(normalized)) {
    return "file_invalid"
  }

  if (/(ocr|blurry|blur|cropped|unreadable|tilted)/.test(normalized)) {
    return "ocr_retryable"
  }

  return "normal"
}

async function readJsonFile(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"))
}

async function ensureDatabase() {
  await mkdir(runtimeDir, { recursive: true })

  try {
    await readFile(dbPath, "utf8")
  } catch {
    const seed = await readFile(seedPath, "utf8")
    await writeFile(dbPath, seed)
  }
}

async function loadDb() {
  await ensureDatabase()
  return readJsonFile(dbPath)
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

function getFallbackSelection(db, userId) {
  const profiles = listProfilesForUser(db, userId)
  const activeProfileId = profiles[0]?.id ?? ""
  const selectedReportId =
    db.reports
      .filter((report) => report.profileId === activeProfileId)
      .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())[0]?.id ?? null

  return {
    activeProfileId,
    selectedReportId,
  }
}

function getSelectionAfterDelete(db, userId, deletedProfileId) {
  const profiles = listProfilesForUser(db, userId)
  const currentPreferences = getPreferencesForUser(db, userId)
  const nextActiveProfileId =
    currentPreferences.activeProfileId && currentPreferences.activeProfileId !== deletedProfileId &&
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

    if (request.method === "PATCH" && pathname.startsWith("/profiles/")) {
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

      db.profiles = db.profiles.filter((item) => item.id !== profileId)
      db.reports = db.reports.filter((report) => report.profileId !== profileId)

      const nextPreferences = getSelectionAfterDelete(db, currentUserId, profileId)
      db.preferencesByUserId[currentUserId] = nextPreferences

      await saveDb(db)
      json(response, 200, {
        deletedProfileId: profileId,
        activeProfileId: nextPreferences.activeProfileId,
        selectedReportId: nextPreferences.selectedReportId,
      }, corsHeaders)
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

      const fileName = `${body.fileName ?? ""}`.trim()
      const sourceType = body.sourceType === "pdf" ? "pdf" : "image"
      const report = {
        id: `report_scan_${randomUUID().slice(0, 8)}`,
        profileId: profile.id,
        title: stripExtension(fileName) || "Imported Report",
        date: new Date().toISOString(),
        location: sourceType === "pdf" ? "Files Import" : "Mobile Upload",
        sceneType: body.examType === "Clinical" ? "INPATIENT" : "ROUTINE",
        sourceType,
        status: "processing",
        examType: body.examType ?? "Routine",
        aiAccuracy: sourceType === "pdf" ? 98.9 : 97.6,
        results: createSimulatedScanResults(body.examType ?? "Routine"),
        scanScenario: inferScanScenario(fileName),
      }

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

    if (request.method === "POST" && pathname.startsWith("/reports/") && pathname.endsWith("/complete")) {
      if (!currentUserId) {
        unauthorized(response, corsHeaders)
        return
      }

      const reportId = decodeURIComponent(pathname.slice("/reports/".length, -"/complete".length))
      const report = findOwnedReport(db, currentUserId, reportId)

      if (!report) {
        notFound(response, corsHeaders)
        return
      }

      if (report.scanScenario === "file_invalid") {
        report.status = "failed"
        report.scanFailureCode = "file_invalid"
        report.scanFailureMessage = "The selected file appears damaged or unsupported. Please upload a cleaner report file."
        await saveDb(db)
        json(response, 200, report, corsHeaders)
        return
      }

      if (report.scanScenario === "ocr_retryable") {
        report.status = "failed"
        report.scanFailureCode = "ocr_failed"
        report.scanFailureMessage = "OCR confidence was too low to extract reliable biomarkers. Retry once or upload a clearer file."
        await saveDb(db)
        json(response, 200, report, corsHeaders)
        return
      }

      report.status = "ready"
      delete report.scanFailureCode
      delete report.scanFailureMessage
      await saveDb(db)
      json(response, 200, report, corsHeaders)
      return
    }

    if (request.method === "POST" && pathname.startsWith("/reports/") && pathname.endsWith("/retry")) {
      if (!currentUserId) {
        unauthorized(response, corsHeaders)
        return
      }

      const reportId = decodeURIComponent(pathname.slice("/reports/".length, -"/retry".length))
      const report = findOwnedReport(db, currentUserId, reportId)

      if (!report) {
        notFound(response, corsHeaders)
        return
      }

      report.status = "processing"

      if (report.scanScenario === "ocr_retryable") {
        report.scanScenario = "normal"
      }

      delete report.scanFailureCode
      delete report.scanFailureMessage
      await saveDb(db)
      json(response, 200, report, corsHeaders)
      return
    }

    if (request.method === "GET" && pathname.startsWith("/reports/") && pathname.endsWith("/results")) {
      if (!currentUserId) {
        unauthorized(response, corsHeaders)
        return
      }

      const reportId = decodeURIComponent(pathname.slice("/reports/".length, -"/results".length))
      const report = findOwnedReport(db, currentUserId, reportId)

      if (!report) {
        notFound(response, corsHeaders)
        return
      }

      json(response, 200, {
        items: report.results,
      }, corsHeaders)
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

      const report = {
        id: `report_manual_${Date.now()}`,
        profileId: profile.id,
        title: body.title ?? "Manual Entry",
        date: new Date(body.date ?? new Date().toISOString()).toISOString(),
        location: "Manual Entry",
        sceneType: body.examType === "Clinical" ? "INPATIENT" : "ROUTINE",
        sourceType: "manual",
        status: "ready",
        examType: body.examType ?? "Routine",
        aiAccuracy: 100,
        results: Array.isArray(body.results) ? body.results : [],
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

createServer(requestListener).listen(port, () => {
  console.log(`Vitalis Core API listening on http://127.0.0.1:${port}`)
})
