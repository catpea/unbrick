#!/usr/bin/env node

/**
 * unbrick-rgb-all - Global command to unbrick ASUS AURA LEDs
 * Usage: unbrick-rgb-all
 */

const path = require('path');
const fs = require('fs');

// Check for required setup
function checkSetup() {
    const issues = [];

    // Check if device exists
    const hasDevice = fs.existsSync('/dev/hidraw0');
    if (!hasDevice) {
        issues.push('AURA device not found at /dev/hidraw0');
        issues.push('  Check: lsusb | grep 0b05:19af');
    }

    // Check permissions
    if (hasDevice) {
        try {
            fs.accessSync('/dev/hidraw0', fs.constants.R_OK | fs.constants.W_OK);
        } catch (error) {
            issues.push('No read/write permission for /dev/hidraw0');
            issues.push('  Fix: sudo chmod 666 /dev/hidraw0');
            issues.push('  Or see: https://github.com/meow/unbrick#permissions');
        }
    }

    return issues;
}

// Show setup issues if any
const setupIssues = checkSetup();
if (setupIssues.length > 0) {
    console.log('');
    console.log('⚠️  Setup Required');
    console.log('─────────────────────────────────────────────────────────');
    setupIssues.forEach(issue => console.log(issue));
    console.log('');
    console.log('After fixing, run: unbrick-rgb-all');
    console.log('');
    process.exit(1);
}

// Run the actual unbrick tool
const { SafeAuraController } = require('../src/aura-safe');

console.log('');
console.log('═══════════════════════════════════════════════════════════');
console.log('ASUS AURA UNBRICK TOOL');
console.log('═══════════════════════════════════════════════════════════');
console.log('');

const aura = new SafeAuraController({ verbose: true });

try {
    console.log('Connecting to ASUS AURA controller...');
    aura.connect();
    console.log('');

    console.log('Reading current configuration...');
    const before = aura.getConfig();
    console.log(`  Channel 0: ${before.channel0_leds} LEDs`);
    console.log(`  Channel 1: ${before.channel1_leds} LEDs`);
    console.log(`  Channel 2: ${before.channel2_leds} LEDs`);
    console.log('');

    const bricked = aura.isBricked();

    if (bricked) {
        console.log('⚠️  BRICKED STATE DETECTED');
        console.log('');
        console.log('Starting unbrick procedure...');
        console.log('');

        const success = aura.unbrick();

        console.log('');
        if (success) {
            console.log('✅ UNBRICK SUCCESSFUL!');
            console.log('');
            console.log('Your LEDs should now respond to commands.');
            console.log('Verify with: unbrick-rgb-verify');
        } else {
            console.log('❌ Unbrick failed.');
            console.log('');
            console.log('Try:');
            console.log('  1. Power cycle the system');
            console.log('  2. Run: unbrick-rgb-all');
            console.log('  3. Check BIOS AURA settings');
        }
    } else {
        console.log('✓ Configuration looks OK');
        console.log('');
        console.log('No unbrick needed. LEDs should be working.');
        console.log('');
        console.log('If you still have issues:');
        console.log('  - Try: unbrick-rgb-verify');
        console.log('  - Power cycle the system');
        console.log('  - Check physical connections');
    }

    console.log('');
    aura.disconnect();

} catch (error) {
    console.error('');
    console.error('❌ Error:', error.message);
    console.error('');
    console.error('If you see "Not connected" or permission errors:');
    console.error('  sudo chmod 666 /dev/hidraw0');
    console.error('');
    process.exit(1);
}
