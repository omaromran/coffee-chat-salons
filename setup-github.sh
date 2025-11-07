#!/bin/bash

# GitHub Repository Setup Script
# This script will create a GitHub repository and push the code

REPO_NAME="coffee-chat-salons"
GITHUB_USER="omaromran"  # Update this if your GitHub username is different

echo "🚀 Setting up GitHub repository for $REPO_NAME..."

# Check if GitHub CLI is installed
if command -v gh &> /dev/null; then
    echo "✅ GitHub CLI found. Creating repository..."
    gh repo create $REPO_NAME --public --source=. --remote=origin --push
    echo "✅ Repository created and code pushed!"
else
    echo "⚠️  GitHub CLI not found. Please create the repository manually:"
    echo ""
    echo "1. Go to https://github.com/new"
    echo "2. Repository name: $REPO_NAME"
    echo "3. Set to Public or Private"
    echo "4. DO NOT initialize with README, .gitignore, or license"
    echo "5. Click 'Create repository'"
    echo ""
    echo "Then run these commands:"
    echo "  git remote add origin https://github.com/$GITHUB_USER/$REPO_NAME.git"
    echo "  git branch -M main"
    echo "  git push -u origin main"
    echo ""
    read -p "Have you created the repository? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git remote add origin https://github.com/$GITHUB_USER/$REPO_NAME.git 2>/dev/null || git remote set-url origin https://github.com/$GITHUB_USER/$REPO_NAME.git
        git branch -M main
        git push -u origin main
        echo "✅ Code pushed to GitHub!"
    else
        echo "❌ Please create the repository first, then run this script again."
    fi
fi


