import { describe, expect, it, vi } from "vitest";
import { fsHandlers } from "./fs.js";

const mocks = vi.hoisted(() => ({
  readdir: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
  default: { readdir: mocks.readdir },
}));

vi.mock("../../agents/workspace.js", () => ({
  DEFAULT_AGENT_WORKSPACE_DIR: "/workspace",
}));

function makeRespond() {
  const respond = vi.fn();
  const result = () => respond.mock.calls[0] as [boolean, unknown, unknown?];
  return { respond, result };
}

describe("fs.list", () => {
  it("returns items for a valid directory", async () => {
    mocks.readdir.mockResolvedValue([
      { name: "file.txt", isDirectory: () => false },
      { name: "subdir", isDirectory: () => true },
    ]);

    const { respond, result } = makeRespond();
    await fsHandlers["fs.list"]({ params: { dir: "/workspace" }, respond } as never);

    const [ok, data] = result();
    expect(ok).toBe(true);
    expect(data).toEqual({
      dir: "/workspace",
      items: [
        { name: "file.txt", isDir: false, path: "/workspace/file.txt" },
        { name: "subdir", isDir: true, path: "/workspace/subdir" },
      ],
    });
  });

  it("uses DEFAULT_AGENT_WORKSPACE_DIR when dir param is empty", async () => {
    mocks.readdir.mockResolvedValue([]);
    const { respond } = makeRespond();
    await fsHandlers["fs.list"]({ params: {}, respond } as never);
    expect(mocks.readdir).toHaveBeenCalledWith("/workspace", { withFileTypes: true });
  });

  it("returns NOT_FOUND error when directory cannot be read", async () => {
    mocks.readdir.mockRejectedValue(new Error("ENOENT"));
    const { respond, result } = makeRespond();
    await fsHandlers["fs.list"]({ params: { dir: "/bad/path" }, respond } as never);

    const [ok, , err] = result();
    expect(ok).toBe(false);
    expect((err as { message: string }).message).toMatch(/cannot read dir/);
  });
});
