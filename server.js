require('dotenv').config()
// const yargs = require('yargs')(process.argv.slice(2))
const express = require('express')
const session = require('express-session')
const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const mongoose = require('mongoose')
const { urlencoded } = require('express')
const Users = require('./model')
const routes = require('./routes')
const { fork } = require('child_process')
const log4js = require('log4js')

log4js.configure({
    appenders:{
        console: {type: "console"},
        warnFile: {type: "file",filename:"warn.log"},
        errorFile: {type: "file",filename:"error.log"}
    },
    categories: {
        default:{appenders:['console'], level: 'info'},
        console:{appenders:['console'], level: 'info'},
        archivoWarn:{appenders:['console','warnFile'], level: 'warn'},
        archivoError:{appenders:['console','errorFile'], level: 'error'}
    }
})

const logger = log4js.getLogger('console')
const loggerWarn = log4js.getLogger('arhivoWarn')
const loggerError = log4js.getLogger('archivoError')

const app = express()
app.use(express.urlencoded({ extended:true }))

app.use(log4js.connectLogger(logger, {
                                        level: 'auto',
                                        statusRules: [
                                            { from: 200, to: 399, level: "info" },
                                            { from: 400, to: 499, level: "warn" },
                                            { from: 500, to: 599, level: "error" },
                                          ], 
                                        format:':method :url :status'
                                    }))

const port = process.argv[2] || 3000

passport.use('login',new LocalStrategy(
    (username,password,done) => {
        Users.findOne({username}, (err,user) =>{
            if(err) return done(err)
            if(!user) loggerError.error('User not found')

            return done(null,user)
        })
    }
))

passport.use('signup', new LocalStrategy(
    { passReqToCallback:true },
    (req,username,password,done) => {
        Users.findOne({username},(err,user) => {
            if(err) return done(err)
            if(user) {
                loggerError.error('User already exists')
                return done(null,false)
            }
            
            const newUser = {
                username,
                password,
                name:req.body.name
            }
            Users.create(newUser,(err, userWithID) => {
                if(err) return done(err)

                return done(null,userWithID)
            })
        })
    }
))

passport.serializeUser((user,done) => {
    done(null,user._id)
})

passport.deserializeUser((id,done) => {
    Users.findById(id,done)
})

app.use(session({
    secret:'secret',
    resave:false,
    saveUninitialized:false,
    rolling:true,
    cookie:{
        maxAge:30000,
        secure:false,
        httpOnly:true
    }
}))

app.use(passport.initialize())
app.use(passport.session())

//define routes
app.get('/',routes.getRoot)
app.get('/login',routes.getLogin)
app.post('/login',
        passport.authenticate('login'),
        routes.postLogin
)
app.get('/signup',routes.getSignup)
app.post(
    '/signup',
    passport.authenticate('signup', {failureRedirect: 'getFailSignup'}),
    routes.postSignup
)
app.get('/failsignup',routes.getFailSignup)

function checkAuthentication(req,res,next){
    if(req.isAuthenticated()) next()
    else res.redirect('/login')
}

app.get('/private',checkAuthentication, (req,res) => {
    const {user} = req
    res.send('<h1>Solo pudiste entrar porque estas logueado 🚀 </h1>')
})

app.get('/info', (req, res) => {

    const processDetails = {
        'Argumento de entrada': process.argv,
        'Nombre de la plataforma': process.platform,
        'Version de node.js':process.version,
        'Memoria total reservada (rss)':process.memoryUsage.rss(),
        'Path de ejecución':process.execPath,
        'Process id':process.pid,
        'Carpeta del proyecto':process.cwd()
        
    }
  res.json(processDetails)
})

app.get('/api/random',(req,res) => {
    
    const cant  = req.query.cant || 500000000

    const result = {}
    for (let i = 0; i < cant; i++) {
        const num = Math.ceil(Math.random()*1000)
        if (num in result) result[num]++
        else result[num] = 1
    }

    return res.json(result)
})

function connectDB(url,cb){
    mongoose.connect(
        url,
        {
            useNewUrlParser: true,
            useUnifiedTopology: true
        },
        err => {
            if(!err) console.log('Connected')
            if(cb != null) cb(err)
        }
    )
}

connectDB(`mongodb://${process.env.HOST_DB}:${process.env.PORT_DB}/coderhouse`, err => {
  if(err) return console.log('Error connecting DB',err)  

  app.listen(port, () => console.log(`Example app listening on port ${port}!`))
})