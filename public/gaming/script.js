const socket = io("http://localhost:443");
let username = null;
let connected = false;
let navigating = false;
setInterval(() => {
    if (!connected || !username) location.reload();
}, 1000*10);

socket.on("connect", () => {
    connected = true;
    console.log("Connected");

    // Check if user is on mobile
    if (window.innerWidth <= 720) {
        alert("It is strongly recommended to rotate your screen horizontally for the best gameplay experience!");
    }
});
socket.on("username", (user) => {
    username = user;
    console.log(username);
});

// Navigate to home page
document.getElementById("nav-home").addEventListener("click", () => {
    navigating = true;
    location = "/home";
});

document.addEventListener("click", (event) => {
    if (event.target && event.target.matches("#backdrop") || event.target.matches("#game-container")) {
        socket.emit("exit-game");
        document.getElementById("backdrop").remove();
        document.getElementById("game-container").remove();
    }
});

window.addEventListener("message", (event) => {
    const iframe = document.querySelector("iframe").contentWindow;

    // Only accept messages from trusted origins
    // if (!["http://localhost:443", "https://wallatext.loca.lt/gaming"].includes(event.origin)) {
    //     return;
    // }

    if (event.data.type === "start-game") {
        socket.emit("start-game", event.data.content);
        socket.on("game-started", data => iframe.postMessage({type: "game-started", content: data}, "*"));
    } else if (event.data.type === "square-click") {
        socket.emit("square-click", event.data.content.x, event.data.content.y);
        socket.on("square-result", result => {
            iframe.postMessage({type: "square-result", content: result}, "*");
        });
    }
});

function fetchGame(game) {
    // Check if game file can be loaded
    const iframe = document.createElement("iframe");
    try {
        iframe.src = "./games/" + game + "/game.html";
        socket.emit("launch-game", game);
    } catch (err) {
        alert("ERROR LOADING GAME\n" + err);
        return;
    }

    const backdrop = document.createElement("div");
    const gameContainer = document.createElement("div");
    backdrop.id = "backdrop";
    gameContainer.id = "game-container";
    document.querySelector("body").appendChild(backdrop);
    document.querySelector("body").appendChild(gameContainer);
    document.getElementById("game-container").appendChild(iframe);
}

socket.on("disconnect", () => {
    if (!navigating) {
        alert("Disconnected");
        location.reload();
    }
});