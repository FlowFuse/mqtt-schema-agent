function log() {
    const d = new Date
    console.log(d.toISOString(),...arguments)
}

module.exports = {
    log
}