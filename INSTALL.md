# Installation Guide

## Prerequisites

- Node.js (v14 or higher)
- USB access to ASUS AURA device (0b05:19af)
- Linux (tested on Fedora)

**Zero external dependencies** - Uses only Node.js built-in modules for maximum security and auditability.

## Quick Install

```bash
npm install -g unbrick
```

This installs three global commands:
- `unbrick-rgb-all` - Unbrick your AURA LEDs
- `unbrick-rgb-verify` - Verify configuration and test LEDs
- `unbrick-rgb-test` - Run the test suite

## Verify Installation

```bash
# Run tests
unbrick-rgb-test

# Check device connection
unbrick-rgb-verify
```

## Permissions

The tool needs access to `/dev/hidraw0`:

### Option 1: Temporary (Quick Test)
```bash
sudo chmod 666 /dev/hidraw0
```

### Option 2: Permanent (Recommended)

Create udev rule:

```bash
sudo tee /etc/udev/rules.d/99-aura.rules <<EOF
# ASUS AURA LED Controller
SUBSYSTEM=="hidraw", ATTRS{idVendor}=="0b05", ATTRS{idProduct}=="19af", MODE="0666"
EOF

sudo udevadm control --reload-rules
sudo udevadm trigger
```

Then reconnect USB or reboot.

## First Run

The commands will automatically check for setup requirements and guide you through any needed configuration.

```bash
# Unbrick if needed
unbrick-rgb-all

# Verify configuration
unbrick-rgb-verify
```

## Troubleshooting

### Device Not Found

```bash
# Check if device is connected
lsusb | grep 0b05:19af

# Should show:
# Bus 001 Device 002: ID 0b05:19af ASUSTek Computer, Inc. AURA LED Controller
```

### Permission Denied

```bash
# Check hidraw permissions
ls -l /dev/hidraw*

# If not writable, apply permissions (see above)
```

### Installation issues

This package has **zero dependencies** and requires no compilation. If you experience issues:

```bash
# Verify Node.js version
node --version  # Should be v14 or higher

# Try reinstalling
npm uninstall -g unbrick
npm install -g unbrick
```

## Usage

See README.md for usage examples.

## Uninstall

```bash
# Uninstall global package
npm uninstall -g unbrick

# Remove udev rule if added
sudo rm /etc/udev/rules.d/99-aura.rules
sudo udevadm control --reload-rules
```
