# make/setup.mk - Setup & Bootstrap targets
#
# Targets for initial project setup, dependency installation,
# and environment configuration.

.PHONY: bootstrap setup install init-data env-setup setup-hooks

bootstrap: ## Full system bootstrap (run on fresh clone)
	@printf "$(BLUE)Running full bootstrap...$(NC)\n"
	npm run bootstrap

setup: install env-setup ## Quick setup (install deps + env)
	@printf "$(GREEN)Setup complete!$(NC)\n"

install: ## Install npm dependencies
	@printf "$(BLUE)Installing dependencies...$(NC)\n"
	npm install

init-data: ## Initialize data directory with defaults
	@printf "$(BLUE)Initializing data directory...$(NC)\n"
	@mkdir -p $(DATA_DIR) $(LOGS_DIR)/system $(LOGS_DIR)/players $(LOGS_DIR)/error $(LOGS_DIR)/mcp $(LOGS_DIR)/raw-sessions $(LOGS_DIR)/audit
	@if [ ! -f $(DATA_DIR)/users.json ]; then echo '{}' > $(DATA_DIR)/users.json; fi
	@if [ ! -f $(DATA_DIR)/rooms.json ]; then cp $(DATA_DIR)/rooms.json.example $(DATA_DIR)/rooms.json 2>/dev/null || echo '{}' > $(DATA_DIR)/rooms.json; fi
	@printf "$(GREEN)Data directories initialized$(NC)\n"

env-setup: ## Create .env from .env.example if missing
	@if [ ! -f .env ]; then \
		printf "$(YELLOW)Creating .env from .env.example...$(NC)\n"; \
		cp .env.example .env; \
		printf "$(GREEN).env created - please update with your values$(NC)\n"; \
	else \
		printf "$(GREEN).env already exists$(NC)\n"; \
	fi

setup-hooks: ## Install git pre-commit hooks (requires husky)
	@printf "$(BLUE)Setting up git hooks...$(NC)\n"
	@if [ -d ".husky" ]; then \
		printf "$(GREEN)Git hooks already configured$(NC)\n"; \
	elif command -v npx &> /dev/null && npm list husky &> /dev/null; then \
		npx husky; \
		printf "$(GREEN)Git hooks installed$(NC)\n"; \
	else \
		printf "$(YELLOW)Husky not installed. Install with: npm install -D husky lint-staged$(NC)\n"; \
		printf "$(YELLOW)Then run: npx husky init$(NC)\n"; \
	fi
