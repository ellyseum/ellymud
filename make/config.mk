# make/config.mk - Shared configuration and variables
#
# This file contains shared variables, colors, and configuration
# used across all Makefile shards.

# Project paths
PROJECT_ROOT := $(shell pwd)
SCRIPTS_DIR := $(PROJECT_ROOT)/scripts
AGENT_TESTS_DIR := $(PROJECT_ROOT)/.github/agents/agent-tests

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[1;33m
RED := \033[0;31m
CYAN := \033[0;36m
NC := \033[0m

# Common directories
DATA_DIR := data
LOGS_DIR := logs
DIST_DIR := dist
BACKUP_DIR := backups

# Default shell
SHELL := /bin/bash
