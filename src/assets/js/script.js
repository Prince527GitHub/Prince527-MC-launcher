const {
    Client,
    Authenticator
} = require('minecraft-launcher-core');
const {
    DownloadWorker,
    utils
} = require("rapid-downloader");
const {
    ipcRenderer
} = require('electron');
const storage = require('electron-json-storage');
const QuickEncrypt = require('quick-encrypt');
const log = require('electron-log');
const _7z = require('7zip-min');
const path = require('path');
const fs = require('fs');

// set db path
storage.setDataPath(`${__dirname}/assets/json/settings`);

// set logs
Object.assign(console, log.functions);

// Microsoft login
async function startMCMicrosoft(pack_name) {
    // save ram config to file
    const minram = document.getElementById("min-ram").value;
    const maxram = document.getElementById("max-ram").value;

    fs.writeFile(path.join(__dirname, "assets", "json", `${pack_name}`, "max.json"), JSON.stringify({
        "ram": `${minram}`
    }), function writeJSON(err) {
        if (err) return console.log(err);
        console.log("The file was saved! (Max ram)");
    });

    fs.writeFile(path.join(__dirname, "assets", "json", `${pack_name}`, "min.json"), JSON.stringify({
        "ram": `${maxram}`
    }), function writeJSON(err) {
        if (err) return console.log(err);
        console.log("The file was saved! (Min ram)");
    });

    // Login and lauch the app
    const msmc = require("msmc");
    msmc.setFetch(fetch)
    msmc.fastLaunch("raw",
        (update) => {
            document.getElementById(`${pack_name}-microsoft-play`).innerHTML = "Starting";
            console.log("CallBack!!!!!")
            console.log(update)
        }).then(async (result) => {
        if (msmc.errorCheck(result)) {
            document.getElementById(`${pack_name}-microsoft-play`).innerHTML = "Error";
            console.log(result.reason)
            return;
        }

        // save version config to file
        let clientPackageLink;
        let versionLet;
        if (pack_name === "full") {
            versionLet = "1.8.9";
            clientPackageLink = await checkVersionMC(`${pack_name}`);
        } else if (pack_name === "lite") {
            versionLet = "1.8.9";
            clientPackageLink = await checkVersionMC(`${pack_name}`);
        } else {
            versionLet = pack_name;
            clientPackageLink = null;
        }

        // spit "." out of pack_name
        const pack_name_split = pack_name.split(".");

        console.log(clientPackageLink);

        const auth = msmc.getMCLC().getAuth(result);

        await startMCLauncher(clientPackageLink, pack_name_split.join("").toString(), maxram, minram, `${pack_name}-microsoft-play`, auth, versionLet);
    }).catch(reason => {
        document.getElementById(`${pack_name}-microsoft-play`).innerHTML = "Error";
        console.log("We failed to log someone in because : " + reason);
    });
}

async function startMCMojang(pack_name) {
    // save ram config to file
    const minram = document.getElementById("min-ram").value;
    const maxram = document.getElementById("max-ram").value;

    fs.writeFile(path.join(__dirname, "assets", "json", `${pack_name}`, "max.json"), JSON.stringify({
        "ram": `${minram}`
    }), function writeJSON(err) {
        if (err) return console.log(err);
        console.log("The file was saved! (Max ram)");
    });

    fs.writeFile(path.join(__dirname, "assets", "json", `${pack_name}`, "min.json"), JSON.stringify({
        "ram": `${maxram}`
    }), function writeJSON(err) {
        if (err) return console.log(err);
        console.log("The file was saved! (Min ram)");
    });

    // save username and password to file
    const publicKey = require(`${__dirname}/assets/json/launcher/keys.json`);

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    fs.writeFile(path.join(__dirname, "assets", "json", "mc", "username.json"), JSON.stringify({
        "username": `${QuickEncrypt.encrypt(username, publicKey.public)}`
    }), function writeJSON(err) {
        if (err) return console.log(err);
        console.log("The file was saved! (username)");
    });

    fs.writeFile(path.join(__dirname, "assets", "json", "mc", "password.json"), JSON.stringify({
        "password": `${QuickEncrypt.encrypt(password, publicKey.public)}`
    }), function writeJSON(err) {
        if (err) return console.log(err);
        console.log("The file was saved! (password)");
    });

    // save version config to file
    let clientPackageLink;
    let versionLet;
    if (pack_name === "full") {
        versionLet = "1.8.9";
        clientPackageLink = await checkVersionMC(`${pack_name}`);
    } else if (pack_name === "lite") {
        versionLet = "1.8.9";
        clientPackageLink = await checkVersionMC(`${pack_name}`);
    } else {
        versionLet = pack_name;
        clientPackageLink = null;
    }

    // spit "." out of pack_name
    const pack_name_split = pack_name.split(".");

    const auth = Authenticator.getAuth(username, password);

    await startMCLauncher(clientPackageLink, pack_name_split.join("").toString(), maxram, minram, `${pack_name}-mojang-play`, auth, versionLet);
}

async function startMCLauncher(clientPackageLink, pack_name, maxram, minram, btn_id, login, version) {
    let arch;
    if (process.arch === 'x64') {
        arch = '64';
    } else {
        arch = '32';
    }

    let javaPath;
    const javaJson = await storage.getSync('java');
    if (javaJson.path === "auto") {
        javaPath = `${__dirname}/assets/java/${arch}x/bin/java.exe`;
    } else {
        javaPath = javaJson.path;
    }

    const launcher = new Client();

    let forgeLink;
    if (pack_name === "lite") {
        forgeLink = `${__dirname}/assets/java/forge.jar`;
    } else if (pack_name === "full") {
        forgeLink = `${__dirname}/assets/java/forge.jar`;
    } else {
        forgeLink = null;
    }

    let opts = {
        clientPackage: clientPackageLink,
        authorization: login,
        root: `${__dirname}/minecraft/${pack_name}`,
        version: {
            number: version,
            type: "release"
        },
        forge: forgeLink,
        javaPath: javaPath,
        memory: {
            max: `${maxram}G`,
            min: `${minram}G`
        }
    }
    console.log("Starting!")
    launcher.launch(opts);
    launcher.on('debug', (e) => {
        console.log(e)
        document.getElementById(btn_id).innerHTML = "Launching";
    });
    launcher.on('data', (e) => {
        console.log(e)
        document.getElementById(btn_id).innerHTML = "Running";
        const hide_close = storage.getSync('hide-close');
        if (hide_close.option === true) return hideApp();
        closeApp();
    });
}

async function checkVersionMC(pack_name) {
    if (!fs.existsSync(`${__dirname}/assets/json/${pack_name}/version.json`)) {
        const onlineVer = await fetch(`https://prince527github.github.io/Prince527-MC-launcher/assets/json/${pack_name}/version.json`);
        const onlineVerJson = await onlineVer.json();
        console.log(onlineVerJson);
        fs.writeFile(path.join(__dirname, "assets", "json", `${pack_name}`, "version.json"), JSON.stringify(onlineVerJson), function writeJSON(err) {
            if (err) {
                console.log(err);
                return "err"
            }
            console.log("The file was saved! (version)");
        });
        return onlineVerJson.link;
    } else {
        const onlineVer = await fetch(`https://prince527github.github.io/Prince527-MC-launcher/assets/json/${pack_name}/version.json`);
        const onlineVerJson = await onlineVer.json();
        console.log(onlineVer);
        const localVer = require(`${__dirname}/assets/json/${pack_name}/version.json`);
        console.log(localVer);
        if (onlineVerJson.version !== localVer.version) {
            fs.writeFile(path.join(__dirname, "assets", "json", `${pack_name}`, "version.json"), JSON.stringify(onlineVerJson), function writeJSON(err) {
                if (err) {
                    console.log(err);
                    return "err"
                }
                console.log("The file was saved! (version)");
                return onlineVerJson.link;
            });
        } else {
            return null;
        }
    }
}

async function addDropdowm(id) {
    if (id === "lite") {
        document.getElementById("dropdown-select-html").innerHTML += `<a onclick="btnSetup('lite')" id="lite-pack-select" href="#">Lite Hypixel Pack</a>`
    } else if (id === "full") {
        document.getElementById("dropdown-select-html").innerHTML += `<a onclick="btnSetup('full')" id="full-pack-select" href="#">Full Hypixel Pack</a>`
    } else {
        document.getElementById("dropdown-select-html").innerHTML += `<a onclick="btnSetup('${id}')" id="${id}-pack-select" href="#">${id}</a>`
    }
}

function arrayCheck() {
    const array = require(`${__dirname}/assets/json/launcher/pack.json`);
    array.ver.forEach(element => {
        addDropdowm(element.toString());
    });
}

function btnSetup(pack_name) {
    if (pack_name === "lite") {
        document.getElementById("account_type").innerHTML = `<h1>Lite Hypixel Pack</h1><button type="button" class="btn btn-secondary btn-lg" id="lite-mc-micro-login">Login with Microsoft</button><button type="button" class="btn btn-secondary btn-lg" id="lite-mc-mojan-login">Login with mojang</button>`;

        // Change html to microsoft login
        document.querySelector("#lite-mc-micro-login").addEventListener("click", () => {
            const minRamFile = require(`${__dirname}/assets/json/lite/min.json`);
            const maxRamFile = require(`${__dirname}/assets/json/lite/max.json`);
            document.getElementById("account_type").innerHTML = "<!-- Title --><h5 class='card-title'>Prince527's Lite Hypixel Pack </h5><!-- Min ram --><div class='mb-3 input-container'><i class='material-icons user icon'>hourglass_bottom</i><div class='input-group mb-3'><input style='text-align: left;' type='number' class='form-control input-field' id='min-ram' placeholder='Minimum RAM' min='1' max='10' value='1' required><span class='input-group-text input-group-text-change' id='basic-addon2'>GB</span></div></div><!-- Max ram --><div class='mb-3 input-container'><i class='material-icons user icon'>hourglass_top</i><div class='input-group mb-3'><input style='text-align: left;' type='number' class='form-control input-field' id='max-ram' placeholder='Maximum RAM' min='1' max='10' value='1' required><span class='input-group-text input-group-text-change' id='basic-addon2'>GB</span></div></div><!-- Play button --><button type='submit' class='btn btn-primary' id='lite-microsoft-play'>Play</button>"
            document.getElementById("min-ram").value = minRamFile.ram;
            document.getElementById("max-ram").value = maxRamFile.ram;
            document.querySelector("#lite-microsoft-play").addEventListener("click", () => {
                startMCMicrosoft("lite");
            });
            checkVersion("lite", "New version available!", "Update will install when you click play");
        });

        // Change html to mojang login
        document.querySelector("#lite-mc-mojan-login").addEventListener("click", () => {
            const usernameFile = require(`${__dirname}/assets/json/mc/username.json`);
            const passwordFile = require(`${__dirname}/assets/json/mc/password.json`);
            const minRamFile = require(`${__dirname}/assets/json/lite/min.json`);
            const maxRamFile = require(`${__dirname}/assets/json/lite/max.json`);
            const privateKey = require(`${__dirname}/assets/json/launcher/keys.json`);
            document.getElementById("account_type").innerHTML = "<!-- Title --><h5 class='card-title'>Prince527's Lite Hypixel Pack </h5><!-- Form username --><div class='mb-3 input-container'><i class='material-icons user icon'>account_box</i><input style='text-align: left;' type='text' class='form-control input-field' id='username' placeholder='Username' maxlength='100' required></div><!-- Form password --><div class='mb-3 input-container'><i class='material-icons visibility icon' onclick='show()'>visibility</i><input style='text-align: left;' type='password' class='form-control input-field' id='password' placeholder='Password' required></div><!-- Min ram --><div class='mb-3 input-container'><i class='material-icons user icon'>hourglass_bottom</i><div class='input-group mb-3'><input style='text-align: left;' type='number' class='form-control input-field' id='min-ram' placeholder='Minimum RAM' min='1' max='10' value='1' required><span class='input-group-text input-group-text-change' id='basic-addon2'>GB</span></div></div><!-- Max ram --><div class='mb-3 input-container'><i class='material-icons user icon'>hourglass_top</i><div class='input-group mb-3'><input style='text-align: left;' type='number' class='form-control input-field' id='max-ram' placeholder='Maximum RAM' min='1' max='10' value='1' required><span class='input-group-text input-group-text-change' id='basic-addon2'>GB</span></div></div><!-- Play button --><button type='submit' class='btn btn-primary' id='lite-mojang-play'>Play</button>"
            document.getElementById("min-ram").value = minRamFile.ram;
            document.getElementById("max-ram").value = maxRamFile.ram;
            if (usernameFile.username !== "nothing") document.getElementById("username").value = QuickEncrypt.decrypt(usernameFile.username, privateKey.private);
            if (passwordFile.password !== "nothing") document.getElementById("password").value = QuickEncrypt.decrypt(passwordFile.password, privateKey.private);
            document.querySelector("#lite-mojang-play").addEventListener("click", () => {
                startMCMojang("lite");
            });
            checkVersion("lite", "New version available!", "Update will install when you click play");
        });
    } else if (pack_name === "full") {
        document.getElementById("account_type").innerHTML = `<h1>Full Hypixel Pack</h1><button type="button" class="btn btn-secondary btn-lg" id="full-mc-micro-login">Login with Microsoft</button><button type="button" class="btn btn-secondary btn-lg" id="full-mc-mojan-login">Login with mojang</button>`;

        // Change html to microsoft login
        document.querySelector("#full-mc-micro-login").addEventListener("click", () => {
            const minRamFile = require(`${__dirname}/assets/json/full/min.json`);
            const maxRamFile = require(`${__dirname}/assets/json/full/max.json`);
            document.getElementById("account_type").innerHTML = "<!-- Title --><h5 class='card-title'>Prince527's Full Hypixel Pack </h5><!-- Min ram --><div class='mb-3 input-container'><i class='material-icons user icon'>hourglass_bottom</i><div class='input-group mb-3'><input style='text-align: left;' type='number' class='form-control input-field' id='min-ram' placeholder='Minimum RAM' min='1' max='10' value='1' required><span class='input-group-text input-group-text-change' id='basic-addon2'>GB</span></div></div><!-- Max ram --><div class='mb-3 input-container'><i class='material-icons user icon'>hourglass_top</i><div class='input-group mb-3'><input style='text-align: left;' type='number' class='form-control input-field' id='max-ram' placeholder='Maximum RAM' min='1' max='10' value='1' required><span class='input-group-text input-group-text-change' id='basic-addon2'>GB</span></div></div><!-- Play button --><button type='submit' class='btn btn-primary' id='full-microsoft-play'>Play</button>"
            document.getElementById("min-ram").value = minRamFile.ram;
            document.getElementById("max-ram").value = maxRamFile.ram;
            document.querySelector("#full-microsoft-play").addEventListener("click", () => {
                startMCMicrosoft("full");
            });
            checkVersion("full", "New version available!", "Update will install when you click play");
        });

        // Change html to mojang login
        document.querySelector("#full-mc-mojan-login").addEventListener("click", () => {
            const usernameFile = require(`${__dirname}/assets/json/mc/username.json`);
            const passwordFile = require(`${__dirname}/assets/json/mc/password.json`);
            const minRamFile = require(`${__dirname}/assets/json/full/min.json`);
            const maxRamFile = require(`${__dirname}/assets/json/full/max.json`);
            const privateKey = require(`${__dirname}/assets/json/launcher/keys.json`);
            document.getElementById("account_type").innerHTML = "<!-- Title --><h5 class='card-title'>Prince527's Full Hypixel Pack </h5><!-- Form username --><div class='mb-3 input-container'><i class='material-icons user icon'>account_box</i><input style='text-align: left;' type='text' class='form-control input-field' id='username' placeholder='Username' maxlength='100' required></div><!-- Form password --><div class='mb-3 input-container'><i class='material-icons visibility icon' onclick='show()'>visibility</i><input style='text-align: left;' type='password' class='form-control input-field' id='password' placeholder='Password' required></div><!-- Min ram --><div class='mb-3 input-container'><i class='material-icons user icon'>hourglass_bottom</i><div class='input-group mb-3'><input style='text-align: left;' type='number' class='form-control input-field' id='min-ram' placeholder='Minimum RAM' min='1' max='10' value='1' required><span class='input-group-text input-group-text-change' id='basic-addon2'>GB</span></div></div><!-- Max ram --><div class='mb-3 input-container'><i class='material-icons user icon'>hourglass_top</i><div class='input-group mb-3'><input style='text-align: left;' type='number' class='form-control input-field' id='max-ram' placeholder='Maximum RAM' min='1' max='10' value='1' required><span class='input-group-text input-group-text-change' id='basic-addon2'>GB</span></div></div><!-- Play button --><button type='submit' class='btn btn-primary' id='full-mojang-play'>Play</button>"
            document.getElementById("min-ram").value = minRamFile.ram;
            document.getElementById("max-ram").value = maxRamFile.ram;
            if (usernameFile.username !== "nothing") document.getElementById("username").value = QuickEncrypt.decrypt(usernameFile.username, privateKey.private);
            if (passwordFile.password !== "nothing") document.getElementById("password").value = QuickEncrypt.decrypt(passwordFile.password, privateKey.private);
            document.querySelector("#full-mojang-play").addEventListener("click", () => {
                startMCMojang("full");
            });
            checkVersion("full", "New version available!", "Update will install when you click play");
        });
    } else {
        document.getElementById("account_type").innerHTML = `<h1>${pack_name}</h1><button type="button" class="btn btn-secondary btn-lg" id="${pack_name}-mc-micro-login">Login with Microsoft</button><button type="button" class="btn btn-secondary btn-lg" id="${pack_name}-mc-mojan-login">Login with mojang</button>`;

        // Change html to microsoft login
        document.getElementById(`${pack_name}-mc-micro-login`).addEventListener("click", () => {
            const minRamFile = require(`${__dirname}/assets/json/general/min.json`);
            const maxRamFile = require(`${__dirname}/assets/json/general/max.json`);
            document.getElementById("account_type").innerHTML = `<!-- Title --><h5 class='card-title'>${pack_name} </h5><!-- Min ram --><div class='mb-3 input-container'><i class='material-icons user icon'>hourglass_bottom</i><div class='input-group mb-3'><input style='text-align: left;' type='number' class='form-control input-field' id='min-ram' placeholder='Minimum RAM' min='1' max='10' value='1' required><span class='input-group-text input-group-text-change' id='basic-addon2'>GB</span></div></div><!-- Max ram --><div class='mb-3 input-container'><i class='material-icons user icon'>hourglass_top</i><div class='input-group mb-3'><input style='text-align: left;' type='number' class='form-control input-field' id='max-ram' placeholder='Maximum RAM' min='1' max='10' value='1' required><span class='input-group-text input-group-text-change' id='basic-addon2'>GB</span></div></div><!-- Play button --><button type='submit' class='btn btn-primary' id='${pack_name}-microsoft-play'>Play</button>`
            document.getElementById("min-ram").value = minRamFile.ram;
            document.getElementById("max-ram").value = maxRamFile.ram;
            document.getElementById(`${pack_name}-microsoft-play`).addEventListener("click", () => {
                startMCMicrosoft(pack_name);
            });
        });

        // Change html to mojang login
        document.getElementById(`${pack_name}-mc-mojan-login`).addEventListener("click", () => {
            const usernameFile = require(`${__dirname}/assets/json/mc/username.json`);
            const passwordFile = require(`${__dirname}/assets/json/mc/password.json`);
            const minRamFile = require(`${__dirname}/assets/json/general/min.json`);
            const maxRamFile = require(`${__dirname}/assets/json/general/max.json`);
            const privateKey = require(`${__dirname}/assets/json/launcher/keys.json`);
            document.getElementById("account_type").innerHTML = `<!-- Title --><h5 class='card-title'>${pack_name} </h5><!-- Form username --><div class='mb-3 input-container'><i class='material-icons user icon'>account_box</i><input style='text-align: left;' type='text' class='form-control input-field' id='username' placeholder='Username' maxlength='100' required></div><!-- Form password --><div class='mb-3 input-container'><i class='material-icons visibility icon' onclick='show()'>visibility</i><input style='text-align: left;' type='password' class='form-control input-field' id='password' placeholder='Password' required></div><!-- Min ram --><div class='mb-3 input-container'><i class='material-icons user icon'>hourglass_bottom</i><div class='input-group mb-3'><input style='text-align: left;' type='number' class='form-control input-field' id='min-ram' placeholder='Minimum RAM' min='1' max='10' value='1' required><span class='input-group-text input-group-text-change' id='basic-addon2'>GB</span></div></div><!-- Max ram --><div class='mb-3 input-container'><i class='material-icons user icon'>hourglass_top</i><div class='input-group mb-3'><input style='text-align: left;' type='number' class='form-control input-field' id='max-ram' placeholder='Maximum RAM' min='1' max='10' value='1' required><span class='input-group-text input-group-text-change' id='basic-addon2'>GB</span></div></div><!-- Play button --><button type='submit' class='btn btn-primary' id='${pack_name}-mojang-play'>Play</button>`
            document.getElementById("min-ram").value = minRamFile.ram;
            document.getElementById("max-ram").value = maxRamFile.ram;
            if (usernameFile.username !== "nothing") document.getElementById("username").value = QuickEncrypt.decrypt(usernameFile.username, privateKey.private);
            if (passwordFile.password !== "nothing") document.getElementById("password").value = QuickEncrypt.decrypt(passwordFile.password, privateKey.private);
            document.getElementById(`${pack_name}-mojang-play`).addEventListener("click", () => {
                startMCMojang(pack_name);
            });
        });
    }
}

// check if internet is connected
function updateOnlineStatus() {
    const status = navigator.onLine ? 'online' : 'offline'
    if (status === 'offline') {
        return closeApp();
    }
}

window.addEventListener('online', updateOnlineStatus)
window.addEventListener('offline', updateOnlineStatus)

updateOnlineStatus();

// bootstrap tost message
function toast(message, name, time) {
    document.getElementById("toast-error-set").innerHTML = `<div class="position-fixed bottom-0 end-0 p-3" style="z-index: 11"><div id="liveToast" class="toast hide text-body bg-dark" role="alert" aria-live="assertive" aria-atomic="true"><div class="toast-header"><img src="./assets/image/prince.jpg" class="rounded me-2" alt="img_toast" height="32px" width="32px"><strong class="me-auto" style="color:black;">${name}</strong><small style="color:black;font-size:12px;">${time}</small><button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button></div><div class="toast-body">${message}</div></div></div>`
    const tostID = document.getElementById('liveToast');
    const toast = bootstrap.Toast.getOrCreateInstance(tostID);
    toast.show();
}

// check version from github
async function checkVersion(pack_name, title, text) {
    if (fs.existsSync(`${__dirname}/assets/json/${pack_name}/version.json`)) {
        const localVersion = require(`${__dirname}/assets/json/${pack_name}/version.json`);
        const onlineVersion = await fetch(`https://prince527github.github.io/Prince527-MC-launcher/assets/json/${pack_name}/version.json`);
        const onlineVersionJson = await onlineVersion.json();
        if (onlineVersionJson.version !== localVersion.version) return toast(text, title, "Just now");
    }
}

checkVersion("launcher", "New launcher available!", "Please download the latest version of the launcher");

// Close app
function closeApp() {
    ipcRenderer.invoke('quit-app');
}

// hide app
function hideApp() {
    ipcRenderer.invoke('hide-app');
}

let btnClicked;

function settingsMenu() {
    document.querySelector("#options-btn-html").addEventListener("click", () => {
        if (btnClicked === "1") {
            btnClicked = "0";
            return resetHTML();
        }
        btnClicked = '1';
        document.getElementById("dropdown-select-html").innerHTML = "";
        document.getElementById("account_type").innerHTML = `<div class="form-check form-switch"><input class="form-check-input" type="checkbox" id="hide-close"><label class="form-check-label" for="hide-close">Hide launcher will playing</label></div><button type="button" class="btn btn-secondary btn-lg" id="reset-java">Reset Java setup</button><div class="form-check form-switch"><input class="form-check-input" type="checkbox" id="rpc"><label class="form-check-label" for="rpc">Discord integration</label></div>`;

        const hideClose = document.getElementById("hide-close");

        // check if data file exist
        const hideCloseData = storage.getSync('hide-close');
        if (hideCloseData.option === true) {
            hideClose.checked = true;
        } else {
            hideClose.checked = false;
        }

        // get form switch checkbox and add event listener
        hideClose.addEventListener('change', function () {
            // get the value of the checkbox
            var checkboxValue = hideClose.checked;
            // if the checkbox is checked
            if (checkboxValue) {
                storage.set('hide-close', {
                    option: true
                }, function (error) {
                    if (error) throw error;
                });
            } else {
                storage.set('hide-close', {
                    option: false
                }, function (error) {
                    if (error) throw error;
                });
            }
        });

        document.getElementById("reset-java").addEventListener("click", () => {
            // reset db
            fs.unlink(`${__dirname}/assets/json/settings/java.json`, (err) => {
                if (err) return console.log(err);
                console.log("Java is deleted.");
                // reset data
                return MCsetup();
            });
        });

        const rpcCheck = document.getElementById("rpc");

        // check if data file exist
        const rpcData = storage.getSync('rpc');
        if (rpcData.option === true) {
            rpcCheck.checked = true;
        } else {
            rpcCheck.checked = false;
        }

        // get form switch checkbox and add event listener
        rpcCheck.addEventListener('change', function () {
            // get the value of the checkbox
            var checkboxValue = rpcCheck.checked;
            // if the checkbox is checked
            if (checkboxValue) {
                storage.set('rpc', {
                    option: true
                }, function (error) {
                    if (error) throw error;
                });
                return toast("Please restart the launcher", "RPC setting changed", "Just now");
            } else {
                storage.set('rpc', {
                    option: false
                }, function (error) {
                    if (error) throw error;
                });
                return toast("Please restart the launcher", "RPC setting changed", "Just now");
            }
        });
    });
}

// reset HTML
function resetHTML() {
    document.getElementById("account_type").innerHTML = `<h1>Prince527's MC launcher</h1>`;
    document.getElementById("options-btn-html-div").innerHTML = `<button class="btn btn-secondary material-icons user icon" style="position:absolute;bottom:15px;right:15px;" id="options-btn-html">settings</button>`;
    arrayCheck();
    settingsMenu();
}

resetHTML();

async function MCsetup() {

    // check version json file and save it
    if (!fs.existsSync(`${__dirname}/assets/json/lite/version.json`)) {
        const onlineVer = await fetch(`https://prince527github.github.io/Prince527-MC-launcher/assets/json/lite/version.json`);
        const onlineVerJson = await onlineVer.json();
        console.log(onlineVerJson);
        fs.writeFile(path.join(__dirname, "assets", "json", "lite", "version.json"), JSON.stringify(onlineVerJson), function writeJSON(err) {
            if (err) {
                console.log(err);
                return "err"
            }
            console.log("The file was saved! (lite version)");
        });
    }

    // check version json file and save it
    if (!fs.existsSync(`${__dirname}/assets/json/full/version.json`)) {
        const onlineVer = await fetch(`https://prince527github.github.io/Prince527-MC-launcher/assets/json/full/version.json`);
        const onlineVerJson = await onlineVer.json();
        console.log(onlineVerJson);
        fs.writeFile(path.join(__dirname, "assets", "json", "full", "version.json"), JSON.stringify(onlineVerJson), function writeJSON(err) {
            if (err) {
                console.log(err);
                return "err"
            }
            console.log("The file was saved! (full version)");
        });
    }

    // ram check and save
    if (!fs.existsSync(`${__dirname}/assets/json/full/max.json`)) {
        fs.writeFile(path.join(__dirname, "assets", "json", "full", "max.json"), JSON.stringify({
            "ram": "1"
        }), function writeJSON(err) {
            if (err) return console.log(err);
            console.log("The file was saved! (Max ram Full)");
        });
    }

    if (!fs.existsSync(`${__dirname}/assets/json/full/min.json`)) {
        fs.writeFile(path.join(__dirname, "assets", "json", "full", "min.json"), JSON.stringify({
            "ram": "1"
        }), function writeJSON(err) {
            if (err) return console.log(err);
            console.log("The file was saved! (Max ram Full)");
        });
    }

    // ram check and save
    if (!fs.existsSync(`${__dirname}/assets/json/lite/max.json`)) {
        fs.writeFile(path.join(__dirname, "assets", "json", "lite", "max.json"), JSON.stringify({
            "ram": "1"
        }), function writeJSON(err) {
            if (err) return console.log(err);
            console.log("The file was saved! (Max ram Lite)");
        });
    }

    if (!fs.existsSync(`${__dirname}/assets/json/lite/min.json`)) {
        fs.writeFile(path.join(__dirname, "assets", "json", "lite", "min.json"), JSON.stringify({
            "ram": "1"
        }), function writeJSON(err) {
            if (err) return console.log(err);
            console.log("The file was saved! (Max ram Lite)");
        });
    }

    // ram check and save
    if (!fs.existsSync(`${__dirname}/assets/json/general/max.json`)) {
        fs.writeFile(path.join(__dirname, "assets", "json", "general", "max.json"), JSON.stringify({
            "ram": "1"
        }), function writeJSON(err) {
            if (err) return console.log(err);
            console.log("The file was saved! (Max ram General)");
        });
    }

    if (!fs.existsSync(`${__dirname}/assets/json/general/min.json`)) {
        fs.writeFile(path.join(__dirname, "assets", "json", "general", "min.json"), JSON.stringify({
            "ram": "1"
        }), function writeJSON(err) {
            if (err) return console.log(err);
            console.log("The file was saved! (Max ram General)");
        });
    }

    // Hide Launcher While Playing or Close
    storage.has('hide-close', function (error, hasKey) {
        if (error) throw error;
        if (!hasKey) {
            storage.set('hide-close', {
                option: false
            }, function (error) {
                if (error) throw error;
            });
        }
    });

    // Hide Launcher While Playing or Close
    storage.has('rpc', function (error, hasKey) {
        if (error) throw error;
        if (!hasKey) {
            storage.set('rpc', {
                option: true
            }, function (error) {
                if (error) throw error;
            });
        }
    });

    // public & private key
    if (!fs.existsSync(`${__dirname}/assets/json/launcher/keys.json`)) {
        // set html
        document.getElementById("account_type").innerHTML = `<h1>Downloading required files</h1>`
        document.getElementById("dropdown-select-html").innerHTML = "";
        document.getElementById("options-btn-html-div").innerHTML = "";

        console.log("Public file does not exsit.");
        const keys = QuickEncrypt.generate(2048);
        fs.writeFile(path.join(__dirname, "assets", "json", "launcher", "keys.json"), JSON.stringify(keys), function writeJSON(err) {
            if (err) return console.log(err);
            console.log("The file was saved! (public & private)");
        });
    }

    // check if forge is installed
    // download forge from github
    if (!fs.existsSync(`${__dirname}/assets/java/forge.jar`)) {
        // set html
        document.getElementById("account_type").innerHTML = `<h1>Downloading required files</h1>`
        document.getElementById("dropdown-select-html").innerHTML = "";
        document.getElementById("options-btn-html-div").innerHTML = "";

        const worker = new DownloadWorker("https://prince527github.github.io/Prince527-MC-launcher/assets/java/forge.jar", `${__dirname}/assets/java/forge.jar`, {
            maxConnections: 8
        });
        worker.on('ready', () => {
            worker.on('start', () => {
                console.log('started');
            })
            worker.on('progress', (progress) => {
                const speed = utils.dynamicSpeedUnitDisplay(progress.bytesPerSecond, 2);
                console.log(`${progress.completedPercent}% - ${speed}`);
            });
            worker.on('finishing', () => console.log('Download is finishing'));
            worker.on('end', () => {
                console.log('Download is done');
            });
            worker.start();
        });
    }

    // setup java
    // set html

    let arch;
    if (process.arch === 'x64') {
        arch = '64';
    } else {
        arch = '32';
    }

    if (!fs.existsSync(`${__dirname}/assets/java/${arch}x`)) {
        // check db
        storage.has('java', function (error, hasKey) {
            if (error) throw error;
            if (hasKey) return resetHTML();
        });

        // set html
        document.getElementById("account_type").innerHTML = `<h1>Java setup</h1><button type="button" class="btn btn-secondary btn-lg" id="java-auto">Automatic</button><button type="button" class="btn btn-secondary btn-lg" id="java-manuel">Manuel</button>`
        document.getElementById("dropdown-select-html").innerHTML = "";
        document.getElementById("options-btn-html-div").innerHTML = "";

        document.getElementById("java-auto").addEventListener("click", function () {
            // set html
            document.getElementById("account_type").innerHTML = `<h1>Downloading required files</h1>`

            // save db
            storage.set('java', {
                path: 'auto'
            }, function (error) {
                if (error) throw error;
            });

            // download java from internet
            const worker = new DownloadWorker(`https://prince527github.github.io/Prince527-MC-launcher/assets/java/${arch}x.7z`, `${__dirname}/assets/java/${arch}x.7z`, {
                maxConnections: 8
            });
            worker.on('ready', () => {
                worker.on('start', () => {
                    console.log('started')
                })
                worker.on('progress', (progress) => {
                    const speed = utils.dynamicSpeedUnitDisplay(progress.bytesPerSecond, 2);
                    console.log(`${progress.completedPercent}% - ${speed}`)
                });
                worker.on('finishing', () => console.log('Download is finishing'));
                worker.on('end', () => {
                    console.log('Download is done');

                    // extract 7zip file
                    _7z.unpack(`${__dirname}/assets/java/${arch}x.7z`, `${__dirname}/assets/java/`, err => {
                        if (err) return console.log(err);
                        if (!err) {
                            console.log('7z unpack done');

                            fs.unlink(`${__dirname}/assets/java/${arch}x.7z`, (err) => {
                                if (err) return console.log(err);
                                console.log("7zip is deleted.");
                                resetHTML();
                            });
                        }
                    });
                });
                worker.start();
            });
        });

        document.getElementById("java-manuel").addEventListener("click", function () {
            // set html
            document.getElementById("account_type").innerHTML = `<h1>Java setup</h1><input type="file" class="form-control" id="java-path">`

            // on change event
            document.getElementById("java-path").addEventListener("change", function () {
                // get file path from input
                const file = document.getElementById("java-path").files[0];
                if (file.name !== "java.exe") return MCsetup();
                const filePath = file.path;

                // save db
                storage.set('java', {
                    path: `${filePath}`
                }, function (error) {
                    if (error) throw error;
                });

                // reset html
                resetHTML();
            });
        });
    }
}

MCsetup();