#!/usr/bin/env bash
# MemoCare one-command start (Mac / Linux)
cd "$(dirname "$0")/memocare-backend" || exit 1
[ -d node_modules ] || npm install
npm run start:local
