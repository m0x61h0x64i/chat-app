const express = require('express')
const http = require('http')
const app = express()
const path = require('path')
const socketio = require('socket.io')
const Filter = require('bad-words')
const filter = new Filter()
const { generateMessage, generateLocationMessage } = require('./utils/message')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')

const port = process.env.PORT || 3000
const server = http.createServer(app)
const io = socketio(server)

const public = path.join(__dirname, 'public')
app.use(express.static(public))

io.on('connection', (socket) => {
    console.log('New connection : ' + socket.id)

    socket.on('join', ({ username, room }, callback) => {
        const { user, error } = addUser({ id: socket.id, username, room })

        if (error) {
            return callback(error)
        }

        socket.join(user.room)
        socket.emit('message', generateMessage('Admin', 'Welcome!'))
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined.`))

        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback()
    })
    
    socket.on('sendLocation', (location, callback) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${location.lat},${location.lon}`))
        callback()
    })
    
    socket.on('sendMessage', (message, callback) => {
        if (filter.isProfane(message)) {
            return callback('Profanity not allowd!')
        }
        
        const user = getUser(socket.id)
        
        io.to(user.room).emit('message', generateMessage(user.username, message))
        callback()
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if (user) {
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left.`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })
})

server.listen(port, () => {
    console.log(`Server is listening on port ${port}...`)
})