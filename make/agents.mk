# make/agents.mk - Agent Ecosystem targets
#
# Targets for running agent tests, validation, and
# agent-specific operations.
#
# All agent commands go through npm scripts.

.PHONY: agent-test agent-test-dry agent-test-list agent-validate

agent-test: ## Run all agent tests
	@printf "$(BLUE)Running agent tests...$(NC)\n"
	npm run test-agents

agent-test-dry: ## Dry-run agent tests (preview only)
	npm run test-agents-dry

agent-test-list: ## List all agent test IDs
	npm run test-agents-list

agent-test-validate: ## Validate agent test naming convention
	npm run test-agents-validate
