#!/usr/bin/env node

/**
 * ASUS AURA Unbrick Tool
 * Recovers bricked LED configurations
 */

const { SafeAuraController } = require('../src/aura-safe');

console.log('');
console.log('═══════════════════════════════════════════════════════════');
console.log('ASUS AURA UNBRICK TOOL');
console.log('═══════════════════════════════════════════════════════════');
console.log('');

const aura = new SafeAuraController({ verbose: true });

try {
    // Connect
    console.log('Connecting to ASUS AURA controller...');
    aura.connect();
    console.log('');

    // Check current state
    console.log('Reading current configuration...');
    const before = aura.getConfig();
    console.log(`  Channel 0: ${before.channel0_leds} LEDs`);
    console.log(`  Channel 1: ${before.channel1_leds} LEDs`);
    console.log(`  Channel 2: ${before.channel2_leds} LEDs`);
    console.log('');

    // Check if bricked
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
            console.log('Run "npm run verify" to confirm.');
        } else {
            console.log('❌ Unbrick failed.');
            console.log('');
            console.log('Try:');
            console.log('  1. Power cycle the system');
            console.log('  2. Run this tool again');
            console.log('  3. Check BIOS AURA settings');
        }
    } else {
        console.log('✓ Configuration looks OK');
        console.log('');
        console.log('No unbrick needed. LEDs should be working.');
        console.log('');
        console.log('If you are still having issues:');
        console.log('  - Try power cycling');
        console.log('  - Run "npm run verify"');
        console.log('  - Check physical connections');
    }
    
    console.log('');
    aura.disconnect();
    
} catch (error) {
    console.error('');
    console.error('❌ Error:', error.message);
    console.error('');
    process.exit(1);
}
