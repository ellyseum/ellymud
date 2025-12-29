# GitHub Workflows - LLM Context

## Overview

This directory contains GitHub Actions workflow YAML files for CI/CD automation.

## File Reference

Currently no workflows are defined. Future workflows will include:
- `ci.yml` - Run tests and linting on pull requests
- `release.yml` - Automated releases and deployments

## Conventions

### Workflow Structure

```yaml
name: Workflow Name
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  job-name:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
```

## Related Context

- [../../Makefile](../../Makefile) - Make targets that CI workflows should mirror
- [../../package.json](../../package.json) - npm scripts used by workflows
