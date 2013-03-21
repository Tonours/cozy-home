Client = require('request-json').JsonClient
bcrypt = require('bcrypt')
http = require('http')

# Bring models in context
Application = null
CozyInstance = null
User = null

helpers = {}

# init the compound application
# will create @app in context
# usage : before helpers.init require '../server'
helpers.init = (instantiator) -> (done) ->
    @app = instantiator()
    @app.compound.on 'models', (models) ->
        {Application, CozyInstance, User} = models
        done()

# This function remove everythin from the db
helpers.clearDb = (callback) ->
    User.destroyAll ->
        Application.destroyAll ->
            CozyInstance.destroyAll ->
                callback()

# function factory for creating user
helpers.createUser = (email, password) -> (callback) ->
    salt = bcrypt.genSaltSync(10)
    hash = bcrypt.hashSync(password, salt)
    user = new User
        email: email
        owner: true
        password: hash
        activated: true

    user.save callback

# function factory for creating application
helpers.createApp = (name, slug, index, state) -> (callback) ->
    app = new Application
        name: name
        state: state
        index: index
        slug: slug

    app.save callback

helpers.fakeServer = (json, code=200) ->

    lastCall = {}

    server = http.createServer (req, res) ->
        body = ""
        req.on 'data', (chunk) ->
            body += chunk
        req.on 'end', ->
            res.writeHead code, 'Content-Type': 'application/json'
            res.end(JSON.stringify json)
            data = JSON.parse body if body? and body.length > 0
            lastCall = request:req, body:data

    server.lastCall = -> lastCall
    server.reset = -> lastCall = {}
    return server


helpers.getClient = (port, context) ->
    old = new Client "http://localhost:#{port}/"

    store = if context? then context else {}

    callbackFactory = (done) -> (error, response, body) =>
        store.error = error
        store.response = response
        store.body = body
        done()

    clean = ->
        store.error = null
        store.response = null
        store.body = null

    return (
        get: (url, done) ->
            clean()
            old.get url, callbackFactory(done)
        post: (url, data, done) ->
            clean()
            old.post url, data, callbackFactory(done)
        put: (url, data, done) ->
            clean()
            old.put url, data, callbackFactory(done)
        del: (url, done) ->
            clean()
            old.del url, callbackFactory(done)
        last: store
        clean: clean
        )

module.exports = helpers
