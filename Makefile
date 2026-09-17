.DEFAULT_GOAL := help

SHELL := /bin/sh

API_DIR := apps/api
WEB_DIR := apps/mobile
API_PORT ?= 8000
WEB_PORT ?= 8081

.PHONY: help install install-api install-web env db migrate api web dev run test lint typecheck check

help: ## Show available commands
	@awk 'BEGIN {FS = ":.*## "; printf "Usage: make <target>\n\nTargets:\n"} /^[a-zA-Z0-9_-]+:.*## / {printf "  %-12s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: install-api install-web ## Install backend and frontend dependencies

install-api: ## Install Python dependencies with uv
	cd $(API_DIR) && uv sync --locked

install-web: ## Install JavaScript dependencies with npm
	cd $(WEB_DIR) && npm ci

env: ## Create the local API environment file when it does not exist
	@if [ ! -f "$(API_DIR)/.env" ]; then \
		cp $(API_DIR)/.env.example $(API_DIR)/.env; \
		echo "Created $(API_DIR)/.env from .env.example"; \
	else \
		echo "$(API_DIR)/.env already exists"; \
	fi

db: ## Start the local PostgreSQL database
	docker compose -f $(API_DIR)/docker-compose.yml up -d db

migrate: ## Apply database migrations
	cd $(API_DIR) && uv run alembic upgrade head

api: ## Run the FastAPI backend with hot reload
	cd $(API_DIR) && uv run uvicorn app.main:app --reload --host 0.0.0.0 --port $(API_PORT)

web: ## Run the Expo web client
	cd $(WEB_DIR) && npm run web -- --port $(WEB_PORT)

dev: ## Run the backend and web client together
	@trap 'trap - INT TERM EXIT; kill 0' INT TERM EXIT; \
	$(MAKE) api & \
	$(MAKE) web

run: dev ## Alias for dev

test: ## Run backend and frontend tests
	cd $(API_DIR) && uv run pytest
	cd $(WEB_DIR) && npm test

lint: ## Run backend and frontend linters
	cd $(API_DIR) && uv run ruff check .
	cd $(WEB_DIR) && npm run lint

typecheck: ## Run backend and frontend type checks
	cd $(API_DIR) && uv run mypy app
	cd $(WEB_DIR) && npm run typecheck

check: lint typecheck test ## Run lint, type checks, and tests
