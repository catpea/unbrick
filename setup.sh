#!/bin/bash

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "ASUS AURA Unbrick - Setup"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js first."
    exit 1
fi

echo "✓ Node.js found: $(node --version)"

# Install dependencies
echo ""
echo "Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ npm install failed"
    echo ""
    echo "Try installing build tools:"
    echo "  sudo dnf install gcc-c++ make python3"
    exit 1
fi

echo ""
echo "✓ Dependencies installed"

# Check device
echo ""
echo "Checking for AURA device..."
if lsusb | grep -q "0b05:19af"; then
    echo "✓ AURA device found"
else
    echo "⚠️  AURA device not found (0b05:19af)"
    echo "   Make sure it's connected via USB"
fi

# Check permissions
echo ""
echo "Checking permissions..."
if [ -w /dev/hidraw0 ]; then
    echo "✓ /dev/hidraw0 is writable"
else
    echo "⚠️  /dev/hidraw0 not writable"
    echo ""
    echo "Run: sudo chmod 666 /dev/hidraw0"
    echo "Or see INSTALL.md for permanent fix"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "Setup Complete!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. If needed: sudo chmod 666 /dev/hidraw0"
echo "  2. Run: npm run unbrick"
echo "  3. Run: npm run verify"
echo ""
echo "See README.md for usage examples."
echo ""
