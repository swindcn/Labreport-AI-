import test from "node:test"
import assert from "node:assert/strict"
import { mkdtemp } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { listLocalBiomarkerAliases, upsertLocalBiomarkerAlias } from "./localBiomarkerAliasStore.js"

test("upsertLocalBiomarkerAlias creates and updates runtime alias entries", async () => {
  const runtimeDir = await mkdtemp(path.join(tmpdir(), "vitalis-local-alias-store-"))
  const previousFile = process.env.LOCAL_BIOMARKER_ALIAS_FILE

  process.env.LOCAL_BIOMARKER_ALIAS_FILE = path.join(runtimeDir, "local-biomarker-aliases.json")

  try {
    const created = await upsertLocalBiomarkerAlias({
      sourceKey: "LP-PLA2|source",
      code: "LP-PLA2",
      name: "Lipoprotein-associated Phospholipase A2",
      category: "Cardiovascular",
      referenceText: "<175",
      aliases: ["LP-PLA2", "脂蛋白相关磷脂酶A2(LP-PLA2)"],
    })

    const updated = await upsertLocalBiomarkerAlias({
      sourceKey: "LP-PLA2|source",
      code: "LP-PLA2",
      name: "Lipoprotein-associated Phospholipase A2",
      category: "Cardiovascular",
      referenceText: "<175",
      aliases: ["LP-PLA2", "脂蛋白相关磷脂酶A2(LP-PLA2)", "Lipoprotein-associated Phospholipase A2"],
    })

    const payload = await listLocalBiomarkerAliases()

    assert.equal(payload.length, 1)
    assert.equal(payload[0].id, created.id)
    assert.equal(updated.id, created.id)
    assert.ok(payload[0].aliases.includes("Lipoprotein-associated Phospholipase A2"))
  } finally {
    if (previousFile === undefined) {
      delete process.env.LOCAL_BIOMARKER_ALIAS_FILE
    } else {
      process.env.LOCAL_BIOMARKER_ALIAS_FILE = previousFile
    }
  }
})
