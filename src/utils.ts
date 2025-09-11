import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export const OUTPUT = vscode.window.createOutputChannel('Kaggle');

export function getWorkspaceFolder(): string | undefined {
  const folders = vscode.workspace.workspaceFolders;
  return folders && folders.length ? folders[0].uri.fsPath : undefined;
}

export async function ensureFolder(folder: string) {
  await fs.promises.mkdir(folder, { recursive: true });
}

export async function writeFile(filePath: string, contents: string) {
  await ensureFolder(path.dirname(filePath));
  await fs.promises.writeFile(filePath, contents, 'utf8');
}

export async function readJson<T = Record<string, unknown>>(
  filePath: string
): Promise<T | undefined> {
  try {
    const raw = await fs.promises.readFile(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

export async function fileExists(p: string) {
  try {
    await fs.promises.access(p);
    return true;
  } catch {
    return false;
  }
}

export function showError(e: Error | unknown, msg?: string) {
  const message = e instanceof Error ? e.message : String(e);
  OUTPUT.appendLine(`Error: ${message}`);
  vscode.window.showErrorMessage(msg || message);
}
