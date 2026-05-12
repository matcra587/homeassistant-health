#!/bin/sh
set -eu

base_url="http://health-tracker:3000"
user_id="ha-native-dev-user"
display_name="Native Dev User"
today="$(date -u +%F)"
entry_date="${today}T07:30:00.000Z"

curl --fail --silent --show-error \
  -H "x-ha-user-id: ${user_id}" \
  -H "x-ha-user-display-name: ${display_name}" \
  "${base_url}/api/bootstrap" >/dev/null

curl --fail --silent --show-error \
  -X PATCH \
  -H "content-type: application/json" \
  -H "x-ha-user-id: ${user_id}" \
  -H "x-ha-user-display-name: ${display_name}" \
  --data "{\"id\":\"${user_id}\",\"patch\":{\"heightCm\":170,\"age\":36,\"sex\":\"F\",\"activityLevel\":1.4,\"startWeightKg\":75,\"goalWeightKg\":70,\"targetDate\":\"2026-12-01T08:00:00.000Z\",\"units\":\"metric\",\"shareDetails\":true}}" \
  "${base_url}/api/members" >/dev/null

curl --fail --silent --show-error \
  -X POST \
  -H "content-type: application/json" \
  -H "x-ha-user-id: ${user_id}" \
  -H "x-ha-user-display-name: ${display_name}" \
  --data "{\"id\":\"${user_id}-${today}\",\"memberId\":\"${user_id}\",\"date\":\"${entry_date}\",\"weightKg\":72.4,\"bodyFatPct\":null,\"waistCm\":null,\"note\":\"Local HA native stack seed\"}" \
  "${base_url}/api/entries" >/dev/null

echo "Seeded Home Assistant Health native integration data for ${display_name}."
