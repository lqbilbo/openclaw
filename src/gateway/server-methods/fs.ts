import fs from "node:fs/promises";
import path from "node:path";
import { DEFAULT_AGENT_WORKSPACE_DIR } from "../../agents/workspace.js";
import { ErrorCodes, errorShape } from "../protocol/index.js";
import type { GatewayRequestHandlers } from "./types.js";

export const fsHandlers: GatewayRequestHandlers = {
  "fs.list": async ({ params, respond }) => {
    const dir =
      typeof params.dir === "string" && params.dir.trim()
        ? params.dir.trim()
        : DEFAULT_AGENT_WORKSPACE_DIR;

    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      respond(false, undefined, errorShape(ErrorCodes.NOT_FOUND, `cannot read dir: ${dir}`));
      return;
    }

    const items = entries.map((e) => ({
      name: e.name,
      isDir: e.isDirectory(),
      path: path.join(dir, e.name),
    }));

    respond(true, { dir, items });
  },

  "fs.upload": async ({ params, respond }) => {
    const name = typeof params.name === "string" ? params.name.trim() : "";
    const data = typeof params.data === "string" ? params.data : "";
    if (!name || !data) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, "name and data are required"),
      );
      return;
    }
    // Prevent path traversal
    if (name.includes("..") || path.isAbsolute(name)) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "invalid file name"));
      return;
    }
    const dir = DEFAULT_AGENT_WORKSPACE_DIR;
    const filePath = path.join(dir, name);
    try {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(filePath, Buffer.from(data, "base64"));
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.NOT_FOUND, `upload failed: ${String(err)}`));
      return;
    }
    respond(true, { path: filePath });
  },
};
