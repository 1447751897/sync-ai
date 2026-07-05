import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

import { HistoryStore, type HistoryRecord } from "../src/history/historyStore.js";

describe("HistoryStore", () => {
  test("starts with an empty history when no file exists", async () => {
    const store = new HistoryStore(await tempHistoryPath());

    await expect(store.read()).resolves.toEqual([]);
  });

  test("appends newest records first", async () => {
    const store = new HistoryStore(await tempHistoryPath());

    await store.append(createRecord("first"));
    await store.append(createRecord("second"));

    const records = await store.read();
    expect(records.map((record) => record.id)).toEqual(["second", "first"]);
  });

  test("keeps only the latest 100 records", async () => {
    const store = new HistoryStore(await tempHistoryPath());

    for (let index = 0; index < 105; index += 1) {
      await store.append(createRecord(`record-${index}`));
    }

    const records = await store.read();
    expect(records).toHaveLength(100);
    expect(records[0].id).toBe("record-104");
    expect(records.at(-1)?.id).toBe("record-5");
  });

  test("clears all records", async () => {
    const store = new HistoryStore(await tempHistoryPath());
    await store.append(createRecord("one"));

    await store.clear();

    await expect(store.read()).resolves.toEqual([]);
  });
});

async function tempHistoryPath(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "sync-ai-history-"));
  return join(dir, "history.json");
}

function createRecord(id: string): HistoryRecord {
  return {
    id,
    type: "text",
    routeId: "route-text",
    provider: "openai-compatible",
    model: "gpt-5.5",
    status: "success",
    summary: `summary ${id}`,
    createdAt: new Date().toISOString()
  };
}
