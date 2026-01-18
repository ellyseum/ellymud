# make/artifacts.mk - Pipeline Artifact Synchronization targets
#
# Targets for listing and syncing pipeline artifacts
# between local development and hub codespace.
#
# All artifact commands go through npm scripts.

.PHONY: artifact-list artifact-push artifact-pull
.PHONY: artifact-push-dry artifact-pull-dry

artifact-list: ## List all pipeline artifacts
	@printf "$(BLUE)Listing pipeline artifacts...$(NC)\n"
	npm run artifact:list

artifact-push: ## Sync artifacts TO hub codespace
	@printf "$(BLUE)Pushing artifacts to hub...$(NC)\n"
	npm run artifact:push

artifact-pull: ## Sync artifacts FROM hub codespace
	@printf "$(BLUE)Pulling artifacts from hub...$(NC)\n"
	npm run artifact:pull

artifact-push-dry: ## Preview push to hub (dry run)
	@printf "$(BLUE)Previewing artifact push...$(NC)\n"
	npm run artifact:push-dry

artifact-pull-dry: ## Preview pull from hub (dry run)
	@printf "$(BLUE)Previewing artifact pull...$(NC)\n"
	npm run artifact:pull-dry
