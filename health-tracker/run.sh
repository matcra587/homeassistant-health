#!/usr/bin/with-contenv sh
# shellcheck shell=sh
set -eu

cd /app/dist
exec bun index.js
