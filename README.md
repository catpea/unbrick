# ASUS AURA Unbrick

Safe ASUS AURA LED controller with automatic recovery from bricked states.

Built using the **BLACK STATE MACHINE** methodology for reverse engineering unknown systems.

## Quick Start

### Global Install (Recommended)

```bash
npm install -g unbrick
```

### Usage

```bash
# Unbrick your LEDs
unbrick-rgb-all

# Verify configuration
unbrick-rgb-verify

# Run tests
unbrick-rgb-test
```

That's it! The tools will guide you through any setup needed.

## Features

- ✅ **Zero dependencies** - No npm packages, no supply chain attacks, uses only Node.js built-ins
- ✅ **Safe by design** - BLACK STATE MACHINE guards prevent invalid operations
- ✅ **Automatic recovery** - Unbrick LEDs with one command
- ✅ **Global commands** - Install once, use anywhere
- ✅ **No postinstall scripts** - Trustworthy, transparent installation
- ✅ **No native compilation** - Pure JavaScript, installs instantly
- ✅ **Setup detection** - Alerts you if permissions or device access needed
- ✅ **Production ready** - Error handling, validation, state tracking
- ✅ **Fully auditable** - <500 lines of pure JavaScript code

## The Problem

ASUS AURA LEDs can get "bricked" where:
- LEDs 10-16 don't respond
- Channel 2 stuck at 9 LEDs instead of 16
- No clear recovery procedure
- Silent failures

## The Solution

This tool automatically:
1. Detects bricked state
2. Initializes correct topology
3. Commits to EEPROM
4. Verifies recovery

## Global Commands

After `npm install -g unbrick`, you get:

### unbrick-rgb-all

Unbrick your ASUS AURA LEDs:

```bash
unbrick-rgb-all
```

Automatically detects and fixes bricked states.

### unbrick-rgb-verify

Verify your LED configuration:

```bash
unbrick-rgb-verify
```

Checks topology and tests LED 10.

### unbrick-rgb-test

Run the test suite:

```bash
unbrick-rgb-test
```

Validates library functionality (some tests require hardware).

## Setup Requirements

The commands will alert you if setup is needed. Typically:

### 1. Device Access

ASUS AURA controller must be connected (USB device 0b05:19af).

Verify:
```bash
lsusb | grep 0b05:19af
```

### 2. Permissions

Read/write access to `/dev/hidraw0`:

**Quick fix (temporary):**
```bash
sudo chmod 666 /dev/hidraw0
```

**Permanent fix (recommended):**
```bash
sudo tee /etc/udev/rules.d/99-aura.rules <<EOF
SUBSYSTEM=="hidraw", ATTRS{idVendor}=="0b05", ATTRS{idProduct}=="19af", MODE="0666"
EOF

sudo udevadm control --reload-rules
sudo udevadm trigger
```

## Programmatic Usage

You can also use the library in your Node.js code:

```javascript
const { SafeAuraController } = require('unbrick');

const aura = new SafeAuraController();

try {
    // Connect (auto-initializes topology)
    aura.connect();

    // Set LED 10 to RED
    aura.setLED(2, 9, 255, 0, 0);

    // Set all LEDs on channel 1 to BLUE
    aura.setAllLEDs(1, 0, 0, 255);

    // Commit to persist
    aura.commit();

} finally {
    aura.disconnect();
}
```

### API

**SafeAuraController Methods:**
- `connect()` - Connect and auto-initialize topology
- `disconnect()` - Close connection
- `setLED(channel, index, r, g, b)` - Set single LED
- `setAllLEDs(channel, r, g, b)` - Set all LEDs on channel
- `setEffect(channel, mode, r, g, b, brightness)` - Set effect
- `commit()` - Persist to EEPROM
- `getConfig()` - Read CONFIG_TABLE
- `getState()` - Get current BSM state
- `isBricked()` - Check for bricked state
- `unbrick(topology)` - Recover from bricked state

## How It Works

### The Discovery

The ASUS AURA firmware requires **topology initialization** before accepting commands:

```javascript
aura.setLEDCount(2, 16);  // Init topology (EC 52 53 02 10)
aura.commit();             // Persist to EEPROM (EC 3F 55)
```

Without topology init:
- Color commands are ignored
- Commits fail silently
- LEDs appear "bricked"

### BLACK STATE MACHINE

This library implements the **BLACK STATE MACHINE** methodology:

```
BOOT → LOCKED → RUNTIME → COMMITTED
```

**Key insight:** Model unknown systems as state machines (even if they're not) for predictive power.

This framework works on any resettable black box: embedded devices, unknown firmware, proprietary protocols, even UFOs!

## Documentation

- **[INSTALL.md](INSTALL.md)** - Installation details
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** - Technical design
- **[docs/THEORY.md](docs/THEORY.md)** - BLACK STATE MACHINE methodology
- **[docs/BEST-PRACTICES.md](docs/BEST-PRACTICES.md)** - Safe usage patterns
- **[docs/DISCOVERY.md](docs/DISCOVERY.md)** - How we reverse engineered this

## Troubleshooting

### Device not found

```bash
# Check if connected
lsusb | grep 0b05:19af

# Should show:
# Bus 001 Device 002: ID 0b05:19af ASUSTek Computer, Inc. AURA LED Controller
```

### Permission denied

```bash
# Quick fix
sudo chmod 666 /dev/hidraw0

# Or see INSTALL.md for permanent udev rules
```

### Still bricked after unbrick

1. Power cycle the system
2. Run `unbrick-rgb-all` again
3. Check BIOS AURA settings
4. See [docs/BEST-PRACTICES.md](docs/BEST-PRACTICES.md)

### LEDs not responding

```bash
# Verify configuration
unbrick-rgb-verify

# If bricked, unbrick
unbrick-rgb-all
```

## Uninstall

```bash
npm uninstall -g unbrick
```

Clean uninstall with no leftover scripts or processes.

## Development

```bash
# Clone repository
git clone https://github.com/meow/unbrick.git
cd unbrick

# Install dependencies
npm install

# Run tests
npm test

# Test global install locally
npm link
unbrick-rgb-test
npm unlink
```

## Contributing

Found a bug or have a feature request? Please open an issue!

## License

MIT

## Credits

**Methodology:** BLACK STATE MACHINE framework
**Discovered:** 2026-01-05
**Author:** meow

Built with reverse engineering, hot showers, and perseverance.

## Philosophy

> "If you can reset it, you can model it.
> If you can model it, you can control it.
> Even UFOs."

The BLACK STATE MACHINE methodology transforms unknown systems into understandable, controllable components through systematic observation and modeling.

## Security

This package is designed with security in mind:
- ✅ **Zero npm dependencies** - No supply chain attack surface
- ✅ **No postinstall scripts** - No hidden code execution
- ✅ **No telemetry or analytics** - Your data stays private
- ✅ **No native compilation** - Pure JavaScript you can read and audit
- ✅ **Open source and auditable** - Every line of code is visible
- ✅ **Transparent permission requirements** - Explicitly needs /dev/hidraw access
- ✅ **Custom HID implementation** - Direct /dev/hidraw access using Node.js fs module

**Total attack surface:** ~500 lines of auditable JavaScript + Node.js runtime

## Related Projects

- [OpenRGB](https://openrgb.org/) - Cross-platform RGB control

## Support

- **Documentation:** See [docs/](docs/) directory
- **Issues:** GitHub issue tracker
- **Discussions:** GitHub discussions

---

**Status:** Production Ready ✅
**Tested On:** Fedora Linux, ASUS B650E motherboard
**Device:** ASUS AURA LED Controller (0b05:19af)

## Dedication

I dedicate this project to [+Fravia][1]
![fravia.jpg](fravia.jpg)
We are still learning from you, sir.

[1]: https://en.wikipedia.org/wiki/Fravia
