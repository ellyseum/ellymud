# make/agents.mk - Agent Ecosystem targets
#
# Targets for running agent tests, validation, and
# agent-specific operations.

.PHONY: agent-test agent-test-dry agent-test-list agent-validate
.PHONY: agent-research agent-planning agent-implementation agent-validation

agent-test: ## Run all agent tests
	@printf "$(BLUE)Running agent tests...$(NC)\n"
	npm run test-agents

agent-test-dry: ## Dry-run agent tests (preview only)
	npm run test-agents-dry

agent-test-list: ## List all agent test IDs
	npm run test-agents-list

agent-validate: ## Validate agent test naming convention
	npm run test-agents-validate

agent-research: ## Run research agent tests only
	$(AGENT_TESTS_DIR)/run-tests.sh research

agent-planning: ## Run planning agent tests only
	$(AGENT_TESTS_DIR)/run-tests.sh planning

agent-implementation: ## Run implementation agent tests only
	$(AGENT_TESTS_DIR)/run-tests.sh implementation

agent-validation: ## Run validation agent tests only
	$(AGENT_TESTS_DIR)/run-tests.sh validation
