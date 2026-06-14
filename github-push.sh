#!/bin/bash
# Hobbithole GitHub Push - Commits and pushes the source code to GitHub

# Go to the script directory
cd "$(dirname "$0")"

# 1. Detect version from index.html
VERSION=$(grep -oP "const APP_VERSION = '\K[^']+" index.html)

if [ -z "$VERSION" ]; then
    echo "❌ Could not detect version from index.html"
    exit 1
fi

echo "🚀 Preparing GitHub push for version: $VERSION"

# 2. Add changes
git add .

# 3. Commit
COMMIT_MSG="Release v$VERSION"
if [[ "$VERSION" == *"-dev"* ]]; then
    COMMIT_MSG="Work in progress: $VERSION"
fi

git commit -m "$COMMIT_MSG"

# 4. Push
echo "📤 Pushing to GitHub (origin master)..."
git push origin master

# 5. Tag if it's a clean release (no -dev)
if [[ "$VERSION" != *"-dev"* ]]; then
    echo "🏷️ Tagging version v$VERSION..."
    git tag -a "v$VERSION" -m "Version $VERSION"
    git push origin "v$VERSION"
fi

echo "✅ GitHub push complete!"
