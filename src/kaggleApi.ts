import axios, { AxiosInstance } from 'axios';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const FormData = require('form-data');
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export interface KaggleCredentials {
  username: string;
  key: string;
}

export interface KaggleKernel {
  ref: string;
  title: string;
  author: string;
  slug: string;
  lastRunTime?: string;
  language: string;
  kernelType: string;
  isPrivate: boolean;
  enableGpu: boolean;
  enableTpu: boolean;
  enableInternet: boolean;
  categoryIds: number[];
  datasetDataSources: string[];
  competitionDataSources: string[];
  kernelDataSources: string[];
}

export interface KaggleDataset {
  ref: string;
  title: string;
  size: number;
  lastUpdated: string;
  downloadCount: number;
  isPrivate: boolean;
  isReviewed: boolean;
  isFeatured: boolean;
  licenseName: string;
  description: string;
  ownerName: string;
  ownerRef: string;
  kernelCount: number;
  titleNullable: string;
  subtitleNullable: string;
  creatorName: string;
  creatorRef: string;
}

export interface KaggleRun {
  id: number;
  title: string;
  creationDate: string;
  status: string;
  stopReason?: string;
}

export class KaggleApiClient {
  private client: AxiosInstance;
  private credentials: KaggleCredentials | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: 'https://www.kaggle.com/api/v1',
      timeout: 30000,
      headers: {
        'User-Agent': 'Kaggle VS Code Extension',
      },
    });
  }

  async setCredentials(credentials: KaggleCredentials): Promise<void> {
    this.credentials = credentials;
    this.client.defaults.auth = {
      username: credentials.username,
      password: credentials.key,
    };
  }

  async testAuthentication(): Promise<boolean> {
    try {
      await this.client.get('/kernels/list?mine=true&page=1&pageSize=1');
      return true;
    } catch {
      return false;
    }
  }

  // Kernels API
  async listMyKernels(page: number = 1, pageSize: number = 20): Promise<KaggleKernel[]> {
    try {
      const response = await this.client.get(`/kernels/list`, {
        params: {
          mine: 'true',
          page: page,
          pageSize: pageSize,
        },
      });
      return response.data;
    } catch (error: any) {
      // Log more detailed error information
      const errorDetails = error.response
        ? {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data,
            url: error.config?.url,
            params: error.config?.params,
          }
        : error.message;
      console.error('Failed to list kernels - detailed error:', errorDetails);
      throw new Error(
        `Failed to list kernels: ${error.response?.status} ${error.response?.statusText || error.message}`
      );
    }
  }

  async pullKernel(userName: string, kernelSlug: string, outputPath: string): Promise<void> {
    try {
      const response = await this.client.get(`/kernels/pull`, {
        params: {
          userName,
          kernelSlug,
          language: 'all',
          kernelType: 'all',
        },
      });

      // Create output directory if it doesn't exist
      if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath, { recursive: true });
      }

      // Save kernel metadata
      const metadataPath = path.join(outputPath, 'kernel-metadata.json');
      fs.writeFileSync(metadataPath, JSON.stringify(response.data.metadata, null, 2));

      // Save source files
      if (response.data.blob) {
        const sourcePath = path.join(outputPath, response.data.blob.name || 'notebook.ipynb');
        fs.writeFileSync(sourcePath, response.data.blob.source);
      }
    } catch (error) {
      throw new Error(`Failed to pull kernel: ${error}`);
    }
  }

  async pushKernel(kernelPath: string, newKernel: boolean = false): Promise<KaggleRun> {
    try {
      const form = new FormData();

      // Read kernel metadata
      const metadataPath = path.join(kernelPath, 'kernel-metadata.json');
      if (!fs.existsSync(metadataPath)) {
        throw new Error('kernel-metadata.json not found');
      }

      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      form.append('text', JSON.stringify(metadata));

      // Read source file
      const sourceFiles = fs
        .readdirSync(kernelPath)
        .filter(
          f => f.endsWith('.ipynb') || f.endsWith('.py') || f.endsWith('.r') || f.endsWith('.rmd')
        );

      if (sourceFiles.length === 0) {
        throw new Error('No source file found');
      }

      const sourceFile = sourceFiles[0];
      const sourcePath = path.join(kernelPath, sourceFile);
      form.append('blob', fs.createReadStream(sourcePath), sourceFile);

      const endpoint = newKernel ? '/kernels/push' : '/kernels/push';
      const response = await this.client.post(endpoint, form, {
        headers: {
          ...form.getHeaders(),
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error) {
      throw new Error(`Failed to push kernel: ${error}`);
    }
  }

  async getKernelStatus(userName: string, kernelSlug: string): Promise<any> {
    try {
      const response = await this.client.get(`/kernels/status`, {
        params: { userName, kernelSlug },
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get kernel status: ${error}`);
    }
  }

  async getKernelOutput(userName: string, kernelSlug: string, outputPath: string): Promise<void> {
    try {
      const response = await this.client.get(`/kernels/output`, {
        params: { userName, kernelSlug },
        responseType: 'stream',
      });

      // Create output directory if it doesn't exist
      if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath, { recursive: true });
      }

      const zipPath = path.join(outputPath, 'output.zip');
      const writer = fs.createWriteStream(zipPath);

      response.data.pipe(writer);

      return new Promise<void>((resolve, reject) => {
        writer.on('finish', () => resolve());
        writer.on('error', reject);
      });
    } catch (error) {
      throw new Error(`Failed to get kernel output: ${error}`);
    }
  }

  // Datasets API
  async listDatasets(
    search?: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<KaggleDataset[]> {
    try {
      const params: any = { page, pageSize };
      if (search) {
        params.search = search;
      }

      const response = await this.client.get('/datasets/list', { params });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to list datasets: ${error}`);
    }
  }

  async downloadDataset(ownerSlug: string, datasetSlug: string, outputPath: string): Promise<void> {
    try {
      const response = await this.client.get(`/datasets/download/${ownerSlug}/${datasetSlug}`, {
        responseType: 'stream',
      });

      // Create output directory if it doesn't exist
      if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath, { recursive: true });
      }

      const zipPath = path.join(outputPath, `${datasetSlug}.zip`);
      const writer = fs.createWriteStream(zipPath);

      response.data.pipe(writer);

      return new Promise<void>((resolve, reject) => {
        writer.on('finish', () => resolve());
        writer.on('error', reject);
      });
    } catch (error) {
      throw new Error(`Failed to download dataset: ${error}`);
    }
  }

  async downloadDatasetFiles(
    ownerSlug: string,
    datasetSlug: string,
    outputPath: string
  ): Promise<string[]> {
    try {
      const response = await this.client.get(`/datasets/list/${ownerSlug}/${datasetSlug}/files`);
      const files: string[] = [];

      for (const file of response.data) {
        const fileResponse = await this.client.get(
          `/datasets/download/${ownerSlug}/${datasetSlug}/${file.name}`,
          { responseType: 'stream' }
        );

        // Create output directory if it doesn't exist
        if (!fs.existsSync(outputPath)) {
          fs.mkdirSync(outputPath, { recursive: true });
        }

        const filePath = path.join(outputPath, file.name);
        const writer = fs.createWriteStream(filePath);

        fileResponse.data.pipe(writer);

        await new Promise<void>((resolve, reject) => {
          writer.on('finish', () => resolve());
          writer.on('error', reject);
        });

        files.push(filePath);
      }

      return files;
    } catch (error) {
      throw new Error(`Failed to download dataset files: ${error}`);
    }
  }

  // Competitions API
  async submitToCompetition(
    competitionName: string,
    filePath: string,
    message: string
  ): Promise<any> {
    try {
      const form = new FormData();
      form.append('blobs', fs.createReadStream(filePath), path.basename(filePath));
      form.append('submissionDescription', message);

      const response = await this.client.post(
        `/competitions/submissions/submit/${competitionName}`,
        form,
        {
          headers: {
            ...form.getHeaders(),
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      return response.data;
    } catch (error) {
      throw new Error(`Failed to submit to competition: ${error}`);
    }
  }

  async listCompetitions(page: number = 1, pageSize: number = 20): Promise<any[]> {
    try {
      const response = await this.client.get('/competitions/list', {
        params: { page, pageSize },
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to list competitions: ${error}`);
    }
  }
}

// Singleton instance
let apiClient: KaggleApiClient | null = null;

export function getKaggleApiClient(): KaggleApiClient {
  if (!apiClient) {
    apiClient = new KaggleApiClient();
  }
  return apiClient;
}

// Helper function to get credentials from VS Code storage or environment
export async function getKaggleCredentials(): Promise<KaggleCredentials | null> {
  // First try environment variable
  const envToken = process.env.KAGGLE_TOKEN_JSON;
  if (envToken) {
    try {
      const parsed = JSON.parse(envToken);
      return {
        username: parsed.username,
        key: parsed.key,
      };
    } catch (error) {
      console.error('Failed to parse KAGGLE_TOKEN_JSON:', error);
    }
  }

  // Then try VS Code secret storage
  try {
    const storedToken = (await vscode.workspace
      .getConfiguration()
      .get('kaggle.storedToken')) as string;
    if (storedToken) {
      const parsed = JSON.parse(storedToken);
      return {
        username: parsed.username,
        key: parsed.key,
      };
    }
  } catch (error) {
    console.error('Failed to get stored token:', error);
  }

  return null;
}

export async function initializeKaggleApi(): Promise<boolean> {
  const client = getKaggleApiClient();
  const credentials = await getKaggleCredentials();

  if (!credentials) {
    return false;
  }

  await client.setCredentials(credentials);
  return await client.testAuthentication();
}
