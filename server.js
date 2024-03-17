const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

// Use an object to store snakes, where each key is a clientId
let snakes = {};

wss.on('connection', function connection(ws) {

    console.log('A new client connected.');

    ws.on('message', function incoming(message) {
        const data = JSON.parse(message);

        if (data.type === 'INITIALIZE') {
            // Add or update the snake's state
            snakes[data.clientId] = data.snakeInfo;
            // Send the new client the state of all snakes
            ws.send(JSON.stringify({ type: 'ALL_SNAKES', snakes }));
            // Broadcast the updated state of this snake to all other clients
            broadcastSnakes(data.clientId);
        } else if (data.type === 'GAME_STATE') {
            // Update the game state with the new info
            snakes[data.clientId] = data.snakeInfo;
            // Broadcast the update to all clients
            broadcastSnakes();
        }
    });


    ws.on('close', function() {
        // Find the clientId for the disconnected client and remove their snake
        Object.keys(snakes).forEach(clientId => {
            if (snakes[clientId].ws === ws) {
                console.log(`Client ID: ${clientId} has disconnected.`);
                delete snakes[clientId]; // Remove the snake on disconnection
            }
        });
    });
});


function broadcastSnakes(excludeClientId = '') {
    const message = JSON.stringify({
        type: 'ALL_SNAKES',
        snakes
    });
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN && client !== snakes[excludeClientId]?.ws) {
            client.send(message);
        }
    });
}

console.log('WebSocket server started on ws://localhost:8080');

