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

let runtime = -1

// console.log(options)

const api = new API(app, options)

if (process.env.FORGE_TIMEOUT !== undefined && Number.isInteger(parseInt(process.env.FORGE_TIMEOUT))) {
    runtime = parseInt(process.env.FORGE_TIMEOUT) * 60 * 60 * 1000 // hours
    console.log(`Auto shutdown in ${process.env.FORGE_TIMEOUT} hours (${runtime}) seconds`)
    setTimeout(async () => {
        console.log('Auto shutdown firing')
        try {
            await api.selfShutdown()
        } catch (err) {
            console.log(err)
        }
        // await api.stop(true)
        // process.exit(0)
    }, runtime)
} else {
    console.log(process.env.FORGE_TIMEOUT)
    console.log(Number.isInteger(process.env.FORGE_TIMEOUT))
    console.log(Number.isInteger(parseInt(process.env.FORGE_TIMEOUT)))
}

process.on('SIGTERM', async () => {
    await api.stop()
    process.exit(0)
})

app.listen(port, () => {
    console.log(`MQTT Schema Agent running - pid ${process.pid}`)
    console.log(`listening on port ${port}`)
})
