# 🎯 bun-spaces

A powerful CLI tool for managing Bun workspaces with style! Run commands across your monorepo workspaces with ease.

## 🚀 Features

- 📦 List and filter workspaces
- 🛠️ Execute scripts across multiple workspaces
- ⚡ Parallel execution support
- 🎯 Pattern-based workspace filtering
- 📊 Detailed workspace information
- 🔄 Dependency-aware script execution

## 📥 Installation

```bash
# Using npm
npm install -g bun-spaces

# Using bun
bun install -g bun-spaces

# install locally in a project
bun install bun-spaces
```

## 🎮 Usage

### List Workspaces

```bash
# List all workspaces
bun-spaces list

# List with name only
bun-spaces list --name-only

# List as JSON
bun-spaces list --json

# Filter workspaces by pattern
bun-spaces list "packages/*"
```

### List Available Scripts

```bash
# List all scripts
bun-spaces list-scripts

# Show script names only
bun-spaces list-scripts --name-only
```

### Get Workspace Info

```bash
# Show detailed workspace information
bun-spaces info <workspace-name>
```

### Run Scripts

```bash
# Run in specific workspace
bun-spaces run @myorg/package-a build

# Run in multiple workspaces using patterns
bun-spaces run "packages/*" test

# Run with multiple filters
bun-spaces run --filter packages/* --filter tools/* build

# Run in parallel
bun-spaces run --parallel "packages/*" test

# Run including dependencies
bun-spaces run --deps @myorg/package-a build

# Run with additional arguments
bun-spaces run packages/* test --coverage
```

### Advanced Options

```bash
# Stream output with prefixes
bun-spaces run --stream packages/* test

# Continue on failure
bun-spaces run --no-bail packages/* test

# Dry run to see what would be executed
bun-spaces run --dry-run packages/* build

# Run only if script exists
bun-spaces run --if-script-exists packages/* lint
```

## 🎛️ Global Options

- `-l, --log-level <level>` - Set logging level (silent, error, warn, info, debug)
- `-d, --cwd <dir>` - Set working directory

## 🤝 Contributing

Contributions are welcome! Feel free to:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

MIT

## 🙏 Credits

Based on the original work by [Scott Morse](https://github.com/ScottMorse/bun-workspaces)

---

Made with ❤️ for the Bun community
