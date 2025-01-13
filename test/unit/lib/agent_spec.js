const should = require('should')
const express = require('express')
const Aedes = require('aedes')
const net = require('net')
const agent = require('../../../lib/agent.js')
const { setTimeout } = require('node:timers/promises')

const BrokerPort = 18830
// const WSBrokerPort = 18880
const APIPort = 3090

describe('Agent', function () {
    let aedes
    let mqttServer
    let httpServer

    const creds = {
        foo: {
            hostname: 'localhost',
            host: `localhost:${BrokerPort}`,
            port: BrokerPort,
            protocol: 'mqtt:',
            username: 'user',
            password: 'password',
            clientId: 'foo'
        },
        bar: {
            hostname: 'localhost',
            host: `localhost:${BrokerPort}`,
            port: BrokerPort,
            protocol: 'mqtt:',
            username: 'user',
            password: 'password',
            clientId: 'bar'
        }
    }

    before(async function () {
        aedes = new Aedes()
        aedes.authenticate = function (client, username, password, cb) {
            // console.log(client.id, username, password.toString('utf8'))
            cb(null, true)
        }
        mqttServer = net.createServer(aedes.handle)
        mqttServer.listen(BrokerPort, function () {
            // console.log(`test broker listening on ${BrokerPort}`)
        })

        const app = express()
        app.get('/api/v1/team/:teamId/broker/:brokerId/creds', function (request, reply) {
            reply.send(creds[request.params.brokerId])
        })

        httpServer = app.listen(APIPort, () => {
            // console.log(`API listening on ${APIPort}`)
        })
    })

    after(async function () {
        try {
            await aedes.close()
            await mqttServer.close()
            await httpServer.close()
        } catch (ee) {
            console.log(ee)
        }
    })

    it('should create a new Agent', async function () {
        const a = new agent.Agent({})
        should.exist(a)
    })

    it('should download credentials', async function () {
        const a = new agent.Agent({
            forgeURL: `http://localhost:${APIPort}`,
            token: 'fft_foo',
            team: 'team',
            broker: 'foo'
        })

        await a.start()
        await setTimeout(1000)
        a.state().should.have.property('connected', true)
        await a.stop()
    })

    it('should record topics', async function () {
        let a = new agent.Agent({
            forgeURL: `http://localhost:${APIPort}`,
            token: 'fft_foo',
            team: 'team',
            broker: 'bar'
        })
        try {
            await a.start()
            await setTimeout(1000)
            a.state().should.have.property('connected', true)
            aedes.publish({
                topic: 'hello/world',
                payload: Buffer.from('HelloWorld'),
                qos: 0,
                retain: false,
                dup: false,
                messageId: 42
            })
            aedes.publish({
                topic: 'hello',
                payload: Buffer.from('bye'),
                qos: 0,
                retain: false,
                dup: false,
                messageId: 42
            })
            await setTimeout(250)
            const state = a.state()
            state.should.have.property('topics')
            state.topics.should.have.property('hello/world')
            state.topics.should.have.property('hello')
            await a.stop()
            a = undefined
        } finally {
            if (a) {
                await a.stop()
            }
        }
    })
})
