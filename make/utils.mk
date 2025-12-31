# make/utils.mk - Utilities & Maintenance targets
#
# Targets for cleaning, logging, backup, and general
# maintenance tasks.

.PHONY: clean clean-dist clean-logs clean-all
.PHONY: logs logs-follow logs-error logs-error-follow logs-mcp logs-mcp-follow
.PHONY: backup-data reset-data
.PHONY: pipeline-report

#-----------------------------------------------------------------------------
# Cleaning
#-----------------------------------------------------------------------------

clean: clean-dist clean-logs ## Clean all generated files

clean-dist: ## Remove dist directory
	@printf "$(YELLOW)Cleaning dist...$(NC)\n"
	rm -rf $(DIST_DIR)

clean-logs: ## Remove log files
	@printf "$(YELLOW)Cleaning logs...$(NC)\n"
	rm -rf $(LOGS_DIR)/*/*.log $(LOGS_DIR)/*/*.json

clean-all: clean ## Clean everything including node_modules
	@printf "$(YELLOW)Cleaning node_modules...$(NC)\n"
	rm -rf node_modules

#-----------------------------------------------------------------------------
# Log viewing
#-----------------------------------------------------------------------------

logs: ## Show recent system logs (last 50 lines)
	@if ls $(LOGS_DIR)/system/system-*.log 1>/dev/null 2>&1; then \
		tail -50 $(LOGS_DIR)/system/system-*.log; \
	else printf "$(YELLOW)No system logs found$(NC)\n"; fi

logs-follow: ## Follow system logs (interactive, Ctrl+C to exit)
	@if ls $(LOGS_DIR)/system/system-*.log 1>/dev/null 2>&1; then \
		tail -f $(LOGS_DIR)/system/system-*.log; \
	else printf "$(YELLOW)No system logs found$(NC)\n"; fi

logs-error: ## Show recent error logs (last 50 lines)
	@if ls $(LOGS_DIR)/error/error-*.log 1>/dev/null 2>&1; then \
		tail -50 $(LOGS_DIR)/error/error-*.log; \
	else printf "$(YELLOW)No error logs found$(NC)\n"; fi

logs-error-follow: ## Follow error logs (interactive)
	@if ls $(LOGS_DIR)/error/error-*.log 1>/dev/null 2>&1; then \
		tail -f $(LOGS_DIR)/error/error-*.log; \
	else printf "$(YELLOW)No error logs found$(NC)\n"; fi

logs-mcp: ## Show recent MCP logs (last 50 lines)
	@if ls $(LOGS_DIR)/mcp/mcp-*.log 1>/dev/null 2>&1; then \
		tail -50 $(LOGS_DIR)/mcp/mcp-*.log; \
	else printf "$(YELLOW)No MCP logs found$(NC)\n"; fi

logs-mcp-follow: ## Follow MCP logs (interactive)
	@if ls $(LOGS_DIR)/mcp/mcp-*.log 1>/dev/null 2>&1; then \
		tail -f $(LOGS_DIR)/mcp/mcp-*.log; \
	else printf "$(YELLOW)No MCP logs found$(NC)\n"; fi

#-----------------------------------------------------------------------------
# Data management
#-----------------------------------------------------------------------------

backup-data: ## Backup data directory
	@printf "$(BLUE)Backing up data...$(NC)\n"
	@mkdir -p $(BACKUP_DIR)
	@tar -czf $(BACKUP_DIR)/data-$(shell date +%Y%m%d-%H%M%S).tar.gz $(DATA_DIR)/
	@printf "$(GREEN)Backup created in $(BACKUP_DIR)/$(NC)\n"

reset-data: ## Reset data to defaults (DESTRUCTIVE)
	@printf "$(RED)WARNING: This will reset all game data!$(NC)\n"
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ] || exit 1
	@rm -rf $(DATA_DIR)/*.json
	@$(MAKE) init-data
	@printf "$(GREEN)Data reset complete$(NC)\n"

#-----------------------------------------------------------------------------
# Data migration (JSON <-> Database)
#-----------------------------------------------------------------------------

.PHONY: data-status data-export data-import data-backup
.PHONY: data-switch-json data-switch-sqlite data-switch-postgres

data-status: ## Show current storage backend and data counts
	@npx ts-node scripts/data-migrate.ts status

data-export: ## Export database to JSON files
	@npx ts-node scripts/data-migrate.ts export

data-import: ## Import JSON files into database
	@npx ts-node scripts/data-migrate.ts import

data-backup: ## Create timestamped backup of all data
	@npx ts-node scripts/data-migrate.ts backup

data-switch-json: ## Switch to JSON storage backend
	@npx ts-node scripts/data-migrate.ts switch json

data-switch-sqlite: ## Switch to SQLite storage backend
	@npx ts-node scripts/data-migrate.ts switch sqlite

data-switch-postgres: ## Switch to PostgreSQL storage backend
	@npx ts-node scripts/data-migrate.ts switch postgres

#-----------------------------------------------------------------------------
# Pipeline Metrics
#-----------------------------------------------------------------------------

pipeline-report: ## Generate agent pipeline metrics report
	@./scripts/generate-pipeline-report.sh