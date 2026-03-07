import { WebSocketServer, WebSocket } from "ws";

const wss = new WebSocketServer({ port : 8080});

const rooms = new Map<string, Set<WebSocket>>();

wss.on('connection', (ws) => {
    console.log("New user connected")

    ws.on('error', (error) => {
        console.error('Error : ', error);
    })

    ws.on('message', (data) => {
       const parsedMessage = JSON.parse(data.toString());
       console.log("Received message : ", parsedMessage);

       wss.clients.forEach((client)=> {
        if(client.readyState === 1) {
            client.send(parsedMessage);
        }
       })
    })

    ws.on('close', ()=> {
        console.log("User Disconnected");
    })
})

console.log('Chat server is running on ws://localhost:8080');