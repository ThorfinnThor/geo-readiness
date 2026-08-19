.DEFAULT_GOAL := help
.PHONY: help setup db-up db-down web-dev web-build web-test worker-test lint typecheck test ci

# Use the Compose plugin if present, else the standalone binary.
COMPOSE := $(shell docker compose version >/dev/null 2>&1 && echo "docker compose" || echo "docker-compose")

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

setup: ## Install web + worker dependencies
	pnpm install
	cd apps/worker && uv sync

db-up: ## Start local Postgres (docker compose)
	$(COMPOSE) up -d postgres

db-down: ## Stop local Postgres
	$(COMPOSE) down

web-dev: ## Run the Next.js web app
	pnpm --filter @geo/web dev

web-build: ## Build the Next.js web app
	pnpm --filter @geo/web build

web-test: ## Run web tests
	pnpm --filter @geo/web test

worker-test: ## Run Python worker tests
	cd apps/worker && uv run pytest

lint: ## Lint web + worker
	pnpm --filter @geo/web lint
	cd apps/worker && uv run ruff check .

typecheck: ## Typecheck web
	pnpm --filter @geo/web typecheck

test: web-test worker-test ## Run all tests

ci: lint typecheck test web-build ## Everything CI runs
