const socket = io("http://localhost:443");
let username = null;
let connected = false;
let navigating = false;
// setInterval(() => {
//     if (!connected || !username) location.reload();
// }, 1000*10);

socket.on("connect", () => {
    connected = true;
    console.log("Connected");
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
    if (event.target && event.target.matches("#backdrop")) {
        document.querySelector("iframe").remove();
        event.target.remove();
    }
});

function fetchGame(game) {
    // Check if game file can be loaded
    const iframe = document.createElement("iframe");
    try {
        iframe.src = "./games/" + game + "/game.html";
    } catch (err) {
        alert("ERROR LOADING GAME\n" + err);
        return;
    }

    const backdrop = document.createElement("div");
    backdrop.id = "backdrop";
    document.querySelector("body").appendChild(backdrop);
    document.querySelector("body").appendChild(iframe);
}

socket.on("disconnect", () => {
    if (!navigating) {
        alert("Disconnected");
        location.reload();
    }
});