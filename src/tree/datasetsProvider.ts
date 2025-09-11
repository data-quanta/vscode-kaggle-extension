import * as vscode from 'vscode';
import { runKaggleCLI } from '../kaggleCli';

export interface DatasetItem {
  ref: string;
  url: string;
}

export class DatasetsProvider implements vscode.TreeDataProvider<DatasetItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(
    private context: vscode.ExtensionContext,
    private getUsername: () => Promise<string | undefined>
  ) {}

  refresh() {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: DatasetItem): vscode.TreeItem {
    const item = new vscode.TreeItem(element.ref, vscode.TreeItemCollapsibleState.None);
    item.contextValue = 'dataset';
    item.tooltip = element.url;
    item.iconPath = new vscode.ThemeIcon('database');
    item.command = {
      command: 'vscode.open',
      title: 'Open',
      arguments: [vscode.Uri.parse(element.url)],
    };
    return item;
  }

  async getChildren(): Promise<DatasetItem[]> {
    try {
      // List top datasets (could be filtered by user later)
      const res = await runKaggleCLI(this.context, ['datasets', 'list', '--csv', '-p', '50']);
      const lines = res.stdout.trim().split(/\r?\n/);
      const header = lines.shift() || '';
      const refIdx = header.split(',').findIndex(h => /^ref$/i.test(h.trim().replace(/"/g, '')));
      const urlIdx = header.split(',').findIndex(h => /^url$/i.test(h.trim().replace(/"/g, '')));
      const items: DatasetItem[] = [];
      for (const line of lines) {
        const cols = splitCsv(line);
        const ref = cols[refIdx] || '';
        const url = cols[urlIdx] || (ref ? `https://www.kaggle.com/datasets/${ref}` : '');
        if (ref) items.push({ ref, url });
      }
      return items;
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
