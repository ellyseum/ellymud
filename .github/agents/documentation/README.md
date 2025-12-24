# Documentation Agent Outputs

This directory contains outputs from the Documentation Updater Agent.

## Purpose

The Documentation Updater Agent produces reports documenting what README.md and AGENTS.md files were created or updated during pipeline execution.

## Contents

- `docs_<topic>_<timestamp>.md` - Documentation update reports
- `docs_<topic>_<timestamp>-reviewed.md` - Reports reviewed by Output Review Agent
- `docs_<topic>_<timestamp>-grade.md` - Grade reports from Output Review Agent

## Note

All output files except README.md and AGENTS.md are git-ignored as they are session-specific artifacts.
