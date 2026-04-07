import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const seedPath = path.join(__dirname, "data", "seed.json");

async function createTestSeed(targetPath) {
  const rawSeed = await readFile(seedPath, "utf8");
  const seed = JSON.parse(rawSeed);
  seed.assets = [];
  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(targetPath, JSON.stringify(seed, null, 2));
}

async function waitForServer(baseUrl) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/auth/session`);

      if (response.ok) {
        return;
      }
    } catch {
      // keep polling until server is ready
    }

    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  throw new Error("API server did not start in time");
}

async function startServer() {
  const runtimeDir = await mkdtemp(path.join(tmpdir(), "vitalis-api-test-"));
  const dataDir = path.join(runtimeDir, "data");
  const runtimeDataDir = path.join(runtimeDir, "runtime");
  const dbPath = path.join(runtimeDataDir, "health-db.json");
  const unknownBiomarkerFilePath = path.join(runtimeDataDir, "unknown-biomarkers.json");
  const localBiomarkerAliasFilePath = path.join(runtimeDataDir, "local-biomarker-aliases.json");
  const port = 9100 + Math.floor(Math.random() * 500);
  const baseUrl = `http://127.0.0.1:${port}`;

  await createTestSeed(dbPath);

  const child = spawn(process.execPath, [path.join(__dirname, "index.js")], {
    cwd: path.join(__dirname, ".."),
    env: {
      ...process.env,
      API_PORT: `${port}`,
      API_DATA_DIR: dataDir,
      API_RUNTIME_DIR: runtimeDataDir,
      API_DB_PATH: dbPath,
      API_SEED_PATH: seedPath,
      UNKNOWN_BIOMARKER_FILE: unknownBiomarkerFilePath,
      LOCAL_BIOMARKER_ALIAS_FILE: localBiomarkerAliasFilePath,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  await waitForServer(baseUrl);

  return {
    baseUrl,
    runtimeDir,
    unknownBiomarkerFilePath,
    localBiomarkerAliasFilePath,
    async stop() {
      child.kill("SIGTERM");
      await new Promise((resolve) => child.once("exit", resolve));

      if (stderr.trim()) {
        assert.equal(stderr.trim(), "", stderr);
      }
    },
  };
}

async function login(baseUrl) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: "jane.smith@medical.com",
      password: "password123",
    }),
  });

  assert.equal(response.status, 200);
  const cookie = response.headers.get("set-cookie");
  assert.ok(cookie);
  return cookie.split(";")[0];
}

async function requestJson(baseUrl, urlPath, init = {}, cookie) {
  const response = await fetch(`${baseUrl}${urlPath}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.headers ?? {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
  });
  const payload = response.status === 204 ? null : await response.json();

  return {
    response,
    payload,
  };
}

test("avatar upload stores an asset and delete removes it", async () => {
  const server = await startServer();

  try {
    const cookie = await login(server.baseUrl);
    const avatarDataUrl =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII=";

    const uploadResult = await requestJson(
      server.baseUrl,
      "/api/profiles/profile_me/avatar",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: "avatar.png",
          mimeType: "image/png",
          sizeBytes: 68,
          dataUrl: avatarDataUrl,
        }),
      },
      cookie,
    );

    assert.equal(uploadResult.response.status, 200);
    assert.equal(uploadResult.payload.avatarAsset.fileName, "avatar.png");
    assert.ok(uploadResult.payload.avatarUrl.includes("/api/assets/"));

    const contentResponse = await fetch(uploadResult.payload.avatarUrl, {
      headers: {
        Cookie: cookie,
      },
    });

    assert.equal(contentResponse.status, 200);
    assert.equal(contentResponse.headers.get("content-type"), "image/png");

    const deleteResult = await requestJson(
      server.baseUrl,
      "/api/profiles/profile_me/avatar",
      {
        method: "DELETE",
      },
      cookie,
    );

    assert.equal(deleteResult.response.status, 200);
    assert.equal(deleteResult.payload.avatarUrl, "");
    assert.equal(deleteResult.payload.avatarAsset, null);

    const missingAssetResponse = await fetch(uploadResult.payload.avatarUrl, {
      headers: {
        Cookie: cookie,
      },
    });

    assert.equal(missingAssetResponse.status, 404);
  } finally {
    await server.stop();
  }
});

test("report source file upload stores an asset and report deletion cleans it up", async () => {
  const server = await startServer();

  try {
    const cookie = await login(server.baseUrl);
    const fileDataUrl =
      "data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrp/Og0MTGCjEgMCBvYmoKPDwvVHlwZS9DYXRhbG9nPj4KZW5kb2JqCnhyZWYKMCAxCjAwMDAwMDAwMDAgNjU1MzUgZiAKdHJhaWxlcgo8PC9Sb290IDEgMCBSPj4Kc3RhcnR4cmVmCjQ1CiUlRU9G";

    const uploadResult = await requestJson(
      server.baseUrl,
      "/api/reports/report_1/files",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: "lab-report.pdf",
          mimeType: "application/pdf",
          sizeBytes: 132,
          dataUrl: fileDataUrl,
        }),
      },
      cookie,
    );

    assert.equal(uploadResult.response.status, 200);
    assert.equal(uploadResult.payload.sourceFile.fileName, "lab-report.pdf");
    assert.equal(uploadResult.payload.sourceFile.mimeType, "application/pdf");

    const contentResponse = await fetch(uploadResult.payload.sourceFile.url, {
      headers: {
        Cookie: cookie,
      },
    });

    assert.equal(contentResponse.status, 200);
    assert.equal(contentResponse.headers.get("content-type"), "application/pdf");

    const attachSourceResult = await requestJson(
      server.baseUrl,
      "/api/reports/report_1/source",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: "lab-report.pdf",
          examType: "Routine",
          sourceType: "pdf",
        }),
      },
      cookie,
    );

    assert.equal(attachSourceResult.response.status, 200);
    assert.ok(attachSourceResult.payload.sourceUpdatedAt);
    assert.equal(attachSourceResult.payload.resultsGeneratedAt, undefined);

    const scanResult = await requestJson(
      server.baseUrl,
      "/api/reports/report_1/scan",
      {
        method: "POST",
      },
      cookie,
    );

    assert.equal(scanResult.response.status, 200);
    assert.ok(scanResult.payload.resultsGeneratedAt);
    assert.ok(
      new Date(scanResult.payload.resultsGeneratedAt).getTime() >=
        new Date(attachSourceResult.payload.sourceUpdatedAt).getTime(),
    );

    const deleteResult = await requestJson(
      server.baseUrl,
      "/api/reports/report_1",
      {
        method: "DELETE",
      },
      cookie,
    );

    assert.equal(deleteResult.response.status, 200);

    const missingAssetResponse = await fetch(uploadResult.payload.sourceFile.url, {
      headers: {
        Cookie: cookie,
      },
    });

    assert.equal(missingAssetResponse.status, 404);
  } finally {
    await server.stop();
  }
});

test("report file delete endpoint clears source file without deleting report", async () => {
  const server = await startServer();

  try {
    const cookie = await login(server.baseUrl);
    const fileDataUrl =
      "data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrp/Og0MTGCjEgMCBvYmoKPDwvVHlwZS9DYXRhbG9nPj4KZW5kb2JqCnhyZWYKMCAxCjAwMDAwMDAwMDAgNjU1MzUgZiAKdHJhaWxlcgo8PC9Sb290IDEgMCBSPj4Kc3RhcnR4cmVmCjQ1CiUlRU9G";

    const uploadResult = await requestJson(
      server.baseUrl,
      "/api/reports/report_2/files",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: "replaceable-report.pdf",
          mimeType: "application/pdf",
          sizeBytes: 132,
          dataUrl: fileDataUrl,
        }),
      },
      cookie,
    );

    assert.equal(uploadResult.response.status, 200);

    const deleteFileResult = await requestJson(
      server.baseUrl,
      "/api/reports/report_2/files",
      {
        method: "DELETE",
      },
      cookie,
    );

    assert.equal(deleteFileResult.response.status, 200);
    assert.equal(deleteFileResult.payload.id, "report_2");
    assert.equal(deleteFileResult.payload.sourceFile, null);

    const reportResult = await requestJson(server.baseUrl, "/api/reports/report_2", {}, cookie);
    assert.equal(reportResult.response.status, 200);
    assert.equal(reportResult.payload.id, "report_2");
    assert.equal(reportResult.payload.sourceFile, null);

    const missingAssetResponse = await fetch(uploadResult.payload.sourceFile.url, {
      headers: {
        Cookie: cookie,
      },
    });
    assert.equal(missingAssetResponse.status, 404);
  } finally {
    await server.stop();
  }
});

test("profile deletion cleans avatar and linked report assets", async () => {
  const server = await startServer();

  try {
    const cookie = await login(server.baseUrl);
    const avatarDataUrl =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII=";
    const fileDataUrl =
      "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxAQEBUQEBAVFhUVFRUVFRUVFRUVFRUVFRUWFhUVFRUYHSggGBolHRUVITEhJSkrLi4uFx8zODMsNygtLisBCgoKDg0OGxAQGy0mICYtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLf/AABEIAAEAAgMBIgACEQEDEQH/xAAXAAEBAQEAAAAAAAAAAAAAAAABAgAD/8QAFhEBAQEAAAAAAAAAAAAAAAAAAAER/9oADAMBAAIQAxAAAAG8gqf/xAAYEAADAQEAAAAAAAAAAAAAAAAAARECEv/aAAgBAQABBQK0a//EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQMBAT8BP//EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQIBAT8BP//Z";

    const avatarResult = await requestJson(
      server.baseUrl,
      "/api/profiles/profile_dad/avatar",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: "dad-avatar.png",
          mimeType: "image/png",
          sizeBytes: 68,
          dataUrl: avatarDataUrl,
        }),
      },
      cookie,
    );

    assert.equal(avatarResult.response.status, 200);

    const reportCreateResult = await requestJson(
      server.baseUrl,
      "/api/reports",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profileId: "profile_dad",
          examType: "Routine",
        }),
      },
      cookie,
    );

    assert.equal(reportCreateResult.response.status, 201);
    const createdReportId = reportCreateResult.payload.id;

    const reportFileResult = await requestJson(
      server.baseUrl,
      `/api/reports/${createdReportId}/files`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: "dad-lab.jpg",
          mimeType: "image/jpeg",
          sizeBytes: 128,
          dataUrl: fileDataUrl,
        }),
      },
      cookie,
    );

    assert.equal(reportFileResult.response.status, 200);

    const deleteProfileResult = await requestJson(
      server.baseUrl,
      "/api/profiles/profile_dad",
      {
        method: "DELETE",
      },
      cookie,
    );

    assert.equal(deleteProfileResult.response.status, 200);

    const avatarMissingResponse = await fetch(avatarResult.payload.avatarUrl, {
      headers: {
        Cookie: cookie,
      },
    });
    assert.equal(avatarMissingResponse.status, 404);

    const sourceMissingResponse = await fetch(reportFileResult.payload.sourceFile.url, {
      headers: {
        Cookie: cookie,
      },
    });
    assert.equal(sourceMissingResponse.status, 404);
  } finally {
    await server.stop();
  }
});

test("report result patch updates a single biomarker result", async () => {
  const server = await startServer();

  try {
    const cookie = await login(server.baseUrl);

    const updateResult = await requestJson(
      server.baseUrl,
      "/api/reports/report_1/results/r1_alt",
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "ALT (Edited)",
          category: "Liver Review",
          value: 41.2,
          unit: "U/L",
          referenceText: "Ref < 35 U/L",
          status: "high",
        }),
      },
      cookie,
    );

    assert.equal(updateResult.response.status, 200);

    const editedResult = updateResult.payload.results.find((item) => item.id === "r1_alt");
    assert.ok(editedResult);
    assert.equal(editedResult.name, "ALT (Edited)");
    assert.equal(editedResult.category, "Liver Review");
    assert.equal(editedResult.value, 41.2);
    assert.equal(editedResult.referenceText, "Ref < 35 U/L");
    assert.equal(editedResult.status, "high");
  } finally {
    await server.stop();
  }
});

test("unknown biomarker endpoint returns the current user's review queue", async () => {
  const server = await startServer();

  try {
    const cookie = await login(server.baseUrl);

    await writeFile(
      server.unknownBiomarkerFilePath,
      JSON.stringify(
        [
          {
            key: "LP-PLA2|脂蛋白相关磷脂酶A2(LP-PLA2)||<175",
            provider: "tencent",
            code: "LP-PLA2",
            rawName: "脂蛋白相关磷脂酶A2(LP-PLA2)",
            normalizedName: "脂蛋白相关磷脂酶A2(LP-PLA2)",
            category: "Other",
            unit: "ng/mL",
            referenceText: "<175",
            sampleRawValue: "248↑",
            sampleValue: 248,
            occurrences: 2,
            reportIds: ["report_x", "report_y"],
            profileIds: ["profile_me"],
            firstSeenAt: "2026-04-05T08:00:00.000Z",
            lastSeenAt: "2026-04-05T10:00:00.000Z",
            status: "pending",
            processedAt: null,
            processedReason: null,
            localAliasId: null
          },
          {
            key: "private-only",
            provider: "tencent",
            code: "PRIVATE",
            rawName: "Private Marker",
            normalizedName: "Private Marker",
            category: "Other",
            unit: "",
            referenceText: "",
            sampleRawValue: "1",
            sampleValue: 1,
            occurrences: 1,
            reportIds: ["report_z"],
            profileIds: ["profile_other_user"],
            firstSeenAt: "2026-04-05T08:00:00.000Z",
            lastSeenAt: "2026-04-05T10:00:00.000Z",
            status: "pending",
            processedAt: null,
            processedReason: null,
            localAliasId: null
          }
        ],
        null,
        2,
      ),
    );

    const result = await requestJson(server.baseUrl, "/api/scan/unknown-biomarkers", {}, cookie);

    assert.equal(result.response.status, 200);
    assert.equal(result.payload.items.length, 1);
    assert.equal(result.payload.items[0].code, "LP-PLA2");
    assert.equal(result.payload.items[0].occurrences, 2);
    assert.equal(result.payload.items[0].status, "pending");
  } finally {
    await server.stop();
  }
});

test("unknown biomarker status can be marked processed and reopened", async () => {
  const server = await startServer();

  try {
    const cookie = await login(server.baseUrl);
    const key = "LP-PLA2|脂蛋白相关磷脂酶A2(LP-PLA2)|ng/mL|<175";

    await writeFile(
      server.unknownBiomarkerFilePath,
      JSON.stringify(
        [
          {
            key,
            provider: "tencent",
            code: "LP-PLA2",
            rawName: "脂蛋白相关磷脂酶A2(LP-PLA2)",
            normalizedName: "脂蛋白相关磷脂酶A2(LP-PLA2)",
            category: "Other",
            unit: "ng/mL",
            referenceText: "<175",
            sampleRawValue: "248↑",
            sampleValue: 248,
            occurrences: 1,
            reportIds: ["report_x"],
            profileIds: ["profile_me"],
            firstSeenAt: "2026-04-05T08:00:00.000Z",
            lastSeenAt: "2026-04-05T10:00:00.000Z",
            status: "pending",
            processedAt: null,
            processedReason: null,
            localAliasId: null,
          },
        ],
        null,
        2,
      ),
    );

    const processed = await requestJson(
      server.baseUrl,
      `/api/scan/unknown-biomarkers/${encodeURIComponent(key)}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "processed" }),
      },
      cookie,
    );

    assert.equal(processed.response.status, 200);
    assert.equal(processed.payload.status, "processed");
    assert.equal(processed.payload.processedReason, "manual");

    const reopened = await requestJson(
      server.baseUrl,
      `/api/scan/unknown-biomarkers/${encodeURIComponent(key)}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "pending" }),
      },
      cookie,
    );

    assert.equal(reopened.response.status, 200);
    assert.equal(reopened.payload.status, "pending");
    assert.equal(reopened.payload.processedAt, null);
  } finally {
    await server.stop();
  }
});

test("creating local biomarker alias marks unknown item processed and writes override file", async () => {
  const server = await startServer();

  try {
    const cookie = await login(server.baseUrl);
    const key = "LP-PLA2|脂蛋白相关磷脂酶A2(LP-PLA2)|ng/mL|<175";

    await writeFile(
      server.unknownBiomarkerFilePath,
      JSON.stringify(
        [
          {
            key,
            provider: "tencent",
            code: "LP-PLA2",
            rawName: "脂蛋白相关磷脂酶A2(LP-PLA2)",
            normalizedName: "脂蛋白相关磷脂酶A2(LP-PLA2)",
            category: "Other",
            unit: "ng/mL",
            referenceText: "<175",
            sampleRawValue: "248↑",
            sampleValue: 248,
            occurrences: 1,
            reportIds: ["report_x"],
            profileIds: ["profile_me"],
            firstSeenAt: "2026-04-05T08:00:00.000Z",
            lastSeenAt: "2026-04-05T10:00:00.000Z",
            status: "pending",
            processedAt: null,
            processedReason: null,
            localAliasId: null,
          },
        ],
        null,
        2,
      ),
    );

    const created = await requestJson(
      server.baseUrl,
      `/api/scan/unknown-biomarkers/${encodeURIComponent(key)}/local-alias`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category: "Cardiovascular",
          referenceText: "<175",
        }),
      },
      cookie,
    );

    assert.equal(created.response.status, 201);
    assert.equal(created.payload.item.status, "processed");
    assert.equal(created.payload.item.processedReason, "local_alias");
    assert.equal(created.payload.alias.category, "Cardiovascular");

    const aliasFile = JSON.parse(await readFile(server.localBiomarkerAliasFilePath, "utf8"));
    assert.equal(aliasFile.length, 1);
    assert.equal(aliasFile[0].sourceKey, key);
    assert.ok(aliasFile[0].aliases.includes("脂蛋白相关磷脂酶A2(LP-PLA2)"));
  } finally {
    await server.stop();
  }
});
