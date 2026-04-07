import { GENERATED_BIOMARKER_REFERENCE } from "./biomarkerReferenceData.generated.js"
import { readLocalBiomarkerAliasesSync } from "../localBiomarkerAliasStore.js"

function normalizeText(value) {
  return `${value ?? ""}`
    .trim()
    .toUpperCase()
    .replace(/[★☆•·]/g, "")
    .replace(/[（【\[]/g, "(")
    .replace(/[）】\]]/g, ")")
    .replace(/[^\p{L}\p{N}()%+\-./]+/gu, "")
}

function normalizeCode(value) {
  return `${value ?? ""}`
    .trim()
    .toUpperCase()
    .replace(/0/g, "O")
    .replace(/[★☆•·]/g, "")
    .replace(/[^\p{L}\p{N}%+\-./]+/gu, "")
}

function stripDecorators(value) {
  return `${value ?? ""}`
    .replace(/[★☆•·]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function stripBracketedCode(value) {
  return stripDecorators(value).replace(/\s*[\[【(（][^\]】)）]+[\]】)）]\s*/g, " ").replace(/\s+/g, " ").trim()
}

function extractCodeHints(value) {
  const hints = new Set()
  const text = stripDecorators(value)

  for (const match of text.matchAll(/[\[【(（]([^\]】)）]+)[\]】)）]/g)) {
    const normalized = normalizeCode(match[1])

    if (normalized) {
      hints.add(normalized)
    }
  }

  const slashToken = text.match(/\b([A-Z][A-Z0-9]{0,5}(?:\/[A-Z][A-Z0-9]{0,5})+)\b/)

  if (slashToken) {
    hints.add(normalizeCode(slashToken[1]))
  }

  return [...hints]
}

const EXTRA_BIOMARKER_REFERENCE = [
  {
    code: "WBC",
    name: "White Blood Cell",
    category: "CBC Differential",
    categoryLabel: "血液常规相关",
    referenceText: "4.0-10.0 10^9/L",
    aliases: ["WBC", "WHITE BLOOD CELL", "白细胞计数"],
  },
  {
    code: "RBC",
    name: "Red Blood Cell",
    category: "CBC Core",
    categoryLabel: "血液常规相关",
    referenceText: "3.5-6.0 10^12/L",
    aliases: ["RBC", "RED BLOOD CELL", "红细胞计数"],
  },
  {
    code: "HGB",
    name: "Hemoglobin",
    category: "CBC Core",
    categoryLabel: "血液常规相关",
    referenceText: "120-165 g/L",
    aliases: ["HGB", "HEMOGLOBIN", "血红蛋白"],
  },
  {
    code: "HCT",
    name: "Hematocrit",
    category: "CBC Core",
    categoryLabel: "血液常规相关",
    referenceText: "40.0-50.0 %",
    aliases: ["HCT", "HEMATOCRIT", "红细胞比积", "红细胞压积"],
  },
  {
    code: "MCV",
    name: "Mean Corpuscular Volume",
    category: "Red Cell Indices",
    categoryLabel: "血液常规相关",
    referenceText: "80.0-100.0 fl",
    aliases: ["MCV", "MEAN CORPUSCULAR VOLUME", "平均红细胞体积"],
  },
  {
    code: "MCH",
    name: "Mean Corpuscular Hemoglobin",
    category: "Red Cell Indices",
    categoryLabel: "血液常规相关",
    referenceText: "27.3-34.4 pg",
    aliases: ["MCH", "MEAN CORPUSCULAR HEMOGLOBIN", "平均红细胞血红蛋白含量", "平均红细胞血红蛋白量"],
  },
  {
    code: "MCHC",
    name: "Mean Corpuscular Hemoglobin Concentration",
    category: "Red Cell Indices",
    categoryLabel: "血液常规相关",
    referenceText: "320.0-360.0 g/L",
    aliases: ["MCHC", "MEAN CORPUSCULAR HEMOGLOBIN CONCENTRATION", "平均红细胞血红蛋白浓度"],
  },
  {
    code: "RDW-SD",
    name: "Red Cell Distribution Width SD",
    category: "Red Cell Indices",
    categoryLabel: "血液常规相关",
    referenceText: "37.0-54.0 fl",
    aliases: ["RDW-SD", "红细胞体积分布宽度-SD"],
  },
  {
    code: "RDW-CV",
    name: "Red Cell Distribution Width CV",
    category: "Red Cell Indices",
    categoryLabel: "血液常规相关",
    referenceText: "11.0-16.0 %",
    aliases: ["RDW-CV", "红细胞体积分布宽度-CV"],
  },
  {
    code: "NEUT%",
    name: "Neutrophil Percentage",
    category: "CBC Differential",
    categoryLabel: "血液常规相关",
    referenceText: "50.0-70.0 %",
    aliases: ["NEUT%", "中性粒细胞%", "中性粒细胞百分比"],
  },
  {
    code: "LYMPH%",
    name: "Lymphocyte Percentage",
    category: "CBC Differential",
    categoryLabel: "血液常规相关",
    referenceText: "20.0-40.0 %",
    aliases: ["LYMPH%", "淋巴细胞%", "淋巴细胞百分比"],
  },
  {
    code: "MONO%",
    name: "Monocyte Percentage",
    category: "CBC Differential",
    categoryLabel: "血液常规相关",
    referenceText: "3.0-8.0 %",
    aliases: ["MONO%", "单核细胞%", "单核细胞百分比"],
  },
  {
    code: "EOS%",
    name: "Eosinophil Percentage",
    category: "CBC Differential",
    categoryLabel: "血液常规相关",
    referenceText: "0.0-5.0 %",
    aliases: ["EOS%", "嗜酸性粒细胞%", "嗜酸性粒细胞百分比"],
  },
  {
    code: "BASO%",
    name: "Basophil Percentage",
    category: "CBC Differential",
    categoryLabel: "血液常规相关",
    referenceText: "0.0-1.0 %",
    aliases: ["BASO%", "嗜碱性粒细胞%", "嗜碱性粒细胞百分比"],
  },
  {
    code: "NEUT#",
    name: "Neutrophil Absolute Count",
    category: "CBC Differential",
    categoryLabel: "血液常规相关",
    referenceText: "1.5-7.0 10^9/L",
    aliases: ["NEUT#", "中性粒细胞绝对数"],
  },
  {
    code: "LYMPH#",
    name: "Lymphocyte Absolute Count",
    category: "CBC Differential",
    categoryLabel: "血液常规相关",
    referenceText: "0.8-4.0 10^9/L",
    aliases: ["LYMPH#", "淋巴细胞绝对数"],
  },
  {
    code: "MONO#",
    name: "Monocyte Absolute Count",
    category: "CBC Differential",
    categoryLabel: "血液常规相关",
    referenceText: "0.12-0.80 10^9/L",
    aliases: ["MONO#", "单核细胞绝对数"],
  },
  {
    code: "EOS#",
    name: "Eosinophil Absolute Count",
    category: "CBC Differential",
    categoryLabel: "血液常规相关",
    referenceText: "0.0-0.50 10^9/L",
    aliases: ["EOS#", "嗜酸性粒细胞绝对数"],
  },
  {
    code: "BASO#",
    name: "Basophil Absolute Count",
    category: "CBC Differential",
    categoryLabel: "血液常规相关",
    referenceText: "0.0-0.10 10^9/L",
    aliases: ["BASO#", "嗜碱性粒细胞绝对数"],
  },
  {
    code: "NRBC#",
    name: "Nucleated Red Blood Cell Absolute Count",
    category: "CBC Core",
    categoryLabel: "血液常规相关",
    referenceText: "0.00-0.02 10^9/L",
    aliases: ["NRBC#", "有核红细胞绝对计数"],
  },
  {
    code: "NRBC%",
    name: "Nucleated Red Blood Cell Percentage",
    category: "CBC Core",
    categoryLabel: "血液常规相关",
    referenceText: "<1.00 %",
    aliases: ["NRBC%", "有核红细胞/白细胞"],
  },
  {
    code: "PLT",
    name: "Platelet Count",
    category: "Platelet Indices",
    categoryLabel: "血液常规相关",
    referenceText: "100-300 10^9/L",
    aliases: ["PLT", "PLATELET COUNT", "血小板计数"],
  },
  {
    code: "PLTCT",
    name: "Manual White Cell Differential Count",
    category: "CBC Differential",
    categoryLabel: "血液常规相关",
    referenceText: "",
    aliases: ["PLTCT", "手工白细胞分类计数", "手工白细胞分类计数:"],
  },
  {
    code: "P-LCC",
    name: "Large Platelet Ratio",
    category: "Platelet Indices",
    categoryLabel: "血液常规相关",
    referenceText: "13.00-43.00 %",
    aliases: ["P-LCC", "大血小板比率"],
  },
  {
    code: "PCT-PLT",
    name: "Plateletcrit",
    category: "Platelet Indices",
    categoryLabel: "血液常规相关",
    referenceText: "0.06-0.28 %",
    aliases: ["PCT-PLT", "血小板比容"],
  },
  {
    code: "MPV",
    name: "Mean Platelet Volume",
    category: "Platelet Indices",
    categoryLabel: "血液常规相关",
    referenceText: "6.4-12.1 fl",
    aliases: ["MPV", "平均血小板体积"],
  },
  {
    code: "PDW",
    name: "Platelet Distribution Width",
    category: "Platelet Indices",
    categoryLabel: "血液常规相关",
    referenceText: "9.0-17.0 %",
    aliases: ["PDW", "血小板体积分布宽度"],
  },
  {
    code: "NEUT-BAND%",
    name: "Band Neutrophil Percentage",
    category: "CBC Differential",
    categoryLabel: "血液常规相关",
    referenceText: "",
    aliases: ["NEUT-BAND%", "中性杆状核粒细胞"],
  },
  {
    code: "NEUT-SEG%",
    name: "Segmented Neutrophil Percentage",
    category: "CBC Differential",
    categoryLabel: "血液常规相关",
    referenceText: "",
    aliases: ["NEUT-SEG%", "中性分叶核粒细胞"],
  },
  {
    code: "LYMPH-MANUAL%",
    name: "Manual Lymphocyte Percentage",
    category: "CBC Differential",
    categoryLabel: "血液常规相关",
    referenceText: "",
    aliases: ["LYMPH-MANUAL%", "淋巴细胞"],
  },
  {
    code: "ALY%",
    name: "Atypical Lymphocyte Percentage",
    category: "CBC Differential",
    categoryLabel: "血液常规相关",
    referenceText: "",
    aliases: ["ALY%", "异型淋巴细胞"],
  },
  {
    code: "MONO-MANUAL%",
    name: "Manual Monocyte Percentage",
    category: "CBC Differential",
    categoryLabel: "血液常规相关",
    referenceText: "",
    aliases: ["MONO-MANUAL%", "单核细胞"],
  },
  {
    code: "GLB",
    name: "Globulin",
    category: "Liver Function",
    categoryLabel: "肝功能",
    referenceText: "20-35 g/L",
    aliases: ["GLB", "GLOBULIN", "球蛋白"],
  },
  {
    code: "A/G",
    name: "Albumin/Globulin Ratio",
    category: "Liver Function",
    categoryLabel: "肝功能",
    referenceText: "1.09-2.50",
    aliases: ["A/G", "AG", "白球比例", "白蛋白/球蛋白"],
  },
  {
    code: "AST",
    name: "Aspartate Aminotransferase",
    category: "Liver Function",
    categoryLabel: "肝功能",
    referenceText: "0-40 U/L",
    aliases: ["AST", "天冬氨酸氨基转移酶"],
  },
  {
    code: "LAP",
    name: "Leucine Aminopeptidase",
    category: "Liver Function",
    categoryLabel: "肝功能",
    referenceText: "15-125 U/L",
    aliases: ["LAP", "亮氨酸氨基肽酶"],
  },
  {
    code: "GGT",
    name: "Gamma-Glutamyl Transferase",
    category: "Liver Function",
    categoryLabel: "肝功能",
    referenceText: "10-60 U/L",
    aliases: ["GGT", "γ-谷氨酰转肽酶", "Γ-谷氨酰转肽酶", "谷氨酰转肽酶"],
  },
  {
    code: "CHE",
    name: "Cholinesterase",
    category: "Liver Function",
    categoryLabel: "肝功能",
    referenceText: "5000-12000 U/L",
    aliases: ["CHE", "胆碱脂酶", "胆碱酯酶"],
  },
  {
    code: "PA",
    name: "Prealbumin",
    category: "Nutrition",
    categoryLabel: "营养与一般状态",
    referenceText: "250-400 mg/L",
    aliases: ["PA", "PREALBUMIN", "前白蛋白"],
  },
  {
    code: "UREA",
    name: "Urea",
    category: "Kidney Function",
    categoryLabel: "肾功能",
    referenceText: "2.9-7.5 mmol/L",
    aliases: ["UREA", "尿素"],
  },
  {
    code: "UA",
    name: "Uric Acid",
    category: "Kidney Function",
    categoryLabel: "肾功能",
    referenceText: "130-430 μmol/L",
    aliases: ["UA", "URIC", "尿酸"],
  },
  {
    code: "HCO3",
    name: "Bicarbonate",
    category: "Electrolytes",
    categoryLabel: "水合与电解质",
    referenceText: "20.1-29.0 mmol/L",
    aliases: ["HCO3", "HC03", "碳酸氢盐", "碳酸氢根"],
  },
  {
    code: "AG",
    name: "Anion Gap",
    category: "Electrolytes",
    categoryLabel: "水合与电解质",
    referenceText: "",
    aliases: ["AG", "ANION GAP", "阴离子间隙"],
  },
  {
    code: "OSM",
    name: "Osmolality",
    category: "Electrolytes",
    categoryLabel: "水合与电解质",
    referenceText: "275-305 mOsm/L",
    aliases: ["OSM", "渗透压", "渗透压(OSM)"],
  },
  {
    code: "HAV-IgM",
    name: "Hepatitis A Virus IgM Antibody",
    category: "Immune Function",
    categoryLabel: "免疫与感染抗体",
    referenceText: "<1",
    aliases: ["HAV-IGM", "甲肝病毒IGM抗体", "甲肝病毒IGM", "HAV IGM"],
  },
  {
    code: "HAV-IgG",
    name: "Hepatitis A Virus IgG Antibody",
    category: "Immune Function",
    categoryLabel: "免疫与感染抗体",
    referenceText: "<1",
    aliases: ["HAV-IGG", "甲肝病毒IGG抗体", "甲肝病毒IGG", "HAV IGG"],
  },
  {
    code: "HDV-IgM",
    name: "Hepatitis D Virus IgM Antibody",
    category: "Immune Function",
    categoryLabel: "免疫与感染抗体",
    referenceText: "<1",
    aliases: ["HDV-IGM", "丁肝病毒IGM抗体", "丁肝病毒IGM", "HDV IGM"],
  },
  {
    code: "HDV-IgG",
    name: "Hepatitis D Virus IgG Antibody",
    category: "Immune Function",
    categoryLabel: "免疫与感染抗体",
    referenceText: "<1",
    aliases: ["HDV-IGG", "丁肝病毒IGG抗体", "丁肝病毒IGG", "HDV IGG"],
  },
  {
    code: "HEV-IgM",
    name: "Hepatitis E Virus IgM Antibody",
    category: "Immune Function",
    categoryLabel: "免疫与感染抗体",
    referenceText: "<1",
    aliases: ["HEV-IGM", "戊肝病毒IGM抗体", "戊肝病毒IGM", "HEV IGM"],
  },
  {
    code: "HEV-IgG",
    name: "Hepatitis E Virus IgG Antibody",
    category: "Immune Function",
    categoryLabel: "免疫与感染抗体",
    referenceText: "<1",
    aliases: ["HEV-IGG", "戊肝病毒IGG抗体", "戊肝病毒IGG", "HEV IGG"],
  },
]

export const BIOMARKER_CATALOG = [...GENERATED_BIOMARKER_REFERENCE, ...EXTRA_BIOMARKER_REFERENCE]

function buildCatalogState(catalog) {
  const aliasLookup = new Map()
  const codeLookup = new Map()

  for (const entry of catalog) {
    const normalizedCode = normalizeCode(entry.code)

    if (normalizedCode) {
      codeLookup.set(normalizedCode, entry)
    }

    for (const alias of [entry.code, ...(entry.aliases ?? [])]) {
      const normalizedAlias = normalizeText(alias)

      if (normalizedAlias) {
        aliasLookup.set(normalizedAlias, entry)
      }
    }
  }

  return {
    catalog,
    aliasLookup,
    codeLookup,
  }
}

const baseCatalogState = buildCatalogState(BIOMARKER_CATALOG)

function getCombinedCatalogState() {
  const localAliases = readLocalBiomarkerAliasesSync().map((item) => ({
    code: item.code,
    name: item.name,
    category: item.category,
    categoryLabel: item.category,
    referenceText: item.referenceText ?? "",
    aliases: Array.isArray(item.aliases) ? item.aliases : [],
    source: "local",
  }))

  if (localAliases.length === 0) {
    return baseCatalogState
  }

  return buildCatalogState([...BIOMARKER_CATALOG, ...localAliases])
}

export function matchBiomarkerMetadata(name) {
  const { catalog, aliasLookup, codeLookup } = getCombinedCatalogState()
  const normalizedName = normalizeText(name)

  if (!normalizedName) {
    return null
  }

  for (const codeHint of extractCodeHints(name)) {
    const byCode = codeLookup.get(codeHint)

    if (byCode) {
      return byCode
    }

    const byAlias = aliasLookup.get(normalizeText(codeHint))

    if (byAlias) {
      return byAlias
    }
  }

  const directAliasMatch = aliasLookup.get(normalizedName)

  if (directAliasMatch) {
    return directAliasMatch
  }

  const strippedName = stripBracketedCode(name)
  const normalizedStrippedName = normalizeText(strippedName)

  if (normalizedStrippedName) {
    const strippedAliasMatch = aliasLookup.get(normalizedStrippedName)

    if (strippedAliasMatch) {
      return strippedAliasMatch
    }
  }

  if (strippedName.includes("/")) {
    return null
  }

  const fuzzyCandidates = catalog.flatMap((entry, index) =>
    entry.aliases
      .map((alias) => normalizeText(alias))
      .filter((normalizedAlias) => normalizedAlias && normalizedAlias.length >= 3)
      .filter(
        (normalizedAlias) =>
          normalizedName.includes(normalizedAlias) ||
          normalizedAlias.includes(normalizedName) ||
          (normalizedStrippedName && normalizedStrippedName.includes(normalizedAlias)),
      )
      .map((normalizedAlias) => ({
        entry,
        score: normalizedAlias.length,
        priority: catalog.length - index,
      })),
  ).sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score
    }

    return right.priority - left.priority
  })

  return fuzzyCandidates[0]?.entry ?? null
}
