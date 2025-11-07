#!/bin/bash

# Final automated setup - tries all methods
REPO_NAME="coffee-chat-salons"
GITHUB_USER="omaromran"

echo "🚀 Final automated GitHub setup..."

# Check if repo already exists
if curl -s -f "https://api.github.com/repos/$GITHUB_USER/$REPO_NAME" > /dev/null 2>&1; then
    echo "✅ Repository already exists!"
    git push -u origin main 2>/dev/null && echo "✅ Code pushed!" || echo "⚠️  Push failed - may need authentication"
    exit 0
fi

# Try GitHub CLI if authenticated
if gh auth status &>/dev/null; then
    echo "✅ Using GitHub CLI..."
    gh repo create $REPO_NAME --public --source=. --remote=origin --push 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "✅ Repository created and pushed!"
        exit 0
    fi
fi

# Try with token if available
if [ -n "$GITHUB_TOKEN" ]; then
    echo "🔑 Using GITHUB_TOKEN..."
    echo "$GITHUB_TOKEN" | gh auth login --with-token 2>/dev/null
    gh repo create $REPO_NAME --public --source=. --remote=origin --push 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "✅ Repository created!"
        exit 0
    fi
fi

# Final attempt: Create via API with token
if [ -n "$GITHUB_TOKEN" ]; then
    echo "📡 Creating via API..."
    curl -s -X POST \
        -H "Authorization: token $GITHUB_TOKEN" \
        -H "Accept: application/vnd.github.v3+json" \
        "https://api.github.com/user/repos" \
        -d "{\"name\":\"$REPO_NAME\",\"public\":true}" > /dev/null
    
    if [ $? -eq 0 ]; then
        git push -u origin main
        echo "✅ Repository created and pushed!"
        exit 0
    fi
fi

echo ""
echo "⚠️  Authentication required to create repository."
echo ""
echo "🔧 Quick fix - run ONE of these:"
echo ""
echo "1. Authenticate GitHub CLI:"
echo "   gh auth login"
echo "   Then run: gh repo create $REPO_NAME --public --source=. --remote=origin --push"
echo ""
echo "2. Or create manually on GitHub.com:"
echo "   Visit: https://github.com/new"
echo "   Name: $REPO_NAME, Public, then: git push -u origin main"
echo ""
echo "✅ Everything else is ready - just needs authentication!"


