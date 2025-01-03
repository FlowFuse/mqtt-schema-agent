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

    before(async function () {
        aedes = new Aedes()
        mqttServer = net.createServer(aedes.handle)
        mqttServer.listen(BrokerPort, function () {
            // console.log(`test broker listening on ${BrokerPort}`)
        })

        const app = express()
        app.get('/api/v1/team/:teamid/broker/:brokerid/creds', function (request, reply) {
            reply.send({
                hostname: 'localhost',
                host: `localhost:${BrokerPort}`,
                port: BrokerPort,
                protocol: 'mqtt:'
            })
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
        let a = new agent.Agent({
            forgeURL: `http://localhost:${APIPort}`,
            token: 'fft_foo',
            team: 'team',
            broker: 'broker'
        })
        try {
            await a.start()
            await setTimeout(1000)
            a.state().should.have.property('connected', true)
            await a.stop()
            a = undefined
        } finally {
            if (a) {
                await a.stop()
            }
        }
    })

    it('should record topics', async function () {
        let a = new agent.Agent({
            forgeURL: `http://localhost:${APIPort}`,
            token: 'fft_foo',
            team: 'team',
            broker: 'broker'
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
            await setTimeout(250)
            const state = a.state()
            state.should.have.property('topics')
            state.topics.should.have.property('hello/world')
            console.log()
            await a.stop()
            a = undefined
        } finally {
            if (a) {
                await a.stop()
            }
        }
    })
})
