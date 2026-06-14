#!/bin/bash
# Hobbithole Push - Builds and pushes from a staged directory

# Ga naar de map waar het script staat
cd "$(dirname "$0")"

VERSION=$1
IMAGE_DASHBOARD="piggyoriginal/hobbithole-dashboard"
IMAGE_CONFIG="piggyoriginal/hobbithole-config-api"

if [ -z "$VERSION" ]; then
    # Auto-detect latest staged version if none provided
    VERSION=$(ls -d backups/v*-pre-push 2>/dev/null | sort -V | tail -n 1 | grep -oP 'v\K[0-9.]+(-dev)?')
    if [ -z "$VERSION" ]; then
        echo "❌ No staged version found in backups/ and no version provided."
        echo "Usage: ./push.sh 1.8.6"
        exit 1
    fi
    echo "🔍 No version provided, detected latest staged: $VERSION"
fi

# Schoon de versie op voor de Docker tag (verwijder -dev indien aanwezig)
CLEAN_VERSION=$(echo "$VERSION" | sed 's/-dev//')
STAGING_DIR="backups/v$VERSION-pre-push"

if [ ! -d "$STAGING_DIR" ]; then
    echo "❌ Staging directory $STAGING_DIR not found!"
    exit 1
fi

echo "🚀 Starting multi-arch build and push for version: $CLEAN_VERSION (from $VERSION source)"
cd "$STAGING_DIR"

# 1. Ensure buildx builder
echo "🛠 Preparing buildx builder..."
docker buildx create --use --name hobbithole-builder 2>/dev/null || docker buildx use hobbithole-builder
docker buildx inspect --bootstrap

# 2. Build & Push Dashboard
echo "📦 Building & Pushing $IMAGE_DASHBOARD..."
docker buildx build --platform linux/amd64,linux/arm64 \
  -t $IMAGE_DASHBOARD:latest \
  -t $IMAGE_DASHBOARD:$CLEAN_VERSION --push .

# 3. Build & Push Config API
echo "📦 Building & Pushing $IMAGE_CONFIG..."
docker buildx build --platform linux/amd64,linux/arm64 \
  -f Dockerfile.config-api \
  -t $IMAGE_CONFIG:latest \
  -t $IMAGE_CONFIG:$CLEAN_VERSION --push .

echo "✅ Done! Version $CLEAN_VERSION is now live on Docker Hub."

# 4. Sync to GitHub (v1.9.2 update)
echo "🌐 Syncing source code to GitHub..."
cd "$(dirname "$0")" # Terug naar de script directory
./github-push.sh
