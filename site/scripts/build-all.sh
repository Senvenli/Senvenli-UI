#!/bin/sh
# The three builds the hydration check reads: production, development React (reports attribute
# mismatches), and development React built on another day in another zone (reports clock reads).
set -e
cd "$(dirname "$0")/.."
pnpm build
VITE_SITE_CHECK=1 NODE_ENV=development SITE_BUILD_DIR=build-dev pnpm exec react-router build --mode development
SITE_BUILD_DIR=build-dev node scripts/postbuild.mjs
NODE_OPTIONS="--import $PWD/scripts/fake-date.mjs" TZ=Pacific/Auckland VITE_SITE_CHECK=1 NODE_ENV=development SITE_BUILD_DIR=build-skew pnpm exec react-router build --mode development
SITE_BUILD_DIR=build-skew node scripts/postbuild.mjs
