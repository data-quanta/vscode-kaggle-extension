# 🚀 Kaggle Studio - VS Code Extension

**Develop locally, run on Kaggle's compute infrastructure.** Push notebooks and scripts, configure GPU/TPU settings, attach datasets, and download outputs — all integrated into VS Code.

---

## ✨ Features

### 🖥️ **Seamless Local Development**
- Write and debug your notebooks/scripts locally in VS Code
- One-click deployment to Kaggle's cloud infrastructure
- No external dependencies - connects directly to Kaggle's API

### ⚡ **Kaggle Compute Integration**
- Configure GPU/TPU settings for your notebooks
- Enable/disable internet access per run
- Choose accelerator type (none/GPU/TPU) per project

### 📊 **Dataset Management**
- Browse popular Kaggle datasets in sidebar
- Attach datasets to your projects
- Download datasets to local folders

### 🏆 **Competition Integration**
- Submit directly to Kaggle competitions
- Simple submission workflow with file selection

### 🔄 **Workflow Automation**
- Auto-download outputs when runs complete
- Configurable run status polling
- Basic run logging and history
- Smart project initialization and linking

---

## 🚀 Quick Start

### 1️⃣ **Install & Authenticate**
```bash
# Install the extension from VS Code Marketplace
# Then get your Kaggle API token
```

1. Go to [Kaggle Account Settings](https://www.kaggle.com/account)
2. Create a new API token (downloads `kaggle.json`)
3. **Sign in** using one of these methods:
   - Use **"Kaggle: Sign In"** command in VS Code (recommended)
   - Set `KAGGLE_TOKEN_JSON` environment variable

### 2️⃣ **Initialize Your Project**
```bash
# Run the command palette (Ctrl/Cmd + Shift + P)
> Kaggle: Init Project
```
This creates:
- `kaggle.yml` - Project configuration
- `kernel-metadata.json` - Notebook metadata

### 3️⃣ **Run on Kaggle**
1. Open any `.ipynb` notebook
2. Click the 🚀 **"Run on Kaggle"** button in the toolbar
3. Choose your compute preferences (GPU/TPU, Internet)
4. Your notebook gets pushed and executed on Kaggle

### 4️⃣ **Get Your Results**
- Outputs automatically download to `.kaggle-outputs/` when complete
- Extension polls Kaggle periodically to check run status
- View run URLs from the Runs panel

---

## 📋 Key Commands

| Command | Description | Shortcut |
|---------|-------------|----------|
| **Kaggle: Sign In** | Authenticate with Kaggle | - |
| **Kaggle: Init Project** | Set up project files | - |
| **Run on Kaggle** | Deploy and run notebook | Toolbar button 🚀 |
| **Kaggle: Download Outputs** | Get run results | - |
| **Kaggle: Check API Status** | Verify connection | - |
| **Kaggle: Attach Dataset** | Add dataset to project | Right-click in Datasets |
| **Kaggle: Submit to Competition** | Submit competition entry | - |

---

## 🎯 Use Cases

### 🧪 **Machine Learning Research**
- Prototype locally with fast iteration
- Scale up training on GPU/TPU infrastructure
- Access to 50,000+ datasets instantly

### 📈 **Data Science Projects** 
- Explore datasets in familiar VS Code environment
- Leverage Kaggle's compute for heavy processing
- Share and collaborate through Kaggle notebooks

### 🏆 **Kaggle Competitions**
- Develop solutions locally with full IDE support
- Test on powerful hardware without setup
- Submit entries directly from VS Code

### 🎓 **Learning & Education**
- Access Kaggle's datasets for learning
- Practice with cloud compute resources
- Build projects using Kaggle's platform

---

## ⚙️ Configuration

### Project Configuration (`kaggle.yml`)
```yaml
project: my-awesome-project
kernel_slug: username/my-project
code_file: notebook.ipynb
accelerator: gpu          # none | gpu | tpu
internet: true           # Enable internet access
privacy: private         # private | public
datasets:
  - username/dataset-name
competitions:
  - competition-name
outputs:
  download_to: .kaggle-outputs/
```

### Extension Settings
| Setting | Default | Description |
|---------|---------|-------------|
| `kaggle.defaultAccelerator` | `none` | Default compute type |
| `kaggle.defaultInternet` | `false` | Default internet access |
| `kaggle.outputsFolder` | `.kaggle-outputs` | Output download location |
| `kaggle.autoDownloadOnComplete` | `true` | Auto-download results |
| `kaggle.pollIntervalSeconds` | `30` | Status check frequency |

---

## 📁 Project Structure

```
your-project/
├── notebook.ipynb              # Your main notebook
├── kaggle.yml                  # Project configuration  
├── kernel-metadata.json        # Kaggle metadata
├── .kaggle-outputs/           # Downloaded results
├── .kaggle-run.log            # Run history log
├── .kaggle-datasets/          # Cached datasets
└── remote_notebooks/          # Pulled notebooks
```

---

## 🛡️ Security & Privacy

- **Secure Storage**: API tokens stored in VS Code's secure secret storage
- **No File Writes**: Extension never writes `kaggle.json` to disk
- **Privacy Control**: Choose public or private for each notebook
- **Local Development**: Code stays local until you explicitly push

---

## 🔧 Development & Contributing

### Building from Source
```bash
git clone https://github.com/data-quanta/vscode-kaggle-extension
cd vscode-kaggle-extension
npm install
npm run compile
```

### Running Tests
```bash
npm test
```

### Contributing
We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

---

## 📊 What's New

### v1.1.0 - Direct API Integration
- ✅ **No external dependencies** - Direct Kaggle API integration
- ✅ **Faster execution** - No CLI subprocess overhead  
- ✅ **Better error handling** - Clear, actionable error messages
- ✅ **Improved reliability** - Robust API connection management

---

## 🆘 Support & Troubleshooting

### Common Issues

**🔐 Authentication Problems**
```bash
# Check API status
> Kaggle: Check API Status

# Re-authenticate  
> Kaggle: Sign Out
> Kaggle: Sign In
```

**📊 Missing Outputs**
- Ensure run completed successfully
- Check `kaggle.pollTimeoutSeconds` setting
- Verify output folder permissions

**🔗 Connection Issues**
- Verify internet connection
- Check Kaggle API status
- Confirm API token is valid

### Getting Help
- 📖 [Documentation](https://github.com/data-quanta/vscode-kaggle-extension)
- 🐛 [Report Issues](https://github.com/data-quanta/vscode-kaggle-extension/issues)
- 💬 [Discussions](https://github.com/data-quanta/vscode-kaggle-extension/discussions)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**⭐ If you find this extension helpful, please consider giving it a star on [GitHub](https://github.com/data-quanta/vscode-kaggle-extension)!**

[Install from Marketplace](https://marketplace.visualstudio.com/items?itemName=DataQuanta.vscode-kaggle-run) • [View Source](https://github.com/data-quanta/vscode-kaggle-extension) • [Report Issues](https://github.com/data-quanta/vscode-kaggle-extension/issues)

</div>
