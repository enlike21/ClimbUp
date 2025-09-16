const { defineConfig } = require("cypress");

module.exports = defineConfig({
    e2e: {
        baseUrl: "http://escalada-app.dvl.to",
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