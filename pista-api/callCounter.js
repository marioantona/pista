// How many SerpAPI calls a single request spent — Phase 0C, charge-on-success.
//
// A refund has to say what the failed search actually cost us, and only api.js
// knows. Threading a counter through generateMultiCityItineraries() would mean
// changing the signature of the algorithm and every call inside it, so the count
// rides in async context instead: the request opens a scope, api.js increments
// whatever scope it happens to be running in, and the route reads the total.
//
// AsyncLocalStorage rather than a module-level counter, because two searches can
// overlap: a plain counter would attribute one request's calls to the other. It
// survives await boundaries and Promise.all, which is how main.js works.

const { AsyncLocalStorage } = require('node:async_hooks')

const storage = new AsyncLocalStorage()

// Runs fn inside a fresh counting scope. Never throws: the count matters most on
// the failure path, so the error is returned rather than propagated.
// -> { ok: true, value, calls } | { ok: false, error, calls }
function withCallCount(fn) {
    const state = { calls: 0 }
    return storage.run(state, async () => {
        try {
            const value = await fn()
            return { ok: true, value, calls: state.calls }
        } catch (error) {
            return { ok: false, error, calls: state.calls }
        }
    })
}

// Called by every api.js wrapper, at the moment a request is actually sent.
// Outside a counting scope (a script, a test) this is a no-op.
function countCall() {
    const state = storage.getStore()
    if (state) state.calls++
}

module.exports = { withCallCount, countCall }
