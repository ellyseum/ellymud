# make/dev.mk - Development targets
#
# Targets for development workflow including hot reload
# and dev-specific server configurations.

.PHONY: dev dev-admin dev-user watch

dev: ## Start development server with hot reload
	@printf "$(BLUE)Starting development server...$(NC)\n"
	npm run dev

dev-admin: ## Start dev server with admin auto-login
	@printf "$(BLUE)Starting dev server (admin mode)...$(NC)\n"
	npm run dev-admin

dev-user: ## Start dev server with user prompt
	@printf "$(BLUE)Starting dev server (user mode)...$(NC)\n"
	npm run dev-user

watch: ## Watch TypeScript files for changes
	@printf "$(BLUE)Starting TypeScript watch mode...$(NC)\n"
	npm run watch
