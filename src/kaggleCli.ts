import * as vscode from 'vscode';
import { exec } from 'child_process';
import * as fs from 'fs';
import { OUTPUT } from './utils';

const SECRET_KEY = 'kaggle.api.token.json';

export async function storeApiTokenFromFile(context: vscode.ExtensionContext) {
  const uri = await vscode.window.showOpenDialog({
    canSelectMany: false,
    filters: { JSON: ['json'] },
  });
  if (!uri || !uri[0]) return;
  const raw = await fs.promises.readFile(uri[0].fsPath, 'utf8');
  const obj = JSON.parse(raw);
  if (!obj.username || !obj.key) {
    throw new Error('Invalid kaggle.json (missing username/key).');
  }
  await context.secrets.store(SECRET_KEY, raw);
  vscode.window.showInformationMessage('Kaggle token stored securely.');
}

export async function getKaggleCreds(
  context: vscode.ExtensionContext
): Promise<{ username: string; key: string }> {
  // 1) Secrets store (via Kaggle: Sign In)
  const raw = await context.secrets.get(SECRET_KEY);
  if (raw) {
    try {
      const obj = JSON.parse(raw);
      if (obj?.username && obj?.key) return { username: obj.username, key: obj.key };
    } catch {
      /* fallthrough */
    }
  }

  // 2) Env: KAGGLE_TOKEN_JSON
  const envRaw = process.env.KAGGLE_TOKEN_JSON;
  if (envRaw) {
    try {
      const obj = JSON.parse(envRaw);
      if (obj?.username && obj?.key) return { username: obj.username, key: obj.key };
    } catch {
      /* fallthrough */
    }
  }

  // 3) Env: KAGGLE_USERNAME / KAGGLE_KEY
  if (process.env.KAGGLE_USERNAME && process.env.KAGGLE_KEY) {
    return { username: process.env.KAGGLE_USERNAME, key: process.env.KAGGLE_KEY } as {
      username: string;
      key: string;
    };
  }

  throw new Error(
    'No Kaggle token found. Run "Kaggle: Sign In" or set KAGGLE_TOKEN_JSON / KAGGLE_USERNAME & KAGGLE_KEY.'
  );
}

export async function clearStoredToken(context: vscode.ExtensionContext) {
  await context.secrets.delete(SECRET_KEY);
}

export async function storeApiTokenFromEnvOrPrompt(context: vscode.ExtensionContext) {
  // Prefer env var if present
  const envRaw = process.env.KAGGLE_TOKEN_JSON;
  if (envRaw) {
    try {
      const obj = JSON.parse(envRaw);
      if (obj?.username && obj?.key) {
        await context.secrets.store(SECRET_KEY, envRaw);
        vscode.window.showInformationMessage('Kaggle token loaded from environment.');
        return;
      }
    } catch {
      /* fallthrough to prompt */
    }
  }

  // Prompt user for username & key
  const username = await vscode.window.showInputBox({
    prompt: 'Kaggle Username',
    ignoreFocusOut: true,
  });
  if (!username) throw new Error('Sign in canceled.');
  const key = await vscode.window.showInputBox({
    prompt: 'Kaggle API Key',
    password: true,
    ignoreFocusOut: true,
  });
  if (!key) throw new Error('Sign in canceled.');
  const json = JSON.stringify({ username, key });
  await context.secrets.store(SECRET_KEY, json);
  vscode.window.showInformationMessage('Kaggle token saved securely.');
}

export type ExecResult = { code: number; stdout: string; stderr: string };

export async function runKaggleCLI(
  context: vscode.ExtensionContext,
  args: string[],
  cwd?: string
): Promise<ExecResult> {
  const config = vscode.workspace.getConfiguration('kaggle');
  const cliPath = config.get<string>('cliPath', 'kaggle');
  const creds = await getKaggleCreds(context);

  return new Promise((resolve, reject) => {
    OUTPUT.show(true);
    OUTPUT.appendLine(`$ ${cliPath} ${args.join(' ')}`);
    exec(
      `${cliPath} ${args.map(a => `'${a.replace(/'/g, "'\\''")}'`).join(' ')}`,
      { cwd, env: { ...process.env, KAGGLE_USERNAME: creds.username, KAGGLE_KEY: creds.key } },
      (error, stdout, stderr) => {
        if (stdout) OUTPUT.append(stdout);
        if (stderr) OUTPUT.append(stderr);
        if (error) return reject(error);
        resolve({ code: 0, stdout, stderr });
      }
    );
  });
}
