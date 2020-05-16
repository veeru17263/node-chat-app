const express = require('express')
const path = require('path')
const http = require('http')
const socketio = require('socket.io') 
const Filter = require('bad-words')
const {generatemessage,generatelocationmessage} = require('./utils/messages')
const {adduser,removeuser,getuser,getusersinroom} = require('./utils/users.js')

const app = express()
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT || 3000
const publicdirectorypath = path.join('__dirname','../public')

app.use(express.static(publicdirectorypath))

io.on('connection',(socket) => {
    console.log('New Websocket Connection')

     socket.on('join',({username,room},callback) => {
         const {error,user} = adduser({id: socket.id, username, room})

         if(error)
         {
             return callback(error)
         }
         socket.join(user.room)

         socket.emit('message',generatemessage('Admin','Welcome!'))
         socket.broadcast.to(user.room).emit('message',generatemessage('Admin',`${user.username} has joined`))
         io.to(user.room).emit('roomdata',{
             room: user.room,
             users: getusersinroom(user.room)
         })

         callback()
     })

     socket.on('sendmessage',(message,callback) => {
         const user = getuser(socket.id)
         const filter = new Filter()

         if(filter.isProfane(message))
         {
             return callback('profanity is not allowed')
         }
         io.to(user.room).emit('message',generatemessage(user.username,message))
         callback()
     })

     socket.on('sendlocation',(coords,callback) => {
        const user = getuser(socket.id)
        io.to(user.room).emit('locationmessage',generatelocationmessage(user.username,`https://google.com/maps?q=${coords.latitude},${coords.longitude}`))
            callback()
     })

     socket.on('disconnect',() => {
         const user = removeuser(socket.id)
         if(user)
         {
            io.to(user.room).emit('message',generatemessage(user.username,`${user.username} has left!`))
            io.to(user.room).emit('roomdata',{
                room: user.room,
                users: getusersinroom(user.room)
            })
         }
     })
})

server.listen(port,() => {
    console.log(`server is up on port ${port}`)
})
