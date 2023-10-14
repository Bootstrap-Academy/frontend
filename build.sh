#!/usr/bin/env bash

set -ex

npm run generate
rm dist/404.html
