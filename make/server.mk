# make/server.mk - Server Management targets
#
# Targets for starting, stopping, and managing the game server
# in various modes and configurations.

.PHONY: start start-admin start-user start-bg stop restart status health

start: ## Start production server
	@printf "$(BLUE)Starting server...$(NC)\n"
	npm start

start-admin: ## Start server with admin auto-login
	npm run start-admin

start-user: ## Start server with user selection
	npm run start-user

start-bg: ## Start server in background
	@printf "$(BLUE)Starting server in background...$(NC)\n"
	@nohup npm start > $(LOGS_DIR)/server.out 2>&1 & echo $$! > .server.pid
	@sleep 1 && if [ -f .server.pid ]; then printf "$(GREEN)Server started in background (PID: $$(cat .server.pid))$(NC)\n"; fi

stop: ## Stop background server
	@printf "$(YELLOW)Stopping server...$(NC)\n"
	@if [ -f .server.pid ]; then kill $$(cat .server.pid) 2>/dev/null && rm .server.pid && printf "$(GREEN)Stopped$(NC)\n"; \
	else pkill -f "node.*dist/server.js" 2>/dev/null || echo "No server process found"; fi

restart: stop start ## Restart server

status: ## Check server status
	@printf "$(BLUE)Server Status:$(NC)\n"
	@pgrep -f "node.*dist/server.js" > /dev/null && printf "$(GREEN)Running$(NC)\n" || printf "$(RED)Not running$(NC)\n"
	@printf "\n"
	@printf "$(BLUE)Ports:$(NC)\n"
	@lsof -i :8023 2>/dev/null | head -2 || echo "  Telnet (8023): not listening"
	@lsof -i :8080 2>/dev/null | head -2 || echo "  WebSocket (8080): not listening"
	@lsof -i :3100 2>/dev/null | head -2 || echo "  MCP (3100): not listening"

health: ## Check server health via MCP endpoint
	@printf "$(BLUE)Health Check:$(NC)\n"
	@curl -sf http://localhost:3100/health && printf "$(GREEN)Healthy$(NC)\n" || printf "$(RED)Server not responding$(NC)\n"
