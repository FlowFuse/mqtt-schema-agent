const express = require('express')
const bodyParser = require('body-parser')
const { API } = require('./lib/api.js')
const { healthz } = require('./lib/health.js')

const port = 3500

const app = express()
app.use(bodyParser.json({}))

app.get('/healthz', healthz)

const options = {
    forgeURL: process.env.FORGE_URL,
    team: process.env.FORGE_TEAM_ID,
    broker: process.env.FORGE_BROKER_ID,
    token: process.env.FORGE_TEAM_TOKEN
}

const api = new API(app, options)

process.on('SIGTERM', async () => {
    await api.stop()
    process.exit(0)
})

app.listen(port, () => {
    console.log(`listening on port ${port}`)
})
