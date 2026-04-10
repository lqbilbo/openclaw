/* @vitest-environment jsdom */

import { render } from "lit";
import { describe, expect, it, vi } from "vitest";
import { renderFsTreePanel } from "./app-render.ts";
import type { AppViewState } from "./app-view-state.ts";
import type { FsEntry } from "./controllers/fs-tree.ts";

function makeState(overrides: Partial<AppViewState> = {}): AppViewState {
  return {
    connected: true,
    fsTreeLoading: false,
    fsTreeDir: "/workspace",
    fsTreeItems: [],
    fsTreeError: null,
    fsTreeExpanded: {},
    handleLoadFsTree: vi.fn(),
    handleFsTreeToggleDir: vi.fn(),
    ...overrides,
  } as unknown as AppViewState;
}

function renderToDiv(state: AppViewState): HTMLElement {
  const container = document.createElement("div");
  render(renderFsTreePanel(state), container);
  return container;
}

describe("renderFsTreePanel", () => {
  it("returns nothing when not connected", () => {
    const container = renderToDiv(makeState({ connected: false }));
    expect(container.querySelector("aside")).toBeNull();
  });

  it("calls handleLoadFsTree on first render when dir is empty", () => {
    const handleLoadFsTree = vi.fn();
    renderToDiv(makeState({ fsTreeDir: "", handleLoadFsTree }));
    expect(handleLoadFsTree).toHaveBeenCalledOnce();
  });

  it("does not call handleLoadFsTree when dir is already set", () => {
    const handleLoadFsTree = vi.fn();
    renderToDiv(makeState({ fsTreeDir: "/workspace", handleLoadFsTree }));
    expect(handleLoadFsTree).not.toHaveBeenCalled();
  });

  it("shows loading indicator when fsTreeLoading is true", () => {
    const container = renderToDiv(makeState({ fsTreeLoading: true }));
    expect(container.querySelector(".fs-tree__loading")).not.toBeNull();
  });

  it("shows error message when fsTreeError is set", () => {
    const container = renderToDiv(makeState({ fsTreeError: "cannot read dir: /bad" }));
    const err = container.querySelector(".fs-tree__error");
    expect(err?.textContent).toContain("cannot read dir: /bad");
  });

  it("renders file and directory entries", () => {
    const items: FsEntry[] = [
      { name: "README.md", isDir: false, path: "/workspace/README.md" },
      { name: "skills", isDir: true, path: "/workspace/skills" },
    ];
    const container = renderToDiv(makeState({ fsTreeItems: items }));
    const names = [...container.querySelectorAll(".fs-tree__name")].map((el) => el.textContent);
    expect(names).toContain("README.md");
    expect(names).toContain("skills");
  });

  it("adds fs-tree__item--dir class only for directories", () => {
    const items: FsEntry[] = [
      { name: "file.txt", isDir: false, path: "/workspace/file.txt" },
      { name: "subdir", isDir: true, path: "/workspace/subdir" },
    ];
    const container = renderToDiv(makeState({ fsTreeItems: items }));
    const dirItems = container.querySelectorAll(".fs-tree__item--dir");
    expect(dirItems).toHaveLength(1);
    expect(dirItems[0].querySelector(".fs-tree__name")?.textContent).toBe("subdir");
  });
});

describe("renderEntries (via renderFsTreePanel)", () => {
  it("renders expanded subdirectory entries with increased indent", () => {
    const items: FsEntry[] = [{ name: "skills", isDir: true, path: "/workspace/skills" }];
    const expanded: Record<string, FsEntry[]> = {
      "/workspace/skills": [{ name: "my-skill", isDir: false, path: "/workspace/skills/my-skill" }],
    };
    const container = renderToDiv(makeState({ fsTreeItems: items, fsTreeExpanded: expanded }));
    const names = [...container.querySelectorAll(".fs-tree__name")].map((el) => el.textContent);
    expect(names).toContain("skills");
    expect(names).toContain("my-skill");

    // child should have greater padding-left than parent
    const allItems = container.querySelectorAll<HTMLElement>(".fs-tree__item");
    const parentPadding = parseInt(allItems[0].style.paddingLeft || "0");
    const childPadding = parseInt(allItems[1].style.paddingLeft || "0");
    expect(childPadding).toBeGreaterThan(parentPadding);
  });

  it("does not render children for collapsed directories", () => {
    const items: FsEntry[] = [{ name: "skills", isDir: true, path: "/workspace/skills" }];
    const container = renderToDiv(makeState({ fsTreeItems: items, fsTreeExpanded: {} }));
    const names = [...container.querySelectorAll(".fs-tree__name")].map((el) => el.textContent);
    expect(names).toEqual(["skills"]);
  });

  it("calls handleFsTreeToggleDir when a directory is clicked", () => {
    const handleFsTreeToggleDir = vi.fn();
    const items: FsEntry[] = [{ name: "skills", isDir: true, path: "/workspace/skills" }];
    const container = renderToDiv(makeState({ fsTreeItems: items, handleFsTreeToggleDir }));
    const dirItem = container.querySelector<HTMLElement>(".fs-tree__item--dir");
    dirItem?.click();
    expect(handleFsTreeToggleDir).toHaveBeenCalledWith("/workspace/skills");
  });

  it("does not call handleFsTreeToggleDir when a file is clicked", () => {
    const handleFsTreeToggleDir = vi.fn();
    const items: FsEntry[] = [{ name: "file.txt", isDir: false, path: "/workspace/file.txt" }];
    const container = renderToDiv(makeState({ fsTreeItems: items, handleFsTreeToggleDir }));
    const fileItem = container.querySelector<HTMLElement>(
      ".fs-tree__item:not(.fs-tree__item--dir)",
    );
    fileItem?.click();
    expect(handleFsTreeToggleDir).not.toHaveBeenCalled();
  });
});
