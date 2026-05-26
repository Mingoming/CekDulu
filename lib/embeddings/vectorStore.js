import { promises as fs } from "node:fs";
import path from "node:path";

const VECTOR_STORE_PATH = path.join(
  process.cwd(),
  "data",
  "vectors",
  "sources.json"
);
const MAX_VECTOR_RECORDS = 200;

async function ensureVectorStore() {
  await fs.mkdir(path.dirname(VECTOR_STORE_PATH), { recursive: true });

  try {
    await fs.access(VECTOR_STORE_PATH);
  } catch {
    await fs.writeFile(VECTOR_STORE_PATH, "[]\n", "utf8");
  }
}

function isValidVectorRecord(record) {
  return (
    typeof record?.id === "string" &&
    typeof record?.text === "string" &&
    Array.isArray(record?.embedding)
  );
}

export async function loadVectors() {
  try {
    await ensureVectorStore();
    const rawContent = await fs.readFile(VECTOR_STORE_PATH, "utf8");
    const parsedContent = JSON.parse(rawContent);

    if (!Array.isArray(parsedContent)) {
      throw new Error("Vector store harus berupa array.");
    }

    return parsedContent.filter(isValidVectorRecord).slice(-MAX_VECTOR_RECORDS);
  } catch (error) {
    console.error("[vectorStore] failed to read, recreating store", {
      message: error instanceof Error ? error.message : "unknown error",
    });

    try {
      await fs.mkdir(path.dirname(VECTOR_STORE_PATH), { recursive: true });
      await fs.writeFile(VECTOR_STORE_PATH, "[]\n", "utf8");
    } catch (writeError) {
      console.error("[vectorStore] failed to recreate store", {
        message: writeError instanceof Error ? writeError.message : "unknown error",
      });
    }

    return [];
  }
}

export async function saveVectors(records) {
  try {
    await ensureVectorStore();
    const limitedRecords = records.filter(isValidVectorRecord).slice(-MAX_VECTOR_RECORDS);
    const temporaryPath = `${VECTOR_STORE_PATH}.tmp`;

    await fs.writeFile(
      temporaryPath,
      `${JSON.stringify(limitedRecords, null, 2)}\n`,
      "utf8"
    );
    await fs.rename(temporaryPath, VECTOR_STORE_PATH);
  } catch (error) {
    console.error("[vectorStore] failed to write", {
      message: error instanceof Error ? error.message : "unknown error",
    });
  }
}
