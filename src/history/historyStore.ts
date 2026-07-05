import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export type HistoryRecord = {
  id: string;
  type: "text" | "image";
  routeId: string;
  provider: string;
  model: string;
  status: "success" | "error";
  summary: string;
  imagePath?: string;
  metadataPath?: string;
  createdAt: string;
};

const MAX_HISTORY_RECORDS = 100;
const writeQueues = new Map<string, Promise<unknown>>();

export function defaultHistoryPath(): string {
  return join(process.env.LOCALAPPDATA ?? process.cwd(), "SyncAI", "history.json");
}

export class HistoryStore {
  constructor(private readonly historyPath = defaultHistoryPath()) {}

  async read(): Promise<HistoryRecord[]> {
    try {
      const raw = await readFile(this.historyPath, "utf8");
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(isHistoryRecord) : [];
    } catch (error) {
      if (isFileMissing(error)) {
        return [];
      }
      if (error instanceof SyntaxError) {
        await quarantineCorruptHistory(this.historyPath);
        return [];
      }
      throw error;
    }
  }

  async append(record: HistoryRecord): Promise<HistoryRecord[]> {
    return withHistoryWriteLock(this.historyPath, async () => {
      const records = [sanitizeRecord(record), ...(await this.read())].slice(0, MAX_HISTORY_RECORDS);
      await this.write(records);
      return records;
    });
  }

  async clear(): Promise<void> {
    await withHistoryWriteLock(this.historyPath, async () => {
      await this.write([]);
    });
  }

  private async write(records: HistoryRecord[]): Promise<void> {
    await mkdir(dirname(this.historyPath), { recursive: true });
    const tempPath = `${this.historyPath}.${process.pid}.${Date.now()}.${randomUUID()}.tmp`;
    await writeFile(tempPath, `${JSON.stringify(records, null, 2)}\n`, "utf8");
    await rename(tempPath, this.historyPath);
  }
}

async function quarantineCorruptHistory(historyPath: string): Promise<void> {
  const corruptPath = `${historyPath}.corrupt-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  try {
    await rename(historyPath, corruptPath);
  } catch (error) {
    if (!isFileMissing(error)) {
      throw error;
    }
  }
}

async function withHistoryWriteLock<T>(historyPath: string, task: () => Promise<T>): Promise<T> {
  const previous = writeQueues.get(historyPath) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(task);
  writeQueues.set(historyPath, next);
  try {
    return await next;
  } finally {
    if (writeQueues.get(historyPath) === next) {
      writeQueues.delete(historyPath);
    }
  }
}

function sanitizeRecord(record: HistoryRecord): HistoryRecord {
  return {
    id: record.id,
    type: record.type,
    routeId: record.routeId,
    provider: record.provider,
    model: record.model,
    status: record.status,
    summary: sanitizeSummary(record.summary),
    ...(record.imagePath ? { imagePath: record.imagePath } : {}),
    ...(record.metadataPath ? { metadataPath: record.metadataPath } : {}),
    createdAt: record.createdAt
  };
}

function sanitizeSummary(summary: string): string {
  return summary
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/sk-[A-Za-z0-9._-]+/g, "sk-[redacted]")
    .slice(0, 500);
}

function isHistoryRecord(value: unknown): value is HistoryRecord {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Partial<HistoryRecord>;
  return (
    typeof record.id === "string" &&
    (record.type === "text" || record.type === "image") &&
    typeof record.routeId === "string" &&
    typeof record.provider === "string" &&
    typeof record.model === "string" &&
    (record.status === "success" || record.status === "error") &&
    typeof record.summary === "string" &&
    typeof record.createdAt === "string"
  );
}

function isFileMissing(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
