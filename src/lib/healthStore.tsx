import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type PropsWithChildren,
} from "react";
import type {
  BiomarkerTrendCardItem,
  FamilyProfileItem,
  HealthCategoryItem,
  MonthlyTrendItem,
  RecentRecordItem,
  ReportArchiveItem,
  ReportBiomarkerGroupItem,
} from "@/components/health/sections";
import { createHealthApi } from "@/lib/api/healthApi";
import { createManualPanelValues, getManualBiomarkersForPanel, profileRelationOptions } from "@/lib/healthData";
import { getReportVersionState } from "@/lib/reportVersionState";
import type {
  AuthDraft,
  BiomarkerResult,
  BiomarkerStatus,
  CreateProfileInput,
  CreateManualReportInput,
  CreateUploadedReportInput,
  DeleteReportResult,
  DeleteProfileResult,
  ExamType,
  HealthAppState,
  HealthClientState,
  HealthPreferences,
  HealthSession,
  Profile,
  ProfileDraft,
  ProfileDraftState,
  Report,
  SceneType,
  UpdateBiomarkerResultInput,
  UpdateReportInput,
} from "@/lib/healthDomain";

type Action =
  | { type: "hydrate"; state: HealthAppState }
  | { type: "auth/loginField"; field: keyof AuthDraft; value: string }
  | { type: "auth/registerField"; field: keyof AuthDraft; value: string }
  | { type: "auth/loginSuccess"; currentUserId: string | null }
  | { type: "auth/registerSuccess"; currentUserId: string | null; email: string; password: string }
  | { type: "auth/logoutSuccess" }
  | { type: "profiles/select"; profileId: string }
  | { type: "profiles/createSuccess"; profile: Profile }
  | { type: "profiles/deleteSuccess"; payload: DeleteProfileResult }
  | { type: "profileDraft/startCreate" }
  | { type: "profileDraft/set"; field: keyof ProfileDraft; value: string }
  | { type: "profileDraft/saveSuccess"; profile: Profile }
  | { type: "scan/setExamType"; examType: ExamType }
  | { type: "scan/setProgress"; progress: number }
  | { type: "scan/start" }
  | { type: "reports/createUploadedSuccess"; report: Report }
  | { type: "scan/completeSuccess"; report: Report }
  | { type: "scan/retrySuccess"; report: Report }
  | { type: "reports/updateSuccess"; report: Report }
  | { type: "reports/deleteSuccess"; payload: DeleteReportResult }
  | { type: "reports/save"; reportId: string; savedAt: string }
  | { type: "reports/select"; reportId: string }
  | { type: "reports/resultsLoaded"; reportId: string; results: BiomarkerResult[] }
  | { type: "manual/setMeta"; field: "date" | "examType" | "panel"; value: string }
  | { type: "manual/setValue"; code: string; value: string }
  | { type: "manual/submitSuccess"; report: Report };

function createResult(
  id: string,
  code: string,
  name: string,
  category: string,
  value: number,
  unit: string,
  referenceText: string,
  status: BiomarkerStatus,
): BiomarkerResult {
  return { id, code, name, category, value, unit, referenceText, status };
}

function createEmptyProfileDraft(relation = "Relative"): ProfileDraft {
  return {
    fullName: "",
    relation,
    birthDate: "",
    gender: "",
    note: "",
    avatarUrl: "",
  };
}

function createProfileDraftFromProfile(profile: Profile): ProfileDraft {
  return {
    fullName: profile.name,
    relation: profile.relation,
    birthDate: profile.birthDate,
    gender: profile.gender,
    note: profile.note,
    avatarUrl: profile.avatarUrl ?? "",
  };
}

function createInitialState(): HealthAppState {
  const userId = "user_me";
  const profileMe = "profile_me";
  const profileDad = "profile_dad";
  const profileMom = "profile_mom";

  return {
    auth: {
      currentUserId: userId,
      loginDraft: {
        email: "jane.smith@medical.com",
        password: "password123",
        code: "",
      },
      registerDraft: {
        email: "jane.smith@medical.com",
        password: "password123",
        code: "824019",
      },
    },
    profiles: [
      {
        id: profileMe,
        userId,
        name: "John Doe",
        relation: "Me",
        initials: "ME",
        memberId: "882-0192-H",
        birthDate: "1990-04-18",
        gender: "Male",
        note: "Monitoring liver function and routine metabolic markers.",
        avatarUrl: "",
      },
      {
        id: profileDad,
        userId,
        name: "Dad",
        relation: "Father",
        initials: "DA",
        memberId: "772-2120-A",
        birthDate: "1962-08-11",
        gender: "Male",
        note: "Kidney function and blood pressure follow-up.",
        avatarUrl: "",
      },
      {
        id: profileMom,
        userId,
        name: "Mom",
        relation: "Mother",
        initials: "MO",
        memberId: "662-1198-C",
        birthDate: "1965-01-26",
        gender: "Female",
        note: "Routine preventive screening record.",
        avatarUrl: "",
      },
    ],
    activeProfileId: profileMe,
    profileDraft: {
      fullName: "Jhonathan Doe",
      relation: "Me",
      birthDate: "1990-04-18",
      gender: "Male",
      note: "Note any chronic conditions, recurring symptoms, or recent medical observations...",
      avatarUrl: "",
    },
    profileDraftState: {
      mode: "edit",
      targetProfileId: profileMe,
    },
    reportSavedAt: {},
    reports: [
      {
        id: "report_1",
        profileId: profileMe,
        title: "Full Blood Count",
        date: "2026-03-27T09:30:00.000Z",
        location: "St. Mary's Lab",
        sceneType: "DAILY",
        sourceType: "pdf",
        status: "ready",
        examType: "Routine",
        aiAccuracy: 99.2,
        results: [
          createResult("r1_alt", "ALT", "ALT (Alanine Aminotransferase)", "Liver Function", 45, "U/L", "Ref < 40 U/L", "high"),
          createResult("r1_ast", "AST", "AST (Aspartate Aminotransferase)", "Liver Function", 32, "U/L", "Ref 10 - 35 U/L", "normal"),
          createResult("r1_alp", "ALP", "ALP (Alkaline Phosphatase)", "Liver Function", 88, "U/L", "Ref 44 - 147 U/L", "normal"),
          createResult("r1_cre", "CRE", "Creatinine", "Kidney Function", 1.1, "mg/dL", "Ref 0.7 - 1.3 mg/dL", "normal"),
          createResult("r1_bun", "BUN", "BUN (Blood Urea Nitrogen)", "Kidney Function", 6, "mg/dL", "Ref 7 - 20 mg/dL", "low"),
        ],
      },
      {
        id: "report_2",
        profileId: profileMe,
        title: "Liver Function Test",
        date: "2026-03-21T09:30:00.000Z",
        location: "Central Clinic",
        sceneType: "INPATIENT",
        sourceType: "image",
        status: "ready",
        examType: "Clinical",
        aiAccuracy: 98.7,
        results: [
          createResult("r2_alt", "ALT", "ALT", "Liver Function", 16, "U/L", "Ref 7 - 55 U/L", "normal"),
          createResult("r2_ast", "AST", "AST", "Liver Function", 19, "U/L", "Ref 8 - 48 U/L", "normal"),
          createResult("r2_cre", "CRE", "Creatinine", "Kidney Function", 0.95, "mg/dL", "Ref 0.7 - 1.3 mg/dL", "normal"),
          createResult("r2_bun", "BUN", "BUN", "Kidney Function", 7, "mg/dL", "Ref 7 - 20 mg/dL", "normal"),
          createResult("r2_hba1c", "HBA1C", "HbA1c", "Metabolic", 5.2, "%", "Ref 4.0 - 5.6%", "normal"),
        ],
      },
      {
        id: "report_3",
        profileId: profileMe,
        title: "Cardiology Screening",
        date: "2026-03-15T09:30:00.000Z",
        location: "Dr. Aris",
        sceneType: "DAILY",
        sourceType: "pdf",
        status: "ready",
        examType: "Routine",
        aiAccuracy: 97.4,
        results: [
          createResult("r3_alt", "ALT", "ALT", "Liver Function", 18, "U/L", "Ref 7 - 55 U/L", "normal"),
          createResult("r3_ast", "AST", "AST", "Liver Function", 22, "U/L", "Ref 8 - 48 U/L", "normal"),
          createResult("r3_cre", "CRE", "Creatinine", "Kidney Function", 0.9, "mg/dL", "Ref 0.7 - 1.3 mg/dL", "normal"),
          createResult("r3_bun", "BUN", "BUN", "Kidney Function", 8, "mg/dL", "Ref 7 - 20 mg/dL", "normal"),
          createResult("r3_hba1c", "HBA1C", "HbA1c", "Metabolic", 5.4, "%", "Ref 4.0 - 5.6%", "normal"),
        ],
      },
    ],
    selectedReportId: "report_1",
    scanSession: {
      progress: 65,
      status: "processing",
      examType: "Routine",
    },
    manualEntryDraft: {
      date: "2026-03-27",
      examType: "Routine",
      panel: "Liver Function Panel",
      values: {
        ...createManualPanelValues("Liver Function Panel"),
        ALT: "45",
        AST: "32",
        ALP: "88",
      },
    },
  };
}

function pickPreferences(state: HealthAppState): HealthPreferences {
  return {
    activeProfileId: state.activeProfileId,
    selectedReportId: state.selectedReportId,
  };
}

function pickClientState(state: HealthAppState): HealthClientState {
  return {
    profileDraft: state.profileDraft,
    profileDraftState: state.profileDraftState,
    profileAvatarUrls: Object.fromEntries(
      state.profiles
        .filter((profile) => Boolean(profile.avatarUrl))
        .map((profile) => [profile.id, profile.avatarUrl ?? ""]),
    ),
    reportSavedAt: state.reportSavedAt,
    scanSession: state.scanSession,
    manualEntryDraft: state.manualEntryDraft,
  };
}

function mergeHydratedState(
  initialState: HealthAppState,
  resources: {
    session: HealthSession | null;
    profiles: Profile[] | null;
    reports: Report[] | null;
    preferences: HealthPreferences | null;
    clientState: HealthClientState | null;
  },
): HealthAppState {
  const avatarUrlCache = resources.clientState?.profileAvatarUrls ?? {};
  const profiles = (resources.profiles ?? initialState.profiles).map((profile) => ({
    ...profile,
    avatarUrl: profile.avatarUrl || avatarUrlCache[profile.id] || "",
  }));
  const activeProfileId =
    resources.preferences?.activeProfileId && profiles.some((profile) => profile.id === resources.preferences?.activeProfileId)
      ? resources.preferences.activeProfileId
      : profiles[0]?.id ?? "";
  const reports = resources.reports ?? initialState.reports;
  const selectedReportId =
    resources.preferences?.selectedReportId &&
    reports.some((report) => report.id === resources.preferences?.selectedReportId && report.profileId === activeProfileId)
      ? resources.preferences.selectedReportId
      : getLatestReportId(reports, activeProfileId);
  const currentProfile = profiles.find((profile) => profile.id === activeProfileId) ?? profiles[0];
  const fallbackClientState = pickClientState(initialState);
  const requestedProfileDraftState = resources.clientState?.profileDraftState;
  const profileDraftState: ProfileDraftState =
    requestedProfileDraftState?.mode === "edit" &&
    requestedProfileDraftState.targetProfileId &&
    profiles.some((profile) => profile.id === requestedProfileDraftState.targetProfileId)
      ? requestedProfileDraftState
      : currentProfile
        ? {
            mode: "edit",
            targetProfileId: currentProfile.id,
          }
        : {
            mode: "create",
            targetProfileId: null,
          };
  const draftProfile =
    profileDraftState.mode === "edit" && profileDraftState.targetProfileId
      ? profiles.find((profile) => profile.id === profileDraftState.targetProfileId) ?? currentProfile
      : null;

  return {
    ...initialState,
    auth: {
      ...initialState.auth,
      currentUserId: resources.session ? resources.session.currentUserId : initialState.auth.currentUserId,
    },
    profiles,
    reports,
    activeProfileId,
    selectedReportId,
    profileDraftState,
    profileDraft:
      requestedProfileDraftState?.mode === "create"
        ? resources.clientState?.profileDraft ?? createEmptyProfileDraft()
        : draftProfile
          ? createProfileDraftFromProfile(draftProfile)
          : currentProfile
        ? createProfileDraftFromProfile(currentProfile)
        : createEmptyProfileDraft(),
    reportSavedAt: resources.clientState?.reportSavedAt ?? fallbackClientState.reportSavedAt,
    scanSession: resources.clientState?.scanSession ?? fallbackClientState.scanSession,
    manualEntryDraft: resources.clientState?.manualEntryDraft ?? fallbackClientState.manualEntryDraft,
  };
}

function reducer(state: HealthAppState, action: Action): HealthAppState {
  switch (action.type) {
    case "hydrate":
      return action.state;
    case "auth/loginField":
      return {
        ...state,
        auth: {
          ...state.auth,
          loginDraft: {
            ...state.auth.loginDraft,
            [action.field]: action.value,
          },
        },
      };
    case "auth/registerField":
      return {
        ...state,
        auth: {
          ...state.auth,
          registerDraft: {
            ...state.auth.registerDraft,
            [action.field]: action.value,
          },
        },
      };
    case "auth/loginSuccess":
      return {
        ...state,
        auth: {
          ...state.auth,
          currentUserId: action.currentUserId,
        },
      };
    case "auth/registerSuccess":
      return {
        ...state,
        auth: {
          ...state.auth,
          currentUserId: action.currentUserId,
          loginDraft: {
            ...state.auth.loginDraft,
            email: action.email,
            password: action.password,
          },
        },
      };
    case "auth/logoutSuccess":
      return {
        ...state,
        auth: {
          ...state.auth,
          currentUserId: null,
        },
      };
    case "profiles/select": {
      const profile = state.profiles.find((item) => item.id === action.profileId);

      if (!profile) {
        return state;
      }

      return {
        ...state,
        activeProfileId: profile.id,
        selectedReportId: getLatestReportId(state.reports, profile.id),
        profileDraftState: {
          mode: "edit",
          targetProfileId: profile.id,
        },
        profileDraft: createProfileDraftFromProfile(profile),
      };
    }
    case "profiles/createSuccess":
      return {
        ...state,
        profiles: [...state.profiles, action.profile],
        activeProfileId: action.profile.id,
        selectedReportId: getLatestReportId(state.reports, action.profile.id),
        profileDraftState: {
          mode: "edit",
          targetProfileId: action.profile.id,
        },
        profileDraft: createProfileDraftFromProfile(action.profile),
      };
    case "profiles/deleteSuccess": {
      const profiles = state.profiles.filter((profile) => profile.id !== action.payload.deletedProfileId);
      const nextProfile =
        profiles.find((profile) => profile.id === action.payload.activeProfileId) ?? profiles[0] ?? null;

      return {
        ...state,
        profiles,
        reports: state.reports.filter((report) => report.profileId !== action.payload.deletedProfileId),
        activeProfileId: action.payload.activeProfileId,
        selectedReportId: action.payload.selectedReportId,
        profileDraftState: nextProfile
          ? {
              mode: "edit",
              targetProfileId: nextProfile.id,
            }
          : {
              mode: "create",
              targetProfileId: null,
            },
        profileDraft: nextProfile ? createProfileDraftFromProfile(nextProfile) : createEmptyProfileDraft(),
      };
    }
    case "profileDraft/startCreate": {
      const relation = profileRelationOptions.find((option) => option !== "Me") ?? "Relative";

      return {
        ...state,
        profileDraftState: {
          mode: "create",
          targetProfileId: null,
        },
        profileDraft: createEmptyProfileDraft(relation),
      };
    }
    case "profileDraft/set":
      return {
        ...state,
        profileDraft: {
          ...state.profileDraft,
          [action.field]: action.value,
        },
      };
    case "profileDraft/saveSuccess":
      return {
        ...state,
        profiles: state.profiles.map((profile) =>
          profile.id === action.profile.id ? action.profile : profile,
        ),
        profileDraftState: {
          mode: "edit",
          targetProfileId: action.profile.id,
        },
        profileDraft: createProfileDraftFromProfile(action.profile),
      };
    case "scan/setExamType":
      return {
        ...state,
        scanSession: {
          ...state.scanSession,
          examType: action.examType,
        },
      };
    case "scan/setProgress":
      return {
        ...state,
        scanSession: {
          ...state.scanSession,
          status: action.progress >= 100 ? "ready" : "processing",
          progress: Math.max(0, Math.min(100, Math.round(action.progress))),
        },
      };
    case "scan/start":
      return {
        ...state,
        scanSession: {
          ...state.scanSession,
          status: "processing",
          progress: 12,
        },
      };
    case "reports/createUploadedSuccess":
      return {
        ...state,
        reports: [action.report, ...state.reports.filter((report) => report.id !== action.report.id)],
        selectedReportId: action.report.id,
        scanSession: {
          ...state.scanSession,
          status: "processing",
          progress: 12,
        },
      };
    case "scan/completeSuccess":
      return {
        ...state,
        reports: state.reports.map((report) => (report.id === action.report.id ? action.report : report)),
        scanSession: {
          ...state.scanSession,
          status: action.report.status === "failed" ? "failed" : "ready",
          progress: action.report.status === "failed" ? Math.max(state.scanSession.progress, 92) : 100,
        },
        selectedReportId: action.report.id,
      };
    case "scan/retrySuccess":
      return {
        ...state,
        reports: state.reports.map((report) => (report.id === action.report.id ? action.report : report)),
        selectedReportId: action.report.id,
        scanSession: {
          ...state.scanSession,
          status: "processing",
          progress: 12,
        },
      };
    case "reports/updateSuccess":
      return {
        ...state,
        reports: state.reports.map((report) => (report.id === action.report.id ? action.report : report)),
      };
    case "reports/deleteSuccess":
      const nextReportSavedAt = { ...state.reportSavedAt };
      delete nextReportSavedAt[action.payload.deletedReportId];

      return {
        ...state,
        reports: state.reports.filter((report) => report.id !== action.payload.deletedReportId),
        selectedReportId: action.payload.selectedReportId,
        reportSavedAt: nextReportSavedAt,
      };
    case "reports/save":
      return {
        ...state,
        reportSavedAt: {
          ...state.reportSavedAt,
          [action.reportId]: action.savedAt,
        },
      };
    case "reports/select":
      return {
        ...state,
        selectedReportId: action.reportId,
      };
    case "reports/resultsLoaded":
      return {
        ...state,
        reports: state.reports.map((report) =>
          report.id === action.reportId
            ? {
                ...report,
                results: action.results,
              }
            : report,
        ),
      };
    case "manual/setMeta":
      if (action.field === "examType") {
        return {
          ...state,
          manualEntryDraft: {
            ...state.manualEntryDraft,
            examType: action.value as ExamType,
          },
        };
      }

      if (action.field === "panel") {
        return {
          ...state,
          manualEntryDraft: {
            ...state.manualEntryDraft,
            panel: action.value,
            values: createManualPanelValues(action.value),
          },
        };
      }

      return {
        ...state,
        manualEntryDraft: {
          ...state.manualEntryDraft,
          [action.field]: action.value,
        },
      };
    case "manual/setValue":
      return {
        ...state,
        manualEntryDraft: {
          ...state.manualEntryDraft,
          values: {
            ...state.manualEntryDraft.values,
            [action.code]: action.value,
          },
        },
      };
    case "manual/submitSuccess":
      return {
        ...state,
        reports: [action.report, ...state.reports.filter((report) => report.id !== action.report.id)],
        selectedReportId: action.report.id,
      };
    default:
      return state;
  }
}

function getLatestReportId(reports: Report[], profileId: string) {
  return [...reports]
    .filter((report) => report.profileId === profileId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.id ?? null;
}

function createInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function createProfileUpdate(state: HealthAppState) {
  const profileId = state.profileDraftState.targetProfileId;
  const profile = profileId ? state.profiles.find((item) => item.id === profileId) : null;

  if (!profile) {
    return null;
  }

  const name = state.profileDraft.fullName || profile.name;

  return {
    profileId: profile.id,
    patch: {
      name,
      relation: state.profileDraft.relation,
      birthDate: state.profileDraft.birthDate,
      gender: state.profileDraft.gender,
      note: state.profileDraft.note,
      avatarUrl: state.profileDraft.avatarUrl || "",
      initials: createInitials(name),
    },
  };
}

function createProfileFromDraft(state: HealthAppState): CreateProfileInput {
  const relation =
    state.profileDraft.relation && state.profileDraft.relation.trim() !== ""
      ? state.profileDraft.relation
      : "Relative";

  return {
    name: state.profileDraft.fullName.trim() || `${relation} Member`,
    relation,
    birthDate: state.profileDraft.birthDate,
    gender: state.profileDraft.gender,
    note: state.profileDraft.note,
    avatarUrl: state.profileDraft.avatarUrl || undefined,
  };
}

function createManualReportInput(state: HealthAppState): CreateManualReportInput {
  const panelBiomarkers = getManualBiomarkersForPanel(state.manualEntryDraft.panel);
  const biomarkerMap = new Map<string, (typeof panelBiomarkers)[number]>(
    panelBiomarkers.map((item) => [item.code, item]),
  );
  const results = Object.entries(state.manualEntryDraft.values)
    .filter(([, value]) => value.trim() !== "")
    .map(([code, rawValue], index) => {
      const numericValue = Number(rawValue);
      const biomarker = biomarkerMap.get(code);
      const isKidneyMetric = code === "CRE" || code === "BUN" || code === "UA" || code === "EGFR";
      const isMetabolicMetric = code === "GLU" || code === "HBA1C" || code === "CHOL" || code === "TRIG";
      const unit = biomarker?.unit ?? "U/L";
      const category = isKidneyMetric ? "Kidney Function" : isMetabolicMetric ? "Metabolic" : "Liver Function";
      const referenceText =
        code === "TBIL"
          ? "Ref 0.1 - 1.2 mg/dL"
          : code === "CRE"
            ? "Ref 0.7 - 1.3 mg/dL"
            : code === "BUN"
              ? "Ref 7 - 20 mg/dL"
              : code === "UA"
                ? "Ref 3.5 - 7.2 mg/dL"
                : code === "EGFR"
                  ? "Ref > 90 mL/min/1.73m2"
                  : code === "GLU"
                    ? "Ref 70 - 99 mg/dL"
                    : code === "HBA1C"
                      ? "Ref 4.0 - 5.6%"
                      : code === "CHOL"
                        ? "Ref < 200 mg/dL"
                        : code === "TRIG"
                          ? "Ref < 150 mg/dL"
                          : "Ref 7 - 55 U/L";

      return createResult(
        `manual_${code}_${index}`,
        code,
        biomarker?.name ?? code,
        category,
        numericValue,
        unit,
        referenceText,
        numericValue > 40 ? "high" : "normal",
      );
    });

  return {
    profileId: state.activeProfileId,
    title: state.manualEntryDraft.panel,
    date: state.manualEntryDraft.date,
    examType: state.manualEntryDraft.examType,
    results,
  };
}

function createUploadedReportInput(
  state: HealthAppState,
  input: Pick<CreateUploadedReportInput, "batchId" | "fileName" | "sourceType" | "fileDataUrl" | "mimeType" | "sizeBytes">,
): CreateUploadedReportInput {
  return {
    profileId: state.activeProfileId,
    batchId: input.batchId,
    fileName: input.fileName,
    examType: state.scanSession.examType,
    sourceType: input.sourceType,
    fileDataUrl: input.fileDataUrl,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
  };
}

function formatDateLabel(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

function formatDateTimeLabel(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function formatCompactDateLabel(date: string) {
  const value = new Date(date)
  const year = value.getFullYear()
  const month = `${value.getMonth() + 1}`.padStart(2, "0")
  const day = `${value.getDate()}`.padStart(2, "0")
  return `${year}.${month}.${day}`
}

function formatAssetSize(sizeBytes?: number) {
  if (!sizeBytes || sizeBytes <= 0) {
    return "";
  }

  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
}

function statusToTone(status: BiomarkerStatus): "danger" | "accent" | "success" {
  if (status === "high") return "danger";
  if (status === "low") return "accent";
  return "success";
}

function statusToText(status: BiomarkerStatus) {
  if (status === "high") return "HIGH";
  if (status === "low") return "LOW";
  return "NORMAL";
}

function sceneToTag(sceneType: SceneType) {
  return sceneType;
}

function deriveStoreData(state: HealthAppState) {
  const fallbackProfile: Profile = {
    id: "",
    userId: state.auth.currentUserId ?? "",
    name: "Guest",
    relation: "Me",
    initials: "GU",
    memberId: "N/A",
    birthDate: "",
    gender: "",
    note: "",
    avatarUrl: "",
  };
  const currentProfile =
    state.profiles.find((profile) => profile.id === state.activeProfileId) ?? state.profiles[0] ?? fallbackProfile;

  const profileReports = [...state.reports]
    .filter((report) => report.profileId === currentProfile.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const savedProfileReports = profileReports.filter((report) => report.isSaved !== false);

  const selectedReport =
    profileReports.find((report) => report.id === state.selectedReportId) ?? profileReports[0] ?? null;
  const selectedReportBatchReports = selectedReport?.batchId
    ? profileReports
        .filter((report) => report.batchId === selectedReport.batchId)
        .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime())
    : selectedReport
      ? [selectedReport]
      : [];

  const familyProfileItems: FamilyProfileItem[] = state.profiles.map((profile) => ({
    id: profile.id,
    name: profile.relation === "Me" ? "Me" : profile.name,
    initials: profile.initials,
    accent: profile.id === state.activeProfileId,
  }));

  const recentRecordItems: RecentRecordItem[] = savedProfileReports.slice(0, 3).map((report) => {
    const versionState = getReportVersionState(report);

    return {
      id: report.id,
      title: report.title,
      date: formatDateLabel(report.date),
      location: report.location,
      tag: sceneToTag(report.sceneType),
      status: report.status === "ready" ? "READY" : report.status === "failed" ? "FAILED" : "PROCESSING",
      tone:
        report.status === "failed"
          ? "danger"
          : report.sourceType === "manual"
            ? "accent"
            : report.sceneType === "INPATIENT"
              ? "accent"
              : "success",
      versionLabel: versionState.label,
      versionTone: versionState.tone,
    };
  });

  const reportArchiveItems: ReportArchiveItem[] = savedProfileReports.map((report) => {
    const versionState = getReportVersionState(report);

    return {
      id: report.id,
      rawDate: report.date,
      title: report.title,
      date: formatDateLabel(report.date),
      location: report.location,
      examType: report.examType,
      sourceType: report.sourceType,
      status: report.status === "ready" ? "READY" : report.status === "failed" ? "FAILED" : "PROCESSING",
      aiAccuracy: `${report.aiAccuracy.toFixed(1)}%`,
      savedAt: state.reportSavedAt[report.id],
      isFavorite: report.isFavorite ?? false,
      sourceFileName: report.sourceFile?.fileName,
      hasSourceFile: Boolean(report.sourceFile?.url),
      sourceFileMeta:
        report.sourceFile
          ? [report.sourceFile.mimeType === "application/pdf" ? "PDF" : "IMAGE", formatAssetSize(report.sourceFile.sizeBytes)]
              .filter(Boolean)
              .join(" • ")
          : undefined,
      versionLabel: versionState.label,
      versionTone: versionState.tone,
      versionDetail: versionState.detail,
      tone:
        report.status === "failed"
          ? "danger"
          : report.status === "processing"
          ? "warning"
          : report.sourceType === "manual" || report.sceneType === "INPATIENT"
            ? "accent"
            : "success",
    };
  });

  const categoryMap = new Map<
    string,
    Array<{
      result: BiomarkerResult;
      reportDate: string;
    }>
  >();
  const latestCategoryResultMap = new Map<
    string,
    Map<
      string,
      {
        result: BiomarkerResult;
        reportDate: string;
      }
    >
  >();
  savedProfileReports.forEach((report) => {
    report.results.forEach((result) => {
      const categoryResults =
        latestCategoryResultMap.get(result.category) ??
        new Map<
          string,
          {
            result: BiomarkerResult;
            reportDate: string;
          }
        >();

      if (!categoryResults.has(result.code)) {
        categoryResults.set(result.code, {
          result,
          reportDate: report.date,
        });
      }

      latestCategoryResultMap.set(result.category, categoryResults);
    });
  });

  latestCategoryResultMap.forEach((resultsByCode, category) => {
    categoryMap.set(category, [...resultsByCode.values()]);
  });

  const healthCategoryItems: HealthCategoryItem[] = Array.from(categoryMap.entries()).map(([category, results]) => {
    const latest = results[0]?.result;

    return {
      title: category,
      subtitle: `${results.length} biomarker${results.length > 1 ? "s" : ""}`,
      tone: latest ? statusToTone(latest.status) : "success",
      trendTo: "/biomarker-trends",
      rows: results.map(({ result, reportDate }) => ({
        id: `${category}:${result.code}`,
        label: result.code,
        value: `${result.value}`,
        unit: result.unit || "—",
        reference: result.referenceText || "—",
        observedDate: formatCompactDateLabel(reportDate),
        state: result.status === "normal" ? "NORMAL" : result.status === "high" ? "HIGH" : "LOW",
        tone: statusToTone(result.status),
      })),
    };
  });

  const monthlyTrendItems: MonthlyTrendItem[] = [
    {
      label: "Inflammation Index",
      status: savedProfileReports.some((report) => report.sceneType === "INPATIENT") ? "Elevated" : "Low",
      tone: savedProfileReports.some((report) => report.sceneType === "INPATIENT") ? "warning" : "success",
    },
    {
      label: "Cardiovascular Load",
      status: "Optimal",
      tone: "accent",
    },
    {
      label: "Hydration",
      status: savedProfileReports[0]?.results.some((result) => result.code === "BUN" && result.status === "low")
        ? "Watch"
        : "Stable",
      tone: savedProfileReports[0]?.results.some((result) => result.code === "BUN" && result.status === "low")
        ? "warning"
        : "accent",
    },
  ];

  const biomarkerMap = new Map<string, BiomarkerResult[]>();
  [...savedProfileReports].reverse().forEach((report) => {
    report.results.forEach((result) => {
      const values = biomarkerMap.get(result.code) ?? [];
      values.push(result);
      biomarkerMap.set(result.code, values);
    });
  });

  const biomarkerTrendItems: BiomarkerTrendCardItem[] = Array.from(biomarkerMap.entries())
    .slice(0, 5)
    .map(([code, results]) => {
      const latest = results[results.length - 1];

      return {
        label: code,
        range: latest.referenceText,
        state: latest.status === "normal" ? "NORMAL" : latest.status === "high" ? "ELEVATED" : "LOW",
        tone: statusToTone(latest.status),
        values: results.map((result) => result.value),
      };
    });

  const reportBiomarkerGroups: ReportBiomarkerGroupItem[] = selectedReport
    ? Array.from(
        selectedReportBatchReports.reduce((dateMap, report) => {
          const dateKey = selectedReportBatchReports.length > 1 ? formatDateTimeLabel(report.date) : "";
          const categoryMap = dateMap.get(dateKey) ?? new Map<string, Array<{ report: Report; result: BiomarkerResult }>>();

          report.results.forEach((result) => {
            const list = categoryMap.get(result.category) ?? [];
            list.push({ report, result });
            categoryMap.set(result.category, list);
          });

          dateMap.set(dateKey, categoryMap);
          return dateMap;
        }, new Map<string, Map<string, Array<{ report: Report; result: BiomarkerResult }>>>()),
      ).flatMap(([dateKey, categoryMap]) =>
        Array.from(categoryMap.entries()).map(([category, items], index) => ({
          id: `${dateKey || "single"}:${category}`,
          groupLabel: dateKey && index === 0 ? dateKey : undefined,
          section: category,
          count: `${items.length} biomarkers`,
          rows: items.map(({ report, result }) => ({
            id: `${report.id}:${result.id}`,
            reportId: report.id,
            resultId: result.id,
            code: result.code,
            name: result.name,
            category: result.category,
            numericValue: result.value,
            unit: result.unit,
            referenceText: result.referenceText,
            status: result.status,
            ref: result.referenceText,
            value: `${result.value} ${result.unit}`.trim(),
            tone: statusToTone(result.status),
            tag: statusToText(result.status),
          })),
        })),
      )
    : [];

  return {
    currentProfile,
    familyProfileItems,
    recentRecordItems,
    reportArchiveItems,
    healthCategoryItems,
    biomarkerTrendItems,
    reportBiomarkerGroups,
    monthlyTrendItems,
    selectedReport,
    selectedReportBatchReports,
  };
}

type HealthStoreValue = {
  state: HealthAppState;
  derived: ReturnType<typeof deriveStoreData>;
  sync: {
    hydrated: boolean;
    mode: "local" | "remote";
    error: string | null;
  };
  actions: {
    setLoginField: (field: keyof AuthDraft, value: string) => void;
    setRegisterField: (field: keyof AuthDraft, value: string) => void;
    login: () => Promise<boolean>;
    register: () => Promise<boolean>;
    sendRegisterCode: () => string;
    logout: () => void;
    selectProfile: (profileId: string) => void;
    beginCreateProfile: () => void;
    deleteProfile: (profileId: string) => Promise<boolean>;
    deleteActiveProfile: () => Promise<boolean>;
    setProfileDraftField: (field: keyof ProfileDraft, value: string) => void;
    saveProfile: () => Promise<boolean>;
    saveSelectedReport: () => Promise<boolean>;
    discardSelectedUnsavedReportBatch: () => Promise<boolean>;
    updateReportResult: (reportId: string, resultId: string, patch: UpdateBiomarkerResultInput) => Promise<boolean>;
    updateSelectedReportResult: (resultId: string, patch: UpdateBiomarkerResultInput) => Promise<boolean>;
    updateReport: (reportId: string, patch: UpdateReportInput) => Promise<boolean>;
    updateSelectedReport: (patch: UpdateReportInput) => Promise<boolean>;
    setReportFavorite: (reportId: string, isFavorite: boolean) => Promise<boolean>;
    setSelectedReportFavorite: (isFavorite: boolean) => Promise<boolean>;
    deleteReport: (reportId: string) => Promise<boolean>;
    deleteSelectedReport: () => Promise<boolean>;
    setScanExamType: (examType: ExamType) => void;
    setScanProgress: (progress: number) => void;
    startScan: () => void;
    createUploadedReport: (input: Pick<CreateUploadedReportInput, "batchId" | "fileName" | "sourceType" | "fileDataUrl" | "mimeType" | "sizeBytes">) => Promise<boolean>;
    uploadReportFile: (reportId: string, input: { fileName: string; fileDataUrl: string; mimeType?: string; sizeBytes?: number }) => Promise<boolean>;
    replaceReportSource: (
      reportId: string,
      input: { fileName: string; fileDataUrl: string; sourceType: "image" | "pdf"; mimeType?: string; sizeBytes?: number },
    ) => Promise<boolean>;
    deleteReportFile: (reportId: string) => Promise<boolean>;
    retryReport: (reportId: string) => Promise<boolean>;
    completeScan: () => Promise<Report | null>;
    retrySelectedScan: () => Promise<boolean>;
    selectReport: (reportId: string) => void;
    refreshReport: (reportId: string) => Promise<Report | null>;
    refreshSelectedReport: () => Promise<Report | null>;
    loadReportResults: (reportId: string) => Promise<boolean>;
    setManualMeta: (field: "date" | "examType" | "panel", value: string) => void;
    setManualValue: (code: string, value: string) => void;
    submitManualEntry: () => Promise<boolean>;
  };
};

const HealthStoreContext = createContext<HealthStoreValue | null>(null);

export function HealthStoreProvider({ children }: PropsWithChildren) {
  const api = useMemo(() => createHealthApi(), []);
  const initialState = useMemo(() => createInitialState(), []);
  const [state, dispatch] = useReducer(reducer, initialState);
  const [hydrated, setHydrated] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const hydrateFromApi = async () => {
    const { session, profiles, reports, preferences, clientState } = await api.bootstrap();

    dispatch({
      type: "hydrate",
      state: mergeHydratedState(initialState, {
        session,
        profiles,
        reports,
        preferences,
        clientState,
      }),
    });
    setHydrated(true);
    setSyncError(null);
  };

  useEffect(() => {
    let cancelled = false;

    hydrateFromApi()
      .then(() => {
        if (cancelled) {
          return;
        }
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        setHydrated(true);
        setSyncError(error instanceof Error ? error.message : "Failed to load state");
      });

    return () => {
      cancelled = true;
    };
  }, [api, initialState]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    api.preferences.update(pickPreferences(state)).catch((error: unknown) => {
      setSyncError(error instanceof Error ? error.message : "Failed to save user preferences");
    });
  }, [
    api,
    hydrated,
    state.activeProfileId,
    state.selectedReportId,
  ]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    api.clientState.update(pickClientState(state)).catch((error: unknown) => {
      setSyncError(error instanceof Error ? error.message : "Failed to save local draft state");
    });
  }, [
    api,
    hydrated,
    state.profileDraft,
    state.profileDraftState,
    state.scanSession,
    state.manualEntryDraft,
  ]);

  const value = useMemo<HealthStoreValue>(() => {
    const derived = deriveStoreData(state);
    const deleteProfile = async (profileId: string) => {
      if (!profileId) {
        return false;
      }

      try {
        const payload = await api.profiles.delete(profileId);
        dispatch({ type: "profiles/deleteSuccess", payload });
        setSyncError(null);
        return true;
      } catch (error: unknown) {
        setSyncError(error instanceof Error ? error.message : "Failed to delete profile");
        return false;
      }
    };
    const updateReport = async (reportId: string, patch: UpdateReportInput) => {
      if (!reportId) {
        return false;
      }

      try {
        const report = await api.reports.update(reportId, patch);
        dispatch({ type: "reports/updateSuccess", report });
        setSyncError(null);
        return true;
      } catch (error: unknown) {
        setSyncError(error instanceof Error ? error.message : "Failed to update report");
        return false;
      }
    };
    const updateReportResult = async (reportId: string, resultId: string, patch: UpdateBiomarkerResultInput) => {
      if (!reportId || !resultId) {
        return false;
      }

      try {
        const report = await api.reports.updateResult(reportId, resultId, patch);
        dispatch({ type: "reports/updateSuccess", report });
        setSyncError(null);
        return true;
      } catch (error: unknown) {
        setSyncError(error instanceof Error ? error.message : "Failed to update report result");
        return false;
      }
    };
    const setReportFavorite = async (reportId: string, isFavorite: boolean) => {
      if (!reportId) {
        return false;
      }

      try {
        const report = await api.reports.setFavorite(reportId, isFavorite);
        dispatch({ type: "reports/updateSuccess", report });
        setSyncError(null);
        return true;
      } catch (error: unknown) {
        setSyncError(error instanceof Error ? error.message : "Failed to update report favorite");
        return false;
      }
    };
    const deleteReport = async (reportId: string) => {
      if (!reportId) {
        return false;
      }

      try {
        const payload = await api.reports.delete(reportId);
        dispatch({ type: "reports/deleteSuccess", payload });
        setSyncError(null);
        return true;
      } catch (error: unknown) {
        setSyncError(error instanceof Error ? error.message : "Failed to delete report");
        return false;
      }
    };
    const retryReport = async (reportId: string) => {
      if (!reportId) {
        return false;
      }

      try {
        const report = await api.reports.retryScan(reportId);
        if (reportId === state.selectedReportId) {
          dispatch({ type: "scan/retrySuccess", report });
        } else {
          dispatch({ type: "reports/updateSuccess", report });
        }
        setSyncError(null);
        return true;
      } catch (error: unknown) {
        setSyncError(error instanceof Error ? error.message : "Failed to retry scan");
        return false;
      }
    };
    const refreshReport = async (reportId: string) => {
      if (!reportId) {
        return null;
      }

      try {
        const report = await api.reports.get(reportId);

        if (!report) {
          setSyncError(null);
          return null;
        }

        if (report.status === "ready" || report.status === "failed") {
          dispatch({ type: "scan/completeSuccess", report });
        } else {
          dispatch({ type: "reports/updateSuccess", report });
        }

        setSyncError(null);
        return report;
      } catch (error: unknown) {
        setSyncError(error instanceof Error ? error.message : "Failed to refresh report");
        return null;
      }
    };
    const uploadReportFile = async (
      reportId: string,
      input: { fileName: string; fileDataUrl: string; mimeType?: string; sizeBytes?: number },
    ) => {
      if (!reportId) {
        return false;
      }

      try {
        const report = await api.reports.uploadFile(reportId, {
          fileName: input.fileName,
          dataUrl: input.fileDataUrl,
          mimeType: input.mimeType,
          sizeBytes: input.sizeBytes,
        });
        dispatch({ type: "reports/updateSuccess", report });
        setSyncError(null);
        return true;
      } catch (error: unknown) {
        setSyncError(error instanceof Error ? error.message : "Failed to upload report file");
        return false;
      }
    };
    const replaceReportSource = async (
      reportId: string,
      input: { fileName: string; fileDataUrl: string; sourceType: "image" | "pdf"; mimeType?: string; sizeBytes?: number },
    ) => {
      if (!reportId) {
        return false;
      }

      const existingReport = state.reports.find((report) => report.id === reportId);

      if (!existingReport) {
        setSyncError(`Report ${reportId} not found`);
        return false;
      }

      try {
        await api.reports.uploadFile(reportId, {
          fileName: input.fileName,
          dataUrl: input.fileDataUrl,
          mimeType: input.mimeType,
          sizeBytes: input.sizeBytes,
        });
        const report = await api.reports.attachSource(reportId, {
          fileName: input.fileName,
          examType: existingReport.examType,
          sourceType: input.sourceType,
          fileDataUrl: input.fileDataUrl,
          mimeType: input.mimeType,
          sizeBytes: input.sizeBytes,
        });
        dispatch({ type: "reports/createUploadedSuccess", report });
        setSyncError(null);
        return true;
      } catch (error: unknown) {
        setSyncError(error instanceof Error ? error.message : "Failed to replace report source");
        return false;
      }
    };
    const deleteReportFile = async (reportId: string) => {
      if (!reportId) {
        return false;
      }

      try {
        const report = await api.reports.deleteFile(reportId);
        dispatch({ type: "reports/updateSuccess", report });
        setSyncError(null);
        return true;
      } catch (error: unknown) {
        setSyncError(error instanceof Error ? error.message : "Failed to delete report file");
        return false;
      }
    };

    return {
      state,
      derived,
      sync: {
        hydrated,
        mode: api.mode,
        error: syncError,
      },
      actions: {
        setLoginField: (field, value) => dispatch({ type: "auth/loginField", field, value }),
        setRegisterField: (field, value) => dispatch({ type: "auth/registerField", field, value }),
        login: async () => {
          try {
            const session = await api.auth.login({
              email: state.auth.loginDraft.email,
              password: state.auth.loginDraft.password,
            });
            dispatch({ type: "auth/loginSuccess", currentUserId: session.currentUserId });
            await hydrateFromApi();
            setSyncError(null);
            return true;
          } catch (error: unknown) {
            setSyncError(error instanceof Error ? error.message : "Failed to login");
            return false;
          }
        },
        register: async () => {
          try {
            const session = await api.auth.register(state.auth.registerDraft);
            dispatch({
              type: "auth/registerSuccess",
              currentUserId: session.currentUserId,
              email: state.auth.registerDraft.email,
              password: state.auth.registerDraft.password,
            });
            await hydrateFromApi();
            setSyncError(null);
            return true;
          } catch (error: unknown) {
            setSyncError(error instanceof Error ? error.message : "Failed to register");
            return false;
          }
        },
        sendRegisterCode: () => {
          const code = `${Math.floor(100000 + Math.random() * 900000)}`;
          dispatch({ type: "auth/registerField", field: "code", value: code });
          setSyncError(null);
          return code;
        },
        logout: () => {
          void api.auth
            .logout()
            .then(() => {
              dispatch({ type: "auth/logoutSuccess" });
              return hydrateFromApi();
            })
            .then(() => {
              setSyncError(null);
            })
            .catch((error: unknown) => {
              setSyncError(error instanceof Error ? error.message : "Failed to logout");
            });
        },
        selectProfile: (profileId) => dispatch({ type: "profiles/select", profileId }),
        beginCreateProfile: () => dispatch({ type: "profileDraft/startCreate" }),
        deleteProfile,
        deleteActiveProfile: async () => {
          return deleteProfile(state.activeProfileId);
        },
        setProfileDraftField: (field, value) => dispatch({ type: "profileDraft/set", field, value }),
        saveProfile: async () => {
          if (state.profileDraftState.mode === "create") {
            try {
              const profile = await api.profiles.create(createProfileFromDraft(state));
              dispatch({ type: "profiles/createSuccess", profile });
              await api.clientState.update({
                profileAvatarUrls: {
                  ...pickClientState(state).profileAvatarUrls,
                  ...(profile.avatarUrl ? { [profile.id]: profile.avatarUrl } : {}),
                },
              });
              await hydrateFromApi();
              setSyncError(null);
              return true;
            } catch (error: unknown) {
              setSyncError(error instanceof Error ? error.message : "Failed to create profile");
              return false;
            }
          }

          const update = createProfileUpdate(state);

          if (!update) {
            return false;
          }

          try {
            const profile = await api.profiles.update(update.profileId, update.patch);
            dispatch({ type: "profileDraft/saveSuccess", profile });
            await api.clientState.update({
              profileAvatarUrls: {
                ...pickClientState(state).profileAvatarUrls,
                ...(profile.avatarUrl ? { [profile.id]: profile.avatarUrl } : {}),
              },
            });
            await hydrateFromApi();
            setSyncError(null);
            return true;
          } catch (error: unknown) {
            setSyncError(error instanceof Error ? error.message : "Failed to save profile");
            return false;
          }
        },
        saveSelectedReport: async () => {
          if (!state.selectedReportId) {
            setSyncError("No report is selected.");
            return false;
          }

          const savedAt = new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "2-digit",
            year: "numeric",
          }).format(new Date());
          const selectedReport = state.reports.find((report) => report.id === state.selectedReportId);
          const targetReports =
            selectedReport?.batchId
              ? state.reports.filter((report) => report.batchId === selectedReport.batchId)
              : selectedReport
                ? [selectedReport]
                : [];

          if (targetReports.length === 0) {
            setSyncError("No report is selected.");
            return false;
          }

          try {
            const updatedReports = await Promise.all(
              targetReports.map((report) => api.reports.update(report.id, { isSaved: true })),
            );

            updatedReports.forEach((report) => {
              dispatch({ type: "reports/updateSuccess", report });
              dispatch({ type: "reports/save", reportId: report.id, savedAt });
            });

            await api.clientState.update({
              reportSavedAt: {
                ...pickClientState(state).reportSavedAt,
                ...Object.fromEntries(targetReports.map((report) => [report.id, savedAt])),
              },
            });
            setSyncError(null);
            return true;
          } catch (error: unknown) {
            setSyncError(error instanceof Error ? error.message : "Failed to save report state");
            return false;
          }
        },
        discardSelectedUnsavedReportBatch: async () => {
          if (!state.selectedReportId) {
            setSyncError("No report is selected.");
            return false;
          }

          const selectedReport = state.reports.find((report) => report.id === state.selectedReportId);

          if (!selectedReport) {
            setSyncError("No report is selected.");
            return false;
          }

          const targetReports = selectedReport.batchId
            ? state.reports.filter((report) => report.batchId === selectedReport.batchId && report.isSaved === false)
            : selectedReport.isSaved === false
              ? [selectedReport]
              : [];

          if (targetReports.length === 0) {
            setSyncError("Current report has already been saved.");
            return false;
          }

          try {
            for (const report of targetReports) {
              const payload = await api.reports.delete(report.id);
              dispatch({ type: "reports/deleteSuccess", payload });
            }

            const nextReportSavedAt = { ...pickClientState(state).reportSavedAt };
            targetReports.forEach((report) => {
              delete nextReportSavedAt[report.id];
            });

            await api.clientState.update({
              reportSavedAt: nextReportSavedAt,
            });
            setSyncError(null);
            return true;
          } catch (error: unknown) {
            setSyncError(error instanceof Error ? error.message : "Failed to discard report draft");
            return false;
          }
        },
        updateReportResult,
        updateSelectedReportResult: async (resultId, patch) => {
          if (!state.selectedReportId) {
            setSyncError("No report is selected.");
            return false;
          }

          return updateReportResult(state.selectedReportId, resultId, patch);
        },
        updateReport,
        updateSelectedReport: async (patch) => {
          if (!state.selectedReportId) {
            setSyncError("No report is selected.");
            return false;
          }

          return updateReport(state.selectedReportId, patch);
        },
        setReportFavorite,
        setSelectedReportFavorite: async (isFavorite) => {
          if (!state.selectedReportId) {
            setSyncError("No report is selected.");
            return false;
          }

          return setReportFavorite(state.selectedReportId, isFavorite);
        },
        deleteReport,
        deleteSelectedReport: async () => {
          if (!state.selectedReportId) {
            setSyncError("No report is selected.");
            return false;
          }

          return deleteReport(state.selectedReportId);
        },
        setScanExamType: (examType) => dispatch({ type: "scan/setExamType", examType }),
        setScanProgress: (progress) => dispatch({ type: "scan/setProgress", progress }),
        startScan: () => dispatch({ type: "scan/start" }),
        createUploadedReport: async (input) => {
          try {
            const report = await api.reports.createUploaded(createUploadedReportInput(state, input));
            dispatch({ type: "reports/createUploadedSuccess", report });
            setSyncError(null);
            return true;
          } catch (error: unknown) {
            setSyncError(error instanceof Error ? error.message : "Failed to create uploaded report");
            return false;
          }
        },
        uploadReportFile,
        replaceReportSource,
        deleteReportFile,
        completeScan: async () => {
          if (!state.selectedReportId) {
            setSyncError("No report is selected.");
            return null;
          }

          try {
            const report = await api.reports.startScan(state.selectedReportId);
            dispatch({ type: "scan/completeSuccess", report });
            setSyncError(null);
            return report;
          } catch (error: unknown) {
            setSyncError(error instanceof Error ? error.message : "Failed to complete scan");
            return null;
          }
        },
        retryReport,
        retrySelectedScan: async () => {
          if (!state.selectedReportId) {
            setSyncError("No report is selected.");
            return false;
          }

          return retryReport(state.selectedReportId);
        },
        selectReport: (reportId) => dispatch({ type: "reports/select", reportId }),
        refreshReport,
        refreshSelectedReport: async () => {
          if (!state.selectedReportId) {
            setSyncError("No report is selected.");
            return null;
          }

          return refreshReport(state.selectedReportId);
        },
        loadReportResults: async (reportId) => {
          try {
            const results = await api.reports.getResults(reportId);
            dispatch({ type: "reports/resultsLoaded", reportId, results });
            setSyncError(null);
            return true;
          } catch (error: unknown) {
            setSyncError(error instanceof Error ? error.message : "Failed to load report results");
            return false;
          }
        },
        setManualMeta: (field, value) => dispatch({ type: "manual/setMeta", field, value }),
        setManualValue: (code, value) => dispatch({ type: "manual/setValue", code, value }),
        submitManualEntry: async () => {
          const hasDate = state.manualEntryDraft.date.trim() !== "";
          const hasAnyValue = Object.values(state.manualEntryDraft.values).some((value) => value.trim() !== "");

          if (!hasDate) {
            setSyncError("Please select the laboratory test date.");
            return false;
          }

          if (!hasAnyValue) {
            setSyncError("Enter at least one biomarker value before submitting.");
            return false;
          }

          try {
            const report = await api.reports.createManual(createManualReportInput(state));
            dispatch({ type: "manual/submitSuccess", report });
            setSyncError(null);
            return true;
          } catch (error: unknown) {
            setSyncError(error instanceof Error ? error.message : "Failed to submit manual report");
            return false;
          }
        },
      },
    };
  }, [api, hydrated, state, syncError]);

  return <HealthStoreContext.Provider value={value}>{children}</HealthStoreContext.Provider>;
}

export function useHealthStore() {
  const context = useContext(HealthStoreContext);

  if (!context) {
    throw new Error("useHealthStore must be used within HealthStoreProvider");
  }

  return context;
}
