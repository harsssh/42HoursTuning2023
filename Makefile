include .env	# WEBHOOK_URL
MYSQL_LOG := ./volume/mysql/log/slow.log

.PHONY: deploy-migration
deploy-migration:
	@git pull
	@cd benchmarker && ./migration.sh

.PHONY: deploy
deploy:
	@git pull
	@cd app && ./restart_container.sh

.PHONY: bench-migration
bench-migration: deploy-migration
	@sudo truncate -s 0 ./volume/mysql/log/slow.log
	@cd benchmarker && ./run_k6_and_score.sh
	@make log

.PHONY: bench
bench: deploy
	@sudo truncate -s 0 ./volume/mysql/log/slow.log
	@cd benchmarker && ./run_k6_and_score.sh
	@make log

.PHONY: test
test: deploy
	@cd benchmarker && ./e2e.sh

.PHONY: restore
restore:
	@cd benchmarker && ./restore_and_migration.sh

.PHONY: log
log:
	@sudo cat $(MYSQL_LOG) | pt-query-digest --limit 10 > /tmp/pt-query-digest.txt
	-@curl -X POST -F txt=@/tmp/pt-query-digest.txt $(WEBHOOK_URL) -s -o /dev/null

.PHONY: enter-mysql
enter-mysql:
	@mysql -P 33060 -h env-fox -u mysql -p
