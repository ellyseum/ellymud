# make/docker.mk - Docker & Deployment targets
#
# Targets for building, running, and managing Docker containers,
# as well as deployment-related tasks.
#
# All docker commands go through npm scripts in package.json
# to maintain a single source of truth for commands.

.PHONY: docker-build docker-up docker-down docker-logs docker-ps docker-restart
.PHONY: docker-shell docker-clean docker-rebuild
.PHONY: docker-up-postgres docker-down-postgres docker-clean-postgres docker-rebuild-postgres
.PHONY: deploy-check prod-start

docker-build: ## Build Docker image
	@printf "$(BLUE)Building Docker image...$(NC)\n"
	npm run docker:build

docker-up: ## Start Docker containers (docker compose up)
	@printf "$(BLUE)Starting Docker containers...$(NC)\n"
	npm run docker:up

docker-down: ## Stop Docker containers (docker compose down)
	@printf "$(BLUE)Stopping Docker containers...$(NC)\n"
	npm run docker:down

docker-logs: ## Show Docker container logs (follow mode)
	npm run docker:logs

docker-ps: ## Show Docker container status
	npm run docker:ps

docker-restart: ## Restart Docker containers
	@printf "$(BLUE)Restarting Docker containers...$(NC)\n"
	npm run docker:restart

docker-shell: ## Open shell in app container
	npm run docker:shell

docker-clean: ## Stop containers and remove volumes
	@printf "$(YELLOW)Stopping and cleaning Docker resources...$(NC)\n"
	npm run docker:clean

docker-rebuild: ## Rebuild and restart containers
	@printf "$(BLUE)Rebuilding Docker containers...$(NC)\n"
	npm run docker:rebuild

docker-up-postgres: ## Start with PostgreSQL (docker-compose.postgres.yml)
	@printf "$(BLUE)Starting with PostgreSQL backend...$(NC)\n"
	npm run docker:up:postgres

docker-down-postgres: ## Stop PostgreSQL containers
	@printf "$(BLUE)Stopping PostgreSQL containers...$(NC)\n"
	npm run docker:down:postgres

docker-clean-postgres: ## Stop PostgreSQL containers and remove volumes (fresh start)
	@printf "$(YELLOW)Stopping and cleaning PostgreSQL Docker resources...$(NC)\n"
	npm run docker:clean:postgres

docker-rebuild-postgres: ## Rebuild and restart PostgreSQL containers
	@printf "$(BLUE)Rebuilding PostgreSQL Docker containers...$(NC)\n"
	npm run docker:rebuild:postgres

deploy-check: build validate ## Pre-deployment checks
	@printf "$(GREEN)Ready for deployment$(NC)\n"

prod-start: ## Start in production mode
	npm run prod
