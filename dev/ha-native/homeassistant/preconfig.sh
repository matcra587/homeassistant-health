#!/bin/sh
set -eu

markfile="/config/.preconfigured-homeassistant-health"
source_dirs="/preconfig.d"
target_dir="/config"

if [ -f "${markfile}" ]; then
  echo "Home Assistant Health dev preconfiguration already applied" >&2
  exit 0
fi

for source in "${source_dirs}"/*; do
  if [ ! -d "${source}" ]; then
    continue
  fi
  cp -R "${source}/." "${target_dir}/"
done

touch "${markfile}"
echo "Home Assistant Health dev preconfiguration applied" >&2
