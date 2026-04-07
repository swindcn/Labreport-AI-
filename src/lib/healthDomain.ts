export type ExamType = "Routine" | "Clinical";
export type SceneType = "DAILY" | "INPATIENT" | "ROUTINE";
export type SourceType = "image" | "pdf" | "manual";
export type ReportStatus = "processing" | "ready" | "failed";
export type BiomarkerStatus = "normal" | "high" | "low";
export type ScanFailureCode = "ocr_failed" | "file_invalid";
export type ScanScenario = "normal" | "ocr_retryable" | "file_invalid";
export type UnknownBiomarkerStatus = "pending" | "processed";

export type AuthDraft = {
  email: string;
  password: string;
  code: string;
};

export type ProfileDraft = {
  fullName: string;
  relation: string;
  birthDate: string;
  gender: string;
  note: string;
  avatarUrl: string;
};

export type ProfileDraftState = {
  mode: "create" | "edit";
  targetProfileId: string | null;
};

export type ScanSession = {
  progress: number;
  status: "idle" | "processing" | "ready" | "failed";
  examType: ExamType;
};

export type ManualEntryDraft = {
  date: string;
  examType: ExamType;
  panel: string;
  values: Record<string, string>;
};

export type HealthAuthState = {
  currentUserId: string | null;
  loginDraft: AuthDraft;
  registerDraft: AuthDraft;
};

export type HealthSession = {
  currentUserId: string | null;
};

export type FileAssetRef = {
  assetId: string;
  url: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

export type AssetUploadInput = {
  fileName: string;
  dataUrl: string;
  mimeType?: string;
  sizeBytes?: number;
};

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
  avatarUrl?: string;
  avatarAsset?: FileAssetRef | null;
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

export type UpdateBiomarkerResultInput = Partial<
  Pick<BiomarkerResult, "code" | "name" | "category" | "value" | "unit" | "referenceText" | "status">
>;

export type Report = {
  id: string;
  profileId: string;
  batchId?: string;
  isSaved?: boolean;
  title: string;
  date: string;
  location: string;
  sceneType: SceneType;
  sourceType: SourceType;
  status: ReportStatus;
  examType: ExamType;
  aiAccuracy: number;
  results: BiomarkerResult[];
  isFavorite?: boolean;
  scanScenario?: ScanScenario;
  scanFailureCode?: ScanFailureCode;
  scanFailureMessage?: string;
  sourceFile?: FileAssetRef | null;
  sourceUpdatedAt?: string;
  resultsGeneratedAt?: string;
  scanParserVersion?: string;
};

export type HealthUiPreferences = {
  activeProfileId: string;
  selectedReportId: string | null;
  profileDraft: ProfileDraft;
  profileDraftState: ProfileDraftState;
  reportSavedAt: Record<string, string>;
  scanSession: ScanSession;
  manualEntryDraft: ManualEntryDraft;
};

export type HealthPreferences = {
  activeProfileId: string;
  selectedReportId: string | null;
};

export type HealthClientState = {
  profileDraft: ProfileDraft;
  profileDraftState: ProfileDraftState;
  profileAvatarUrls: Record<string, string>;
  reportSavedAt: Record<string, string>;
  scanSession: ScanSession;
  manualEntryDraft: ManualEntryDraft;
};

export type CreateManualReportInput = {
  profileId: string;
  title: string;
  date: string;
  examType: ExamType;
  results: BiomarkerResult[];
};

export type CreateUploadedReportInput = {
  profileId: string;
  batchId?: string;
  fileName: string;
  examType: ExamType;
  sourceType: Exclude<SourceType, "manual">;
  fileDataUrl?: string;
  mimeType?: string;
  sizeBytes?: number;
};

export type AttachReportSourceInput = Omit<CreateUploadedReportInput, "profileId">;

export type UpdateReportInput = Partial<Pick<Report, "title" | "location" | "isSaved">>;

export type CreateProfileInput = {
  name: string;
  relation: string;
  birthDate: string;
  gender: string;
  note: string;
  avatarUrl?: string;
};

export type DeleteProfileResult = {
  deletedProfileId: string;
  activeProfileId: string;
  selectedReportId: string | null;
};

export type DeleteReportResult = {
  deletedReportId: string;
  selectedReportId: string | null;
};

export type UnknownBiomarkerItem = {
  key: string;
  provider: string;
  code: string;
  rawName: string;
  normalizedName: string;
  category: string;
  unit: string;
  referenceText: string;
  sampleRawValue: string;
  sampleValue: number;
  occurrences: number;
  reportIds: string[];
  profileIds: string[];
  firstSeenAt: string;
  lastSeenAt: string;
  status: UnknownBiomarkerStatus;
  processedAt?: string | null;
  processedReason?: "manual" | "local_alias" | null;
  localAliasId?: string | null;
};

export type LocalBiomarkerAlias = {
  id: string;
  sourceKey?: string | null;
  code: string;
  name: string;
  category: string;
  referenceText: string;
  aliases: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type HealthAppState = {
  auth: HealthAuthState;
  profiles: Profile[];
  reports: Report[];
} & HealthUiPreferences;
