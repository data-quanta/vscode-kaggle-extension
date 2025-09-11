import * as vscode from 'vscode';
import { runKaggleCLI } from '../kaggleCli';

export interface KernelItem {
  ref: string;
  url: string;
}

export class MyNotebooksProvider implements vscode.TreeDataProvider<KernelItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(
    private context: vscode.ExtensionContext,
    private getUsername: () => Promise<string | undefined>
  ) {}

  refresh() {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: KernelItem): vscode.TreeItem {
    const item = new vscode.TreeItem(element.ref, vscode.TreeItemCollapsibleState.None);
    item.contextValue = 'kernel';
    item.tooltip = element.url;
    item.iconPath = new vscode.ThemeIcon('notebook');
    item.command = {
      command: 'kaggle.openNotebookLocally',
      title: 'Open Locally',
      arguments: [element],
    };
    return item;
  }

  async getChildren(): Promise<KernelItem[]> {
    const user = (await this.getUsername())?.toLowerCase();
    if (!user) return [];
    try {
      // Try by explicit user first
      let stdout = (
        await runKaggleCLI(this.context, ['kernels', 'list', '--csv', '--user', user])
      ).stdout.trim();
      if (!isCsvWithRef(stdout)) {
        // Fallback: list only my kernels
        stdout = (
          await runKaggleCLI(this.context, ['kernels', 'list', '--csv', '--mine'])
        ).stdout.trim();
      }
      return parseKernelsCsv(stdout);
    } catch {
      return [];
    }
  }
}

function splitCsv(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQ = !inQ;
      }
    } else if (ch === ',' && !inQ) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map(s => s.replace(/^\"|\"$/g, ''));
}

function isCsvWithRef(csv: string): boolean {
  const first = csv.split(/\r?\n/)[0] || '';
  return /(^|,)\s*ref\s*(,|$)/i.test(first);
}

function parseKernelsCsv(csv: string): KernelItem[] {
  const lines = csv.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];
  const header = lines.shift();
  if (!header) return [];
  const headers = header.split(',').map(h => h.trim().replace(/"/g, '').toLowerCase());
  const refIdx = headers.indexOf('ref');
  const urlIdx = headers.indexOf('url');
  if (refIdx === -1) return [];
  const items: KernelItem[] = [];
  for (const line of lines) {
    const cols = splitCsv(line);
    const ref = cols[refIdx] || '';
    const url = urlIdx >= 0 ? cols[urlIdx] || '' : '';
    const resolvedUrl = url || (ref ? `https://www.kaggle.com/code/${ref}` : '');
    if (ref) items.push({ ref, url: resolvedUrl });
  }
  return items;
}
