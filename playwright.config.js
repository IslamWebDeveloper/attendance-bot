const { defineConfig } = require('@playwright/test');

module.exports = {
    use: {
        headless: true,
        viewport: {
            width: 1400,
            height: 900
        }
    }
}