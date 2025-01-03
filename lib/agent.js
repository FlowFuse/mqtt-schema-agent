const got = require('got')
const mqtt = require('mqtt')

class Agent {
    constructor (options) {
        this.options = options
        this.topics = {}
    }

    async connect () {
        const agent = this
        this.connected = false

        try {
            this.creds = await got.get(`${this.options.forgeURL}/api/v1/team/${this.options.team}/broker/${this.options.broker}/creds`, {
                headers: {
                    Authorization: `Bearer ${this.options.token}`
                }
            }).json()

            this.client = mqtt.connect(`${this.creds.protocol}//${this.creds.hostname}:${this.creds.port}`, this.creds)
            this.client.on('connect', function () {
                agent.connected = true
                console.log('connected')
                agent.client.subscribe('#')
            })
            this.client.on('reconnect', function () {
                console.log('reconnecting')
            })
            this.client.on('close', function () {
                console.log('closed')
            })
            this.client.on('disconnect', function () {})
            this.client.on('error', function (error) {
                console.log('error', error)
            })
            this.client.on('message', function (topic) {
                // console.log(topic)
                agent.topics[topic] = Date.now()
            })
        } catch (err) {
            console.log(err)
            throw err
        }
    }

    async start () {
        if (this.client) {
            await this.stop()
        }
        await this.connect()
    }

    async stop () {
        if (this.client) {
            this.client.end()
        }
        this.connected = false
    }

    state () {
        return {
            connected: this.connected,
            topics: this.topics
        }
    }
}

module.exports = {
    Agent
}
