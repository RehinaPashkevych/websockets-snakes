import { getSnakeProperties } from './game.js';

const serverUrl = 'ws://localhost:8080';
let socket = new WebSocket(serverUrl);
socket.binaryType = 'blob'; // Ensure binary data is received as Blob objects


export function getClientId() {
    let clientId  = sessionStorage.getItem('clientId');
    if (!clientId) {
        clientId = generateUniqueId();
        sessionStorage.setItem('clientId', clientId);
    }
    return clientId;
}

let clientId = getClientId();

const sessionId = window.location.pathname.split('/')[1];


document.addEventListener("DOMContentLoaded", function() {

    socket.onopen = function(event) {

        if (window.location.pathname != '/') {
            console.log("Connected to the WebSocket server.");
            sendInitialData();
        }


        if (window.location.pathname === '/') {
                // Set an interval to send FETCH_SESSIONS request every 400 ms
            setInterval(() => {
                if (socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({ type: 'FETCH_SESSIONS' }));
                }
            }, 400); 
        }
    };

    socket.onmessage = async function(event) {
         const blob = event.data; // The data is a Blob
         //console.log("log the Buffer" + blob); // Directly log the Buffer object
        // console.log("binary data: " + (blob instanceof Blob)); // Should log true for binary messages

        try{
            const text = await blob.text();
            const data = JSON.parse(text); // Parse the text as JSON
       
            if (data.type === 'ALL_SNAKES') {
                window.updateAllSnakes(data.snakes);
            }
    
            if (data.type === 'DISCONNECT') {
                console.log(data)
                window.removeSnake(data.clientId); // Implement this function to remove the snake
            } else if (data.type === 'SESSION_LIST') {
                updateSessionList(data.sessions);
                // Dispatch a custom event with session data
                const sessionEvent = new CustomEvent('sessionListReceived', { detail: data.sessions });
                document.dispatchEvent(sessionEvent);
            }
        } catch (e) {
            console.error('Error parsing JSON:', e);
        }
    

    };

});


export function sendUpdatedData() {
    const snakeInfo = getSnakeProperties();

    if (socket.readyState === WebSocket.OPEN) {

        const message = JSON.stringify({
            type: 'GAME_STATE',
            sessionId: sessionId,
            clientId: clientId, 
            snakeInfo: snakeInfo
        });
         // Use TextEncoder to convert the string to binary data (ArrayBuffer)
         const encoder = new TextEncoder();
         const binaryData = encoder.encode(message);

        socket.send(binaryData);
    } else {
        console.log("WebSocket is not open. ReadyState:", socket.readyState);
    }
}

function sendInitialData() {
    const snakeInfo = getSnakeProperties();

    const message = JSON.stringify({
        type: 'INITIALIZE',
        sessionId: sessionId,
        clientId: clientId, 
        snakeInfo: snakeInfo
    });
     
     const encoder = new TextEncoder();
     const binaryData = encoder.encode(message);

    console.log("binary send client INITIALIZE :" + binaryData );
    

    socket.send(binaryData);
}


function updateSessionList(sessions) {
    const sessionList = document.getElementById('sessionList');
    sessionList.innerHTML = ''; // Clear current list

    Object.entries(sessions).forEach(([sessionId, userCount]) => {
        const button = document.createElement('button');
        button.textContent = `Session ${sessionId} (${userCount} users)`;
        button.addEventListener('click', () => {
            window.location.href = `/${sessionId}`;
        });
        sessionList.appendChild(button);
    });
}


// Generate a unique ID for this client
function generateUniqueId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}