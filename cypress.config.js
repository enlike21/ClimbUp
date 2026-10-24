const { defineConfig } = require("cypress");

module.exports = defineConfig({
    e2e: {
        baseUrl: process.env.CYPRESS_BASE_URL || "http://localhost:8080",
        viewportWidth: 1280,
        viewportHeight: 720,
        defaultCommandTimeout: 10000,
        experimentalInteractiveRunEvents: true,
        chromeWebSecurity: false,
        experimentalRunAllSpecs: true,
        modifyObstructiveCode: false,
        supportFile: false
    }
});