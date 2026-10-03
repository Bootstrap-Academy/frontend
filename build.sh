#!/usr/bin/env bash

set -euo pipefail

npm run generate
rm dist/404.html
