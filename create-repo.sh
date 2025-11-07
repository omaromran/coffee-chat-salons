#!/bin/bash

# Create GitHub Repository and Push Code
REPO_NAME="coffee-chat-salons"

echo "🚀 Creating GitHub repository: $REPO_NAME"

# Check authentication
if ! gh auth status &>/dev/null; then
    echo "⚠️  GitHub CLI authentication required."
    echo "Please run: gh auth login"
    echo "Then run this script again."
    exit 1
fi

# Create repository and push
echo "✅ Creating repository on GitHub..."
gh repo create $REPO_NAME --public --source=. --remote=origin --push

if [ $? -eq 0 ]; then
    echo "✅ Repository created and code pushed successfully!"
    echo "🌐 Repository URL: https://github.com/$(gh api user --jq .login)/$REPO_NAME"
else
    echo "❌ Failed to create repository. Please check your authentication and try again."
    exit 1
fi


