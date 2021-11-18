const path = require('path');
const fs = require('fs');
const {
    Client,
    Authenticator
} = require('minecraft-launcher-core');
const QuickEncrypt = require('quick-encrypt');
const fetch = require("node-fetch");

// Close app
function closeApp() {
    const { ipcRenderer } = require('electron');
    ipcRenderer.invoke('quit-app');
}

// Genirate encryption keys
function genirateKeys() {
    const keys = QuickEncrypt.generate(2048);

    // public & private key
    if(!fs.existsSync(`${__dirname}/assets/json/keys.json`)) {
        console.log("Public file does not exsit.");
        fs.writeFile(path.join(__dirname, "assets", "json", "keys.json"), JSON.stringify(keys), function writeJSON(err) {
            if (err) return console.log(err);
            console.log("The file was saved! (public & private)");
        });
    }
}

genirateKeys();

let arch;
// Microsoft login
async function startMCMicrosoft() {
    // save ram config to file
    const minram = document.getElementById("min-ram").value;
    const maxram = document.getElementById("max-ram").value;

    const jsonObjectMin = {
        "ram": `${minram}`
    };
    const jsonObjectMax = {
        "ram": `${maxram}`
    };

    fs.writeFile(path.join(__dirname, "assets", "json", "ram", "max.json"), JSON.stringify(jsonObjectMax), function writeJSON(err) {
        if (err) return console.log(err);
        console.log("The file was saved! (Max ram)");
    });

    fs.writeFile(path.join(__dirname, "assets", "json", "ram", "min.json"), JSON.stringify(jsonObjectMin), function writeJSON(err) {
        if (err) return console.log(err);
        console.log("The file was saved! (Min ram)");
    });

    if(process.arch === 'x64') {
        arch = '64';
    } else {
        arch = '32';
    }

    // Login and lauch the app
    const launcher = new Client();
    const msmc = require("msmc");
    msmc.setFetch(fetch)
    msmc.fastLaunch("raw",
        (update) => {
            document.getElementById("microsoft-play").innerHTML = "Starting";
            console.log("CallBack!!!!!")
            console.log(update)
        }).then(async(result) => {
        if (msmc.errorCheck(result)) {
            document.getElementById("microsoft-play").innerHTML = "Error";
            console.log(result.reason)
            return;
        }

        // save version config to file
        let clientPackageLink;
        if(!fs.existsSync(`${__dirname}/assets/json/version.json`)) {
            const onlineVer = await fetch("https://serversmp.xyz/assets/json/version.json");
            const onlineVerJson = await onlineVer.json();
            console.log(onlineVerJson);
            fs.writeFile(path.join(__dirname, "assets", "json", "version.json"), JSON.stringify(onlineVerJson), function writeJSON(err) {
                if (err) return console.log(err);
                console.log("The file was saved! (version)");
            });
            clientPackageLink = onlineVerJson.link;
        } else {
            const onlineVer = await fetch("https://serversmp.xyz/assets/json/version.json");
            const onlineVerJson = await onlineVer.json();
            console.log(onlineVer);
            const localVer = require(`${__dirname}/assets/json/version.json`);
            console.log(localVer);
            if(onlineVerJson.version !== localVer.version) {
                fs.writeFile(path.join(__dirname, "assets", "json", "version.json"), JSON.stringify(onlineVerJson), function writeJSON(err) {
                    if (err) return console.log(err);
                    console.log("The file was saved! (version)");
                    clientPackageLink = onlineVerJson.link;
                });
            } else {
                clientPackageLink = null;
            }
        }

        console.log(clientPackageLink);
        
        let opts = {
            clientPackage: clientPackageLink,
            authorization: msmc.getMCLC().getAuth(result),
            root: `${__dirname}/minecraft`,
            version: {
                number: "1.8.9",
                type: "release"
            },
            forge: `${__dirname}/assets/forge.jar`,
            javaPath: `${__dirname}/assets/java${arch}/bin/java.exe`,
            memory: {
                max: `${maxram}G`,
                min: `${minram}G`
            }
        }
        console.log("Starting!")
        launcher.launch(opts);
        launcher.on('debug', (e) => {
            console.log(e)
            document.getElementById("microsoft-play").innerHTML = "Starting";
        });
        launcher.on('data', (e) => {
            console.log(e)
            document.getElementById("microsoft-play").innerHTML = "Running";
            closeApp();
        });
    }).catch(reason => {
        document.getElementById("microsoft-play").innerHTML = "Error";
        console.log("We failed to log someone in because : " + reason);
    })
}

async function startMCMojang() {
    // save ram config to file
    const minram = document.getElementById("min-ram").value;
    const maxram = document.getElementById("max-ram").value;

    const jsonObjectMin = {
        "ram": `${minram}`
    };
    const jsonObjectMax = {
        "ram": `${maxram}`
    };

    fs.writeFile(path.join(__dirname, "assets", "json", "ram", "max.json"), JSON.stringify(jsonObjectMax), function writeJSON(err) {
        if (err) return console.log(err);
        console.log("The file was saved! (Max ram)");
    });

    fs.writeFile(path.join(__dirname, "assets", "json", "ram", "min.json"), JSON.stringify(jsonObjectMin), function writeJSON(err) {
        if (err) return console.log(err);
        console.log("The file was saved! (Min ram)");
    });

    if(process.arch === 'x64') {
        arch = '64';
    } else {
        arch = '32';
    }

    // save username and password to file
    const publicKey = require(`${__dirname}/assets/json/keys.json`);

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    const jsonObjectPassword = {
        "password": `${QuickEncrypt.encrypt(password, publicKey.public)}`
    };
    const jsonObjectUsername = {
        "username": `${QuickEncrypt.encrypt(username, publicKey.public)}`
    };

    fs.writeFile(path.join(__dirname, "assets", "json", "mc", "username.json"), JSON.stringify(jsonObjectUsername), function writeJSON(err) {
        if (err) return console.log(err);
        console.log("The file was saved! (username)");
    });

    fs.writeFile(path.join(__dirname, "assets", "json", "mc", "password.json"), JSON.stringify(jsonObjectPassword), function writeJSON(err) {
        if (err) return console.log(err);
        console.log("The file was saved! (password)");
    });

    // save version config to file
    let clientPackageLink;
    if(!fs.existsSync(`${__dirname}/assets/json/version.json`)) {
        const onlineVer = await fetch("https://serversmp.xyz/assets/json/version.json");
        const onlineVerJson = await onlineVer.json();
        console.log(onlineVerJson);
        fs.writeFile(path.join(__dirname, "assets", "json", "version.json"), JSON.stringify(onlineVerJson), function writeJSON(err) {
            if (err) return console.log(err);
            console.log("The file was saved! (version)");
        });
        clientPackageLink = onlineVerJson.link;
    } else {
        const onlineVer = await fetch("https://serversmp.xyz/assets/json/version.json");
        const onlineVerJson = await onlineVer.json();
        console.log(onlineVer);
        const localVer = require(`${__dirname}/assets/json/version.json`);
        console.log(localVer);
        if(onlineVerJson.version !== localVer.version) {
            fs.writeFile(path.join(__dirname, "assets", "json", "version.json"), JSON.stringify(onlineVerJson), function writeJSON(err) {
                if (err) return console.log(err);
                console.log("The file was saved! (version)");
                clientPackageLink = onlineVerJson.link;
            });
        } else {
            clientPackageLink = null;
        }
    }

    // Login and lauch the app
    const launcher = new Client();
    let opts = {
        clientPackage: clientPackageLink,
        authorization: Authenticator.getAuth(username, password),
        root: `${__dirname}/minecraft`,
        version: {
            number: "1.8.9",
            type: "release"
        },
        forge: `${__dirname}/assets/forge.jar`,
        javaPath: `${__dirname}/assets/java${arch}/bin/java.exe`,
        memory: {
            max: `${maxram}G`,
            min: `${minram}G`
        }
    }
    console.log("Starting!")
    launcher.launch(opts);
    launcher.on('debug', (e) => {
        console.log(e)
        document.getElementById("mojang-play").innerHTML = "Starting";
    });
    launcher.on('data', (e) => {
        console.log(e)
        document.getElementById("mojang-play").innerHTML = "Running";
        closeApp();
    }); 
}

// Change html to microsoft login
document.querySelector("#mc-micro-login").addEventListener("click", () => {
    const minRamFile = require(`${__dirname}/assets/json/ram/min.json`);
    const maxRamFile = require(`${__dirname}/assets/json/ram/max.json`);
    document.getElementById("account_type").innerHTML = "<!-- Title --><h5 class='card-title'>Prince527's Lite Hypixel Pack </h5><!-- Min ram --><div class='mb-3 input-container'><i class='material-icons user icon'>hourglass_bottom</i><div class='input-group mb-3'><input style='text-align: left;' type='number' class='form-control input-field' id='min-ram' placeholder='Minimum RAM' min='1' max='10' value='1' required><span class='input-group-text input-group-text-change' id='basic-addon2'>GB</span></div></div><!-- Max ram --><div class='mb-3 input-container'><i class='material-icons user icon'>hourglass_top</i><div class='input-group mb-3'><input style='text-align: left;' type='number' class='form-control input-field' id='max-ram' placeholder='Maximum RAM' min='1' max='10' value='1' required><span class='input-group-text input-group-text-change' id='basic-addon2'>GB</span></div></div><!-- Play button --><button type='submit' class='btn btn-primary' id='microsoft-play'>Play</button>"
    document.getElementById("min-ram").value = minRamFile.ram;
    document.getElementById("max-ram").value = maxRamFile.ram;
    document.querySelector("#microsoft-play").addEventListener("click", () => {
        startMCMicrosoft();
    });
});

// Change html to mojang login
document.querySelector("#mc-mojan-login").addEventListener("click", () => {
    const usernameFile = require(`${__dirname}/assets/json/mc/username.json`);
    const passwordFile = require(`${__dirname}/assets/json/mc/password.json`);
    const minRamFile = require(`${__dirname}/assets/json/ram/min.json`);
    const maxRamFile = require(`${__dirname}/assets/json/ram/max.json`);
    const privateKey = require(`${__dirname}/assets/json/keys.json`);
    document.getElementById("account_type").innerHTML = "<!-- Title --><h5 class='card-title'>Prince527's Lite Hypixel Pack </h5><!-- Form username --><div class='mb-3 input-container'><i class='material-icons user icon'>account_box</i><input style='text-align: left;' type='text' class='form-control input-field' id='username' placeholder='Username' maxlength='100' required></div><!-- Form password --><div class='mb-3 input-container'><i class='material-icons visibility icon' onclick='show()'>visibility</i><input style='text-align: left;' type='password' class='form-control input-field' id='password' placeholder='Password' required></div><!-- Min ram --><div class='mb-3 input-container'><i class='material-icons user icon'>hourglass_bottom</i><div class='input-group mb-3'><input style='text-align: left;' type='number' class='form-control input-field' id='min-ram' placeholder='Minimum RAM' min='1' max='10' value='1' required><span class='input-group-text input-group-text-change' id='basic-addon2'>GB</span></div></div><!-- Max ram --><div class='mb-3 input-container'><i class='material-icons user icon'>hourglass_top</i><div class='input-group mb-3'><input style='text-align: left;' type='number' class='form-control input-field' id='max-ram' placeholder='Maximum RAM' min='1' max='10' value='1' required><span class='input-group-text input-group-text-change' id='basic-addon2'>GB</span></div></div><!-- Play button --><button type='submit' class='btn btn-primary' id='mojang-play'>Play</button>"
    document.getElementById("min-ram").value = minRamFile.ram;
    document.getElementById("max-ram").value = maxRamFile.ram;
    if(usernameFile.username !== "nothing") document.getElementById("username").value = QuickEncrypt.decrypt(usernameFile.username, privateKey.private);
    if(passwordFile.password !== "nothing") document.getElementById("password").value = QuickEncrypt.decrypt(passwordFile.password, privateKey.private);
    document.querySelector("#mojang-play").addEventListener("click", () => {
        startMCMojang();
    });
});

// check if internet is connected
function updateOnlineStatus() {
    const status = navigator.onLine ? 'online' : 'offline'
    if (status === 'offline') return closeApp();
}

window.addEventListener('online', updateOnlineStatus)
window.addEventListener('offline', updateOnlineStatus)

updateOnlineStatus()