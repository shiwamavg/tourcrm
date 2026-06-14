// src/server.js — entry point
const app = require('./app');
const env = require('./config/env');

app.listen(env.port, () => {
    console.log(`✓ Tour CRM API running on http://localhost:${env.port}`);
    console.log(`  Environment: ${env.nodeEnv}`);
});
