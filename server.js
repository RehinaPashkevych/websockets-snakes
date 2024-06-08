const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

// Use an object to store sessions, where each key is a sessionId
// and its value is an object with clientId keys mapping to snake info and WebSocket connections
let sessions = {};

wss.on('connection', function connection(ws) {
    console.log('A new client connected.');

    ws.on('message', function incoming(message) {

            if (Buffer.isBuffer(message) && message.length === 1) { // Check if it's a binary message and the correct length
              //  console.log("FETCH_SESSION binary message received (bin): " + bufferToBinaryString(message));
                const type = message.readUInt8(0) >> 5; // Extract the first 3 bits for the type
                if (type === 0b000) { // 000 binary for FETCH_SESSIONS
                    // Construct a response for each session
                    const sessionEntries = Object.entries(sessions);
                    const bufferLength = 1 + sessionEntries.length * 2; // 1 byte for type + (1 byte for ID + 1 byte for user count) for each session
                    const buffer = Buffer.alloc(bufferLength);
                    buffer.writeUInt8(0b001 << 5, 0); // Set type for SESSION_LIST (001)
                    sessionEntries.forEach(([sessionId, users], index) => {
                        const userCount = Object.keys(users).length;
                        buffer.writeUInt8(parseInt(sessionId), 1 + index * 2); // Session ID as 1 byte
                        buffer.writeUInt8(userCount, 1 + index * 2 + 1); // Number of users starts from the lowest bit
                    });
        
                    ws.send(buffer);
                    return;
                }
            }
    
        // Fallback to JSON handling if not a binary message or not an INITIALIZE type
        try {
            const data = JSON.parse(message.toString());
            const sessionId = data.sessionId; 
    
            if (!sessions[sessionId]) {
                sessions[sessionId] = {}; // Initialize session if it doesn't exist
            }
            
            switch (data.type) {
                case 'GAME_STATE':
                    // Update game state for a snake within a session
                    if (!sessions[sessionId][data.clientId]) {
                        sessions[sessionId][data.clientId] = { ...data.snakeInfo, ws: ws };
                    } else {
                        sessions[sessionId][data.clientId] = { ...data.snakeInfo, ws: sessions[sessionId][data.clientId].ws };
                    }
                    broadcastSnakes(sessionId);
                    break;
            }
        } catch (e) {
            console.error('Failed to parse message as JSON:', e);
        }
    });
    

    ws.on('close', function() {
        // Remove the disconnected client's snake from the session
        Object.keys(sessions).forEach(sessionId => {
            Object.keys(sessions[sessionId]).forEach(clientId => {
                if (sessions[sessionId][clientId].ws === ws) {
                    console.log(`Client ID: ${clientId} in session ${sessionId} has disconnected.`);
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

// Helper function to convert buffer to a binary string
function bufferToBinaryString(buffer) {
    let binaryString = '';
    for (let i = 0; i < buffer.length; i++) {
        binaryString += buffer[i].toString(2).padStart(8, '0') + ' '; // Convert byte to binary and pad with zeros
    }
    return binaryString.trim();
}


console.log('WebSocket server started on ws://localhost:8080');
