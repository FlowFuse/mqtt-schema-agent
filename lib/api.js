const { Agent } = require('./agent')

class API {
    constructor (app, options) {
        this.options = options

        app.get('/api/v1/status', (request, reply) => {
            if (this.agent) {
                reply.send({
                    connected: this.agent.connected,
                    error: this.agent.error
                })
            } else {
                reply.send({
                    connected: false
                })
            }
        })

        app.post('/api/v1/commands/start', async (request, reply) => {
            try {
                if (!this.agent) {
                    this.agent = new Agent(this.options)
                }
                await this.agent.start()
                reply.send({})
            } catch (err) {
                reply.status(400).send({ error: '', message: '' })
            }
        })

        app.post('/api/v1/commands/stop', async (request, reply) => {
            try {
                if (this.agent) {
                    await this.stop()
                } else {
                    // send error about not active
                }
            } catch (err) {
                reply.status(400).send({ error: '', message: '' })
            }
            reply.send({})
        })
    }

    async stop () {
        if (this.agent) {
            await this.agent.stop()
        }
    }
}

module.exports = {
    API
}
