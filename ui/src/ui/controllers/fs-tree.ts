import type { GatewayBrowserClient } from "../gateway.ts";

export type FsEntry = { name: string; isDir: boolean; path: string };

export type FsTreeState = {
  client: GatewayBrowserClient | null;
  connected: boolean;
  fsTreeLoading: boolean;
  fsTreeDir: string;
  fsTreeItems: FsEntry[];
  fsTreeError: string | null;
  fsTreeExpanded: Record<string, FsEntry[]>;
};

export async function loadFsTree(state: FsTreeState, dir?: string) {
  if (!state.client || !state.connected) {
    return;
  }
  const target = dir ?? state.fsTreeDir;
  state.fsTreeLoading = true;
  state.fsTreeError = null;
  try {
    const res = (await state.client.request("fs.list", { dir: target })) as {
      dir: string;
      items: FsEntry[];
    };
    state.fsTreeDir = res.dir;
    state.fsTreeItems = res.items;
  } catch (err) {
    state.fsTreeError = String(err);
  } finally {
    state.fsTreeLoading = false;
  }
}

export async function loadFsTreeSubdir(state: FsTreeState, dir: string) {
  if (!state.client || !state.connected) {
    return;
  }
  try {
    const res = (await state.client.request("fs.list", { dir })) as {
      dir: string;
      items: FsEntry[];
    };
    state.fsTreeExpanded = { ...state.fsTreeExpanded, [dir]: res.items };
  } catch {
    // ignore subdir errors
  }
}
