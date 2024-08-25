const socket = io("https://wallatext.serveo.net");
let username = null;
const input = document.querySelector("input");
let navigating = false;
let connected = false;
let usernamePrompted = false;
let intervalId = setInterval(() => {
    if (!connected || !username && !usernamePrompted) {
        location.reload();
    }
}, 1000*10);

socket.on("connect", () => {
    connected = true;
    console.log("Connected");
});
socket.on("username", (user) => {
    username = user;
    console.log(username);
});
socket.on("grab-username", (status) => {
    usernamePrompted = true;
    const prepUsername = () => {
        username = grabUsername(status);
        if (!username || !username.trim()) {
            socket.emit("grabbed-username", null);  // For guests
        } else {
            username = username.trim();
            socket.emit("grabbed-username", username);
            console.log(username);
        }
    };
    prepUsername();
});
socket.on("grab-password", (status) => {
    socket.emit("grabbed-password", grabPassword(status));
});

socket.on("initialize-chat", (chat) => {
    document.querySelector(".chat.wall").innerHTML = "";
    chat.forEach(msgObj => {
        if (msgObj.user === username) {
            chatPerspective("local", msgObj);
        } else {
            chatPerspective("remote", msgObj);
        }
    });
});

// Request to navigate to games page
document.querySelector(".options > #games").addEventListener("click", () => {
    socket.emit("gaming-page");
});
socket.on("navigate-to-page", page => {
    navigating = true;
    location = page;
});

// Send a message when user presses Enter in the text box
input.addEventListener("keydown", (event) => {
    if (event.key == "Enter") {
        socket.emit("message", input.value);
        chatPerspective("local", {
            "msg": input.value,
            "user": username,
            "color": null
        });
        input.value = "";
    }
});

// Handle displaying received messages from the server
socket.on("message", (info) => {
    chatPerspective("remote", info);
});

socket.on("disconnect", () => {
    if (!navigating) {
        alert("Disconnected");
        location.reload();
    }
});



function grabUsername(status) {
    if (status === -1) {
        return prompt("Blacklisted username");
    } else {
        return prompt("What's your username?\n(type nothing for a guest username)");
    }
}
function grabPassword(status) {
    if (status === 1) {
        return prompt("Create new password");
    } else if (status === 0) {
        return prompt("What's your password?");
    } else if (status === -1) {
        return prompt("Incorrect password");
    }
}

// info (obj) - {"msg", "user", "color"}
function chatPerspective(origin, info) {
    const msgContainer = document.createElement("div");
    const user = document.createElement("p");
    const msg = document.createElement("p");
    const color = info.color ? info.color : null;

    msgContainer.className = `msg-container ${origin}`;
    user.className = "user";
    msg.className = "msg";

    user.innerHTML = info.user;
    msg.innerHTML = info.msg;

    msgContainer.append(user, msg);
    document.querySelector(".chat.wall").appendChild(msgContainer);
}