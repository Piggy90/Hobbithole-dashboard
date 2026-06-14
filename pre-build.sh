#!/bin/bash
# Hobbithole Pre-Build - Stages a version for release

# Ga naar de map waar het script staat
cd "$(dirname "$0")"

# 1. Detecteer versie uit index.html (Source of Truth voor de UI)
VERSION=$(grep -oP "const APP_VERSION = '\K[^']+" index.html)
CLEAN_VERSION=$(echo "$VERSION" | sed 's/-dev//')

if [ -z "$VERSION" ]; then
    echo "❌ Could not detect version from index.html"
    exit 1
fi

echo "🚀 Processing version: $VERSION (Clean Release: $CLEAN_VERSION)"

# 2. Sync nieuwe features van index.html naar template_index.html
# Dit zorgt ervoor dat alle code-wijzigingen mee gaan naar de Docker build,
# maar de Dockerfile pakt de template zodat jouw lokale data niet gepusht wordt.
echo "🔄 Syncing new features to template_index.html..."
cp index.html template_index.html

# 3. Maak de versie in de template 'schoon' (verwijder -dev)
sed -i "s/const APP_VERSION = '$VERSION'/const APP_VERSION = '$CLEAN_VERSION'/" template_index.html

# 4. Controleer of de Changelog ook de juiste versie heeft
# We passen de meest recente versie-entry aan indien nodig
echo "📝 Checking CHANGELOG.md versioning..."
sed -i "s/\[v$VERSION\]/\[v$CLEAN_VERSION\]/g" CHANGELOG.md

# 5. Maak de staging directory aan
STAGING_DIR="backups/v$VERSION-pre-push"
echo "📦 Staging files to $STAGING_DIR..."
mkdir -p "$STAGING_DIR"

# 6. Kopieer bestanden voor de build (exclusief backups en scripts)
# We gebruiken find om recursieve kopieën van de backups map te voorkomen
find . -maxdepth 1 ! -name 'backups' ! -name 'pre-build.sh' ! -name 'push.sh' ! -name '.' -exec cp -r {} "$STAGING_DIR/" \;

# 7. Auto-bump dev version for the next cycle (local only)
if [[ "$VERSION" == *"-dev"* ]]; then
    echo "📈 Auto-bumping dev version for next cycle..."
    # Splits X.Y.Z in X.Y en Z
    BASE_VERSION=$(echo "$CLEAN_VERSION" | cut -d. -f1,2)
    PATCH_VERSION=$(echo "$CLEAN_VERSION" | cut -d. -f3)
    NEW_PATCH=$((PATCH_VERSION + 1))
    NEXT_DEV_VERSION="${BASE_VERSION}.${NEW_PATCH}-dev"
    
    # Update de lokale index.html naar de volgende dev versie
    sed -i "s/const APP_VERSION = '$VERSION'/const APP_VERSION = '$NEXT_DEV_VERSION'/" index.html
    
    # Voeg een placeholder toe aan CHANGELOG.md (als die er nog niet staat)
    if ! grep -q "\[v$NEXT_DEV_VERSION\]" CHANGELOG.md; then
        # Voeg in na de header (regel 3)
        sed -i "3i ## [v$NEXT_DEV_VERSION] - $(date +%Y-%m-%d)\n### In uitvoering (In Progress)\n- Nieuwe features voor de volgende release.\n" CHANGELOG.md
    fi
    echo "✅ Local version bumped to $NEXT_DEV_VERSION"
fi

# 8. Success message
echo "✅ Pre-build complete!"
echo "✅ template_index.html is nu gesynchroniseerd met $CLEAN_VERSION."
echo "👉 Review de files in $STAGING_DIR. Wanneer je klaar bent voor de echte push:"
echo "   1. ./push.sh $VERSION        (Docker Hub)"
echo "   2. ./github-push.sh          (GitHub)"
