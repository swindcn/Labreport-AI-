import test from "node:test"
import assert from "node:assert/strict"
import { mkdtemp, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { normalizeExtractDocMulti, normalizeExtractDocMultiDetailed } from "./normalizeExtractDocMulti.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function readFixture(fileName) {
  const raw = await readFile(path.join(__dirname, "fixtures", fileName), "utf8")
  return JSON.parse(raw)
}

test("normalizeExtractDocMulti maps real-style CBC response fields", async () => {
  const fixture = await readFixture("cbc-report-page-1.json")
  const results = normalizeExtractDocMulti(fixture, { examType: "Routine" })

  assert.equal(results.length, 2)
  assert.deepEqual(results.map((item) => item.code), ["HGB", "WBC"])
  assert.equal(results[0].name, "Hemoglobin")
  assert.equal(results[0].category, "CBC Core")
  assert.equal(results[0].status, "low")
  assert.equal(results[1].category, "CBC Differential")
  assert.equal(results[1].status, "normal")
})

test("normalizeExtractDocMulti maps metabolic and kidney biomarkers from page 2", async () => {
  const fixture = await readFixture("metabolic-report-page-2.json")
  const results = normalizeExtractDocMulti(fixture, { examType: "Routine" })

  assert.equal(results.length, 2)
  assert.deepEqual(results.map((item) => item.code), ["GLU", "CRE"])
  assert.equal(results[0].category, "Metabolic")
  assert.equal(results[0].status, "high")
  assert.equal(results[1].category, "Kidney Function")
  assert.equal(results[1].status, "normal")
})

test("normalizeExtractDocMulti preserves chemistry panels, aliases, and categories from mixed key names", async () => {
  const fixture = {
    StructuralList: [
      {
        Groups: [
          {
            Lines: [
              { Key: { AutoName: "项目名称" }, Value: { AutoContent: "★直接胆红素[DBIL]" } },
              { Key: { AutoName: "结果" }, Value: { AutoContent: "13.6 ↑" } },
              { Key: { AutoName: "单位" }, Value: { AutoContent: "umol/L" } },
              { Key: { AutoName: "参考范围" }, Value: { AutoContent: "0.0~8.0" } },
            ],
          },
          {
            Lines: [
              { Key: { AutoName: "检验项目" }, Value: { AutoContent: "★尿素[UREA]" } },
              { Key: { AutoName: "结果" }, Value: { AutoContent: "7.3" } },
              { Key: { AutoName: "单位" }, Value: { AutoContent: "mmol/L" } },
              { Key: { AutoName: "参考区间" }, Value: { AutoContent: "3.1~7.4" } },
            ],
          },
          {
            Lines: [
              { Key: { AutoName: "检验项目" }, Value: { AutoContent: "★葡萄糖[GLU]" } },
              { Key: { AutoName: "结果" }, Value: { AutoContent: "6.13 ↑" } },
              { Key: { AutoName: "单位" }, Value: { AutoContent: "mmol/L" } },
              { Key: { AutoName: "参考区间" }, Value: { AutoContent: "3.90~6.10" } },
            ],
          },
          {
            Lines: [
              { Key: { AutoName: "检验项目" }, Value: { AutoContent: "碳酸氢盐[HC03]" } },
              { Key: { AutoName: "结果" }, Value: { AutoContent: "26.4" } },
              { Key: { AutoName: "单位" }, Value: { AutoContent: "mmol/L" } },
              { Key: { AutoName: "参考区间" }, Value: { AutoContent: "20.1~29.0" } },
            ],
          },
          {
            Lines: [
              { Key: { AutoName: "项目名称" }, Value: { AutoContent: "阴离子间隙[AG]" } },
              { Key: { AutoName: "结果" }, Value: { AutoContent: "16" } },
              { Key: { AutoName: "单位" }, Value: { AutoContent: "mmol/L" } },
            ],
          },
          {
            Lines: [
              { Key: { AutoName: "项目名称" }, Value: { AutoContent: "★前白蛋白" } },
              { Key: { AutoName: "结果" }, Value: { AutoContent: "457 ↑" } },
              { Key: { AutoName: "单位" }, Value: { AutoContent: "mg/L" } },
              { Key: { AutoName: "参考范围" }, Value: { AutoContent: "250~400" } },
            ],
          },
          {
            Lines: [
              { Key: { AutoName: "项目名称" }, Value: { AutoContent: "AST/ALT" } },
              { Key: { AutoName: "结果" }, Value: { AutoContent: "0.79" } },
            ],
          },
        ],
      },
    ],
  }

  const results = normalizeExtractDocMulti(fixture, { examType: "Routine" })

  assert.deepEqual(
    results.map((item) => item.code),
    ["DBIL", "UREA", "GLU", "HCO3", "AG", "PA", "AST/ALT"],
  )
  assert.equal(results.find((item) => item.code === "DBIL")?.category, "Liver Function")
  assert.equal(results.find((item) => item.code === "UREA")?.category, "Kidney Function")
  assert.equal(results.find((item) => item.code === "GLU")?.category, "Metabolic")
  assert.equal(results.find((item) => item.code === "HCO3")?.category, "Electrolytes")
  assert.equal(results.find((item) => item.code === "AG")?.category, "Electrolytes")
  assert.equal(results.find((item) => item.code === "PA")?.category, "Nutrition")
  assert.equal(results.find((item) => item.code === "AST/ALT")?.category, "Other")
  assert.equal(results.find((item) => item.code === "DBIL")?.status, "high")
  assert.equal(results.find((item) => item.code === "PA")?.status, "high")
})

test("normalizeExtractDocMulti keeps CBC analytes distinct instead of collapsing into RBC and PLT", () => {
  const fixture = {
    StructuralList: [
      {
        Groups: [
          {
            Lines: [
              { Key: { AutoName: "检验项目" }, Value: { AutoContent: "★红细胞计数" } },
              { Key: { AutoName: "结果" }, Value: { AutoContent: "3.22 ↓" } },
              { Key: { AutoName: "单位" }, Value: { AutoContent: "10^12/L" } },
              { Key: { AutoName: "参考区间" }, Value: { AutoContent: "3.50~6.00" } },
            ],
          },
          {
            Lines: [
              { Key: { AutoName: "检验项目" }, Value: { AutoContent: "★红细胞比积" } },
              { Key: { AutoName: "结果" }, Value: { AutoContent: "27.3 ↓" } },
              { Key: { AutoName: "单位" }, Value: { AutoContent: "%" } },
              { Key: { AutoName: "参考区间" }, Value: { AutoContent: "40.0~50.0" } },
            ],
          },
          {
            Lines: [
              { Key: { AutoName: "检验项目" }, Value: { AutoContent: "平均红细胞血红蛋白含量" } },
              { Key: { AutoName: "结果" }, Value: { AutoContent: "30.1" } },
              { Key: { AutoName: "单位" }, Value: { AutoContent: "pg" } },
              { Key: { AutoName: "参考区间" }, Value: { AutoContent: "27.3~34.4" } },
            ],
          },
          {
            Lines: [
              { Key: { AutoName: "检验项目" }, Value: { AutoContent: "红细胞体积分布宽度-SD" } },
              { Key: { AutoName: "结果" }, Value: { AutoContent: "41.3" } },
              { Key: { AutoName: "单位" }, Value: { AutoContent: "fl" } },
              { Key: { AutoName: "参考区间" }, Value: { AutoContent: "37.0~54.0" } },
            ],
          },
          {
            Lines: [
              { Key: { AutoName: "检验项目" }, Value: { AutoContent: "血小板比容" } },
              { Key: { AutoName: "结果" }, Value: { AutoContent: "0.15" } },
              { Key: { AutoName: "单位" }, Value: { AutoContent: "%" } },
              { Key: { AutoName: "参考区间" }, Value: { AutoContent: "0.06~0.28" } },
            ],
          },
          {
            Lines: [
              { Key: { AutoName: "检验项目" }, Value: { AutoContent: "平均血小板体积" } },
              { Key: { AutoName: "结果" }, Value: { AutoContent: "13.0 ↑" } },
              { Key: { AutoName: "单位" }, Value: { AutoContent: "fl" } },
              { Key: { AutoName: "参考区间" }, Value: { AutoContent: "6.4~12.1" } },
            ],
          },
          {
            Lines: [
              { Key: { AutoName: "检验项目" }, Value: { AutoContent: "血小板体积分布宽度" } },
              { Key: { AutoName: "结果" }, Value: { AutoContent: "16.5" } },
              { Key: { AutoName: "单位" }, Value: { AutoContent: "%" } },
              { Key: { AutoName: "参考区间" }, Value: { AutoContent: "9.0~17.0" } },
            ],
          },
          {
            Lines: [
              { Key: { AutoName: "检验项目" }, Value: { AutoContent: "大血小板比率" } },
              { Key: { AutoName: "结果" }, Value: { AutoContent: "46.60 ↑" } },
              { Key: { AutoName: "单位" }, Value: { AutoContent: "%" } },
              { Key: { AutoName: "参考区间" }, Value: { AutoContent: "13.00~43.00" } },
            ],
          },
        ],
      },
    ],
  }

  const results = normalizeExtractDocMulti(fixture, { examType: "Routine" })

  assert.deepEqual(results.map((item) => item.code), ["RBC", "HCT", "MCH", "RDW-SD", "PCT-PLT", "MPV", "PDW", "P-LCC"])
  assert.equal(results.find((item) => item.code === "RBC")?.status, "low")
  assert.equal(results.find((item) => item.code === "HCT")?.status, "low")
  assert.equal(results.find((item) => item.code === "MPV")?.status, "high")
  assert.equal(results.find((item) => item.code === "P-LCC")?.status, "high")
})

test("normalizeExtractDocMulti keeps virus antibody IgM and IgG analytes distinct", () => {
  const fixture = {
    Response: {
      StructuralList: [
        {
          Groups: [
            {
              Lines: [
                { Key: { AutoName: "检验项目" }, Value: { AutoContent: "★甲肝病毒IgM抗体" } },
                { Key: { AutoName: "结果" }, Value: { AutoContent: "0.01" } },
                { Key: { AutoName: "参考区间" }, Value: { AutoContent: "<1" } },
                { Key: { AutoName: "单位" }, Value: { AutoContent: "S/CO" } },
              ],
            },
            {
              Lines: [
                { Key: { AutoName: "检验项目" }, Value: { AutoContent: "★甲肝病毒IgG抗体" } },
                { Key: { AutoName: "结果" }, Value: { AutoContent: "0.06" } },
                { Key: { AutoName: "参考区间" }, Value: { AutoContent: "<1" } },
                { Key: { AutoName: "单位" }, Value: { AutoContent: "S/CO" } },
              ],
            },
            {
              Lines: [
                { Key: { AutoName: "检验项目" }, Value: { AutoContent: "丁肝病毒IgM抗体" } },
                { Key: { AutoName: "结果" }, Value: { AutoContent: "0.11" } },
                { Key: { AutoName: "参考区间" }, Value: { AutoContent: "<1" } },
                { Key: { AutoName: "单位" }, Value: { AutoContent: "S/CO" } },
              ],
            },
            {
              Lines: [
                { Key: { AutoName: "检验项目" }, Value: { AutoContent: "丁肝病毒IgG抗体" } },
                { Key: { AutoName: "结果" }, Value: { AutoContent: "0.15" } },
                { Key: { AutoName: "参考区间" }, Value: { AutoContent: "<1" } },
                { Key: { AutoName: "单位" }, Value: { AutoContent: "S/CO" } },
              ],
            },
            {
              Lines: [
                { Key: { AutoName: "检验项目" }, Value: { AutoContent: "★戊肝病毒IgM抗体" } },
                { Key: { AutoName: "结果" }, Value: { AutoContent: "0.02" } },
                { Key: { AutoName: "参考区间" }, Value: { AutoContent: "<1" } },
                { Key: { AutoName: "单位" }, Value: { AutoContent: "S/CO" } },
              ],
            },
            {
              Lines: [
                { Key: { AutoName: "检验项目" }, Value: { AutoContent: "★戊肝病毒IgG抗体" } },
                { Key: { AutoName: "结果" }, Value: { AutoContent: "0.13" } },
                { Key: { AutoName: "参考区间" }, Value: { AutoContent: "<1" } },
                { Key: { AutoName: "单位" }, Value: { AutoContent: "S/CO" } },
              ],
            },
          ],
        },
      ],
    },
  }

  const results = normalizeExtractDocMulti(fixture, { examType: "Routine" })

  assert.equal(results.length, 6)
  assert.deepEqual(
    results.map((item) => item.code),
    ["HAV-IgM", "HAV-IgG", "HDV-IgM", "HDV-IgG", "HEV-IgM", "HEV-IgG"],
  )
  assert.ok(results.every((item) => item.category === "Immune Function"))
  assert.ok(results.every((item) => item.unit === "S/CO"))
})

test("normalizeExtractDocMulti maps a real-style liver panel fixture", async () => {
  const fixture = await readFixture("liver-panel-page-1.json")
  const results = normalizeExtractDocMulti(fixture, { examType: "Routine" })

  assert.deepEqual(results.map((item) => item.code), ["ALT", "AST", "GGT"])
  assert.equal(results.find((item) => item.code === "ALT")?.category, "Liver Function")
  assert.equal(results.find((item) => item.code === "ALT")?.status, "normal")
  assert.equal(results.find((item) => item.code === "GGT")?.status, "high")
})

test("normalizeExtractDocMultiDetailed collects unknown biomarkers for dictionary follow-up", async () => {
  const fixture = await readFixture("unknown-biomarker-page.json")
  const payload = normalizeExtractDocMultiDetailed(fixture, { examType: "Routine" })

  assert.deepEqual(payload.results.map((item) => item.code), ["LP-PLA2", "hs-CRP"])
  assert.equal(payload.unknownBiomarkers.length, 1)
  assert.equal(payload.unknownBiomarkers[0].code, "LP-PLA2")
  assert.equal(payload.unknownBiomarkers[0].rawName, "脂蛋白相关磷脂酶A2(LP-PLA2)")
  assert.equal(payload.unknownBiomarkers[0].category, "Other")
})

test("normalizeExtractDocMultiDetailed applies local biomarker aliases before queueing unknown items", async () => {
  const runtimeDir = await mkdtemp(path.join(tmpdir(), "vitalis-local-alias-"))
  const previousFile = process.env.LOCAL_BIOMARKER_ALIAS_FILE
  process.env.LOCAL_BIOMARKER_ALIAS_FILE = path.join(runtimeDir, "local-biomarker-aliases.json")

  try {
    await writeFile(
      process.env.LOCAL_BIOMARKER_ALIAS_FILE,
      JSON.stringify(
        [
          {
            id: "alias_lp_pla2",
            sourceKey: "LP-PLA2|脂蛋白相关磷脂酶A2(LP-PLA2)|ng/mL|<175",
            code: "LP-PLA2",
            name: "Lipoprotein-associated Phospholipase A2",
            category: "Cardiovascular",
            referenceText: "<175",
            aliases: ["LP-PLA2", "脂蛋白相关磷脂酶A2(LP-PLA2)"],
            active: true,
            createdAt: "2026-04-06T08:00:00.000Z",
            updatedAt: "2026-04-06T08:00:00.000Z",
          },
        ],
        null,
        2,
      ),
    )

    const fixture = await readFixture("unknown-biomarker-page.json")
    const payload = normalizeExtractDocMultiDetailed(fixture, { examType: "Routine" })

    assert.deepEqual(payload.results.map((item) => item.code), ["LP-PLA2", "hs-CRP"])
    assert.equal(payload.results.find((item) => item.code === "LP-PLA2")?.category, "Cardiovascular")
    assert.equal(payload.unknownBiomarkers.length, 0)
  } finally {
    if (previousFile === undefined) {
      delete process.env.LOCAL_BIOMARKER_ALIAS_FILE
    } else {
      process.env.LOCAL_BIOMARKER_ALIAS_FILE = previousFile
    }
  }
})
