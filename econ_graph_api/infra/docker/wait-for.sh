#!/usr/bin/env bash
set -e
hostport="$1"; shift
shift_marker="$1"; shift
timeout=60
echo "Waiting for $hostport ..."
for i in $(seq $timeout); do
  nc -z ${hostport%:*} ${hostport#*:} && echo "Ready!" && exec "$@" && exit 0
  sleep 1
done
echo "Timeout waiting for $hostport"
exit 1
