export const familyProfiles = [
  { name: "Me", accent: true, initials: "ME" },
  { name: "Dad", initials: "DA" },
  { name: "Mom", initials: "MO" },
  { name: "Add", dashed: true, initials: "+" },
];

export const recentRecords = [
  {
    title: "Full Blood Count",
    date: "Oct 24, 2023",
    location: "St. Mary's Lab",
    tag: "DAILY",
    tone: "success" as const,
  },
  {
    title: "Liver Function Test",
    date: "Oct 21, 2023",
    location: "Central Clinic",
    tag: "INPATIENT",
    tone: "accent" as const,
  },
  {
    title: "Cardiology Screening",
    date: "Oct 15, 2023",
    location: "Dr. Aris",
    tag: "DAILY",
    tone: "success" as const,
  },
];

export const healthCategories = [
  {
    title: "Liver Function",
    subtitle: "1 biomarker",
    marker: "ALT",
    reading: "45 U/L",
    status: "ATTENTION",
    tone: "danger" as const,
  },
  {
    title: "Kidney Function",
    subtitle: "2 biomarkers",
    marker: "Creatinine",
    reading: "1.1 mg/dL",
    status: "EXCELLENT",
    tone: "success" as const,
  },
  {
    title: "Metabolic",
    subtitle: "2 biomarkers",
    marker: "Glucose",
    reading: "98 mg/dL",
    status: "BALANCED",
    tone: "accent" as const,
  },
  {
    title: "Blood Count",
    subtitle: "2 biomarkers",
    marker: "WBC",
    reading: "6.4 x10^9/L",
    status: "STEADY",
    tone: "success" as const,
  },
];

export const biomarkerTrendCards = [
  {
    label: "ALT",
    range: "Ref Range 7 - 55 U/L",
    state: "NORMAL",
    tone: "success" as const,
    values: [18, 16, 44],
  },
  {
    label: "AST",
    range: "Ref Range 8 - 48 U/L",
    state: "NORMAL",
    tone: "success" as const,
    values: [22, 19, 32],
  },
  {
    label: "Creatinine",
    range: "Ref Range 0.7 - 1.3 mg/dL",
    state: "OPTIMAL",
    tone: "success" as const,
    values: [0.9, 0.95, 1.1],
  },
  {
    label: "BUN",
    range: "Ref Range 7 - 20 mg/dL",
    state: "ELEVATED",
    tone: "danger" as const,
    values: [8, 7, 28],
  },
  {
    label: "HbA1c",
    range: "Ref Range 4.0 - 5.6%",
    state: "STABLE",
    tone: "accent" as const,
    values: [5.4, 5.2, 5.1],
  },
];

export const reportBiomarkers = [
  {
    section: "Liver Function",
    count: "3 biomarkers",
    rows: [
      { name: "ALT (Alanine Aminotransferase)", ref: "Ref < 40 U/L", value: "45 U/L", tone: "danger" as const, tag: "HIGH" },
      { name: "AST (Aspartate Aminotransferase)", ref: "Ref 10 - 35 U/L", value: "32 U/L", tone: "success" as const, tag: "NORMAL" },
      { name: "ALP (Alkaline Phosphatase)", ref: "Ref 44 - 147 U/L", value: "88 U/L", tone: "success" as const, tag: "NORMAL" },
    ],
  },
  {
    section: "Kidney Function",
    count: "2 biomarkers",
    rows: [
      { name: "Creatinine", ref: "Ref 0.7 - 1.3 mg/dL", value: "1.1 mg/dL", tone: "success" as const, tag: "NORMAL" },
      { name: "BUN (Blood Urea Nitrogen)", ref: "Ref 7 - 20 mg/dL", value: "6 mg/dL", tone: "accent" as const, tag: "LOW" },
    ],
  },
];

export const manualBiomarkers = [
  { code: "ALT", name: "Alanine Aminotransferase", unit: "U/L" },
  { code: "AST", name: "Aspartate Aminotransferase", unit: "U/L" },
  { code: "TBIL", name: "Total Bilirubin", unit: "mg/dL" },
  { code: "ALP", name: "Alkaline Phosphatase", unit: "U/L" },
  { code: "GGT", name: "Gamma Glutamyl Transferase", unit: "U/L" },
];

export const profileMenu = [
  { group: "ACCOUNT & CARE", items: ["Profile Management", "Tracked Metrics", "Course Management"] },
  { group: "PRIVACY & SUPPORT", items: ["Privacy & Data", "Help & Feedback", "Settings"] },
];

export const monthlyTrend = [
  { label: "Inflammation Index", status: "Low", tone: "success" as const },
  { label: "Cardiovascular Load", status: "Optimal", tone: "accent" as const },
  { label: "Hydration", status: "Stable", tone: "accent" as const },
];
