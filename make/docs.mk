# make/docs.mk - Documentation targets
#
# Targets for documentation generation, serving,
# and validation.

.PHONY: docs-serve docs-check docs-list docs-paired docs-paired-staged

docs-serve: ## Serve documentation locally (if using mkdocs/etc)
	@printf "$(BLUE)Documentation is in docs/ directory$(NC)\n"
	@ls -la docs/

docs-paired: ## Check all directories for missing README/AGENTS.md pairs
	@./scripts/check-paired-docs.sh --all

docs-paired-staged: ## Check staged files for paired documentation updates
	@printf "$(BLUE)Checking staged paired documentation...$(NC)\n"
	@./scripts/check-paired-docs.sh --staged
	@printf "$(GREEN)Staged docs check complete$(NC)\n"

docs-check: ## Check for broken internal links in docs
	@printf "$(BLUE)Checking documentation links...$(NC)\n"
	@BROKEN=0; \
	for file in $$(find docs -name "*.md"); do \
		grep -oE '\]\([^)#]+\.md' "$$file" 2>/dev/null | sed 's/.*](//' | while read link; do \
			TARGET="$$(dirname $$file)/$$link"; \
			if [ ! -f "$$TARGET" ] && [ ! -f "$$link" ]; then \
				printf "$(RED)Broken:$(NC) $$file -> $$link\n"; \
				BROKEN=1; \
			fi; \
		done; \
	done; \
	printf "$(GREEN)Link check complete$(NC)\n"

docs-list: ## List all AGENTS.md files
	@printf "$(BLUE)AGENTS.md files in project:$(NC)\n"
	@find . -name "AGENTS.md" -not -path "./node_modules/*" | sort
