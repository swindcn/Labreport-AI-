function normalizeText(value) {
  return `${value ?? ""}`
    .trim()
    .toUpperCase()
    .replace(/[（）]/g, "()")
    .replace(/[^\p{L}\p{N}()]+/gu, "")
}

export const BIOMARKER_CATALOG = [
  { code: "HGB", name: "Hemoglobin", category: "Blood Count", aliases: ["HGB", "HB", "HEMOGLOBIN", "血红蛋白"] },
  { code: "WBC", name: "White Blood Cells", category: "Blood Count", aliases: ["WBC", "WHITEBLOODCELLS", "白细胞", "白细胞计数"] },
  { code: "RBC", name: "Red Blood Cells", category: "Blood Count", aliases: ["RBC", "REDBLOODCELLS", "红细胞", "红细胞计数"] },
  { code: "PLT", name: "Platelets", category: "Blood Count", aliases: ["PLT", "PLATELETS", "血小板", "血小板计数"] },
  { code: "HCT", name: "Hematocrit", category: "Blood Count", aliases: ["HCT", "HEMATOCRIT", "红细胞压积"] },
  { code: "ALT", name: "ALT (Alanine Aminotransferase)", category: "Liver Function", aliases: ["ALT", "谷丙转氨酶", "丙氨酸氨基转移酶"] },
  { code: "AST", name: "AST (Aspartate Aminotransferase)", category: "Liver Function", aliases: ["AST", "谷草转氨酶", "天门冬氨酸氨基转移酶"] },
  { code: "ALP", name: "Alkaline Phosphatase", category: "Liver Function", aliases: ["ALP", "AKP", "碱性磷酸酶"] },
  { code: "GGT", name: "Gamma-Glutamyl Transferase", category: "Liver Function", aliases: ["GGT", "Γ-GT", "谷氨酰转肽酶", "谷氨酰基转移酶"] },
  { code: "TBIL", name: "Total Bilirubin", category: "Liver Function", aliases: ["TBIL", "总胆红素"] },
  { code: "ALB", name: "Albumin", category: "Liver Function", aliases: ["ALB", "ALBUMIN", "白蛋白"] },
  { code: "TP", name: "Total Protein", category: "Liver Function", aliases: ["TP", "TOTALPROTEIN", "总蛋白"] },
  { code: "CRE", name: "Creatinine", category: "Kidney Function", aliases: ["CRE", "CR", "CREATININE", "肌酐"] },
  { code: "BUN", name: "Blood Urea Nitrogen", category: "Kidney Function", aliases: ["BUN", "UREANITROGEN", "尿素氮"] },
  { code: "UA", name: "Uric Acid", category: "Kidney Function", aliases: ["UA", "URICACID", "尿酸"] },
  { code: "EGFR", name: "Estimated Glomerular Filtration Rate", category: "Kidney Function", aliases: ["EGFR", "估算肾小球滤过率"] },
  { code: "GLU", name: "Glucose", category: "Metabolic", aliases: ["GLU", "GLUCOSE", "血糖", "葡萄糖", "空腹血糖"] },
  { code: "HBA1C", name: "HbA1c", category: "Metabolic", aliases: ["HBA1C", "HbA1c", "糖化血红蛋白", "糖化血红蛋白A1C"] },
  { code: "TC", name: "Total Cholesterol", category: "Metabolic", aliases: ["TC", "TOTALCHOLESTEROL", "总胆固醇"] },
  { code: "TG", name: "Triglycerides", category: "Metabolic", aliases: ["TG", "TRIGLYCERIDES", "甘油三酯"] },
  { code: "HDL-C", name: "HDL Cholesterol", category: "Metabolic", aliases: ["HDL-C", "HDLC", "高密度脂蛋白胆固醇"] },
  { code: "LDL-C", name: "LDL Cholesterol", category: "Metabolic", aliases: ["LDL-C", "LDLC", "低密度脂蛋白胆固醇"] },
  { code: "TSH", name: "Thyroid Stimulating Hormone", category: "Endocrine", aliases: ["TSH", "促甲状腺激素"] },
  { code: "FT3", name: "Free Triiodothyronine", category: "Endocrine", aliases: ["FT3", "游离三碘甲状腺原氨酸"] },
  { code: "FT4", name: "Free Thyroxine", category: "Endocrine", aliases: ["FT4", "游离甲状腺素"] },
  { code: "Na", name: "Sodium", category: "Electrolytes", aliases: ["NA", "SODIUM", "钠"] },
  { code: "K", name: "Potassium", category: "Electrolytes", aliases: ["K", "POTASSIUM", "钾"] },
  { code: "Cl", name: "Chloride", category: "Electrolytes", aliases: ["CL", "CHLORIDE", "氯"] },
  { code: "Ca", name: "Calcium", category: "Electrolytes", aliases: ["CA", "CALCIUM", "钙"] },
]

export function matchBiomarkerMetadata(name) {
  const normalizedName = normalizeText(name)

  if (!normalizedName) {
    return null
  }

  return (
    BIOMARKER_CATALOG.find((entry) =>
      entry.aliases.some((alias) => {
        const normalizedAlias = normalizeText(alias)
        return normalizedName.includes(normalizedAlias) || normalizedAlias.includes(normalizedName)
      }),
    ) ?? null
  )
}
