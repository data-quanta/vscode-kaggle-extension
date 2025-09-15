import * as vscode from 'vscode';
import { listDatasets } from '../kaggleCli';

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
      // Use the new API function directly
      const datasets = await listDatasets(this.context);
      return datasets.slice(0, 50).map(dataset => ({
        ref: dataset.ref,
        url: `https://www.kaggle.com/datasets/${dataset.ref}`,
      }));
    } catch {
      return [];
    }
  }
}
