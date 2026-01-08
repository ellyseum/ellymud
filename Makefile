# EllyMUD Makefile
# Organized targets for development, testing, and deployment
#
# Usage: make [target]
#        make help     - Show all available targets
#
# Structure:
#   This Makefile includes sharded definitions from make/*.mk:
#   - config.mk  : Shared variables and configuration
#   - setup.mk   : Setup & bootstrap targets
#   - dev.mk     : Development workflow targets
#   - build.mk   : Build & compile targets
#   - server.mk  : Server management targets
#   - test.mk    : Testing targets
#   - agents.mk  : Agent ecosystem targets
#   - docker.mk  : Docker & deployment targets
#   - utils.mk   : Utilities & maintenance targets
#   - docs.mk    : Documentation targets

.DEFAULT_GOAL := help

# Include shared configuration
include make/config.mk

# Include all target shards
include make/setup.mk
include make/dev.mk
include make/build.mk
include make/server.mk
include make/test.mk
include make/agents.mk
include make/docker.mk
include make/utils.mk
include make/docs.mk
include make/artifacts.mk

#=============================================================================
# HELP
#=============================================================================

.PHONY: help

help: ## Show this help message
	@printf "\n"
	@printf "$(BLUE)EllyMUD Makefile$(NC)\n"
	@printf "================\n"
	@printf "\n"
	@printf "$(GREEN)Setup & Bootstrap:$(NC)\n"
	@grep -hE '^[a-zA-Z_-]+:.*?## .*$$' make/setup.mk | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-20s$(NC) %s\n", $$1, $$2}'
	@printf "\n"
	@printf "$(GREEN)Development:$(NC)\n"
	@grep -hE '^[a-zA-Z_-]+:.*?## .*$$' make/dev.mk | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-20s$(NC) %s\n", $$1, $$2}'
	@printf "\n"
	@printf "$(GREEN)Build & Compile:$(NC)\n"
	@grep -hE '^[a-zA-Z_-]+:.*?## .*$$' make/build.mk | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-20s$(NC) %s\n", $$1, $$2}'
	@printf "\n"
	@printf "$(GREEN)Server Management:$(NC)\n"
	@grep -hE '^[a-zA-Z_-]+:.*?## .*$$' make/server.mk | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-20s$(NC) %s\n", $$1, $$2}'
	@printf "\n"
	@printf "$(GREEN)Testing:$(NC)\n"
	@grep -hE '^[a-zA-Z_-]+:.*?## .*$$' make/test.mk | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-20s$(NC) %s\n", $$1, $$2}'
	@printf "\n"
	@printf "$(GREEN)Agent Ecosystem:$(NC)\n"
	@grep -hE '^[a-zA-Z_-]+:.*?## .*$$' make/agents.mk | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-20s$(NC) %s\n", $$1, $$2}'
	@printf "\n"
	@printf "$(GREEN)Docker & Deployment:$(NC)\n"
	@grep -hE '^[a-zA-Z_-]+:.*?## .*$$' make/docker.mk | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-20s$(NC) %s\n", $$1, $$2}'
	@printf "\n"
	@printf "$(GREEN)Utilities & Maintenance:$(NC)\n"
	@grep -hE '^[a-zA-Z_-]+:.*?## .*$$' make/utils.mk | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-20s$(NC) %s\n", $$1, $$2}'
	@printf "\n"
	@printf "$(GREEN)Documentation:$(NC)\n"
	@grep -hE '^[a-zA-Z_-]+:.*?## .*$$' make/docs.mk | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-20s$(NC) %s\n", $$1, $$2}'
	@printf "\n"
	@printf "$(GREEN)Pipeline Artifacts:$(NC)\n"
	@grep -hE '^[a-zA-Z_-]+:.*?## .*$$' make/artifacts.mk | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-20s$(NC) %s\n", $$1, $$2}'
	@printf "\n"
	@printf "$(CYAN)Shards: make/*.mk$(NC)\n"
	@printf "\n"
