const got = require('got')
const isUtf8 = require('is-utf8')
const mqtt = require('mqtt')

const logger = require('./logger')
const schemaGen = require('./schema-generator')

const REPORT_TIME = 1000 * 60 * 2

class Agent {
    constructor (options) {
        this.options = options
        this.topics = {}
        this.error = null
        this.stopped = true
    }

    async connect () {
        const agent = this
        this.connected = false
        this.reconnectCount = 0
        this.stopped = false

        // logger.log(`${this.options.forgeURL}/api/v1/teams/${this.options.team}/brokers/${this.options.broker}/credentials`)

        try {
            this.creds = await got.get(`${this.options.forgeURL}/api/v1/teams/${this.options.team}/brokers/${this.options.broker}/credentials`, {
                headers: {
                    Authorization: `Bearer ${this.options.token}`
                }
            }).json()

            // logger.log(`creds: ${JSON.stringify(this.creds,null, 2)}`)
            this.creds = Object.assign(this.creds, { reconnectPeriod: 0 })

            if (this.creds.ssl) {
                switch (this.creds.protocol) {
                case 'mqtt:':
                    this.creds.protocol = 'mqtts:'
                    break
                case 'ws:':
                    this.creds.protocol = 'wss:'
                    break
                }
            }

            const options = {
                clientId: this.creds.clientId,
                protocolVersion: this.creds.protocolVersion,
                username: this.creds.credentials.username,
                password: this.creds.credentials.password
            }

            if (!this.creds.verifySSL) {
                options.rejectUnauthorized = false
            }

            const url = `${this.creds.protocol}//${this.creds.host}:${this.creds.port}`
            // logger.log(url)
            // logger.log(options)

            // this.client = mqtt.connect(`${this.creds.protocol}//${this.creds.hostname}:${this.creds.port}`, this.creds)
            this.client = mqtt.connect(url, options)
            this.client.on('connect', function () {
                agent.connected = true
                logger.log(`connected to ${agent.creds.host}:${agent.creds.port} as ${options.clientId}`)
                agent.error = null
                const topics = agent.creds.topicPrefix || ['#']
                logger.log(`subscribing to "${topics.join(',')}"`)
                agent.client.subscribe(topics)
            })
            this.client.on('subscribe', function () {
                // on successful subscribe reset reconnect count
                agent.reconnectCount = 0
            })
            this.client.on('reconnect', function () {
                // logger.log('reconnecting')
            })
            this.client.on('close', function () {
                // logger.log('closed')
                if (!agent.stopped) {
                    if (agent.reconnectCount < 3) {
                        agent.reconnectCount++
                        agent.reconnectTimeout = setTimeout(() => {
                            agent.client.reconnect()
                        }, 5000)
                    }
                }
            })
            this.client.on('disconnect', function (packet) {
                // logger.log('MQTTv5 disconnected')
                // should check the reason code
                // logger.log(packet)
            })
            this.client.on('error', function (error) {
                logger.log('error', error.code)
                logger.log(error)
                switch (error.code) {
                case 'ECONNREFUSED': // connection refused
                case 'ENOTFOUND': // DNS lookup failed
                    agent.error = error.code
                    break
                case 1:
                    agent.error = 'WRONGMQTTVERSION'
                    break
                case 2:
                case 133:
                    agent.error = 'CLIENTIDNOTALLOWED'
                    break
                case 4:
                    agent.error = 'MALFORMEDCREDS'
                    break
                case 5:
                case 135: // not authorized
                    agent.error = 'NOTAUTHORIZED'
                    break
                case 138:
                    agent.error = 'BANNED'
                    break
                default:
                    // logger.log('default error')
                }
                // logger.log(`agent.error set to: ${agent.error}`)
            })
            this.client.on('message', function (topic, payload) {
                // logger.log(topic)
                let type = { type: 'unknown' }
                try {
                    if (isUtf8(payload)) {
                        const stringPayload = payload.toString('utf8')
                        type = { type: 'string' }
                        if (stringPayload.charAt(0) === '<' && stringPayload.charAt(stringPayload.length - 1) === '>') {
                            type.type = 'xml'
                        } else {
                            try {
                                const json = JSON.parse(stringPayload)
                                type = schemaGen.generateSchema(json)
                            } catch (err) {
                                // Not JSON parseable - default to string
                            }
                        }
                    } else {
                        type.type = 'bin'
                    }
                } catch (err) {
                    logger.log(`Error parsing payload on topic '${topic}' ${err}`)
                }
                // logger.log(topic, type)
                agent.topics[topic] = {
                    timestamp: Date.now(),
                    type
                }
            })
        } catch (err) {
            logger.log(err)
            throw err
        }

        this.reportInterval = setInterval(async () => {
            if (agent.connected) {
                await this.upload()
            }
        }, REPORT_TIME)
    }

    async upload () {
        // logger.log(`${agent.options.forgeURL}/api/v1/teams/${agent.options.team}/brokers/${agent.options.broker}/topics`)
        // logger.log(JSON.stringify(agent.topics, null, 2))
        const upload = []
        Object.keys(this.topics).forEach((key) => {
            upload.push({
                topic: key,
                type: this.topics[key].type,
                timestamp: this.topics[key].timestamp
            })
        })
        try {
            logger.log('uploading')
            await got.post(`${this.options.forgeURL}/api/v1/teams/${this.options.team}/brokers/${this.options.broker}/topics`, {
                headers: {
                    Authorization: `Bearer ${this.options.token}`
                },
                json: upload
            })
            logger.log('uploaded')
            // clear list so only uploading new topics each time
            this.topics = {}
        } catch (err) {
            logger.log(err)
        }
    }

    async start () {
        if (this.client) {
            await this.stop()
        }
        await this.connect()
    }

    async reportShutdown () {
        try {
            logger.log('reporting shutdown', this.options.token)
            await got.post(`${this.options.forgeURL}/api/v1/teams/${this.options.team}/brokers/${this.options.broker}/suspend`, {
                headers: {
                    Authorization: `Bearer ${this.options.token}`
                }
            })
            logger.log('reported shutdown')
        } catch (err) {
            logger.log(err)
        }
    }

    async stop () {
        this.stopped = true
        if (this.client) {
            this.client.end()
        }
        await this.upload()
        clearTimeout(this.reconnectTimeout)
        clearInterval(this.reportInterval)
        this.reportInterval = null
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
