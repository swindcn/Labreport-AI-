import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type PropsWithChildren,
} from "react";
import type {
  BiomarkerTrendCardItem,
  FamilyProfileItem,
  HealthCategoryItem,
  MonthlyTrendItem,
  RecentRecordItem,
  ReportBiomarkerGroupItem,
} from "@/components/health/sections";

type ExamType = "Routine" | "Clinical";
type SceneType = "DAILY" | "INPATIENT" | "ROUTINE";
type SourceType = "image" | "pdf" | "manual";
type ReportStatus = "processing" | "ready";
type BiomarkerStatus = "normal" | "high" | "low";

export type Profile = {
  id: string;
  userId: string;
  name: string;
  relation: string;
  initials: string;
  memberId: string;
  birthDate: string;
  gender: string;
  note: string;
};

export type BiomarkerResult = {
  id: string;
  code: string;
  name: string;
  category: string;
  value: number;
  unit: string;
  referenceText: string;
  status: BiomarkerStatus;
};

export type Report = {
  id: string;
  profileId: string;
  title: string;
  date: string;
  location: string;
  sceneType: SceneType;
  sourceType: SourceType;
  status: ReportStatus;
  examType: ExamType;
  aiAccuracy: number;
  results: BiomarkerResult[];
};

type AuthDraft = {
  email: string;
  password: string;
  code: string;
};

type ProfileDraft = {
  fullName: string;
  birthDate: string;
  gender: string;
  note: string;
};

type ScanSession = {
  progress: number;
  status: "idle" | "processing" | "ready";
  examType: ExamType;
};

type ManualEntryDraft = {
  date: string;
  examType: ExamType;
  panel: string;
  values: Record<string, string>;
};

export type HealthAppState = {
  auth: {
    currentUserId: string | null;
    loginDraft: AuthDraft;
    registerDraft: AuthDraft;
  };
  profiles: Profile[];
  activeProfileId: string;
  profileDraft: ProfileDraft;
  reports: Report[];
  selectedReportId: string | null;
  scanSession: ScanSession;
  manualEntryDraft: ManualEntryDraft;
};

type Action =
  | { type: "auth/loginField"; field: keyof AuthDraft; value: string }
  | { type: "auth/registerField"; field: keyof AuthDraft; value: string }
  | { type: "auth/login" }
  | { type: "auth/register" }
  | { type: "auth/logout" }
  | { type: "profiles/select"; profileId: string }
  | { type: "profileDraft/set"; field: keyof ProfileDraft; value: string }
  | { type: "profileDraft/save" }
  | { type: "scan/start" }
  | { type: "scan/complete" }
  | { type: "reports/select"; reportId: string }
  | { type: "manual/setMeta"; field: "date" | "examType" | "panel"; value: string }
  | { type: "manual/setValue"; code: string; value: string }
  | { type: "manual/submit" };

const STORAGE_KEY = "vitalis-core-state-v1";

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
      },
    ],
    activeProfileId: profileMe,
    profileDraft: {
      fullName: "Jhonathan Doe",
      birthDate: "1990-04-18",
      gender: "Male",
      note: "Note any chronic conditions, recurring symptoms, or recent medical observations...",
    },
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
        ALT: "45",
        AST: "32",
        TBIL: "",
        ALP: "88",
        GGT: "",
      },
    },
  };
}

function reducer(state: HealthAppState, action: Action): HealthAppState {
  switch (action.type) {
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
    case "auth/login": {
      const existingUser = state.auth.loginDraft.email
        ? state.auth.loginDraft.email
        : state.auth.registerDraft.email;

      const user = state.auth.currentUserId
        ? state.auth.currentUserId
        : state.profiles[0]?.userId ?? null;

      if (!user || !existingUser) {
        return state;
      }

      return {
        ...state,
        auth: {
          ...state.auth,
          currentUserId: user,
        },
      };
    }
    case "auth/register": {
      const userId = `user_${state.auth.registerDraft.email || "new"}`;

      return {
        ...state,
        auth: {
          ...state.auth,
          currentUserId: userId,
          loginDraft: {
            ...state.auth.loginDraft,
            email: state.auth.registerDraft.email,
            password: state.auth.registerDraft.password,
          },
        },
      };
    }
    case "auth/logout":
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
        profileDraft: {
          fullName: profile.name,
          birthDate: profile.birthDate,
          gender: profile.gender,
          note: profile.note,
        },
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
    case "profileDraft/save":
      return {
        ...state,
        profiles: state.profiles.map((profile) =>
          profile.id === state.activeProfileId
            ? {
                ...profile,
                name: state.profileDraft.fullName || profile.name,
                birthDate: state.profileDraft.birthDate,
                gender: state.profileDraft.gender,
                note: state.profileDraft.note,
                initials: createInitials(state.profileDraft.fullName || profile.name),
              }
            : profile,
        ),
      };
    case "scan/start":
      return {
        ...state,
        scanSession: {
          ...state.scanSession,
          status: "processing",
          progress: 65,
        },
      };
    case "scan/complete":
      return {
        ...state,
        scanSession: {
          ...state.scanSession,
          status: "ready",
          progress: 100,
        },
        selectedReportId: getLatestReportId(state.reports, state.activeProfileId),
      };
    case "reports/select":
      return {
        ...state,
        selectedReportId: action.reportId,
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
    case "manual/submit": {
      const createdResults = Object.entries(state.manualEntryDraft.values)
        .filter(([, value]) => value.trim() !== "")
        .map(([code, rawValue], index) => {
          const numericValue = Number(rawValue);

          return createResult(
            `manual_${code}_${index}`,
            code,
            code,
            code === "TBIL" || code === "GGT" ? "Liver Function" : "Liver Function",
            numericValue,
            code === "TBIL" ? "mg/dL" : "U/L",
            code === "TBIL" ? "Ref 0.1 - 1.2 mg/dL" : "Ref 7 - 55 U/L",
            numericValue > 40 ? "high" : "normal",
          );
        });

      const reportId = `report_manual_${Date.now()}`;
      const newReport: Report = {
        id: reportId,
        profileId: state.activeProfileId,
        title: state.manualEntryDraft.panel,
        date: new Date(state.manualEntryDraft.date).toISOString(),
        location: "Manual Entry",
        sceneType: state.manualEntryDraft.examType === "Clinical" ? "INPATIENT" : "ROUTINE",
        sourceType: "manual",
        status: "ready",
        examType: state.manualEntryDraft.examType,
        aiAccuracy: 100,
        results: createdResults,
      };

      return {
        ...state,
        reports: [newReport, ...state.reports],
        selectedReportId: reportId,
      };
    }
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

function formatDateLabel(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(new Date(date));
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
  const currentProfile =
    state.profiles.find((profile) => profile.id === state.activeProfileId) ?? state.profiles[0];

  const profileReports = [...state.reports]
    .filter((report) => report.profileId === currentProfile.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const selectedReport =
    profileReports.find((report) => report.id === state.selectedReportId) ?? profileReports[0] ?? null;

  const familyProfileItems: FamilyProfileItem[] = [
    ...state.profiles.map((profile) => ({
      id: profile.id,
      name: profile.relation === "Me" ? "Me" : profile.name,
      initials: profile.initials,
      accent: profile.id === state.activeProfileId,
    })),
    { id: "add-profile", name: "Add", initials: "+", dashed: true },
  ];

  const recentRecordItems: RecentRecordItem[] = profileReports.slice(0, 3).map((report) => ({
    title: report.title,
    date: formatDateLabel(report.date),
    location: report.location,
    tag: sceneToTag(report.sceneType),
    tone: report.sourceType === "manual" ? "accent" : report.sceneType === "INPATIENT" ? "accent" : "success",
  }));

  const categoryMap = new Map<string, BiomarkerResult[]>();
  profileReports.flatMap((report) => report.results).forEach((result) => {
    const list = categoryMap.get(result.category) ?? [];
    list.push(result);
    categoryMap.set(result.category, list);
  });

  const healthCategoryItems: HealthCategoryItem[] = Array.from(categoryMap.entries())
    .slice(0, 4)
    .map(([category, results]) => {
      const latest = results[0];
      const biomarkers = new Set(results.map((result) => result.code)).size;

      return {
        title: category,
        subtitle: `${biomarkers} biomarker${biomarkers > 1 ? "s" : ""}`,
        marker: latest.name.replace(/\s*\(.+\)/, ""),
        reading: `${latest.value} ${latest.unit}`,
        status: statusToText(latest.status),
        tone: statusToTone(latest.status),
      };
    });

  const monthlyTrendItems: MonthlyTrendItem[] = [
    {
      label: "Inflammation Index",
      status: profileReports.some((report) => report.sceneType === "INPATIENT") ? "Elevated" : "Low",
      tone: profileReports.some((report) => report.sceneType === "INPATIENT") ? "warning" : "success",
    },
    {
      label: "Cardiovascular Load",
      status: "Optimal",
      tone: "accent",
    },
    {
      label: "Hydration",
      status: selectedReport?.results.some((result) => result.code === "BUN" && result.status === "low")
        ? "Watch"
        : "Stable",
      tone: selectedReport?.results.some((result) => result.code === "BUN" && result.status === "low")
        ? "warning"
        : "accent",
    },
  ];

  const biomarkerMap = new Map<string, BiomarkerResult[]>();
  [...profileReports].reverse().forEach((report) => {
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
        selectedReport.results.reduce((map, result) => {
          const list = map.get(result.category) ?? [];
          list.push(result);
          map.set(result.category, list);
          return map;
        }, new Map<string, BiomarkerResult[]>()),
      ).map(([category, results]) => ({
        section: category,
        count: `${results.length} biomarkers`,
        rows: results.map((result) => ({
          name: result.name,
          ref: result.referenceText,
          value: `${result.value} ${result.unit}`,
          tone: statusToTone(result.status),
          tag: statusToText(result.status),
        })),
      }))
    : [];

  return {
    currentProfile,
    familyProfileItems,
    recentRecordItems,
    healthCategoryItems,
    biomarkerTrendItems,
    reportBiomarkerGroups,
    monthlyTrendItems,
    selectedReport,
  };
}

type HealthStoreValue = {
  state: HealthAppState;
  derived: ReturnType<typeof deriveStoreData>;
  actions: {
    setLoginField: (field: keyof AuthDraft, value: string) => void;
    setRegisterField: (field: keyof AuthDraft, value: string) => void;
    login: () => void;
    register: () => void;
    logout: () => void;
    selectProfile: (profileId: string) => void;
    setProfileDraftField: (field: keyof ProfileDraft, value: string) => void;
    saveProfile: () => void;
    startScan: () => void;
    completeScan: () => void;
    selectReport: (reportId: string) => void;
    setManualMeta: (field: "date" | "examType" | "panel", value: string) => void;
    setManualValue: (code: string, value: string) => void;
    submitManualEntry: () => void;
  };
};

const HealthStoreContext = createContext<HealthStoreValue | null>(null);

export function HealthStoreProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return createInitialState();
    }

    try {
      return JSON.parse(stored) as HealthAppState;
    } catch {
      return createInitialState();
    }
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const value = useMemo<HealthStoreValue>(() => {
    const derived = deriveStoreData(state);

    return {
      state,
      derived,
      actions: {
        setLoginField: (field, value) => dispatch({ type: "auth/loginField", field, value }),
        setRegisterField: (field, value) => dispatch({ type: "auth/registerField", field, value }),
        login: () => dispatch({ type: "auth/login" }),
        register: () => dispatch({ type: "auth/register" }),
        logout: () => dispatch({ type: "auth/logout" }),
        selectProfile: (profileId) => dispatch({ type: "profiles/select", profileId }),
        setProfileDraftField: (field, value) => dispatch({ type: "profileDraft/set", field, value }),
        saveProfile: () => dispatch({ type: "profileDraft/save" }),
        startScan: () => dispatch({ type: "scan/start" }),
        completeScan: () => dispatch({ type: "scan/complete" }),
        selectReport: (reportId) => dispatch({ type: "reports/select", reportId }),
        setManualMeta: (field, value) => dispatch({ type: "manual/setMeta", field, value }),
        setManualValue: (code, value) => dispatch({ type: "manual/setValue", code, value }),
        submitManualEntry: () => dispatch({ type: "manual/submit" }),
      },
    };
  }, [state]);

  return <HealthStoreContext.Provider value={value}>{children}</HealthStoreContext.Provider>;
}

export function useHealthStore() {
  const context = useContext(HealthStoreContext);

  if (!context) {
    throw new Error("useHealthStore must be used within HealthStoreProvider");
  }

  return context;
}
