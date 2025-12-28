# make/docker.mk - Docker & Deployment targets
#
# Targets for building, running, and managing Docker containers,
# as well as deployment-related tasks.
#
# MCP API Key handling:
#   1. Pass via env var: docker run -e ELLYMUD_MCP_API_KEY=xxx ...
#   2. Mount .env file: docker run -v /path/.env:/app/.env ...
#   3. Use make docker-run (auto-mounts local .env)
#   4. Secrets manager: inject ELLYMUD_MCP_API_KEY env var

.PHONY: docker-build docker-run docker-stop docker-logs docker-shell
.PHONY: deploy-check prod-start

docker-build: ## Build Docker image
	@printf "$(BLUE)Building Docker image...$(NC)\n"
	docker build -t ellymud:latest .

docker-run: ## Run Docker container (mounts .env for secrets)
	@printf "$(BLUE)Starting Docker container...$(NC)\n"
	@if [ -f "$(PROJECT_ROOT)/.env" ]; then \
		printf "$(CYAN)Mounting .env file for secrets$(NC)\n"; \
		docker run -d --name ellymud \
			-p 8023:8023 -p 8080:8080 -p 3100:3100 \
			-v $(PROJECT_ROOT)/$(DATA_DIR):/app/data \
			-v $(PROJECT_ROOT)/$(LOGS_DIR):/app/logs \
			-v $(PROJECT_ROOT)/.env:/app/.env:ro \
			ellymud:latest; \
	else \
		printf "$(RED)ERROR: No .env file found at $(PROJECT_ROOT)/.env$(NC)\n"; \
		printf "$(YELLOW)The MCP server requires ELLYMUD_MCP_API_KEY to be set.$(NC)\n"; \
		printf "$(YELLOW)Create .env with: echo 'ELLYMUD_MCP_API_KEY=$$(openssl rand -hex 32)' > .env$(NC)\n"; \
		printf "$(YELLOW)Or pass the key directly: docker run -e ELLYMUD_MCP_API_KEY=xxx ...$(NC)\n"; \
		exit 1; \
	fi

docker-run-no-mcp: ## Run Docker container without MCP server (no API key required)
	@printf "$(BLUE)Starting Docker container (MCP disabled)...$(NC)\n"
	docker run -d --name ellymud \
		-p 8023:8023 -p 8080:8080 \
		-v $(PROJECT_ROOT)/$(DATA_DIR):/app/data \
		-v $(PROJECT_ROOT)/$(LOGS_DIR):/app/logs \
		ellymud:latest

docker-stop: ## Stop Docker container
	docker stop ellymud || true
	docker rm ellymud || true

docker-logs: ## Show Docker container logs
	docker logs -f ellymud

docker-shell: ## Open shell in Docker container
	docker exec -it ellymud /bin/sh

deploy-check: build validate ## Pre-deployment checks
	@printf "$(GREEN)Ready for deployment$(NC)\n"

prod-start: ## Start in production mode
	npm run prod
