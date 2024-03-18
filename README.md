# WebSockets Snake App

> :warning: **Development Stage:** This application is currently under development and may undergo significant changes. It is a school project designed for educational purposes.


The WebSockets Snake App is a real-time multiplayer snake application built with WebSockets, enabling seamless interaction between players in different sessions. This project uses Flask for the backend and vanilla JavaScript for the frontend, showcasing the power of WebSockets for real-time web applications.

## Features

- **Multiplayer Gameplay:** Join existing game sessions or create new ones to play with others in real-time.
- **Dynamic Session Management:** Players can see active sessions and their participant counts before joining.
- **Real-Time Updates:** Game state updates and player movements are synchronized in real-time across all participants in a session.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- Python 3.x
- Node.js

### Installing

1. **Clone the Repository**

   ```sh
   git clone https://github.com/RehinaPashkevych/websockets-snakes.git
   cd websockets-snakes
   ```
2. **Activate the Virtual Environment**
    ```sh
   source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
   python app.py
   ```
3. **Start the Flask Server**
   ```sh
   python app.py
   ```
4. **Start the Websocket Server**
   ```sh
   node server.js
   ```

