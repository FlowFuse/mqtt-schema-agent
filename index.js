#!/usr/bin/env node
const express = require('express')
const bodyParser = require('body-parser')
const { API } = require('./lib/api.js')
const { healthz } = require('./lib/health.js')

const port = process.env.FORGE_PORT || 3500

const app = express()
app.use(bodyParser.json({}))

app.get('/healthz', healthz)

const options = {
    forgeURL: process.env.FORGE_URL,
    team: process.env.FORGE_TEAM_ID,
    broker: process.env.FORGE_BROKER_ID,
    token: process.env.FORGE_TEAM_TOKEN
}

// console.log(options)

const api = new API(app, options)

process.on('SIGTERM', async () => {
    await api.stop()
    process.exit(0)
})

app.listen(port, () => {
    console.log(`MQTT Schema Agent running - pid ${process.pid}`)
    console.log(`listening on port ${port}`)
})
