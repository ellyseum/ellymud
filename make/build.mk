# make/build.mk - Build & Compile targets
#
# Targets for TypeScript compilation, type checking,
# and build-related tasks.

.PHONY: build build-clean build-watch typecheck compile lint lint-fix format format-check lint-all info clean-npm outdated deps-check

build: ## Build TypeScript to JavaScript
	@printf "$(BLUE)Building project...$(NC)\n"
	npm run build

build-clean: clean-dist build ## Clean build (remove dist first)

build-watch: ## Build TypeScript in watch mode
	@printf "$(BLUE)Starting build watch mode...$(NC)\n"
	npm run build-watch

typecheck: ## Run TypeScript type checking only
	@printf "$(BLUE)Running type check...$(NC)\n"
	npm run typecheck

compile: build ## Alias for build

lint: ## Run ESLint on source files
	@printf "$(BLUE)Running linter...$(NC)\n"
	npm run lint

lint-fix: ## Run ESLint and auto-fix issues
	@printf "$(BLUE)Running linter with auto-fix...$(NC)\n"
	npm run lint-fix

format: ## Format source files with Prettier
	@printf "$(BLUE)Formatting code...$(NC)\n"
	npm run format

format-check: ## Check formatting without changes
	@printf "$(BLUE)Checking format...$(NC)\n"
	npm run format-check

lint-all: lint format-check ## Run all linting (ESLint + Prettier check)
	@printf "$(GREEN)All lint checks passed$(NC)\n"

clean-npm: ## Remove node_modules (use make install to restore)
	@printf "$(YELLOW)Removing node_modules...$(NC)\n"
	rm -rf node_modules
	@printf "$(GREEN)Run 'make install' to restore dependencies$(NC)\n"

outdated: ## Check for outdated dependencies
	npm run outdated

deps-check: ## Check for unused dependencies
	npm run deps-check

info: ## Show project info and version
	@printf "$(BLUE)EllyMUD Project Info$(NC)\n"
	@printf "===================\n"
	@printf "Name:    %s\n" "$$(node -p "require('./package.json').name")"
	@printf "Version: %s\n" "$$(node -p "require('./package.json').version")"
	@printf "Node:    %s\n" "$$(node -v)"
	@printf "npm:     %s\n" "$$(npm -v)"
	@printf "\n"
