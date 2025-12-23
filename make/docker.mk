# make/docker.mk - Docker & Deployment targets
#
# Targets for building, running, and managing Docker containers,
# as well as deployment-related tasks.

.PHONY: docker-build docker-run docker-stop docker-logs docker-shell
.PHONY: deploy-check prod-start

docker-build: ## Build Docker image
	@printf "$(BLUE)Building Docker image...$(NC)\n"
	docker build -t ellymud:latest .

docker-run: ## Run Docker container
	@printf "$(BLUE)Starting Docker container...$(NC)\n"
	docker run -d --name ellymud \
		-p 8023:8023 -p 8080:8080 -p 3100:3100 \
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
