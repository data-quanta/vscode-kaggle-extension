# Kaggle: Sync & Run

Develop locally, run on Kaggle compute. Push notebooks/scripts, choose CPU/GPU/TPU, attach datasets, and auto-download outputs — all from VS Code.

## Requirements
- Kaggle CLI installed: https://github.com/Kaggle/kaggle-api (ensure `kaggle` is on your PATH)
- A Kaggle API token

## Authentication
- Preferred: set env var `KAGGLE_TOKEN_JSON` to your kaggle.json content (e.g., `{ "username": "...", "key": "..." }`).
- Or use “Kaggle: Sign In” (prompts for username and key). Token is stored in VS Code Secret Storage.
- “Kaggle: Sign Out” clears the stored token.

## Quick start
1) Sign In: open any Kaggle view (Runs / My Notebooks / Datasets) and use the three-dots menu → Kaggle: Sign In.
2) Init: run “Kaggle: Init Project” to create `kaggle.yml` and `kernel-metadata.json`.
3) Open a `.ipynb` and click the rocket “Run on Kaggle”.
4) Outputs auto-download to `.kaggle-outputs` (configurable). You can also run “Kaggle: Download Outputs”.

## Features
- Notebook toolbar button: “Run on Kaggle” (respects `kaggle.yml` accelerator/internet; prompts only if missing)
- Auto-poll and download outputs when run completes
- My Notebooks view: list your kernels; click to download/open locally under `remote_notebooks/<user__slug>`
- Datasets view: list datasets; right-click to Attach, Browse Files (preview/download a single file), or Download all
- Runs view: shows recent run URLs (from `.kaggle-run.log`)

## Key commands
- Kaggle: Sign In / Sign Out
- Kaggle: Init Project
- Kaggle: Link to Existing Notebook
- Run on Kaggle (toolbar/menus)
- Kaggle: Download Outputs
- Kaggle: Attach Dataset / Attach from tree
- Kaggle: Browse Dataset Files / Download Dataset
- Kaggle: Submit to Competition

## Configuration
- `kaggle.cliPath`: path to Kaggle CLI (default: `kaggle`)
- `kaggle.defaultAccelerator`: `none` | `gpu` | `tpu` (default: `none`)
- `kaggle.defaultInternet`: boolean (default: `false`)
- `kaggle.outputsFolder`: outputs download folder (default: `.kaggle-outputs`)
- `kaggle.autoDownloadOnComplete`: auto download outputs (default: `true`)
- `kaggle.pollIntervalSeconds` / `kaggle.pollTimeoutSeconds`: output polling behavior

## Project files
- `kaggle.yml` — extension config (code_file, accelerator, internet, privacy, datasets, competitions, outputs)
- `kernel-metadata.json` — Kaggle notebook metadata read by the CLI

### Example `kaggle.yml`
```
project: my-project
kernel_slug: yourname/my-awesome-kernel
code_file: notebook.ipynb
accelerator: gpu
internet: false
privacy: private
datasets: []
competitions: []
outputs:
  download_to: .kaggle-outputs/
```

## Folders used by the extension
- `.kaggle-outputs/` — run outputs (auto-downloaded)
- `.kaggle-datasets/<user__dataset>/` — dataset downloads
- `remote_notebooks/<user__slug>/` — notebooks pulled from My Notebooks

## Troubleshooting
- “Not found” in My Notebooks: we fallback to `kaggle kernels list --mine`. Ensure you’re signed in.
- CLI missing: set `kaggle.cliPath` to the full path of the CLI.
- No outputs: ensure the run finished or increase timeouts (`kaggle.pollTimeoutSeconds`).
- Auth: you can set `KAGGLE_TOKEN_JSON` or use Sign In (username/key prompt). Sign Out clears stored token.

## Development & testing
- Build: `npm run compile`
- Watch: `npm run watch`
- Tests: `npm test` (integration tests via `@vscode/test-electron`; optional E2E require CLI + creds)

## Security notes
- API token is kept in VS Code Secret Storage. The extension never writes kaggle.json to disk.