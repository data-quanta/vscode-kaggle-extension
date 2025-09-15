import * as vscode from 'vscode';
import { listMyKernels } from '../kaggleCli';

export interface KernelItem {
  id: string;
  title: string;
  author: string;
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
    const item = new vscode.TreeItem(element.title, vscode.TreeItemCollapsibleState.None);
    item.contextValue = 'kernel';
    item.tooltip = `${element.title} by ${element.author}\n${element.url}`;
    item.description = element.author;
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
      // Use the new API function directly
      const kernels = await listMyKernels(this.context);
      return kernels.map(kernel => ({
        id: kernel.id,
        title: kernel.title,
        author: kernel.author,
        url: kernel.url,
      }));
    } catch (error) {
      console.error('Error loading notebooks:', error);
      return [];
    }
  }
}

// Removed unused functions splitCsv, isCsvWithRef and parseKernelsCsv
