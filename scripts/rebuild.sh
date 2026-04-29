#!/usr/bin/env bash
set -euo pipefail
cd /home/azhar/github-projects/yui-hazards-dashboard
npm run build
systemctl --user restart yui-hazards-dashboard.service
