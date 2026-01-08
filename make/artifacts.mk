# make/artifacts.mk - Pipeline Artifact Synchronization targets
#
# Targets for listing and syncing pipeline artifacts
# between local development and hub codespace.

.PHONY: artifact-list artifact-push artifact-pull
.PHONY: artifact-push-dry artifact-pull-dry

artifact-list: ## List all pipeline artifacts
	@printf "$(BLUE)Listing pipeline artifacts...$(NC)\n"
	@$(SCRIPTS_DIR)/pipeline-artifacts-list.sh

artifact-push: ## Sync artifacts TO hub codespace
	@printf "$(BLUE)Pushing artifacts to hub...$(NC)\n"
	@$(SCRIPTS_DIR)/sync-to-hub.sh

artifact-pull: ## Sync artifacts FROM hub codespace
	@printf "$(BLUE)Pulling artifacts from hub...$(NC)\n"
	@$(SCRIPTS_DIR)/sync-from-hub.sh

artifact-push-dry: ## Preview push to hub (dry run)
	@printf "$(BLUE)Previewing artifact push...$(NC)\n"
	@$(SCRIPTS_DIR)/sync-to-hub.sh --dry-run

artifact-pull-dry: ## Preview pull from hub (dry run)
	@printf "$(BLUE)Previewing artifact pull...$(NC)\n"
	@$(SCRIPTS_DIR)/sync-from-hub.sh --dry-run
