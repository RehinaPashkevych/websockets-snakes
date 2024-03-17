import { getSnakeProperties } from './app.js';

const serverUrl = 'ws://localhost:8080';
let socket = new WebSocket(serverUrl);

// Attempt to retrieve the clientId from session storage
export let clientId = sessionStorage.getItem('clientId');
// If it doesn't exist (new tab or first visit), generate a new one and store it
if (!clientId) {
     clientId = generateUniqueId();
    sessionStorage.setItem('clientId', clientId);
}

document.addEventListener("DOMContentLoaded", function() {

    socket.onopen = function(event) {
        console.log("Connected to the WebSocket server as client:", clientId);
        sendInitialData();
    };

    // Inside your client.js or equivalent
    socket.onmessage = function(event) {
        const data = JSON.parse(event.data);
        if (data.type === 'ALL_SNAKES') {
            window.updateAllSnakes(data.snakes);
        }

        if (data.type === 'DISCONNECT') {
            console.log(data)
            window.removeSnake(data.clientId); // Implement this function to remove the snake
        }

    };

});

export function sendUpdatedData() {
    const snakeInfo = getSnakeProperties();

    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'GAME_STATE',
            clientId: clientId, // Use the clientId from session storage
            snakeInfo: snakeInfo
        }));
    } else {
        console.log("WebSocket is not open. ReadyState:", socket.readyState);
        // Optionally, handle the not-ready state, e.g., queue the data or retry later
    }
}

function sendInitialData() {
    const snakeInfo = getSnakeProperties();

    socket.send(JSON.stringify({
        type: 'INITIALIZE',
        clientId: clientId, // Use the clientId from session storage
        snakeInfo: snakeInfo
    }));
}


// Generate a unique ID for this client
function generateUniqueId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}