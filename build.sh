#!/usr/bin/env bash

set -ex

npm run generate
rm .output/public/404.html
