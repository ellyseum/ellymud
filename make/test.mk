# make/test.mk - Testing targets
#
# Targets for running tests, validation, and checks
# on the codebase and data files.

.PHONY: test test-unit test-cov test-e2e test-integration test-all test-full test-watch test-build test-start validate check ci

test: ## Run all tests (typecheck + validate + jest)
	@printf "$(BLUE)Running all tests...$(NC)\n"
	npm test

test-unit: ## Run unit tests only (fast)
	@printf "$(BLUE)Running unit tests...$(NC)\n"
	npm run test:unit

test-cov: ## Run tests with coverage report
	@printf "$(BLUE)Running tests with coverage...$(NC)\n"
	npm run test:coverage

test-e2e: ## Run end-to-end tests
	@printf "$(BLUE)Running E2E tests...$(NC)\n"
	npm run test:e2e

test-integration: ## Run integration tests (requires Docker). Use TEST=<pattern> to filter, e.g., make test-integration TEST=automigrate
	@printf "$(BLUE)Running integration tests...$(NC)\n"
ifdef TEST
	npm run test:integration -- $(TEST)
else
	npm run test:integration
endif

test-all: ## Run all tests (unit + e2e)
	@printf "$(BLUE)Running all tests (unit + e2e)...$(NC)\n"
	npm run test:all

test-full: ## Run full test suite (unit + e2e + integration, requires Docker)
	@printf "$(BLUE)Running full test suite...$(NC)\n"
	npm run test:full

test-watch: ## Run tests in watch mode
	@printf "$(BLUE)Starting test watch mode...$(NC)\n"
	npm run test:watch

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
