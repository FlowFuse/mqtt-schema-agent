function log () {
    const d = new Date()
    // eslint-disable-next-line no-console
    console.log(d.toISOString(), ...arguments)
}

module.exports = {
    log
}
