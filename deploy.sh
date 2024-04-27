#!/bin/bash

jekyll build
npx wrangler pages deploy --project-name guyskk-blog ./_site
