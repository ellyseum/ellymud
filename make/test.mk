# make/test.mk - Testing targets
#
# Targets for running tests, validation, and checks
# on the codebase and data files.

.PHONY: test test-build test-start validate check ci

test: test-build ## Run all tests
	@printf "$(GREEN)All tests passed$(NC)\n"

test-build: ## Test that build completes
	@printf "$(BLUE)Testing build...$(NC)\n"
	npm run build

test-start: ## Test server startup (starts and stops)
	@printf "$(BLUE)Testing server startup...$(NC)\n"
	@timeout 5 npm start 2>&1 | head -20; \
	EXIT_CODE=$${PIPESTATUS[0]}; \
	if [ $$EXIT_CODE -eq 124 ]; then printf "$(GREEN)Server started successfully (timeout as expected)$(NC)\n"; \
	elif [ $$EXIT_CODE -eq 0 ]; then printf "$(GREEN)Server exited cleanly$(NC)\n"; \
	else printf "$(RED)Server failed to start (exit: $$EXIT_CODE)$(NC)\n"; exit 1; fi

validate: ## Validate JSON data files
	@printf "$(BLUE)Validating data files...$(NC)\n"
	npm run validate

check: typecheck validate ## Run all checks (typecheck + validate)

ci: ## Run full CI pipeline (lint, typecheck, validate, build)
	@printf "$(BLUE)Running CI pipeline...$(NC)\n"
	npm run ci
	@printf "$(GREEN)CI pipeline complete$(NC)\n"
