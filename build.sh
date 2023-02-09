#!/usr/bin/env bash

set -ex

nuxt generate
rm .output/public/404.html
