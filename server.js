const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

// Use an object to store snakes, where each key is a clientId
let snakes = {};

wss.on('connection', function connection(ws) {

    console.log('A new client connected.');
    console.log(snakes)

    ws.on('message', function incoming(message) {
        const data = JSON.parse(message);
        if (data.type === 'INITIALIZE') {
            // Add or update the snake's state, including the WebSocket connection
            snakes[data.clientId] = { ...data.snakeInfo, ws: ws };
            // Send the new client the state of all snakes (excluding the ws property)
            ws.send(JSON.stringify({ type: 'ALL_SNAKES', snakes: sanitizeSnakes(snakes) }));
            // Broadcast the updated state of this snake to all other clients
            broadcastSnakes(data.clientId);
        } else if (data.type === 'GAME_STATE') {
            if (!snakes[data.clientId]) {
                // This clientId doesn't exist yet, so it's likely a new connection.
                // For example, initialize it without trying to preserve an existing ws property.
                snakes[data.clientId] = { ...data.snakeInfo, ws: ws };
            } else {
                // The clientId exists, update its info while preserving the existing ws property.
                snakes[data.clientId] = { ...data.snakeInfo, ws: snakes[data.clientId].ws };
            }

            broadcastSnakes();
        }
    });


    ws.on('close', function() {
        // Find the clientId for the disconnected client and remove their snake
        Object.keys(snakes).forEach(clientId => {
            if (snakes[clientId].ws === ws) {
                console.log(`Client ID: ${clientId} has disconnected.`);
                delete snakes[clientId]; // Remove the snake on disconnection
                broadcastDisconnection(clientId);
            }
        });
    });
});


function sanitizeSnakes(snakes) {
    let sanitizedSnakes = {};
    Object.keys(snakes).forEach(clientId => {
        const { ws, ...snakeInfo } = snakes[clientId];
        sanitizedSnakes[clientId] = snakeInfo;
    });
    return sanitizedSnakes;
}

function broadcastSnakes(excludeClientId = '') {
    const message = JSON.stringify({
        type: 'ALL_SNAKES',
        snakes: sanitizeSnakes(snakes)
    });
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN && (!snakes[excludeClientId] || client !== snakes[excludeClientId].ws)) {

            client.send(message);
        }
    });
}

function broadcastDisconnection(clientId) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'DISCONNECT', clientId: clientId }));
        }
    });
}


console.log('WebSocket server started on ws://localhost:8080');

