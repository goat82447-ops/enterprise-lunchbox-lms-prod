# Healing Agents

This directory contains healing agent configurations for automated GitHub workflow operations.

## Overview

Healing agents are autonomous workflows that monitor and automate common GitHub tasks:

- **Issue Analysis**: Automatically categorize and analyze issues
- **PR Review**: Automated code review and validation
- **Dependency Management**: Keep dependencies updated and secure

## Files

- `config.yaml` - Central configuration for all agents
- `healing-agent-1.yaml` - Issue Analyzer agent
- `healing-agent-2.yaml` - PR Reviewer agent
- `healing-agent-3.yaml` - Dependency Updater agent

## Compilation

Agents are compiled via the GitHub Actions workflow:

```bash
gh aw compile
```

Compiled output is stored in `dist/` directory.

## Usage

1. Modify agent configurations as needed
2. Push changes to `agents/**` directory
3. GitHub Actions will automatically compile and validate
4. Artifacts are uploaded for review

## Adding New Agents

Create a new YAML file following the structure of existing agents:

```yaml
name: "your-agent-name"
version: "1.0.0"
description: "Description of what this agent does"

triggers:
  - type: "trigger_type"

actions:
  - name: "action_name"
    description: "What this action does"
```

## Resources

- [GitHub Agentic Workflow Documentation](https://github.com/github/gh-aw)
- [Agent Configuration Guide](./config.yaml)
