include .env	# WEBHOOK_URL
MYSQL_LOG := ./volume/mysql/log/slow.log

.PHONY: deploy
deploy:
	@git pull
	@cd benchmarker && ./migration.sh

.PHONY: bench
bench: deploy
	@truncate -s 0 ./volume/mysql/log/slow.log
	@cd benchmarker && ./run_k6_and_score.sh

.PHONY: test
test: deploy
	@cd benchmarker && ./e2e.sh

.PHONY: reset
reset:
	@cd benchmarker && ./restore_and_migration.sh

.PHONY: log
log:
	@pt-query-digest --limit 10 < $(MYSQL_LOG) > /tmp/pt-query-digest.txt
	-@curl -X POST -F txt=@/tmp/pt-query-digest.txt $(WEBHOOK_URL) -s -o /dev/null

.PHONY: enter-mysql
enter-mysql:
	@mysql -P 33060 -h env-fox -u mysql -p