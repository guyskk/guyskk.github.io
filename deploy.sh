#!/bin/bash
set -euo pipefail

bundle exec jekyll build
npx wrangler pages deploy --project-name guyskk-blog ./_site
