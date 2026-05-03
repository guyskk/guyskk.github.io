#!/bin/bash
set -euo pipefail

echo "==> Installing Ruby dependencies..."
bundle install

echo "==> Installing Node.js dependencies..."
npm install

echo ""
echo "Setup complete! Run './serve.sh' to start the dev server."
