import * as vscode from 'vscode';
import * as fs from 'fs';
import { getKaggleApiClient, getKaggleCredentials } from './kaggleApi';
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

export async function checkKaggleAPI(): Promise<{
  available: boolean;
  version?: string;
  error?: string;
}> {
  try {
    // First check if kaggle CLI is available
    try {
      const result = await executeKaggleCLI(['--version']);
      if (result.code === 0) {
        const credentials = await getKaggleCredentials();
        if (!credentials) {
          return {
            available: false,
            error:
              'No Kaggle credentials found. Please use "Kaggle: Sign In" or set KAGGLE_TOKEN_JSON environment variable.',
          };
        }

        // Test CLI with credentials
        process.env.KAGGLE_USERNAME = credentials.username;
        process.env.KAGGLE_KEY = credentials.key;

        const testResult = await executeKaggleCLI(['competitions', 'list', '--page-size', '1']);
        if (testResult.code === 0) {
          return {
            available: true,
            version: `Kaggle CLI ${result.stdout.trim()}`,
          };
        }
      }
    } catch {
      // CLI not available, try API fallback
    }

    // Fallback to API approach
    const credentials = await getKaggleCredentials();
    if (!credentials) {
      return {
        available: false,
        error:
          'No Kaggle credentials found. Please use "Kaggle: Sign In" or set KAGGLE_TOKEN_JSON environment variable.',
      };
    }

    const client = getKaggleApiClient();
    await client.setCredentials(credentials);
    const isAuthenticated = await client.testAuthentication();

    if (isAuthenticated) {
      return {
        available: true,
        version: 'Kaggle API (Direct)',
      };
    } else {
      return {
        available: false,
        error: 'Invalid Kaggle credentials. Please check your username and API key.',
      };
    }
  } catch (error) {
    return {
      available: false,
      error: `Error connecting to Kaggle: ${error}`,
    };
  }
}

// CLI-based implementations for better reliability
async function executeKaggleCLI(args: string[], cwd?: string): Promise<ExecResult> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { spawn } = require('child_process');

  return new Promise(resolve => {
    const childProcess = spawn('kaggle', args, {
      cwd: cwd || process.cwd(),
      shell: true,
    });

    let stdout = '';
    let stderr = '';

    childProcess.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    childProcess.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    childProcess.on('close', (code: number) => {
      resolve({ code, stdout, stderr });
    });

    childProcess.on('error', (error: Error) => {
      resolve({ code: 1, stdout: '', stderr: error.message });
    });
  });
}

async function setupKaggleEnvironment(context: vscode.ExtensionContext): Promise<void> {
  const credentials = await getKaggleCreds(context);

  // Set environment variables for the CLI
  process.env.KAGGLE_USERNAME = credentials.username;
  process.env.KAGGLE_KEY = credentials.key;
}

export async function listMyKernels(context: vscode.ExtensionContext): Promise<any[]> {
  try {
    // First try CLI approach
    try {
      await setupKaggleEnvironment(context);
      OUTPUT.appendLine('Fetching your notebooks from Kaggle CLI...');
      const result = await executeKaggleCLI([
        'kernels',
        'list',
        '--mine',
        '--csv',
        '--page-size',
        '100',
      ]);

      if (result.code === 0) {
        // Parse CSV output
        const lines = result.stdout.trim().split('\n');
        if (lines.length <= 1) {
          OUTPUT.appendLine('Found 0 notebooks');
          return [];
        }

        const headers = lines[0].split(',');
        const kernels = lines.slice(1).map(line => {
          const values = line.split(',');
          const kernel: any = {};
          headers.forEach((header, index) => {
            kernel[header.toLowerCase()] = values[index] || '';
          });
          return kernel;
        });

        OUTPUT.appendLine(`Found ${kernels.length} notebooks`);
        return kernels;
      }
    } catch (cliError) {
      OUTPUT.appendLine(`CLI approach failed: ${cliError}`);
    }

    // Fallback to API approach
    OUTPUT.appendLine('Falling back to Kaggle API...');
    const credentials = await getKaggleCreds(context);
    const client = getKaggleApiClient();
    await client.setCredentials(credentials);

    const kernels = await client.listMyKernels(1, 100);
    OUTPUT.appendLine(`Found ${kernels.length} notebooks via API`);
    return kernels;
  } catch (error) {
    OUTPUT.appendLine(`Error: ${error}`);
    throw error;
  }
}

export async function pullKernel(
  context: vscode.ExtensionContext,
  kernelRef: string,
  outputPath: string
): Promise<void> {
  try {
    const credentials = await getKaggleCreds(context);
    const client = getKaggleApiClient();
    await client.setCredentials(credentials);

    const [userName, kernelSlug] = kernelRef.split('/');
    OUTPUT.appendLine(`Pulling kernel ${kernelRef}...`);

    await client.pullKernel(userName, kernelSlug, outputPath);
    OUTPUT.appendLine(`Kernel pulled to ${outputPath}`);
  } catch (error) {
    OUTPUT.appendLine(`Error: ${error}`);
    throw error;
  }
}

export async function pushKernel(
  context: vscode.ExtensionContext,
  kernelPath: string,
  isNew: boolean = false
): Promise<any> {
  try {
    const credentials = await getKaggleCreds(context);
    const client = getKaggleApiClient();
    await client.setCredentials(credentials);

    OUTPUT.appendLine(`Pushing kernel from ${kernelPath}...`);
    const result = await client.pushKernel(kernelPath, isNew);
    OUTPUT.appendLine(`Kernel pushed successfully. Run ID: ${result.id || 'N/A'}`);

    return result;
  } catch (error) {
    OUTPUT.appendLine(`Error: ${error}`);
    throw error;
  }
}

export async function getKernelStatus(
  context: vscode.ExtensionContext,
  kernelRef: string
): Promise<any> {
  try {
    const credentials = await getKaggleCreds(context);
    const client = getKaggleApiClient();
    await client.setCredentials(credentials);

    const [userName, kernelSlug] = kernelRef.split('/');
    const status = await client.getKernelStatus(userName, kernelSlug);

    return status;
  } catch (error) {
    OUTPUT.appendLine(`Error getting kernel status: ${error}`);
    throw error;
  }
}

export async function downloadKernelOutput(
  context: vscode.ExtensionContext,
  kernelRef: string,
  outputPath: string
): Promise<void> {
  try {
    const credentials = await getKaggleCreds(context);
    const client = getKaggleApiClient();
    await client.setCredentials(credentials);

    const [userName, kernelSlug] = kernelRef.split('/');
    OUTPUT.appendLine(`Downloading outputs for ${kernelRef}...`);

    await client.getKernelOutput(userName, kernelSlug, outputPath);
    OUTPUT.appendLine(`Outputs downloaded to ${outputPath}`);
  } catch (error) {
    OUTPUT.appendLine(`Error: ${error}`);
    throw error;
  }
}

export async function listDatasets(
  context: vscode.ExtensionContext,
  search?: string
): Promise<any[]> {
  try {
    // First try CLI approach
    try {
      await setupKaggleEnvironment(context);
      OUTPUT.appendLine('Fetching datasets from Kaggle CLI...');
      const args = ['datasets', 'list', '--csv'];
      if (search) {
        args.push('--search', search);
      }

      const result = await executeKaggleCLI(args);

      if (result.code === 0) {
        // Parse CSV output
        const lines = result.stdout.trim().split('\n');
        if (lines.length <= 1) {
          OUTPUT.appendLine('Found 0 datasets');
          return [];
        }

        const headers = lines[0].split(',');
        const datasets = lines.slice(1).map(line => {
          const values = line.split(',');
          const dataset: any = {};
          headers.forEach((header, index) => {
            dataset[header.toLowerCase()] = values[index] || '';
          });
          return dataset;
        });

        OUTPUT.appendLine(`Found ${datasets.length} datasets`);
        return datasets;
      }
    } catch (cliError) {
      OUTPUT.appendLine(`CLI approach failed: ${cliError}`);
    }

    // Fallback to API approach
    OUTPUT.appendLine('Falling back to Kaggle API...');
    const credentials = await getKaggleCreds(context);
    const client = getKaggleApiClient();
    await client.setCredentials(credentials);

    const datasets = await client.listDatasets(search);
    OUTPUT.appendLine(`Found ${datasets.length} datasets via API`);
    return datasets;
  } catch (error) {
    OUTPUT.appendLine(`Error: ${error}`);
    throw error;
  }
}

export async function downloadDataset(
  context: vscode.ExtensionContext,
  datasetRef: string,
  outputPath: string
): Promise<void> {
  try {
    const credentials = await getKaggleCreds(context);
    const client = getKaggleApiClient();
    await client.setCredentials(credentials);

    const [ownerSlug, datasetSlug] = datasetRef.split('/');
    OUTPUT.appendLine(`Downloading dataset ${datasetRef}...`);

    await client.downloadDataset(ownerSlug, datasetSlug, outputPath);
    OUTPUT.appendLine(`Dataset downloaded to ${outputPath}`);
  } catch (error) {
    OUTPUT.appendLine(`Error: ${error}`);
    throw error;
  }
}

export async function downloadDatasetFiles(
  context: vscode.ExtensionContext,
  datasetRef: string,
  outputPath: string
): Promise<string[]> {
  try {
    const credentials = await getKaggleCreds(context);
    const client = getKaggleApiClient();
    await client.setCredentials(credentials);

    const [ownerSlug, datasetSlug] = datasetRef.split('/');
    OUTPUT.appendLine(`Downloading dataset files for ${datasetRef}...`);

    const files = await client.downloadDatasetFiles(ownerSlug, datasetSlug, outputPath);
    OUTPUT.appendLine(`Downloaded ${files.length} files to ${outputPath}`);

    return files;
  } catch (error) {
    OUTPUT.appendLine(`Error: ${error}`);
    throw error;
  }
}

export async function submitToCompetition(
  context: vscode.ExtensionContext,
  competitionName: string,
  filePath: string,
  message: string
): Promise<any> {
  try {
    const credentials = await getKaggleCreds(context);
    const client = getKaggleApiClient();
    await client.setCredentials(credentials);

    OUTPUT.appendLine(`Submitting to competition ${competitionName}...`);
    const result = await client.submitToCompetition(competitionName, filePath, message);
    OUTPUT.appendLine(`Submission successful: ${JSON.stringify(result)}`);

    return result;
  } catch (error) {
    OUTPUT.appendLine(`Error: ${error}`);
    throw error;
  }
}

export async function listCompetitions(context: vscode.ExtensionContext): Promise<any[]> {
  try {
    const credentials = await getKaggleCreds(context);
    const client = getKaggleApiClient();
    await client.setCredentials(credentials);

    OUTPUT.appendLine('Fetching competitions from Kaggle API...');
    const competitions = await client.listCompetitions();
    OUTPUT.appendLine(`Found ${competitions.length} competitions`);

    return competitions;
  } catch (error) {
    OUTPUT.appendLine(`Error: ${error}`);
    throw error;
  }
}

// Legacy compatibility function for existing code
export async function runKaggleCLI(
  context: vscode.ExtensionContext,
  args: string[],
  cwd?: string
): Promise<ExecResult> {
  const command = args[0];
  const subCommand = args[1];

  try {
    // Map CLI commands to API calls
    switch (command) {
      case 'kernels':
        switch (subCommand) {
          case 'list':
            if (args.includes('--mine')) {
              const kernels = await listMyKernels(context);
              return {
                code: 0,
                stdout: JSON.stringify(kernels),
                stderr: '',
              };
            }
            break;
          case 'pull':
            const pullArgs = args.slice(2);
            const kernelRef = pullArgs.find(arg => !arg.startsWith('-'));
            const outputDir = cwd || process.cwd();
            if (kernelRef) {
              await pullKernel(context, kernelRef, outputDir);
              return { code: 0, stdout: 'Kernel pulled successfully', stderr: '' };
            }
            break;
          case 'push':
            const pushDir = cwd || process.cwd();
            await pushKernel(context, pushDir);
            return { code: 0, stdout: 'Kernel pushed successfully', stderr: '' };
          case 'status':
            const statusArgs = args.slice(2);
            const statusKernelRef = statusArgs.find(arg => !arg.startsWith('-'));
            if (statusKernelRef) {
              const status = await getKernelStatus(context, statusKernelRef);
              return { code: 0, stdout: JSON.stringify(status), stderr: '' };
            }
            break;
          case 'output':
            const outputArgs = args.slice(2);
            const outputKernelRef = outputArgs.find(arg => !arg.startsWith('-'));
            const outputDir2 = cwd || process.cwd();
            if (outputKernelRef) {
              await downloadKernelOutput(context, outputKernelRef, outputDir2);
              return { code: 0, stdout: 'Output downloaded successfully', stderr: '' };
            }
            break;
        }
        break;
      case 'datasets':
        switch (subCommand) {
          case 'list':
            const datasets = await listDatasets(context);
            return { code: 0, stdout: JSON.stringify(datasets), stderr: '' };
          case 'download':
            const downloadArgs = args.slice(2);
            const datasetRef = downloadArgs.find(arg => !arg.startsWith('-'));
            const downloadDir = cwd || process.cwd();
            if (datasetRef) {
              await downloadDataset(context, datasetRef, downloadDir);
              return { code: 0, stdout: 'Dataset downloaded successfully', stderr: '' };
            }
            break;
          case 'files':
            const filesArgs = args.slice(2);
            const filesDatasetRef = filesArgs.find(arg => !arg.startsWith('-'));
            const filesDir = cwd || process.cwd();
            if (filesDatasetRef) {
              const files = await downloadDatasetFiles(context, filesDatasetRef, filesDir);
              return { code: 0, stdout: files.join('\n'), stderr: '' };
            }
            break;
        }
        break;
      case 'competitions':
        switch (subCommand) {
          case 'submit':
            const submitArgs = args.slice(2);
            const competitionName = submitArgs[0];
            const filePath = submitArgs.find(arg => arg.startsWith('-f'))?.split('=')[1];
            const message =
              submitArgs.find(arg => arg.startsWith('-m'))?.split('=')[1] ||
              'Submission from VS Code';
            if (competitionName && filePath) {
              const result = await submitToCompetition(context, competitionName, filePath, message);
              return { code: 0, stdout: JSON.stringify(result), stderr: '' };
            }
            break;
          case 'list':
            const competitions = await listCompetitions(context);
            return { code: 0, stdout: JSON.stringify(competitions), stderr: '' };
        }
        break;
    }

    throw new Error(`Unsupported command: ${args.join(' ')}`);
  } catch (error) {
    return {
      code: 1,
      stdout: '',
      stderr: `Error: ${error}`,
    };
  }
}
