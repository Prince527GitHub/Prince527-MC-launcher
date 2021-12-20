const {
    Client,
    Authenticator
} = require('minecraft-launcher-core');
const {
    DownloaderHelper
} = require('node-downloader-helper');
const {
    ipcRenderer
} = require('electron');
const QuickEncrypt = require('quick-encrypt');
const log = require('electron-log');
const _7z = require('7zip-min');
const fs = require('fs');

// set logs
Object.assign(console, log.functions);

// check if internet is connected
function updateOnlineStatus() {
    return navigator.onLine ? 'online' : 'offline'
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

// Microsoft login
async function startMCMicrosoft(pack_name, gameVersion, modded) {
    // save ram config to file
    const maxram = document.getElementById("max-ram").value;

    await setData('max', `${process.env.APPDATA}/Prince527's MC Launcher/settings/${pack_name}`, {
        "ram": minram
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
            return resetHTML();
        }

        const clientPackageLink = await getPackageLink(pack_name);
        const versionLet = await getVersion(pack_name, gameVersion);

        // spit "." out of pack_name
        const pack_name_split = pack_name.split(".");

        console.log(clientPackageLink);

        const auth = msmc.getMCLC().getAuth(result);

        await startMCLauncher(clientPackageLink, pack_name_split.join("").toString(), maxram, `${pack_name}-microsoft-play`, auth, versionLet, modded);
    }).catch(reason => {
        document.getElementById(`${pack_name}-microsoft-play`).innerHTML = "Error";
        console.log("We failed to log someone in because : " + reason);
        return resetHTML();
    });
}

async function startMCMojang(pack_name, gameVersion, modded) {
    // save ram config to file
    const maxram = document.getElementById("max-ram").value;

    await setData('max', `${process.env.APPDATA}/Prince527's MC Launcher/settings/${pack_name}`, {
        "ram": minram
    });

    // save username and password to file
    const publicKey = await getData('public', `${process.env.APPDATA}/Prince527's MC Launcher/settings/`);

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    await setData('username', `${process.env.APPDATA}/Prince527's MC Launcher/settings/mc`, {
        "username": QuickEncrypt.encrypt(username, publicKey.public)
    });
    await setData('password', `${process.env.APPDATA}/Prince527's MC Launcher/settings/mc`, {
        "password": QuickEncrypt.encrypt(password, publicKey.public)
    });

    const clientPackageLink = await getPackageLink(pack_name);
    const versionLet = await getVersion(pack_name, gameVersion);

    // spit "." out of pack_name
    const pack_name_split = pack_name.split(".");

    const auth = Authenticator.getAuth(username, password);

    await startMCLauncher(clientPackageLink, pack_name_split.join("").toString(), maxram, `${pack_name}-mojang-play`, auth, versionLet);
}

async function startMCLauncher(clientPackageLink, pack_name, maxram, btn_id, login, version, modded) {
    let arch;
    if (process.arch === 'x64') {
        arch = '64';
    } else {
        arch = '32';
    }

    let javaPath;

    if (!await hasData('java', `${process.env.APPDATA}/Prince527's MC Launcher/settings/`)) return resetHTML();
    if (!await hasData('java17', `${process.env.APPDATA}/Prince527's MC Launcher/settings/`)) return resetHTML();

    const javaJson = await getData('java', `${process.env.APPDATA}/Prince527's MC Launcher/settings`);
    const javaJson17 = await getData('java17', `${process.env.APPDATA}/Prince527's MC Launcher/settings`);

    console.log(javaJson);
    console.log(javaJson17);

    console.log(javaJson.path);
    console.log(javaJson17.path);

    if (Number(version.split(".").join("")) > Number("1165")) {
        if (javaJson17.path === "auto") {
            javaPath = `${__dirname}/assets/java/java17/bin/java.exe`;
            console.log(javaPath);
        } else {
            javaPath = javaJson17.path;
            console.log(javaPath);
        }
    } else {
        if (javaJson.path === "auto") {
            javaPath = `${__dirname}/assets/java/${arch}x/bin/java.exe`;
            console.log(javaPath);
        } else {
            javaPath = javaJson.path;
            console.log(javaPath);
        }
    }

    console.log(javaPath);

    const launcher = new Client();

    let forgeLink;
    if (pack_name === "lite") {
        forgeLink = `${__dirname}/assets/java/forge.jar`;
    } else if (pack_name === "full") {
        forgeLink = `${__dirname}/assets/java/forge.jar`;
    } else {
        forgeLink = null;
    }

    let dir = `${process.env.APPDATA}/Prince527's MC Launcher/minecraft`;
    if (await hasData('game-path', `${process.env.APPDATA}/Prince527's MC Launcher/settings`)) dir = (await getData('game-path', `${process.env.APPDATA}/Prince527's MC Launcher/settings`)).path;

    if (!await fs.existsSync(`${dir}/${pack_name}`)) await fs.mkdirSync(`${dir}/${pack_name}`, {
        recursive: true
    });

    if (await fs.existsSync(`${__dirname}/assets/java/Log4jPatcher.jar`)) if (!await fs.existsSync(`${dir}/${pack_name}/Log4jPatcher.jar`)) await fs.copyFileSync(`${__dirname}/assets/java/Log4jPatcher.jar`, `${dir}/${pack_name}/Log4jPatcher.jar`);

    let opts = {
        clientPackage: clientPackageLink,
        removePackage: true,
        authorization: login,
        root: `${dir}/${pack_name}`,
        customArgs: [
            '-javaagent:Log4jPatcher.jar'
        ],
        customLaunchArgs: [
            '-javaagent:Log4jPatcher.jar'
        ],
        version: {
            number: version,
            type: "release"
        },
        forge: forgeLink,
        javaPath: javaPath,
        memory: {
            max: `${maxram}G`,
            min: "128MB"
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
        const hide_close = getData('hide-close', `${process.env.APPDATA}/Prince527's MC Launcher/settings`);
        if (hide_close.option === true) {
            hideApp();
            return resetHTML();
        }
        closeApp();
    });
}

async function startMCOffline(pack_name, gameVersion, modded) {
    let dir = `${process.env.APPDATA}/Prince527's MC Launcher/minecraft`;
    if (await hasData('game-path', `${process.env.APPDATA}/Prince527's MC Launcher/settings`)) dir = (await getData('game-path', `${process.env.APPDATA}/Prince527's MC Launcher/settings`)).path;

    const pack_name_split = pack_name.split(".");

    if (!await fs.existsSync(`${dir}/${pack_name_split.join("").toString()}`)) {
        toast("The version you are trying to play does not exist!", "Offline", "Just now");
        return resetHTML();
    }

    let version;
    if (pack_name === "full") {
        versionLet = "1.8.9";
    } else if (pack_name === "lite") {
        version = "1.8.9";

    } else {
        version = pack_name;
    }

    let arch;
    if (process.arch === 'x64') {
        arch = '64';
    } else {
        arch = '32';
    }

    let javaPath;

    if (!await hasData('java', `${process.env.APPDATA}/Prince527's MC Launcher/settings/`)) return resetHTML();
    if (!await hasData('java17', `${process.env.APPDATA}/Prince527's MC Launcher/settings/`)) return resetHTML();

    const javaJson = await getData('java', `${process.env.APPDATA}/Prince527's MC Launcher/settings`);
    const javaJson17 = await getData('java17', `${process.env.APPDATA}/Prince527's MC Launcher/settings`);

    if (Number(version.split(".").join("")) > Number("1165")) {
        if (javaJson17.path === "auto") {
            if (!await fs.existsSync(`${__dirname}/assets/java/java17/bin/java.exe`)) {
                toast("Java 17 is not installed!", "Offline", "Just now");
                return resetHTML();
            }
            javaPath = `${__dirname}/assets/java/java17/bin/java.exe`;
        } else {
            javaPath = javaJson17.path;
        }
    } else {
        if (javaJson.path === "auto") {
            if (!await fs.existsSync(`${__dirname}/assets/java/${arch}x/bin/java.exe`)) {
                toast("Java 8 is not installed!", "Offline", "Just now");
                return resetHTML();
            }
            javaPath = `${__dirname}/assets/java/${arch}x/bin/java.exe`;
        } else {
            javaPath = javaJson.path;
        }
    }

    const launcher = new Client();

    let forgeLink;
    if (pack_name === "lite") {
        if (!await fs.existsSync(`${__dirname}/assets/java/forge.jar`)) {
            toast("You don't have forge installed", "Offline", "Just now");
            return resetHTML();
        }
        forgeLink = `${__dirname}/assets/java/forge.jar`;
    } else if (pack_name === "full") {
        if (!await fs.existsSync(`${__dirname}/assets/java/forge.jar`)) {
            toast("You don't have forge installed", "Offline", "Just now");
            return resetHTML();
        }
        forgeLink = `${__dirname}/assets/java/forge.jar`;
    } else {
        forgeLink = null;
    }

    const maxram = document.getElementById("max-ram").value;

    await setData('min', `${process.env.APPDATA}/Prince527's MC Launcher/settings/${pack_name}`, {
        "ram": maxram
    });

    if (await fs.existsSync(`${__dirname}/assets/java/Log4jPatcher.jar`)) {
        if (!await fs.existsSync(`${dir}/${pack_name}/Log4jPatcher.jar`)) await fs.copyFileSync(`${__dirname}/assets/java/Log4jPatcher.jar`, `${dir}/${pack_name}/Log4jPatcher.jar`);
    } else {
        toast("You don't have Log4jPatcher installed", "Offline", "Just now");
        return resetHTML();
    }

    let opts = {
        authorization: Authenticator.getAuth("offline"),
        root: `${dir}/${pack_name}`,
        customArgs: [
            '-javaagent:Log4jPatcher.jar'
        ],
        customLaunchArgs: [
            '-javaagent:Log4jPatcher.jar'
        ],
        version: {
            number: version,
            type: "release"
        },
        forge: forgeLink,
        javaPath: javaPath,
        memory: {
            max: `${maxram}G`,
            min: "128MB"
        }
    }
    console.log("Starting!")
    launcher.launch(opts);
    launcher.on('debug', (e) => {
        console.log(e)
        document.getElementById(`${pack_name}-offline-play`).innerHTML = "Launching";
    });
    launcher.on('data', (e) => {
        console.log(e)
        document.getElementById(`${pack_name}-offline-play`).innerHTML = "Running";
        const hide_close = getData('hide-close', `${process.env.APPDATA}/Prince527's MC Launcher/settings`);
        if (hide_close.option === true) {
            hideApp();
            return resetHTML();
        }
        closeApp();
    });
}

async function checkVersionMC(pack_name) {
    if (!await hasData('version', `${process.env.APPDATA}/Prince527's MC Launcher/settings/${pack_name}`)) {
        const onlineVer = await fetch(`https://prince527github.github.io/Prince527-MC-launcher/assets/json/${pack_name}/version.json`);
        const onlineVerJson = await onlineVer.json();
        console.log(onlineVerJson);
        await setData('version', `${process.env.APPDATA}/Prince527's MC Launcher/settings/${pack_name}`, JSON.stringify(onlineVerJson));
        return onlineVerJson.link;
    } else {
        const onlineVer = await fetch(`https://prince527github.github.io/Prince527-MC-launcher/assets/json/${pack_name}/version.json`);
        const onlineVerJson = await onlineVer.json();
        console.log(onlineVer);
        const localVer = await getData('version', `${process.env.APPDATA}/Prince527's MC Launcher/settings/${pack_name}`);
        console.log(localVer);
        if (onlineVerJson.version !== localVer.version) {
            await setData('version', `${process.env.APPDATA}/Prince527's MC Launcher/settings/${pack_name}`, JSON.stringify(onlineVerJson));
            return onlineVerJson.link;
        } else {
            return null;
        }
    }
}

function getVersion(pack_name, version) {
    if (pack_name === "lite") return "1.8.9";
    if (pack_name === "full") return "1.8.9";
    if (version !== "undefined") return version;
    return pack_name;
}

async function getPackageLink(pack_name) {
    // if (pack_name === "lite") return await checkVersionMC(pack_name);
    // if (pack_name === "full") return await checkVersionMC(pack_name);
    // if (pack_name === "1.18.1 Pack") return await checkVersionMC(pack_name);
    // return null; 
    if (['lite', 'full', '1.18.1 Pack'].indexOf(pn) !== -1) return await checkVersionMC(pn);
    return null;
}

async function DownloadOptifine(pack_name, version) {
    const optifineLink = await fetch(`https://prince527github.github.io/Prince527-MC-launcher/assets/json/optifine.json`).json();
    
    const dl = new DownloaderHelper(, `${__dirname}/assets/temp`);
    dl.on('end', () => {
        console.log("Downloaded Optifine!");
    });
    dl.on('start', () => {
        console.log("Downloading Optifine...");
    });
    dl.start();
}

async function addDropdowm(id) {
    if (updateOnlineStatus() === 'online') {
        if (id === "lite") {
            return document.getElementById("dropdown-select-html").innerHTML += `<a onclick="btnSetup('lite')" id="lite-pack-select" href="#">Lite Hypixel Pack</a>`
        } else if (id === "full") {
            return document.getElementById("dropdown-select-html").innerHTML += `<a onclick="btnSetup('full')" id="full-pack-select" href="#">Full Hypixel Pack</a>`
        } else {
            return document.getElementById("dropdown-select-html").innerHTML += `<a onclick="btnSetup('${id}')" id="${id}-pack-select" href="#">${id}</a>`
        }
    }

    if (id === "lite") {
        document.getElementById("dropdown-select-html").innerHTML += `<a onclick="offlineBtnSetup('lite')" id="lite-pack-select" href="#">Lite Hypixel Pack</a>`
    } else if (id === "full") {
        document.getElementById("dropdown-select-html").innerHTML += `<a onclick="offlineBtnSetup('full')" id="full-pack-select" href="#">Full Hypixel Pack</a>`
    } else {
        document.getElementById("dropdown-select-html").innerHTML += `<a onclick="offlineBtnSetup('${id}')" id="${id}-pack-select" href="#">${id}</a>`
    }
}

function arrayCheck() {
    const array = require(`${__dirname}/assets/json/launcher/pack.json`);
    array.ver.forEach(element => {
        addDropdowm(element.toString());
    });
}

async function btnSetup(pack_name) {
    if (pack_name === "lite") {
        document.getElementById("account_type").innerHTML = `<h1>Lite Hypixel Pack</h1><button type="button" class="btn btn-secondary btn-lg" id="lite-mc-micro-login">Login with Microsoft</button><button type="button" class="btn btn-secondary btn-lg" id="lite-mc-mojan-login">Login with mojang</button>`;

        // Change html to microsoft login
        document.querySelector("#lite-mc-micro-login").addEventListener("click", async () => {
            let maxRamFile = "1";
            if (await hasData('max', `${process.env.APPDATA}/Prince527's MC Launcher/settings/lite`)) maxRamFile = (await getData('max', `${process.env.APPDATA}/Prince527's MC Launcher/settings/lite`)).ram;

            document.getElementById("account_type").innerHTML = "<!-- Title --><h5 class='card-title'>Prince527's Lite Hypixel Pack </h5><!-- Max ram --><div class='input-container'><i class='material-icons user icon'>memory</i><div class='input-group'><input style='text-align: left;' type='number' class='form-control input-field' id='max-ram' placeholder='Maximum RAM' min='1' max='10' value='1' required><span class='input-group-text input-group-text-change' id='basic-addon2'>GB</span></div></div><!-- Play button --><button type='submit' class='btn btn-primary' id='lite-microsoft-play'>Play</button>"

            document.getElementById("max-ram").value = maxRamFile;

            const btn = document.querySelector("#lite-microsoft-play");

            btn.addEventListener("click", () => {
                document.getElementById('dropdown-select-html').innerHTML = "";
                document.getElementById('options-btn-html-div').innerHTML = "";

                btn.classList.add("disabled");

                startMCMicrosoft("lite");
            });

            checkVersion("lite", "New version available!", "Update will install when you click play");
        });

        // Change html to mojang login
        document.querySelector("#lite-mc-mojan-login").addEventListener("click", async () => {
            let usernameFile = "nothing";
            if (await hasData('username', `${process.env.APPDATA}/Prince527's MC Launcher/settings/mc`)) usernameFile = (await getData('username', `${process.env.APPDATA}/Prince527's MC Launcher/settings/mc`)).username;

            let passwordFile = "nothing";
            if (await hasData('password', `${process.env.APPDATA}/Prince527's MC Launcher/settings/mc`)) passwordFile = (await getData('password', `${process.env.APPDATA}/Prince527's MC Launcher/settings/mc`)).password;

            let maxRamFile = "1";
            if (await hasData('max', `${process.env.APPDATA}/Prince527's MC Launcher/settings/lite`)) maxRamFile = (await getData('max', `${process.env.APPDATA}/Prince527's MC Launcher/settings/lite`)).ram;

            const privateKey = (await getData('key', `${process.env.APPDATA}/Prince527's MC Launcher/settings/`)).private;

            document.getElementById("account_type").innerHTML = "<!-- Title --><h5 class='card-title'>Prince527's Lite Hypixel Pack </h5><!-- Form username --><div class='input-container'><i class='material-icons user icon'>account_box</i><input style='text-align: left;' type='text' class='form-control input-field' id='username' placeholder='Username' maxlength='100' required></div><!-- Form password --><div class='input-container'><i class='material-icons visibility icon' onclick='show()'>visibility</i><input style='text-align: left;' type='password' class='form-control input-field' id='password' placeholder='Password' required></div><!-- Max ram --><div class='mb-3 input-container'><i class='material-icons user icon'>memory</i><div class='input-group'><input style='text-align: left;' type='number' class='form-control input-field' id='max-ram' placeholder='Maximum RAM' min='1' max='10' value='1' required><span class='input-group-text input-group-text-change' id='basic-addon2'>GB</span></div></div><!-- Play button --><button type='submit' class='btn btn-primary' id='lite-mojang-play'>Play</button>"

            document.getElementById("max-ram").value = maxRamFile;

            if (usernameFile !== "nothing") document.getElementById("username").value = QuickEncrypt.decrypt(usernameFile, privateKey);
            if (passwordFile !== "nothing") document.getElementById("password").value = QuickEncrypt.decrypt(passwordFile, privateKey);

            const btn = document.querySelector("#lite-microsoft-play");

            btn.addEventListener("click", () => {
                document.getElementById('dropdown-select-html').innerHTML = "";
                document.getElementById('options-btn-html-div').innerHTML = "";

                btn.classList.add("disabled");

                startMCMojang("lite");
            });

            checkVersion("lite", "New version available!", "Update will install when you click play");
        });
    } else if (pack_name === "full") {
        document.getElementById("account_type").innerHTML = `<h1>Full Hypixel Pack</h1><button type="button" class="btn btn-secondary btn-lg" id="full-mc-micro-login">Login with Microsoft</button><button type="button" class="btn btn-secondary btn-lg" id="full-mc-mojan-login">Login with mojang</button>`;

        // Change html to microsoft login
        document.querySelector("#full-mc-micro-login").addEventListener("click", async () => {
            let maxRamFile = "1";
            if (await hasData('max', `${process.env.APPDATA}/Prince527's MC Launcher/settings/full`)) maxRamFile = (await getData('max', `${process.env.APPDATA}/Prince527's MC Launcher/settings/full`)).ram;

            document.getElementById("account_type").innerHTML = "<!-- Title --><h5 class='card-title'>Prince527's Full Hypixel Pack </h5><!-- Max ram --><div class='input-container'><i class='material-icons user icon'>memory</i><div class='input-group'><input style='text-align: left;' type='number' class='form-control input-field' id='max-ram' placeholder='Maximum RAM' min='1' max='10' value='1' required><span class='input-group-text input-group-text-change' id='basic-addon2'>GB</span></div></div><!-- Play button --><button type='submit' class='btn btn-primary' id='full-microsoft-play'>Play</button>"

            document.getElementById("max-ram").value = maxRamFile;

            const btn = document.querySelector("#full-microsoft-play");

            btn.addEventListener("click", () => {
                document.getElementById('dropdown-select-html').innerHTML = "";
                document.getElementById('options-btn-html-div').innerHTML = "";

                btn.classList.add("disabled");

                startMCMicrosoft("full");
            });

            checkVersion("full", "New version available!", "Update will install when you click play");
        });

        // Change html to mojang login
        document.querySelector("#full-mc-mojan-login").addEventListener("click", async () => {
            let usernameFile = "nothing";
            if (await hasData('username', `${process.env.APPDATA}/Prince527's MC Launcher/settings/mc`)) usernameFile = (await getData('username', `${process.env.APPDATA}/Prince527's MC Launcher/settings/mc`)).username;

            let passwordFile = "nothing";
            if (await hasData('password', `${process.env.APPDATA}/Prince527's MC Launcher/settings/mc`)) passwordFile = (await getData('password', `${process.env.APPDATA}/Prince527's MC Launcher/settings/mc`)).password;

            let maxRamFile = "1";
            if (await hasData('max', `${process.env.APPDATA}/Prince527's MC Launcher/settings/full`)) maxRamFile = (await getData('max', `${process.env.APPDATA}/Prince527's MC Launcher/settings/full`)).ram;

            const privateKey = (await getData('key', `${process.env.APPDATA}/Prince527's MC Launcher/settings/`)).private;

            document.getElementById("account_type").innerHTML = "<!-- Title --><h5 class='card-title'>Prince527's Full Hypixel Pack </h5><!-- Form username --><div class='input-container'><i class='material-icons user icon'>account_box</i><input style='text-align: left;' type='text' class='form-control input-field' id='username' placeholder='Username' maxlength='100' required></div><!-- Form password --><div class='mb-3 input-container'><i class='material-icons visibility icon' onclick='show()'>visibility</i><input style='text-align: left;' type='password' class='form-control input-field' id='password' placeholder='Password' required></div><!-- Max ram --><div class='input-container'><i class='material-icons user icon'>memory</i><div class='input-group'><input style='text-align: left;' type='number' class='form-control input-field' id='max-ram' placeholder='Maximum RAM' min='1' max='10' value='1' required><span class='input-group-text input-group-text-change' id='basic-addon2'>GB</span></div></div><!-- Play button --><button type='submit' class='btn btn-primary' id='full-mojang-play'>Play</button>"

            document.getElementById("max-ram").value = maxRamFile;

            if (usernameFile !== "nothing") document.getElementById("username").value = QuickEncrypt.decrypt(usernameFile, privateKey);
            if (passwordFile !== "nothing") document.getElementById("password").value = QuickEncrypt.decrypt(passwordFile, privateKey);

            const btn = document.querySelector("#full-mojang-play");

            btn.addEventListener("click", () => {
                document.getElementById('dropdown-select-html').innerHTML = "";
                document.getElementById('options-btn-html-div').innerHTML = "";

                btn.classList.add("disabled");

                startMCMojang("full");
            });

            checkVersion("full", "New version available!", "Update will install when you click play");
        });
    } else {
        document.getElementById("account_type").innerHTML = `<h1>${pack_name}</h1><button type="button" class="btn btn-secondary btn-lg" id="${pack_name}-mc-micro-login">Login with Microsoft</button><button type="button" class="btn btn-secondary btn-lg" id="${pack_name}-mc-mojan-login">Login with mojang</button>`;

        // Change html to microsoft login
        document.getElementById(`${pack_name}-mc-micro-login`).addEventListener("click", async () => {
            let maxRamFile = "1";
            if (await hasData('max', `${process.env.APPDATA}/Prince527's MC Launcher/settings/general`)) maxRamFile = (await getData('max', `${process.env.APPDATA}/Prince527's MC Launcher/settings/general`)).ram;

            document.getElementById("account_type").innerHTML = `<!-- Title --><h5 class='card-title'>${pack_name} </h5><!-- Max ram --><div class='input-container'><i class='material-icons user icon'>memory</i><div class='input-group'><input style='text-align: left;' type='number' class='form-control input-field' id='max-ram' placeholder='Maximum RAM' min='1' max='10' value='1' required><span class='input-group-text input-group-text-change' id='basic-addon2'>GB</span></div></div><!-- Play button --><button type='submit' class='btn btn-primary' id='${pack_name}-microsoft-play'>Play</button>`

            document.getElementById("max-ram").value = maxRamFile;

            const btn = document.getElementById(`${pack_name}-microsoft-play`);

            btn.addEventListener("click", () => {
                document.getElementById('dropdown-select-html').innerHTML = "";
                document.getElementById('options-btn-html-div').innerHTML = "";

                btn.classList.add("disabled");

                startMCMicrosoft(pack_name);
            });
        });

        // Change html to mojang login
        document.getElementById(`${pack_name}-mc-mojan-login`).addEventListener("click", async () => {
            let usernameFile = "nothing";
            if (await hasData('username', `${process.env.APPDATA}/Prince527's MC Launcher/settings/mc`)) usernameFile = (await getData('username', `${process.env.APPDATA}/Prince527's MC Launcher/settings/mc`)).username;

            let passwordFile = "nothing";
            if (await hasData('password', `${process.env.APPDATA}/Prince527's MC Launcher/settings/mc`)) passwordFile = (await getData('password', `${process.env.APPDATA}/Prince527's MC Launcher/settings/mc`)).password;

            let maxRamFile = "1";
            if (await hasData('max', `${process.env.APPDATA}/Prince527's MC Launcher/settings/general`)) maxRamFile = (await getData('max', `${process.env.APPDATA}/Prince527's MC Launcher/settings/general`)).ram;

            const privateKey = (await getData('key', `${process.env.APPDATA}/Prince527's MC Launcher/settings/`)).private;

            document.getElementById("account_type").innerHTML = `<!-- Title --><h5 class='card-title'>${pack_name} </h5><!-- Form username --><div class='input-container'><i class='material-icons user icon'>account_box</i><input style='text-align: left;' type='text' class='form-control input-field' id='username' placeholder='Username' maxlength='100' required></div><!-- Form password --><div class='input-container'><i class='material-icons visibility icon' onclick='show()'>visibility</i><input style='text-align: left;' type='password' class='form-control input-field' id='password' placeholder='Password' required></div><!-- Max ram --><div class='input-container'><i class='material-icons user icon'>memory</i><div class='input-group'><input style='text-align: left;' type='number' class='form-control input-field' id='max-ram' placeholder='Maximum RAM' min='1' max='10' value='1' required><span class='input-group-text input-group-text-change' id='basic-addon2'>GB</span></div></div><!-- Play button --><button type='submit' class='btn btn-primary' id='${pack_name}-mojang-play'>Play</button>`

            document.getElementById("max-ram").value = maxRamFile;

            if (usernameFile !== "nothing") document.getElementById("username").value = QuickEncrypt.decrypt(usernameFile, privateKey);
            if (passwordFile !== "nothing") document.getElementById("password").value = QuickEncrypt.decrypt(passwordFile, privateKey);

            const btn = document.getElementById(`${pack_name}-mojang-play`);

            btn.addEventListener("click", () => {
                document.getElementById('dropdown-select-html').innerHTML = "";
                document.getElementById('options-btn-html-div').innerHTML = "";

                btn.classList.add("disabled");

                startMCMojang(pack_name);
            });
        });
    }
}

async function offlineBtnSetup(pack_name) {
    if (pack_name === "lite") {
        let maxRamFile = "1";
        if (await hasData('max', `${process.env.APPDATA}/Prince527's MC Launcher/settings/lite`)) maxRamFile = (await getData('max', `${process.env.APPDATA}/Prince527's MC Launcher/settings/lite`)).ram;
        document.getElementById("account_type").innerHTML = "<!-- Title --><h5 class='card-title'>Prince527's Lite Hypixel Pack </h5><!-- Max ram --><div class='input-container'><i class='material-icons user icon'>memory</i><div class='input-group'><input style='text-align: left;' type='number' class='form-control input-field' id='max-ram' placeholder='Maximum RAM' min='1' max='10' value='1' required><span class='input-group-text input-group-text-change' id='basic-addon2'>GB</span></div></div><!-- Play button --><button type='submit' class='btn btn-primary' id='lite-offline-play'>Play</button>"
        document.getElementById("max-ram").value = maxRamFile;
        const btn = document.querySelector("#lite-offline-play");
        btn.addEventListener("click", () => {
            document.getElementById('dropdown-select-html').innerHTML = "";
            document.getElementById('options-btn-html-div').innerHTML = "";
            btn.classList.add("disabled");
            startMCOffline("lite");
        });
    } else if (pack_name === "full") {
        let maxRamFile = "1";
        if (await hasData('max', `${process.env.APPDATA}/Prince527's MC Launcher/settings/full`)) maxRamFile = (await getData('max', `${process.env.APPDATA}/Prince527's MC Launcher/settings/full`)).ram;
        document.getElementById("account_type").innerHTML = "<!-- Title --><h5 class='card-title'>Prince527's Full Hypixel Pack </h5><!-- Max ram --><div class='input-container'><i class='material-icons user icon'>memory</i><div class='input-group'><input style='text-align: left;' type='number' class='form-control input-field' id='max-ram' placeholder='Maximum RAM' min='1' max='10' value='1' required><span class='input-group-text input-group-text-change' id='basic-addon2'>GB</span></div></div><!-- Play button --><button type='submit' class='btn btn-primary' id='full-offline-play'>Play</button>"
        document.getElementById("max-ram").value = maxRamFile;
        const btn = document.querySelector("#full-offline-play");
        btn.addEventListener("click", () => {
            document.getElementById('dropdown-select-html').innerHTML = "";
            document.getElementById('options-btn-html-div').innerHTML = "";
            btn.classList.add("disabled");
            startMCOffline("full");
        });
    } else {
        let maxRamFile = "1";
        if (await hasData('max', `${process.env.APPDATA}/Prince527's MC Launcher/settings/general`)) maxRamFile = (await getData('max', `${process.env.APPDATA}/Prince527's MC Launcher/settings/general`)).ram;
        document.getElementById("account_type").innerHTML = `<!-- Title --><h5 class='card-title'>${pack_name}</h5><!-- Max ram --><div class='input-container'><i class='material-icons user icon'>memory</i><div class='input-group'><input style='text-align: left;' type='number' class='form-control input-field' id='max-ram' placeholder='Maximum RAM' min='1' max='10' value='1' required><span class='input-group-text input-group-text-change' id='basic-addon2'>GB</span></div></div><!-- Play button --><button type='submit' class='btn btn-primary' id='${pack_name}-offline-play'>Play</button>`
        document.getElementById("max-ram").value = maxRamFile;
        const btn = document.getElementById(`${pack_name}-offline-play`);
        btn.addEventListener("click", () => {
            document.getElementById('dropdown-select-html').innerHTML = "";
            document.getElementById('options-btn-html-div').innerHTML = "";
            btn.classList.add("disabled");
            startMCOffline(pack_name);
        });
    }
}

// bootstrap tost message
function toast(message, name, time) {
    document.getElementById("toast-error-set").innerHTML = `<div class="position-fixed bottom-0 end-0 p-3" style="z-index: 11"><div id="liveToast" class="toast hide text-body bg-dark" role="alert" aria-live="assertive" aria-atomic="true"><div class="toast-header"><img src="./assets/image/prince.jpg" class="rounded me-2" alt="img_toast" height="32px" width="32px"><strong class="me-auto" style="color:black;">${name}</strong><small style="color:black;font-size:12px;">${time}</small><button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button></div><div class="toast-body">${message}</div></div></div>`
    const tostID = document.getElementById('liveToast');
    const toast = bootstrap.Toast.getOrCreateInstance(tostID);
    toast.show();
}

// check version from github
async function checkVersion(pack_name, title, text) {
    if (updateOnlineStatus() === 'offline') return;
    if (pack_name === "launcher") {
        const localVersion = await getData('version', `${__dirname}/assets/json/launcher`);
        const onlineVersion = await fetch(`https://prince527github.github.io/Prince527-MC-launcher/assets/json/${pack_name}/version.json`);
        const onlineVersionJson = await onlineVersion.json();
        if (onlineVersionJson.version !== localVersion.version) return toast(text, title, "Just now");
    } else {
        if (await hasData('version', `${process.env.APPDATA}/Prince527's MC Launcher/settings/${pack_name}`)) {
            const localVersion = JSON.parse(await getData('version', `${process.env.APPDATA}/Prince527's MC Launcher/settings/${pack_name}`));
            const onlineVersion = await fetch(`https://prince527github.github.io/Prince527-MC-launcher/assets/json/${pack_name}/version.json`);
            const onlineVersionJson = await onlineVersion.json();
            if (onlineVersionJson.version !== localVersion.version) return toast(text, title, "Just now");
        }
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

async function settingsMenu() {
    document.querySelector("#options-btn-html").addEventListener("click", async () => {
        if (btnClicked === "1") {
            btnClicked = "0";
            return resetHTML();
        }
        btnClicked = '1';
        document.getElementById("dropdown-select-html").innerHTML = "";
        document.getElementById("account_type").innerHTML = `<div class="form-check form-switch"><input class="form-check-input" type="checkbox" id="hide-close"><label class="form-check-label" for="hide-close">Hide launcher will playing</label></div><div class="form-check form-switch"><input class="form-check-input" type="checkbox" id="rpc"><label class="form-check-label" for="rpc">Discord integration</label></div><div style="margin-top:5px;" class="btn-group" role="group" aria-label="java"><a href="#" class="btn btn-secondary btn-lg gray-btn active" disabled>Reset</a><a href="#" class="btn btn-secondary btn-lg gray-btn" id="reset-java">Java 8</a><a href="#" class="btn btn-secondary btn-lg gray-btn" id="reset-java17">Java 17</a></div><br><div style="margin-top:5px;" class="btn-group" role="group" aria-label="Basic example"><a class="btn btn-secondary btn-lg gray-btn active" disabled>Game path</a><button type="button" class="btn btn-secondary btn-lg material-icons" id="folder-btn">folder</button><button type="button" class="btn btn-secondary btn-lg material-icons" id="folder-reset-btn">refresh</button></div>`;

        const hideClose = document.getElementById("hide-close");

        // check if data file exist
        const hideCloseData = await getData('hide-close', `${process.env.APPDATA}/Prince527's MC Launcher/settings`);
        if (hideCloseData.option === true) {
            hideClose.checked = true;
        } else {
            hideClose.checked = false;
        }

        // get form switch checkbox and add event listener
        hideClose.addEventListener('change', async function () {
            // get the value of the checkbox
            var checkboxValue = hideClose.checked;
            // if the checkbox is checked
            if (checkboxValue) {
                await setData('hide-close', `${process.env.APPDATA}/Prince527's MC Launcher/settings`, {
                    "option": true
                });
            } else {
                await setData('hide-close', `${process.env.APPDATA}/Prince527's MC Launcher/settings`, {
                    "option": false
                });
            }
        });

        document.getElementById("reset-java").addEventListener("click", async () => {
            // check arch
            let arch;
            if (process.arch === "x64") {
                arch = "64";
            } else {
                arch = "32";
            }

            // delete path if auto
            if ((await getData('java', `${process.env.APPDATA}/Prince527's MC Launcher/settings`)).path === "auto") await fs.unlinkSync(`${__dirname}/assets/java/${arch}x`);
            
            // reset db
            await removeData('java', `${process.env.APPDATA}/Prince527's MC Launcher/settings`);
            return await MCsetup();
        });

        document.getElementById("reset-java17").addEventListener("click", async () => {
            // delete path if auto
            if ((await getData('java', `${process.env.APPDATA}/Prince527's MC Launcher/settings`)).path === "auto") await fs.unlinkSync(`${__dirname}/assets/java/java17`);
            
            // reset db
            await removeData('java17', `${process.env.APPDATA}/Prince527's MC Launcher/settings`);
            return await MCsetup();
        });

        const rpcCheck = document.getElementById("rpc");

        // check if data file exist
        const rpcData = getData('rpc', `${process.env.APPDATA}/Prince527's MC Launcher/settings`);
        if (rpcData.option === true) {
            rpcCheck.checked = true;
        } else {
            rpcCheck.checked = false;
        }

        // get form switch checkbox and add event listener
        rpcCheck.addEventListener('change', async function () {
            // get the value of the checkbox
            var checkboxValue = rpcCheck.checked;
            // if the checkbox is checked
            if (checkboxValue) {
                await setData('rpc', `${process.env.APPDATA}/Prince527's MC Launcher/settings`, {
                    "option": true
                });
                return toast("Please restart the launcher", "RPC setting changed", "Just now");
            } else {
                await setData('rpc', `${process.env.APPDATA}/Prince527's MC Launcher/settings`, {
                    "option": false
                });
                return toast("Please restart the launcher", "RPC setting changed", "Just now");
            }
        });

        document.getElementById("folder-btn").addEventListener("click", async () => {
            const path = await ipcRenderer.invoke('open-folder-dialog');

            if (path === null) return settingsMenu();

            if (await fs.existsSync(`${process.env.APPDATA}/Prince527's MC Launcher/minecraft`)) await fs.unlinkSync(`${process.env.APPDATA}/Prince527's MC Launcher/minecraft`);

            await setData('game-path', `${process.env.APPDATA}/Prince527's MC Launcher/settings`, {
                "path": path
            });

            if (await hasData('version', `${process.env.APPDATA}/Prince527's MC Launcher/settings/lite`)) await removeData('version', `${process.env.APPDATA}/Prince527's MC Launcher/settings/lite`);
            if (await hasData('version', `${process.env.APPDATA}/Prince527's MC Launcher/settings/full`)) await removeData('version', `${process.env.APPDATA}/Prince527's MC Launcher/settings/full`);

            return toast("You game path has been changed successfully", "Game path changed", "Just now");
        });

        document.getElementById("folder-reset-btn").addEventListener("click", async () => {
            if (!await hasData('game-path', `${process.env.APPDATA}/Prince527's MC Launcher/settings`)) return settingsMenu();
            await removeData('game-path', `${process.env.APPDATA}/Prince527's MC Launcher/settings`);
            return toast("You game path has been reset successfully", "Game path reset", "Just now");
        });
    });
}

// reset HTML
function resetHTML() {
    document.getElementById("dropdown-select-html").innerHTML = "";

    if (updateOnlineStatus() === 'online') {
        document.getElementById("account_type").innerHTML = `<h1>Prince527's MC launcher</h1>`;
        document.getElementById("options-btn-html-div").innerHTML = `<button class="btn btn-secondary material-icons user icon" style="position:absolute;bottom:15px;right:15px;" id="options-btn-html">settings</button>`;
        arrayCheck();
        return settingsMenu();
    }

    document.getElementById("account_type").innerHTML = `<h1>Prince527's MC launcher <span class="badge bg-warning text-dark">Offline</span></h1>`;
    document.getElementById("options-btn-html-div").innerHTML = `<button class="btn btn-secondary material-icons user icon" style="position:absolute;bottom:15px;right:15px;" id="options-btn-html">settings</button>`;
    arrayCheck();
    return settingsMenu();
}

resetHTML();

async function java17() {

    if (await fs.existsSync(`${__dirname}/assets/java/java17`)) return resetHTML();
    if (await hasData('java17', `${process.env.APPDATA}/Prince527's MC Launcher/settings`)) return resetHTML();
    // set html
    document.getElementById("account_type").innerHTML = `<h1>Java 17 setup</h1><button type="button" class="btn btn-secondary btn-lg" id="java17-auto">Automatic</button><button type="button" class="btn btn-secondary btn-lg" id="java17-manuel">Manuel</button>`
    document.getElementById("dropdown-select-html").innerHTML = "";
    document.getElementById("options-btn-html-div").innerHTML = "";

    document.getElementById("java17-auto").addEventListener("click", async () => {
        // set html
        document.getElementById("account_type").innerHTML = `<h1>Downloading required files</h1>`

        // save db
        await setData('java17', `${process.env.APPDATA}/Prince527's MC Launcher/settings`, {
            "path": "auto"
        });

        // download java from internet
        const dl = new DownloaderHelper(`https://github.com/Prince527GitHub/Prince527-MC-launcher/blob/web/assets/java/java17.7z?raw=true`, `${__dirname}/assets/java`);

        dl.on('end', () => {
            console.log('Download is done');

            // extract 7zip file
            _7z.unpack(`${__dirname}/assets/java/java17.7z`, `${__dirname}/assets/java/`, err => {
                if (err) return console.log(err);
                if (!err) {
                    console.log('7z unpack done');

                    fs.unlink(`${__dirname}/assets/java/java17.7z`, (err) => {
                        if (err) return console.log(err);
                        console.log("7zip is deleted.");

                        // rest html
                        resetHTML();
                    });
                }
            });
        })
        dl.start();
    });

    document.getElementById("java17-manuel").addEventListener("click", async function () {
        const file = await ipcRenderer.invoke('open-file-java');
        if (file === null) return MCsetup();
        await setData('java17', `${process.env.APPDATA}/Prince527's MC Launcher/settings`, {
            "path": String(file)
        });

        // rest html
        resetHTML();
    });
}

async function MCsetup() {
    // Hide Launcher While Playing or Close
    if (!await hasData('hide-close', `${process.env.APPDATA}/Prince527's MC Launcher/settings`)) {
        await setData('hide-close', `${process.env.APPDATA}/Prince527's MC Launcher/settings`, {
            "option": false
        });
    }

    // Hide Launcher While Playing or Close
    if (!await hasData('rpc', `${process.env.APPDATA}/Prince527's MC Launcher/settings`)) {
        await setData('rpc', `${process.env.APPDATA}/Prince527's MC Launcher/settings`, {
            "option": false
        });
    }

    // public & private key
    if (!await hasData('key', `${process.env.APPDATA}/Prince527's MC Launcher/settings/`)) {
        // set html
        document.getElementById("account_type").innerHTML = `<h1>Downloading required files</h1>`
        document.getElementById("dropdown-select-html").innerHTML = "";
        document.getElementById("options-btn-html-div").innerHTML = "";

        console.log("Public file does not exsit.");
        const keys = QuickEncrypt.generate(2048);
        await setData('key', `${process.env.APPDATA}/Prince527's MC Launcher/settings/`, JSON.stringify(keys));
    }

    // check if log4patcher is installed
    if (!await fs.existsSync(`${__dirname}/assets/java/Log4jPatcher.jar`)) {
        if (updateOnlineStatus() !== 'online') {
            toast("Please connect to the internet", "Log4jPatcher not found", "Just now");
            return resetHTML();
        }

        const dl = new DownloaderHelper('https://prince527github.github.io/Prince527-MC-launcher/assets/java/Log4jPatcher.jar', `${__dirname}/assets/java`);

        dl.on('end', () => console.log('Download Completed'))
        dl.start();
    }

    // check if forge is installed
    // download forge from github
    if (!fs.existsSync(`${__dirname}/assets/java/forge.jar`)) {
        if (updateOnlineStatus() !== 'online') {
            toast("Please connect to the internet", "Forge not found", "Just now");
            return resetHTML();
        }

        // set html
        document.getElementById("account_type").innerHTML = `<h1>Downloading required files</h1>`
        document.getElementById("dropdown-select-html").innerHTML = "";
        document.getElementById("options-btn-html-div").innerHTML = "";

        const dl = new DownloaderHelper('https://prince527github.github.io/Prince527-MC-launcher/assets/java/forge.jar', `${__dirname}/assets/java`);

        dl.on('end', () => console.log('Download Completed'))
        dl.start();
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
        if (await hasData('java', `${process.env.APPDATA}/Prince527's MC Launcher/settings`)) return resetHTML();

        if (updateOnlineStatus() !== 'online') {
            toast("Please connect to the internet", "Java not found", "Just now");
            return resetHTML();
        }

        // set html
        document.getElementById("account_type").innerHTML = `<h1>Java 8 setup</h1><button type="button" class="btn btn-secondary btn-lg" id="java-auto">Automatic</button><button type="button" class="btn btn-secondary btn-lg" id="java-manuel">Manuel</button>`
        document.getElementById("dropdown-select-html").innerHTML = "";
        document.getElementById("options-btn-html-div").innerHTML = "";

        document.getElementById("java-auto").addEventListener("click", async function () {
            // set html
            document.getElementById("account_type").innerHTML = `<h1>Downloading required files</h1>`

            // save db
            await setData('java', `${process.env.APPDATA}/Prince527's MC Launcher/settings`, {
                "path": "auto"
            });

            // download java from internet
            const dl = new DownloaderHelper(`https://prince527github.github.io/Prince527-MC-launcher/assets/java/${arch}x.7z`, `${__dirname}/assets/java`);

            dl.on('end', () => {
                console.log('Download is done');

                // extract 7zip file
                _7z.unpack(`${__dirname}/assets/java/${arch}x.7z`, `${__dirname}/assets/java/`, err => {
                    if (err) return console.log(err);
                    if (!err) {
                        console.log('7z unpack done');

                        fs.unlink(`${__dirname}/assets/java/${arch}x.7z`, (err) => {
                            if (err) return console.log(err);
                            console.log("7zip is deleted.");

                            // java 17 menu
                            java17();
                        });
                    }
                });
            })
            dl.start();
        });

        document.getElementById("java-manuel").addEventListener("click", async function () {
            const file = await ipcRenderer.invoke('open-file-java');
            if (file === null) return MCsetup();
            await setData('java', `${process.env.APPDATA}/Prince527's MC Launcher/settings`, {
                "path": String(file)
            });

            // java 17 menu
            await java17();
        });
    } else return await java17();
}

MCsetup();

// database
async function getData(id, path) {
    if (fs.existsSync(`${path}/${id}.json`)) {
        return JSON.parse(fs.readFileSync(`${path}/${id}.json`, 'utf8'));
    }
}

async function setData(id, path, data) {
    if (!fs.existsSync(path)) await fs.mkdirSync(path, {
        recursive: true
    });
    if (fs.existsSync(path)) {
        return fs.writeFileSync(`${path}/${id}.json`, JSON.stringify(data));
    }
}

async function hasData(id, path) {
    return fs.existsSync(`${path}/${id}.json`);
}

async function removeData(id, path) {
    if (fs.existsSync(`${path}/${id}.json`)) {
        return fs.unlinkSync(`${path}/${id}.json`);
    }
}