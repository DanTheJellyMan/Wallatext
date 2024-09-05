const fs = require("fs");
const express = require("express");
const app = express();
const httpServer = require('http').createServer(app);
const io = require('socket.io')(httpServer, {
    cors: {origin: ["https://wallatext.serveo.net", "http://localhost:443"]}
});
httpServer.listen(443, () => console.log('HTTPS server running on port 443'));

let navigatingToGamePage = false;
app.get("/", (req, res) => res.redirect("/home"));
// Handle sending user to games page
app.get("/gaming", (req, res) => {
    navigatingToGamePage = true;
    if (req.path.includes("gaming") && req.path !== "/gaming/") {
        res.redirect("/gaming/");
    } else {
        res.sendFile(__dirname + "/public/gaming/index.html");
    }
});
app.use("/gaming/games", (req, res, next) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    next();
});
app.use(express.static(__dirname + "/public"));
app.use((req, res) => {
    res.status(404);
    res.send(fs.readFileSync("404error.html", "utf-8")); // le troll ( ͡° ͜ʖ ͡°)
});

const activeUsers = {}; // Key: socket.id   Value: username
const blacklist = loadBlacklist();

io.on("connection", (socket) => {
    const grabUserInfo = () => {
        return new Promise((resolve, reject) => {
            if (navigatingToGamePage) {
                navigatingToGamePage = false;
                reject();
            } else {
                resolve(handleLogin(socket));
            }
        });
    };
    grabUserInfo()
        .then((username) => {
            activeUsers[socket.id] = username;
            socket.emit("initialize-chat", logs(["'messages'"], "grab"));
        })
        .catch(() => {
            // Regenerate a username for guests going to game page
            let guestUsername;
            const generateGuest = () => {
                guestUsername = `Guest_${randomNumber(0,9)}${randomNumber(0,9)}${randomNumber(0,9)}${randomNumber(1,5)}`;
                Object.values(activeUsers).forEach(username => {
                    if (username === guestUsername) {
                        generateGuest();
                    }
                });
                for (const message of logs(["'messages'"], "grab")) {
                    if (message.user === guestUsername) generateGuest();
                }
            }
            generateGuest();
            console.log(guestUsername);
            activeUsers[socket.id] = guestUsername;
            socket.emit("username", guestUsername);
        });

    socket.on("message", (msg) => {
        if (blacklisted(msg)) {
            socket.emit("message", {
                "msg": "No bad words please :)",
                "user": "Server",
                "color": "white"
            });
            return;
        }
        const msgInfo = {
            "msg": msg,
            "user": activeUsers[socket.id],
            "color": null
        };
        socket.broadcast.emit("message", msgInfo);
        logs(["'messages'"], "log", msgInfo);
        console.log(`${activeUsers[socket.id]}: ${msg}`);
    });

    // Remove socket ip from associated username
    socket.on("logout", () => {
        if (activeUsers[socket.id].slice(0,6) !== "Guest_") {
            logs(["'users'"], "logout", activeUsers[socket.id]);
        }
        socket.emit("logged-out");
    });

    // Delete all users related to user's IP or username
    socket.on("delete-info", () => {
        if (activeUsers[socket.id].slice(0,6) !== "Guest_") {
            logs(["'users'"], "delete", {
                ip: socket.handshake.headers["x-forwarded-for"],
                username: activeUsers[socket.id]
            });
        }
        socket.emit("logged-out");
    });

    /* --- Gaming page logic --- */

    //code

    socket.on('disconnect', () => {
        if (activeUsers[socket.id]) {
            console.log(`${activeUsers[socket.id]} disconnected`);
            delete activeUsers[socket.id];
        } else {
            console.log(`A user disconnected (${socket.id})`);
        }
    });
});

// setInterval(() => {
//     console.log(Object.values(activeUsers));
// }, 1000*5);

async function handleLogin(socket) {
    const userInfo = {
        "ip": [socket.handshake.headers["x-forwarded-for"]],
        "username": null,
        "password": null
    };
    
    // Go through all associated ips of each user
    for (const user of logs(["'users'"], "grab")) {
        for (const ip of user["ip"]) {
            if (ip === userInfo.ip[0]) {
                // Return username related to ip address
                socket.emit("username", user.username);
                console.log("returning user: " + user.username);
                return user.username;
            }
        }
    }
    
    // Username initialization
    const initializeUsername = () => {
        return new Promise(resolve => {
            socket.on("grabbed-username", (username) => {
                if (username === null) {
                    resolve(null);
                    return;
                }

                if (blacklisted(username)) {
                    socket.emit("grab-username", -1);   // -1 = invalid username
                } else {
                    resolve(username);
                    socket.off("grabbed-username", initializeUsername);
                }
            });
        });
    };

    // Password initialization
    const initializePassword = () => {
        return new Promise(resolve => {
            socket.on("grabbed-password", (password) => {
                resolve(password);
                socket.off("grabbed-password", initializePassword);
            });
        });
    };

    socket.emit("grab-username");
    userInfo.username = await initializeUsername();

    // Handle creating guest usernames
    if (userInfo.username === null) {
        let guestUsername;
        const generateGuest = () => {
            guestUsername = `Guest_${randomNumber(0,9)}${randomNumber(0,9)}${randomNumber(0,9)}${randomNumber(1,5)}`;
            Object.values(activeUsers).forEach(username => {
                if (username === guestUsername) {
                    generateGuest();
                }
            });
            for (const message of logs(["'messages'"], "grab")) {
                if (message.user === guestUsername) generateGuest();
            }
        }
        generateGuest();
        console.log(guestUsername);
        socket.emit("username", guestUsername);
        return guestUsername;
    }

    let logResults = logs(["'users'"], "check", {"username": userInfo.username});
    if (logResults) {
        let wrongPassword = false;
        const validateUser = () => {
            return new Promise(async (resolve, reject) => {
                // -1 = incorrect password, 0 = existing password needed
                socket.emit("grab-password", wrongPassword ? -1 : 0);
                logResults = logs(["'users'"], "check", {"password": await initializePassword()});
                if (logResults) {
                    resolve(userInfo.username);
                } else {
                    reject();
                }
            });
        }
        const returnUsername = () => {
            return new Promise(resolve => {
                validateUser()
                    .then(() => {
                        resolve();
                    })
                    .catch(() => {
                        wrongPassword = true;
                        validateUser();
                    });
            });
        }
        await returnUsername();
        // Associate current ip with user's credentials
        const users = logs(["'users'"], "grab");
        for (let i=0; i<users.length; i++) {
            if (users[i]["username"] === userInfo.username) {
                logs(["'users'", `"${i}"`, "'ip'"], "log", userInfo.ip[0]);
                break;
            }
        }
        console.log("returning user: " + userInfo.username);
        return userInfo.username;
    } else {
        socket.emit("grab-password", 1); // 1 = new password needed
        userInfo.password = await initializePassword();
        logs(["'users'"], "log", userInfo);
        console.log("new user: " + userInfo.username);
        return userInfo.username;
    }
}

// path (arr) - area of json to go to (surround item strings in double + single quotes)
// action (str) - what to do in the logs
// info (any) - data to be used with "action"
function logs(path, action, info) {
    let logs = JSON.parse(fs.readFileSync("logs.json"));
    let pathStr = eval("logs[" + path.join("][") + "]");    // Functionally the same as doing: logs[(key)]
    // Do not write to file with pathStr

    if (action === "log") {
        pathStr.push(info);
        fs.writeFileSync("logs.json", JSON.stringify(logs, null, 4));
    } else if (action === "check") {
        for (const objOfArr of pathStr) {
            // Check if specified obj property contains info being searched for
            if (objOfArr[Object.keys(info)[0]] == Object.values(info)[0]) {
                return true;
            }
        }
        return false;
    } else if (action === "grab") {
        return pathStr;
    } else if (action === "logout") {
        for (const user of pathStr) {
            if (user.username === info) {
                user.ip = [];
                fs.writeFileSync("logs.json", JSON.stringify(logs, null, 4));
            }
        }
    } else if (action === "delete") {
        // info = {ip, username}
        for (const userIndex in pathStr) {
            if (pathStr[userIndex].username === info.username) {
                console.log(pathStr[userIndex]);
                pathStr.splice(userIndex, 1);
                continue;
            }
            // Check every IP
            for (const ip of pathStr[userIndex].ip) {
                if (ip === info.ip) {
                    console.log(pathStr[userIndex]);
                    pathStr.splice(userIndex, 1);
                    break;
                }
            }
        }
        console.log(JSON.stringify(pathStr) + '\n' + JSON.stringify(logs));
        fs.writeFileSync("logs.json", JSON.stringify(logs, null, 4));
    }
}

function loadBlacklist() {
    try {
        return fs.readFileSync("blacklist.txt", "utf-8").split("\n").map(word => word.trim());
    } catch (err) {
        console.error(`There was an error trying to load the blacklist:\n${err}`);
        return [];
    }
}

function blacklisted(str) {
    return blacklist.some(badWord => str.includes(badWord));
}

function randomNumber(min, max) {
    if (min > max) {
        return Math.floor(Math.random() * (min-max) + max);
    } else {
        return Math.floor(Math.random() * (max-min) + min);
    }
}