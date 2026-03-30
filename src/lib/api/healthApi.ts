import type {
  AuthDraft,
  BiomarkerResult,
  CreateProfileInput,
  CreateManualReportInput,
  CreateUploadedReportInput,
  DeleteReportResult,
  DeleteProfileResult,
  HealthAppState,
  HealthClientState,
  HealthPreferences,
  HealthSession,
  Profile,
  Report,
  ScanScenario,
  UpdateReportInput,
} from "@/lib/healthDomain";

const LEGACY_STORAGE_KEY = "vitalis-core-state-v1";
const STORAGE_KEYS = {
  session: "vitalis-core-session-v1",
  profiles: "vitalis-core-profiles-v1",
  reports: "vitalis-core-reports-v1",
  preferences: "vitalis-core-preferences-v1",
  clientState: "vitalis-core-client-state-v1",
} as const;

export type HealthBootstrap = {
  session: HealthSession | null;
  profiles: Profile[] | null;
  reports: Report[] | null;
  preferences: HealthPreferences | null;
  clientState: HealthClientState | null;
};

export type HealthApi = {
  mode: "local" | "remote";
  bootstrap: () => Promise<HealthBootstrap>;
  auth: {
    login: (input: Pick<AuthDraft, "email" | "password">) => Promise<HealthSession>;
    register: (input: AuthDraft) => Promise<HealthSession>;
    logout: () => Promise<void>;
  };
  profiles: {
    create: (input: CreateProfileInput) => Promise<Profile>;
    update: (
      profileId: string,
      patch: Partial<Pick<Profile, "name" | "relation" | "birthDate" | "gender" | "note" | "initials" | "avatarUrl">>,
    ) => Promise<Profile>;
    delete: (profileId: string) => Promise<DeleteProfileResult>;
  };
  reports: {
    createManual: (input: CreateManualReportInput) => Promise<Report>;
    createUploaded: (input: CreateUploadedReportInput) => Promise<Report>;
    update: (reportId: string, patch: UpdateReportInput) => Promise<Report>;
    delete: (reportId: string) => Promise<DeleteReportResult>;
    completeScan: (reportId: string) => Promise<Report>;
    retryScan: (reportId: string) => Promise<Report>;
    getResults: (reportId: string) => Promise<BiomarkerResult[]>;
  };
  preferences: {
    update: (patch: Partial<HealthPreferences>) => Promise<HealthPreferences>;
  };
  clientState: {
    get: () => Promise<HealthClientState | null>;
    update: (patch: Partial<HealthClientState>) => Promise<HealthClientState>;
  };
};

function readLocalResource<T>(key: string): T | null {
  const raw = window.localStorage.getItem(key);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeLocalResource<T>(key: string, value: T): T {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      throw new Error("Avatar image is too large for local storage. Please choose a smaller photo.");
    }

    throw error;
  }

  return value;
}

function readLegacyState(): HealthAppState | null {
  const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as HealthAppState;
  } catch {
    return null;
  }
}

function buildLegacySession(legacyState: HealthAppState): HealthSession {
  return { currentUserId: legacyState.auth.currentUserId };
}

function buildLegacyPreferences(legacyState: HealthAppState): HealthPreferences {
  return {
    activeProfileId: legacyState.activeProfileId,
    selectedReportId: legacyState.selectedReportId,
  };
}

function buildLegacyClientState(legacyState: HealthAppState): HealthClientState {
  return {
    profileDraft: {
      ...legacyState.profileDraft,
      avatarUrl: legacyState.profileDraft.avatarUrl ?? "",
    },
    profileDraftState: {
      mode: "edit",
      targetProfileId: legacyState.activeProfileId,
    },
    profileAvatarUrls: {},
    reportSavedAt: {},
    scanSession: legacyState.scanSession,
    manualEntryDraft: legacyState.manualEntryDraft,
  };
}

function createManualReport(input: CreateManualReportInput): Report {
  return {
    id: `report_manual_${Date.now()}`,
    profileId: input.profileId,
    title: input.title,
    date: new Date(input.date).toISOString(),
    location: "Manual Entry",
    sceneType: input.examType === "Clinical" ? "INPATIENT" : "ROUTINE",
    sourceType: "manual",
    status: "ready",
    examType: input.examType,
    aiAccuracy: 100,
    results: input.results,
    isFavorite: false,
  };
}

function createSimulatedScanResults(examType: Report["examType"]): BiomarkerResult[] {
  if (examType === "Clinical") {
    return [
      {
        id: `scan_alt_${Date.now()}`,
        code: "ALT",
        name: "ALT (Alanine Aminotransferase)",
        category: "Liver Function",
        value: 42,
        unit: "U/L",
        referenceText: "Ref < 40 U/L",
        status: "high",
      },
      {
        id: `scan_ast_${Date.now()}`,
        code: "AST",
        name: "AST (Aspartate Aminotransferase)",
        category: "Liver Function",
        value: 34,
        unit: "U/L",
        referenceText: "Ref 10 - 35 U/L",
        status: "normal",
      },
      {
        id: `scan_cre_${Date.now()}`,
        code: "CRE",
        name: "Creatinine",
        category: "Kidney Function",
        value: 1.08,
        unit: "mg/dL",
        referenceText: "Ref 0.7 - 1.3 mg/dL",
        status: "normal",
      },
      {
        id: `scan_hba1c_${Date.now()}`,
        code: "HBA1C",
        name: "HbA1c",
        category: "Metabolic",
        value: 5.7,
        unit: "%",
        referenceText: "Ref 4.0 - 5.6%",
        status: "high",
      },
    ];
  }

  return [
    {
      id: `scan_hgb_${Date.now()}`,
      code: "HGB",
      name: "Hemoglobin",
      category: "Blood Count",
      value: 13.9,
      unit: "g/dL",
      referenceText: "Ref 13.5 - 17.5 g/dL",
      status: "normal",
    },
    {
      id: `scan_wbc_${Date.now()}`,
      code: "WBC",
      name: "White Blood Cells",
      category: "Blood Count",
      value: 6.2,
      unit: "10^9/L",
      referenceText: "Ref 4.0 - 11.0 10^9/L",
      status: "normal",
    },
    {
      id: `scan_glu_${Date.now()}`,
      code: "GLU",
      name: "Glucose",
      category: "Metabolic",
      value: 102,
      unit: "mg/dL",
      referenceText: "Ref 70 - 99 mg/dL",
      status: "high",
    },
    {
      id: `scan_bun_${Date.now()}`,
      code: "BUN",
      name: "Blood Urea Nitrogen",
      category: "Kidney Function",
      value: 14,
      unit: "mg/dL",
      referenceText: "Ref 7 - 20 mg/dL",
      status: "normal",
    },
  ];
}

function stripExtension(fileName: string) {
  return fileName.replace(/\.[^/.]+$/, "").trim();
}

function inferScanScenario(fileName: string): ScanScenario {
  const normalized = fileName.toLowerCase();

  if (/(corrupt|damaged|broken|invalid)/.test(normalized)) {
    return "file_invalid";
  }

  if (/(ocr|blurry|blur|cropped|unreadable|tilted)/.test(normalized)) {
    return "ocr_retryable";
  }

  return "normal";
}

function createUploadedReport(input: CreateUploadedReportInput): Report {
  const normalizedFileName = input.fileName.trim() || (input.sourceType === "pdf" ? "Imported Report.pdf" : "Camera Capture.jpg");
  const baseTitle = stripExtension(normalizedFileName);
  const scanScenario = inferScanScenario(normalizedFileName);

  return {
    id: `report_scan_${Date.now()}`,
    profileId: input.profileId,
    title: baseTitle || "Imported Report",
    date: new Date().toISOString(),
    location: input.sourceType === "pdf" ? "Files Import" : "Mobile Upload",
    sceneType: input.examType === "Clinical" ? "INPATIENT" : "ROUTINE",
    sourceType: input.sourceType,
    status: "processing",
    examType: input.examType,
    aiAccuracy: input.sourceType === "pdf" ? 98.9 : 97.6,
    results: createSimulatedScanResults(input.examType),
    isFavorite: false,
    scanScenario,
  };
}

function getLatestReportIdForProfile(reports: Report[], profileId: string) {
  return [...reports]
    .filter((report) => report.profileId === profileId)
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())[0]?.id ?? null;
}

function createLocalHealthApi(): HealthApi {
  const readSession = async () => {
    const localSession = readLocalResource<HealthSession>(STORAGE_KEYS.session);

    if (localSession) {
      return localSession;
    }

    const legacyState = readLegacyState();
    return legacyState ? buildLegacySession(legacyState) : null;
  };

  const readProfiles = async () => {
    const localProfiles = readLocalResource<Profile[]>(STORAGE_KEYS.profiles);

    if (localProfiles) {
      return localProfiles;
    }

    return readLegacyState()?.profiles ?? null;
  };

  const readReports = async () => {
    const localReports = readLocalResource<Report[]>(STORAGE_KEYS.reports);

    if (localReports) {
      return localReports;
    }

    return readLegacyState()?.reports ?? null;
  };

  const readPreferences = async () => {
    const localPreferences = readLocalResource<HealthPreferences>(STORAGE_KEYS.preferences);

    if (localPreferences) {
      return localPreferences;
    }

    const legacyState = readLegacyState();
    return legacyState ? buildLegacyPreferences(legacyState) : null;
  };

  const readClientState = async () => {
    const localClientState = readLocalResource<HealthClientState>(STORAGE_KEYS.clientState);

    if (localClientState) {
      return localClientState;
    }

    const legacyState = readLegacyState();
    return legacyState ? buildLegacyClientState(legacyState) : null;
  };

  return {
    mode: "local",
    async bootstrap() {
      const [session, profiles, reports, preferences, clientState] = await Promise.all([
        readSession(),
        readProfiles(),
        readReports(),
        readPreferences(),
        readClientState(),
      ]);

      return {
        session,
        profiles,
        reports,
        preferences,
        clientState,
      };
    },
    auth: {
      async login(input) {
        const existingSession = await readSession();

        if (existingSession?.currentUserId) {
          return existingSession;
        }

        const profiles = await readProfiles();
        const session = {
          currentUserId: profiles?.[0]?.userId ?? `user_${input.email || "local"}`,
        };

        return writeLocalResource(STORAGE_KEYS.session, session);
      },
      async register(input) {
        const session = {
          currentUserId: `user_${input.email || "new"}`,
        };

        return writeLocalResource(STORAGE_KEYS.session, session);
      },
      async logout() {
        writeLocalResource(STORAGE_KEYS.session, { currentUserId: null } satisfies HealthSession);
      },
    },
    profiles: {
      async create(input) {
        const session = await readSession();
        const userId = session?.currentUserId ?? "user_local";
        const profile = {
          id: `profile_${Date.now()}`,
          userId,
          name: input.name,
          relation: input.relation,
          initials:
            input.name
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0]?.toUpperCase() ?? "")
              .join("") || "ME",
          memberId: `VC-${Date.now().toString().slice(-8)}`,
          birthDate: input.birthDate,
          gender: input.gender,
          note: input.note,
          avatarUrl: input.avatarUrl,
        } satisfies Profile;
        const profiles = (await readProfiles()) ?? [];

        writeLocalResource(STORAGE_KEYS.profiles, [...profiles, profile]);

        return profile;
      },
      async update(profileId, patch) {
        const profiles = (await readProfiles()) ?? [];
        const existingProfile = profiles.find((profile) => profile.id === profileId);

        if (!existingProfile) {
          throw new Error(`Profile ${profileId} not found`);
        }

        const updatedProfile = {
          ...existingProfile,
          ...patch,
        };

        writeLocalResource(
          STORAGE_KEYS.profiles,
          profiles.map((profile) => (profile.id === profileId ? updatedProfile : profile)),
        );

        return updatedProfile;
      },
      async delete(profileId) {
        const profiles = (await readProfiles()) ?? [];
        const profile = profiles.find((item) => item.id === profileId);

        if (!profile) {
          throw new Error(`Profile ${profileId} not found`);
        }

        const nextProfiles = profiles.filter((item) => item.id !== profileId);

        if (nextProfiles.length === 0) {
          throw new Error("At least one profile must remain");
        }

        const reports = (await readReports()) ?? [];
        const nextReports = reports.filter((report) => report.profileId !== profileId);
        const currentPreferences = (await readPreferences()) ?? {
          activeProfileId: nextProfiles[0].id,
          selectedReportId: null,
        };
        const nextActiveProfileId = nextProfiles.some((item) => item.id === currentPreferences.activeProfileId)
          ? currentPreferences.activeProfileId
          : nextProfiles[0].id;
        const nextSelectedReportId =
          nextReports
            .filter((report) => report.profileId === nextActiveProfileId)
            .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())[0]?.id ?? null;

        writeLocalResource(STORAGE_KEYS.profiles, nextProfiles);
        writeLocalResource(STORAGE_KEYS.reports, nextReports);
        writeLocalResource(STORAGE_KEYS.preferences, {
          activeProfileId: nextActiveProfileId,
          selectedReportId: nextSelectedReportId,
        } satisfies HealthPreferences);

        return {
          deletedProfileId: profileId,
          activeProfileId: nextActiveProfileId,
          selectedReportId: nextSelectedReportId,
        };
      },
    },
    reports: {
      async createManual(input) {
        const reports = (await readReports()) ?? [];
        const report = createManualReport(input);

        writeLocalResource(STORAGE_KEYS.reports, [report, ...reports]);

        return report;
      },
      async createUploaded(input) {
        const reports = (await readReports()) ?? [];
        const report = createUploadedReport(input);

        writeLocalResource(STORAGE_KEYS.reports, [report, ...reports]);

        return report;
      },
      async update(reportId, patch) {
        const reports = (await readReports()) ?? [];
        const existingReport = reports.find((report) => report.id === reportId);

        if (!existingReport) {
          throw new Error(`Report ${reportId} not found`);
        }

        const updatedReport = {
          ...existingReport,
          ...patch,
        } satisfies Report;

        writeLocalResource(
          STORAGE_KEYS.reports,
          reports.map((report) => (report.id === reportId ? updatedReport : report)),
        );

        return updatedReport;
      },
      async delete(reportId) {
        const reports = (await readReports()) ?? [];
        const existingReport = reports.find((report) => report.id === reportId);

        if (!existingReport) {
          throw new Error(`Report ${reportId} not found`);
        }

        const nextReports = reports.filter((report) => report.id !== reportId);
        const currentPreferences = (await readPreferences()) ?? {
          activeProfileId: existingReport.profileId,
          selectedReportId: reportId,
        };
        const nextSelectedReportId =
          currentPreferences.selectedReportId === reportId
            ? getLatestReportIdForProfile(nextReports, existingReport.profileId)
            : currentPreferences.selectedReportId;

        writeLocalResource(STORAGE_KEYS.reports, nextReports);
        writeLocalResource(STORAGE_KEYS.preferences, {
          ...currentPreferences,
          selectedReportId: nextSelectedReportId,
        } satisfies HealthPreferences);

        return {
          deletedReportId: reportId,
          selectedReportId: nextSelectedReportId,
        };
      },
      async completeScan(reportId) {
        const reports = (await readReports()) ?? [];
        const existingReport = reports.find((report) => report.id === reportId);

        if (!existingReport) {
          throw new Error(`Report ${reportId} not found`);
        }

        if (existingReport.scanScenario === "file_invalid") {
          const failedReport = {
            ...existingReport,
            status: "failed",
            scanFailureCode: "file_invalid",
            scanFailureMessage: "The selected file appears damaged or unsupported. Please upload a cleaner report file.",
          } satisfies Report;

          writeLocalResource(
            STORAGE_KEYS.reports,
            reports.map((report) => (report.id === reportId ? failedReport : report)),
          );

          return failedReport;
        }

        if (existingReport.scanScenario === "ocr_retryable") {
          const failedReport = {
            ...existingReport,
            status: "failed",
            scanFailureCode: "ocr_failed",
            scanFailureMessage: "OCR confidence was too low to extract reliable biomarkers. Retry once or upload a clearer file.",
          } satisfies Report;

          writeLocalResource(
            STORAGE_KEYS.reports,
            reports.map((report) => (report.id === reportId ? failedReport : report)),
          );

          return failedReport;
        }

        const completedReport = {
          ...existingReport,
          status: "ready",
          scanFailureCode: undefined,
          scanFailureMessage: undefined,
        } satisfies Report;

        writeLocalResource(
          STORAGE_KEYS.reports,
          reports.map((report) => (report.id === reportId ? completedReport : report)),
        );

        return completedReport;
      },
      async retryScan(reportId) {
        const reports = (await readReports()) ?? [];
        const existingReport = reports.find((report) => report.id === reportId);

        if (!existingReport) {
          throw new Error(`Report ${reportId} not found`);
        }

        const retriedReport = {
          ...existingReport,
          status: "processing",
          scanScenario: existingReport.scanScenario === "ocr_retryable" ? "normal" : existingReport.scanScenario,
          scanFailureCode: undefined,
          scanFailureMessage: undefined,
        } satisfies Report;

        writeLocalResource(
          STORAGE_KEYS.reports,
          reports.map((report) => (report.id === reportId ? retriedReport : report)),
        );

        return retriedReport;
      },
      async getResults(reportId) {
        const reports = (await readReports()) ?? [];
        return reports.find((report) => report.id === reportId)?.results ?? [];
      },
    },
    preferences: {
      async update(patch) {
        const current = (await readPreferences()) ?? {
          activeProfileId: "",
          selectedReportId: null,
        };

        return writeLocalResource(STORAGE_KEYS.preferences, {
          ...current,
          ...patch,
        });
      },
    },
    clientState: {
      async get() {
        return readClientState();
      },
      async update(patch) {
        const current = (await readClientState()) ?? null;

        return writeLocalResource(STORAGE_KEYS.clientState, {
          ...current,
          ...patch,
        } as HealthClientState);
      },
    },
  };
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  const method = (init?.method ?? "GET").toUpperCase();
  const response = await fetch(url, {
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (response.status === 404) {
    if (method === "GET") {
      return null;
    }

    throw new Error(`Request failed for ${url}: 404`);
  }

  if (!response.ok) {
    throw new Error(`Request failed for ${url}: ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return (await response.json()) as T;
}

function listFromResponse<T>(payload: { items: T[] } | T[]): T[] {
  return Array.isArray(payload) ? payload : payload.items;
}

function createRemoteHealthApi(baseUrl: string): HealthApi {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");
  const resourceUrl = (path: string) => `${normalizedBaseUrl}${path}`;

  const getClientState = async () => readLocalResource<HealthClientState>(STORAGE_KEYS.clientState);
  const updateClientState = async (patch: Partial<HealthClientState>) => {
    const current = (await getClientState()) ?? null;

    return writeLocalResource(STORAGE_KEYS.clientState, {
      ...current,
      ...patch,
    } as HealthClientState);
  };

  return {
    mode: "remote",
    async bootstrap() {
      const [session, profilesResponse, reportsResponse, preferences, clientState] = await Promise.all([
        requestJson<HealthSession>(resourceUrl("/auth/session")),
        requestJson<{ items: Profile[] } | Profile[]>(resourceUrl("/profiles")),
        requestJson<{ items: Report[] } | Report[]>(resourceUrl("/reports")),
        requestJson<HealthPreferences>(resourceUrl("/users/me/preferences")),
        getClientState(),
      ]);

      return {
        session: session ?? { currentUserId: null },
        profiles: profilesResponse ? listFromResponse(profilesResponse) : null,
        reports: reportsResponse ? listFromResponse(reportsResponse) : null,
        preferences,
        clientState,
      };
    },
    auth: {
      async login(input) {
        const session = await requestJson<HealthSession>(resourceUrl("/auth/login"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(input),
        });

        if (!session) {
          throw new Error("Login did not return a session");
        }

        return session;
      },
      async register(input) {
        const session = await requestJson<HealthSession>(resourceUrl("/auth/register"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(input),
        });

        if (!session) {
          throw new Error("Register did not return a session");
        }

        return session;
      },
      async logout() {
        await requestJson(resourceUrl("/auth/session"), {
          method: "DELETE",
        });
      },
    },
    profiles: {
      async create(input) {
        const profile = await requestJson<Profile>(resourceUrl("/profiles"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(input),
        });

        if (!profile) {
          throw new Error("Profile creation returned empty response");
        }

        return input.avatarUrl && !profile.avatarUrl
          ? {
              ...profile,
              avatarUrl: input.avatarUrl,
            }
          : profile;
      },
      async update(profileId, patch) {
        const profile = await requestJson<Profile>(resourceUrl(`/profiles/${encodeURIComponent(profileId)}`), {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(patch),
        });

        if (!profile) {
          throw new Error(`Profile ${profileId} update returned empty response`);
        }

        return patch.avatarUrl !== undefined && profile.avatarUrl !== patch.avatarUrl
          ? {
              ...profile,
              avatarUrl: patch.avatarUrl,
            }
          : profile;
      },
      async delete(profileId) {
        const payload = await requestJson<DeleteProfileResult>(resourceUrl(`/profiles/${encodeURIComponent(profileId)}`), {
          method: "DELETE",
        });

        if (!payload) {
          throw new Error(`Profile ${profileId} deletion returned empty response`);
        }

        return payload;
      },
    },
    reports: {
      async createManual(input) {
        const report = await requestJson<Report>(resourceUrl("/reports/manual"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(input),
        });

        if (!report) {
          throw new Error("Manual report creation returned empty response");
        }

        return report;
      },
      async update(reportId, patch) {
        const report = await requestJson<Report>(resourceUrl(`/reports/${encodeURIComponent(reportId)}`), {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(patch),
        });

        if (!report) {
          throw new Error(`Report ${reportId} update returned empty response`);
        }

        return report;
      },
      async delete(reportId) {
        const payload = await requestJson<DeleteReportResult>(resourceUrl(`/reports/${encodeURIComponent(reportId)}`), {
          method: "DELETE",
        });

        if (!payload) {
          throw new Error(`Report ${reportId} deletion returned empty response`);
        }

        return payload;
      },
      async createUploaded(input) {
        const report = await requestJson<Report>(resourceUrl("/reports"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(input),
        });

        if (!report) {
          throw new Error("Uploaded report creation returned empty response");
        }

        return report;
      },
      async completeScan(reportId) {
        const report = await requestJson<Report>(resourceUrl(`/reports/${encodeURIComponent(reportId)}/complete`), {
          method: "POST",
        });

        if (!report) {
          throw new Error(`Report ${reportId} completion returned empty response`);
        }

        return report;
      },
      async retryScan(reportId) {
        const report = await requestJson<Report>(resourceUrl(`/reports/${encodeURIComponent(reportId)}/retry`), {
          method: "POST",
        });

        if (!report) {
          throw new Error(`Report ${reportId} retry returned empty response`);
        }

        return report;
      },
      async getResults(reportId) {
        const payload = await requestJson<{ items: BiomarkerResult[] } | BiomarkerResult[]>(
          resourceUrl(`/reports/${encodeURIComponent(reportId)}/results`),
        );

        if (!payload) {
          return [];
        }

        return listFromResponse(payload);
      },
    },
    preferences: {
      async update(patch) {
        const preferences = await requestJson<HealthPreferences>(resourceUrl("/users/me/preferences"), {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(patch),
        });

        if (!preferences) {
          throw new Error("Preferences update returned empty response");
        }

        return preferences;
      },
    },
    clientState: {
      async get() {
        return getClientState();
      },
      async update(patch) {
        return updateClientState(patch);
      },
    },
  };
}

export function createHealthApi(): HealthApi {
  const baseUrl = import.meta.env.VITE_API_BASE_URL;

  if (baseUrl) {
    return createRemoteHealthApi(baseUrl);
  }

  return createLocalHealthApi();
}
