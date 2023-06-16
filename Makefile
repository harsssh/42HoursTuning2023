MYSQL_LOG := ./volume/mysql/log/slow.log
WEBHOOK_URL := https://discord.com/api/webhooks/1119311994512756787/H3D1GV9mWzgJVDJ9DHhPvt7iomAkS0elVKKEEpiGtwv4HwbsSyUKUDUIIfEtVLryw6IY

.PHONY: update
update:
	git pull
	benchmarker/migration.sh

.PHONY: bench
bench: update
	truncate -s 0 ./volume/mysql/log/slow.log
	benchmarker/run_k6_and_score.sh

.PHONY: test
test: update
	benchmarker/e2e.sh

.PHONY: reset
reset:
	benchmarker/restore_and_migration.sh

.PHONY: log
log:
	sudo cat $(MYSQL_LOG) | pt-query-digest --limit 10 > /tmp/pt-query-digest.txt
	-@curl -X POST -F txt=@/tmp/pt-query-digest.txt $(WEBHOOK_URL) -s -o /dev/null