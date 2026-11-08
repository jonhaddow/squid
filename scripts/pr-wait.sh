#!/usr/bin/env bash
# Waits for the current branch's GitHub Actions runs, then prints their results.
# Run gh commands with the PAT: GH_TOKEN='op://Claude/GitHub Personal Access Token/token' op-claude run -- scripts/pr-wait.sh
set -euo pipefail
cd "$(dirname "$0")/.."
sha=$(git rev-parse HEAD)
runs() { gh run list --commit "$sha" --json name,status,conclusion,url --jq '.[] | "\(.name) \(.status) \(.conclusion) \(.url)"'; }
for _ in $(seq 80); do
	out=$(runs)
	[ -n "$out" ] && ! grep -qv ' completed ' <<< "$out" && break
	sleep 15
done
echo "$out"
if [ -z "$out" ] || grep -qv ' completed ' <<< "$out"; then
	echo "timed out waiting for runs" >&2
	exit 1
fi
if grep -qvE ' completed (success|skipped|neutral) ' <<< "$out"; then
	echo "not green; see: gh run view <id> --log-failed" >&2
	exit 1
fi
