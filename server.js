const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

// Use an object to store sessions, where each key is a sessionId
// and its value is an object with clientId keys mapping to snake info and WebSocket connections
let sessions = {};

wss.on('connection', function connection(ws) {
    console.log('A new client connected.');

    ws.on('message', function incoming(message) {
        //console.log(message);
        const data = JSON.parse(message);
        const sessionId = data.sessionId; 

        if (!sessions[sessionId]) {
            sessions[sessionId] = {}; // Initialize session if it doesn't exist
        }
        
        if (data.type === 'INITIALIZE') {
            // Add or update the snake's state, including the WebSocket connection
            sessions[sessionId][data.clientId] = { ...data.snakeInfo, ws: ws };
            // Send the new client the state of all snakes in the session (excluding the ws property)
            const message = JSON.stringify({ type: 'ALL_SNAKES', snakes: sanitizeSnakes(sessions[sessionId]) });
            const binaryData = Buffer.from(message); 
            console.log("binary send:" + binaryData );
            ws.send(binaryData);
            // Broadcast the updated state of this snake to all other clients in the session
            broadcastSnakes(sessionId, data.clientId);
        } else if (data.type === 'GAME_STATE') {
            // Update game state for a snake within a session
            if (!sessions[sessionId][data.clientId]) {
                sessions[sessionId][data.clientId] = { ...data.snakeInfo, ws: ws };
            } else {
                sessions[sessionId][data.clientId] = { ...data.snakeInfo, ws: sessions[sessionId][data.clientId].ws };
            }
            broadcastSnakes(sessionId);
        } else if (data.type === 'FETCH_SESSIONS') {
         // Respond with the current session information
            const sessionInfo = Object.keys(sessions)
            .filter(sessionId => sessionId && sessionId !== 'undefined') // Exclude falsy and 'undefined' as string
            .reduce((info, sessionId) => {
                info[sessionId] = Object.keys(sessions[sessionId]).length; // Count users per session
                return info;
            }, {});

            console.log(sessionInfo);

            const message = JSON.stringify({ type: 'SESSION_LIST', sessions: sessionInfo });
            const binaryData = Buffer.from(message);

            console.log("binary send SESSION_LIST :" + binaryData.toString('hex') );
    
            ws.send(binaryData);
        }
    });

    ws.on('close', function() {
        // Remove the disconnected client's snake from the session
        Object.keys(sessions).forEach(sessionId => {
            Object.keys(sessions[sessionId]).forEach(clientId => {
                if (sessions[sessionId][clientId].ws === ws) {
                    console.log(`Client ID: ${clientId} in session: ${sessionId} has disconnected.`);
                    delete sessions[sessionId][clientId];
                    broadcastDisconnection(sessionId, clientId);
    
                    // Check if the session now has zero users
                    if (Object.keys(sessions[sessionId]).length === 0) {
                        console.log(`Session ID: ${sessionId} is empty and will be deleted.`);
                        delete sessions[sessionId]; // Delete the empty session
                    }
                }
            });
        });
    });
    
});

function sanitizeSnakes(snakesInSession) {
    let sanitizedSnakes = {};
    Object.keys(snakesInSession).forEach(clientId => {
        const { ws, ...snakeInfo } = snakesInSession[clientId];
        sanitizedSnakes[clientId] = snakeInfo;
    });
    return sanitizedSnakes;
}


function broadcastSnakes(sessionId, excludeClientId = '') {
    const message = JSON.stringify({
        type: 'ALL_SNAKES',
        snakes: sanitizeSnakes(sessions[sessionId])
    });
    // Directly send the message as a Buffer (binary data)
    Object.values(sessions[sessionId]).forEach(({ ws }) => {
        if (ws.readyState === WebSocket.OPEN && (!excludeClientId || ws !== sessions[sessionId][excludeClientId].ws)) {
            ws.send(Buffer.from(message));
        }
    });
}


function broadcastDisconnection(sessionId, clientId) {
    const message = JSON.stringify({
        type: 'DISCONNECT',
        clientId: clientId
    });

    const binaryData = Buffer.from(message); // Convert the string to binary data
    //console.log("binary send DISCONNECT :" + binaryData.toString('hex') );
        
    Object.values(sessions[sessionId]).forEach(({ ws }) => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(binaryData); // Send as binary
        }
    });
}


console.log('WebSocket server started on ws://localhost:8080');
