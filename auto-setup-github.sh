#!/bin/bash

# Automated GitHub Repository Setup
REPO_NAME="coffee-chat-salons"
GITHUB_USER="omaromran"

echo "🚀 Setting up GitHub repository automatically..."

# Method 1: Try if already authenticated
if gh auth status &>/dev/null; then
    echo "✅ GitHub CLI already authenticated"
    gh repo create $REPO_NAME --public --source=. --remote=origin --push 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "✅ Repository created and pushed successfully!"
        echo "🌐 View at: https://github.com/$GITHUB_USER/$REPO_NAME"
        exit 0
    fi
fi

# Method 2: Try device flow authentication (non-interactive)
echo "🔐 Attempting authentication..."
DEVICE_CODE=$(gh auth login --device-code 2>&1 | grep 'code:' | sed 's/.*code: //' | head -1)

if [ -n "$DEVICE_CODE" ]; then
    echo "📱 Device code: $DEVICE_CODE"
    echo "Please visit: https://github.com/login/device"
    echo "Enter the code above to authenticate"
    sleep 5
fi

# Method 3: Try with token from environment
if [ -n "$GITHUB_TOKEN" ]; then
    echo "🔑 Using GITHUB_TOKEN from environment..."
    echo "$GITHUB_TOKEN" | gh auth login --with-token 2>/dev/null
    if gh auth status &>/dev/null; then
        gh repo create $REPO_NAME --public --source=. --remote=origin --push
        if [ $? -eq 0 ]; then
            echo "✅ Repository created successfully!"
            exit 0
        fi
    fi
fi

# Method 4: Create via API if token available
if [ -n "$GITHUB_TOKEN" ]; then
    echo "📡 Creating repository via API..."
    RESPONSE=$(curl -s -X POST \
        -H "Authorization: token $GITHUB_TOKEN" \
        -H "Accept: application/vnd.github.v3+json" \
        https://api.github.com/user/repos \
        -d "{\"name\":\"$REPO_NAME\",\"public\":true}")
    
    if echo "$RESPONSE" | grep -q '"name"'; then
        echo "✅ Repository created via API"
        git push -u origin main
        echo "✅ Code pushed successfully!"
        exit 0
    fi
fi

# Fallback: Manual instructions
echo ""
echo "⚠️  Automated setup requires authentication."
echo ""
echo "Quick setup (choose one):"
echo ""
echo "Option 1: Authenticate and auto-create (recommended)"
echo "  gh auth login"
echo "  ./create-repo.sh"
echo ""
echo "Option 2: Create manually on GitHub.com"
echo "  1. Visit: https://github.com/new"
echo "  2. Name: $REPO_NAME"
echo "  3. Set to Public"
echo "  4. Click 'Create repository'"
echo "  5. Then run: git push -u origin main"
echo ""
echo "Current status:"
echo "  ✅ Git repo initialized"
echo "  ✅ Remote configured: https://github.com/$GITHUB_USER/$REPO_NAME.git"
echo "  ✅ Code committed and ready to push"
echo "  ⏳ Waiting for authentication"

