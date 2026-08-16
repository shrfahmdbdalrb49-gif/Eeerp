#!/bin/sh
# Build Sharaf ERP for Cloudflare Pages (root deployment)
set -e
pnpm install --dir apps/web
pnpm --dir apps/web build:cf
rm -rf dist-cf-root
mv apps/web/dist-cf dist-cf-root
sed -i 's|/Eeerp/|/|g' dist-cf-root/index.html dist-cf-root/manifest.webmanifest dist-cf-root/sw.js
echo "Built OK into dist-cf-root"
