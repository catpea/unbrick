#!/usr/bin/env node

/**
 * unbrick-rgb-verify - Verify ASUS AURA topology and test LEDs
 * Usage: unbrick-rgb-verify
 */

const fs = require('fs');

// Check for required setup
function checkSetup() {
    const issues = [];
    
    const hasDevice = fs.existsSync('/dev/hidraw0');
    if (!hasDevice) {
        issues.push('AURA device not found at /dev/hidraw0');
    }
    
    if (hasDevice) {
        try {
            fs.accessSync('/dev/hidraw0', fs.constants.R_OK | fs.constants.W_OK);
        } catch (error) {
            issues.push('No permission for /dev/hidraw0');
            issues.push('  Fix: sudo chmod 666 /dev/hidraw0');
        }
    }
    
    return issues;
}

const setupIssues = checkSetup();
if (setupIssues.length > 0) {
    console.log('');
    console.log('⚠️  Setup Required');
    console.log('─────────────────────────────────────────────────────────');
    setupIssues.forEach(issue => console.log(issue));
    console.log('');
    process.exit(1);
}

const { SafeAuraController } = require('../src/aura-safe');

console.log('');
console.log('═══════════════════════════════════════════════════════════');
console.log('ASUS AURA TOPOLOGY VERIFICATION');
console.log('═══════════════════════════════════════════════════════════');
console.log('');

const aura = new SafeAuraController({ verbose: false });

try {
    aura.connect();
    
    const config = aura.getConfig();
    
    console.log('Current Configuration:');
    console.log('─────────────────────────────────────────────────────────');
    console.log(`  Channel 0: ${config.channel0_leds} LEDs`);
    console.log(`  Channel 1: ${config.channel1_leds} LEDs`);
    console.log(`  Channel 2: ${config.channel2_leds} LEDs`);
    console.log('');
    
    console.log('BLACK STATE MACHINE:');
    console.log('─────────────────────────────────────────────────────────');
    console.log(`  Current State: ${aura.getState()}`);
    console.log(`  Bricked: ${aura.isBricked() ? 'YES ⚠️' : 'NO ✓'}`);
    console.log('');
    
    if (aura.isBricked()) {
        console.log('⚠️  WARNING: Bricked state detected!');
        console.log('');
        console.log('Run: unbrick-rgb-all');
        console.log('');
    } else {
        console.log('✓ Topology is valid');
        console.log('');
        
        // Test LED 10 if channel 2 has enough LEDs
        if (config.channel2_leds >= 10) {
            console.log('Testing LED 10 (index 9) on Channel 2...');
            aura.setLED(2, 9, 255, 0, 0);  // RED
            
            console.log('');
            console.log('🔴 LED 10 should be RED for 3 seconds...');
            console.log('');
            
            setTimeout(() => {
                aura.setLED(2, 9, 0, 0, 0);  // OFF
                console.log('Test complete.');
                console.log('');
                aura.disconnect();
            }, 3000);
        } else {
            console.log(`⚠️  Channel 2 only has ${config.channel2_leds} LEDs`);
            console.log('   Expected: 16 LEDs');
            console.log('');
            console.log('Run: unbrick-rgb-all');
            console.log('');
            aura.disconnect();
        }
    }
    
} catch (error) {
    console.error('');
    console.error('❌ Error:', error.message);
    console.error('');
    process.exit(1);
}
