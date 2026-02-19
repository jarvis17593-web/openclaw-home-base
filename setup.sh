#!/bin/bash

# OpenClaw Home Base — Setup Script
# Usage: ./setup.sh [--quick]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🤖 OpenClaw Home Base — Setup${NC}"
echo ""

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 22 ]; then
  echo -e "${RED}❌ Node.js 22+ required (you have v$(node -v | cut -d'v' -f2))${NC}"
  exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
  echo -e "${RED}❌ npm not found${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Node.js $(node -v)${NC}"
echo -e "${GREEN}✓ npm $(npm -v)${NC}"
echo ""

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm install

echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
  echo -e "${BLUE}🔐 Creating .env file...${NC}"
  cp .env.example .env
  
  echo -e "${YELLOW}⚠️  Please edit .env with your settings:${NC}"
  echo "  - GATEWAY_API_KEY (required)"
  echo "  - GATEWAY_URL (optional, default: http://localhost:18789)"
  echo "  - JWT secrets (will be generated)"
  echo "  - Database encryption key (will be generated)"
  echo ""
  
  # Generate secrets if needed
  if grep -q "CHANGEME" .env; then
    echo -e "${BLUE}🔑 Generating secrets...${NC}"
    
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    DB_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    
    # Update .env with generated secrets
    sed -i '' "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
    sed -i '' "s/JWT_REFRESH_SECRET=.*/JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET/" .env
    sed -i '' "s/DATABASE_ENCRYPTION_KEY=.*/DATABASE_ENCRYPTION_KEY=$DB_KEY/" .env
    
    echo -e "${GREEN}✓ Secrets generated${NC}"
  fi
  
else
  echo -e "${GREEN}✓ .env already exists${NC}"
fi

echo ""

# Initialize database
echo -e "${BLUE}💾 Initializing database...${NC}"
npm run db:init
echo -e "${GREEN}✓ Database initialized${NC}"
echo ""

# Type check
echo -e "${BLUE}✅ Type checking...${NC}"
npm run type-check
echo -e "${GREEN}✓ Type checks passed${NC}"
echo ""

# Done
echo -e "${GREEN}🎉 Setup complete!${NC}"
echo ""
echo "To start development:"
echo -e "  ${BLUE}npm run dev${NC}"
echo ""
echo "Then open:"
echo -e "  ${BLUE}http://localhost:5173${NC}"
echo ""
echo "Backend API:"
echo -e "  ${BLUE}http://localhost:3000/api${NC}"
echo ""
