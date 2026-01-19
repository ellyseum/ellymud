# make/docker.mk - Docker & Deployment targets
#
# Targets for building, running, and managing Docker containers,
# as well as deployment-related tasks.
#
# All docker commands go through npm scripts in package.json
# to maintain a single source of truth for commands.
#
# Profiles:
#   dev     - Local development (json + in-memory)
#   staging - Integration testing (sqlite + redis)
#   prod    - Production (postgres + redis)

.PHONY: docker-build docker-up docker-down docker-clean docker-rebuild
.PHONY: docker-logs docker-ps docker-shell
.PHONY: docker-dev docker-dev-down docker-dev-clean docker-dev-rebuild
.PHONY: docker-staging docker-staging-down docker-staging-clean docker-staging-rebuild
.PHONY: docker-prod docker-prod-down docker-prod-clean docker-prod-rebuild
.PHONY: deploy-check prod-start

docker-build: ## Build Docker image
	@printf "$(BLUE)Building Docker image...$(NC)\n"
	npm run docker:build

# ============================================
# LEGACY COMMANDS (alias to dev profile)
# ============================================
docker-up: ## Start Docker containers (dev profile)
	@printf "$(BLUE)Starting Docker containers...$(NC)\n"
	npm run docker:up

docker-down: ## Stop Docker containers (dev profile)
	@printf "$(BLUE)Stopping Docker containers...$(NC)\n"
	npm run docker:down

docker-clean: ## Stop containers and remove volumes (dev profile)
	@printf "$(YELLOW)Stopping and cleaning Docker resources...$(NC)\n"
	npm run docker:clean

docker-rebuild: ## Rebuild and restart containers (dev profile)
	@printf "$(BLUE)Rebuilding Docker containers...$(NC)\n"
	npm run docker:rebuild

# ============================================
# DEV PROFILE
# ============================================
docker-dev: ## Start dev environment (json + in-memory)
	@printf "$(BLUE)Starting dev containers...$(NC)\n"
	npm run docker:dev

docker-dev-down: ## Stop dev containers
	@printf "$(BLUE)Stopping dev containers...$(NC)\n"
	npm run docker:dev:down

docker-dev-clean: ## Stop dev containers and remove volumes
	@printf "$(YELLOW)Stopping and cleaning dev resources...$(NC)\n"
	npm run docker:dev:clean

docker-dev-rebuild: ## Rebuild and restart dev containers
	@printf "$(BLUE)Rebuilding dev containers...$(NC)\n"
	npm run docker:dev:rebuild

# ============================================
# STAGING PROFILE
# ============================================
docker-staging: ## Start staging environment (sqlite + redis)
	@printf "$(BLUE)Starting staging containers...$(NC)\n"
	npm run docker:staging

docker-staging-down: ## Stop staging containers
	@printf "$(BLUE)Stopping staging containers...$(NC)\n"
	npm run docker:staging:down

docker-staging-clean: ## Stop staging containers and remove volumes
	@printf "$(YELLOW)Stopping and cleaning staging resources...$(NC)\n"
	npm run docker:staging:clean

docker-staging-rebuild: ## Rebuild and restart staging containers
	@printf "$(BLUE)Rebuilding staging containers...$(NC)\n"
	npm run docker:staging:rebuild

# ============================================
# PROD PROFILE
# ============================================
docker-prod: ## Start prod environment (postgres + redis)
	@printf "$(BLUE)Starting prod containers...$(NC)\n"
	npm run docker:prod

docker-prod-down: ## Stop prod containers
	@printf "$(BLUE)Stopping prod containers...$(NC)\n"
	npm run docker:prod:down

docker-prod-clean: ## Stop prod containers and remove volumes
	@printf "$(YELLOW)Stopping and cleaning prod resources...$(NC)\n"
	npm run docker:prod:clean

docker-prod-rebuild: ## Rebuild and restart prod containers
	@printf "$(BLUE)Rebuilding prod containers...$(NC)\n"
	npm run docker:prod:rebuild

# ============================================
# SHARED
# ============================================
docker-logs: ## Show Docker container logs (follow mode)
	npm run docker:logs

docker-ps: ## Show Docker container status
	npm run docker:ps

docker-shell: ## Open shell in app container
	npm run docker:shell

deploy-check: build validate ## Pre-deployment checks
	@printf "$(GREEN)Ready for deployment$(NC)\n"

prod-start: ## Start in production mode
	npm run prod
