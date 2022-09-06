const autocannon = require('autocannon')
const { PassThrough } = require('stream')

function run(url){
    const buf = []
    const outputStream = new PassThrough()

    const inst = autocannon({
        url,
        headres:{
            "Content-Type" : 'application/json'
        },
        requests:[{
            method: 'POST',
            path:'/login',
            body:JSON.stringify({'username':'emanuel','password':'emanuel'})
        }],
        connections: 100,
        duration: 20
    })

    autocannon.track(inst, {outputStream})

    outputStream.on('data', data => {
        buf.push(data)
    })

    inst.on('done', () => {
        process.stdout.write(Buffer.concat(buf))
    })
}

console.log('Running all benchmark in parallel...')

run("http://localhost:3000")
