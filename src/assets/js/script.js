const { Client, Authenticator } = require('minecraft-launcher-core');
const { DownloaderHelper } = require('node-downloader-helper');
const { ipcRenderer } = require('electron');
const Store = require('electron-store');
const log = require('electron-log');
const _7z = require('7zip-min');
const fs = require('fs');

const store = new Store();

Object.assign(console, log.functions);

const updateOnlineStatus = () => {
    return navigator.onLine ? true : false;
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

async function startMC({ name, version, modded, url }) {

    const safeName = (name.split(".")).join("_");

    // <============= Ram =============>    
    const ram = document.getElementById("ram").value;
    if (modded && name !== version) store.set(`${safeName}-ram`, ram);
    else store.set("general-max", ram);

    // <============= Path =============>
    const path = store.get('path') ? store.get('path') : `${process.env.APPDATA}/Prince527's MC Launcher/minecraft`;

    // <============= Offline =============>
    if (!updateOnlineStatus()) return startMCLauncher({
        url: null,
        name: name,
        ram: ram,
        btn: `${name}-play`,
        auth: Authenticator.getAuth("offline"),
        ver: version,
        modded: modded,
        path: path
    });

    // <============= Login =============>
    const auth = await ipcRenderer.invoke('login');
    if (!auth) return resetHTML();

    startMCLauncher({
        url: await checkVersionMC(name, url, path, safeName),
        name: name,
        ram: ram,
        btn: `${name}-play`,
        auth: auth,
        ver: version,
        modded: modded,
        path: path
    });
}

async function startMCLauncher({ url, name, ram, btn, auth, ver, modded, path }) {

    // <=========> Check if installed <=========>
    if (!updateOnlineStatus() && !fs.existsSync(`${dir}/${name}/`)) {
        toast("The version you are trying to play does not exist!", "Offline", "Just now");
        return resetHTML();
    }

    // <============= Java =============>
    let javaPath = null;

    if (!store.get('java8')) return resetHTML();
    if (!store.get('java17')) return resetHTML();

    const java8 = store.get('java8');
    const java17 = store.get('java17');

    if (!updateOnlineStatus() && java17 === "auto" && !fs.existsSync(`${__dirname}/assets/java/17/java/bin/java.exe`)) {
        toast("Java 17 is not installed!", "Offline", "Just now");
        return resetHTML();
    }

    if (!updateOnlineStatus() && java8 === "auto" && !fs.existsSync(`${__dirname}/assets/java/8/java/bin/java.exe`)) {
        toast("Java 8 is not installed!", "Offline", "Just now");
        return resetHTML();
    }

    if (Number(ver.split(".").join("")) > Number("1165")) java17 === "auto" ? javaPath = `${__dirname}/assets/java/17/java/bin/java.exe` : javaPath = java17;
    else java8 === "auto" ? javaPath = `${__dirname}/assets/java/8/java/bin/java.exe` : javaPath = java8;

    // <============= Modded =============>
    let forge = null;
    let fabric = null;

    const moddedCheck = await checkModded(modded, ver, name, path);
    console.log(moddedCheck);

    forge = moddedCheck.forge;
    fabric = moddedCheck.fabric;

    // <============= Checks =============>
    if (!fs.existsSync(`${path}/${name}`)) fs.mkdirSync(`${path}/${name}`, { recursive: true });

    if (fs.existsSync(`${__dirname}/assets/java/log4jspatcher.jar`) && !fs.existsSync(`${path}/${name}/log4jspatcher.jar`)) fs.copyFileSync(`${__dirname}/assets/java/log4jspatcher.jar`, `${path}/${name}/log4jspatcher.jar`);

    if (!fs.existsSync(`${__dirname}/assets/java/log4jspatcher.jar`)) {
        toast("You don't have Log4jPatcher installed", "Offline", "Just now");
        return resetHTML();
    }

    // <============= Console.log =============>
    console.log(String(url));
    console.log(String(name));
    console.log(String(ram));
    console.log(String(btn));
    console.log(String(auth));
    console.log(String(ver));
    console.log(String(path));
    console.log(String(fabric));
    console.log(String(forge));
    console.log(String(javaPath));

    // <============= Launch =============>
    const launcher = new Client();

    launcher.launch({
        clientPackage: url,
        removePackage: true,
        authorization: auth,
        root: `${path}/${name}`,
        customArgs: [
            "-javaagent:log4jspatcher.jar",
        ],
        customLaunchArgs: [
            "-javaagent:log4jspatcher.jar"
        ],
        version: {
            number: ver,
            type: "release",
            custom: fabric
        },
        forge: forge,
        javaPath: javaPath,
        memory: {
            max: `${ram}G`,
            min: `${ram}G`
        }
    });

    let num = 0;
    launcher.on('data', async(e) => {
        if (num === 1) return;
        document.getElementById(btn).innerHTML = "Running";
        if (store.get('hide-close')) {
            num++;
            ipcRenderer.invoke('hide-app');
            return resetHTML();
        }
        ipcRenderer.invoke('quit-app');
    });

}

async function checkVersionMC(name, url, dir, safeName) {
    if (!url) return null;

    if (!store.get(`${safeName}-version`)) {
        const json = await (await fetch(url)).json();

        store.set(`${safeName}-version`, json.version);

        return json.link;
    } else {
        const json = await (await fetch(url)).json();

        if (json.version !== store.get(`${safeName}-version`)) {
            store.set(`${safeName}-version`, json.version);

            if (dir && fs.existsSync(`${dir}/${name}/mods`)) fs.rmdirSync(`${dir}/${name}/mods`, { recursive: true });

            return json.link;
        } else return null;
    }
}

async function checkModded(modded, version, name, dir) {
    if (modded === "forge") {
        if (!updateOnlineStatus() && !fs.existsSync(`${dir}/${name}/forge.jar`)) {
            toast("You don't have forge installed", "Offline", "Just now");
            return resetHTML();
        }

        if (fs.existsSync(`${dir}/${name}/forge.jar`)) return { forge: `${dir}/${name}/forge.jar`, fabric: null };

        const json = await (await fetch("https://prince527github.github.io/Prince527-MC-launcher/files/modded/forge/forge.json")).json();

        if (!json.versions.includes(version)) return null;

        if (!fs.existsSync(`${dir}/${name}/`)) fs.mkdirSync(`${dir}/${name}`, { recursive: true });

        const dl = new DownloaderHelper(`https://prince527github.github.io/Prince527-MC-launcher/files/modded/forge/${version}/forge.jar`, `${dir}/${name}/`);
        await dl.start();

        return { forge: `${dir}/${name}/forge.jar`, fabric: null };
    } else if (modded === "fabric") {
        if (!updateOnlineStatus() && !fs.existsSync(`${dir}/${name}/versions/fabric.json`)) {
            toast("You don't have forge installed", "Offline", "Just now");
            return resetHTML();
        }

        if (fs.existsSync(`${dir}/${name}/fabric.json`)) return { fabric: "fabric.json", forge: null };

        const json = await (await fetch("https://prince527github.github.io/Prince527-MC-launcher/files/modded/fabric/fabric.json")).json();

        if (!json.versions.includes(version)) return null;

        if (!fs.existsSync(`${dir}/${name}/versions/`)) fs.mkdirSync(`${dir}/${name}/versions/`, { recursive: true });

        const dl = new DownloaderHelper(`https://prince527github.github.io/Prince527-MC-launcher/files/modded/fabric/${version}/fabric.json`, `${dir}/${name}/versions/`);
        await dl.start();

        return { fabric: "fabric.json", forge: null };
    } else return { fabric: null, forge: null };
}

async function btnSetup({ name, version, modded, folder, url }) {
    const safeName = (name.split(".")).join("_");

    document.getElementById("folder-btn-html-div").innerHTML = "";

    // <============= Folder =============>
    if (folder === true) {
        const dir = store.get("path") ? store.get("path") : `${process.env.APPDATA}/Prince527's MC Launcher/minecraft`;
        if (fs.existsSync(`${dir}/${name}`)) document.getElementById("folder-btn-html-div").innerHTML = `<button onclick="openFolder('${dir}/${name}')" class="btn btn-secondary material-icons user icon" style="position:absolute;top:15px;right:15px;" id="folder-btn-html">folder</button>`;
    }

    // <============= UI =============>
    document.getElementById("account_type").innerHTML = `<!-- Title --><h5 class='card-title'>${name} </h5><!-- Ram --><div class='input-container'><i class='material-icons user icon'>memory</i><div class='input-group'><input style='text-align: left;' type='number' class='form-control input-field' id='ram' placeholder='Maximum RAM' min='1' max='10' value='1' required><span class='input-group-text input-group-text-change' id='basic-addon2'>GB</span></div></div><!-- Play button --><button type='submit' class='btn btn-primary' id='${name}-play'>Play</button>`

    // <============= Ram =============>
    const ram = document.getElementById("ram");
    if (url) ram.value = store.get(`${safeName}-ram`) ? store.get(`${safeName}-ram`) : "1";
    else ram.value = store.get("general-ram") ? store.get("general-ram") : "1";

    // <============= Button =============>
    const btn = document.getElementById(`${name}-play`);

    btn.addEventListener("click", () => {
        document.getElementById('dropdown-select-html').innerHTML = "";
        document.getElementById('options-btn-html-div').innerHTML = "";

        btn.classList.add("disabled");

        startMC({ name: name, version: version, modded: modded, url: url });
    });

    if (updateOnlineStatus() && url && store.get(`${safeName}-version`)) {
        const onlineVersion = await (await fetch(url)).json();
        if (onlineVersion.version !== store.get(`${safeName}-version`)) return toast(text, title, "Just now");
    }

}

function toast(message, name, time) {
    document.getElementById("toast-error-set").innerHTML = `<div class="position-fixed bottom-0 end-0 p-3" style="z-index: 11"><div id="liveToast" class="toast hide text-body bg-dark" role="alert" aria-live="assertive" aria-atomic="true"><div class="toast-header"><img src="./assets/image/prince.jpg" class="rounded me-2" alt="img_toast" height="32px" width="32px"><strong class="me-auto" style="color:black;">${name}</strong><small style="color:black;font-size:12px;">${time}</small><button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button></div><div class="toast-body">${message}</div></div></div>`
    const tostID = document.getElementById('liveToast');
    const toast = bootstrap.Toast.getOrCreateInstance(tostID);
    toast.show();
}

let btnClicked;
async function settingsMenu() {
    document.querySelector("#options-btn-html").addEventListener("click", async () => {
        if (btnClicked === "1") {
            btnClicked = "0";
            return resetHTML();
        }
        btnClicked = '1';

        document.getElementById("folder-btn-html-div").innerHTML = "";
        document.getElementById("dropdown-select-html").innerHTML = "";
        document.getElementById("account_type").innerHTML = `<div class="form-check form-switch"><input class="form-check-input" type="checkbox" id="hide-close"><label class="form-check-label" for="hide-close">Hide launcher will playing</label></div><div class="form-check form-switch"><input class="form-check-input" type="checkbox" id="rpc"><label class="form-check-label" for="rpc">Discord integration</label></div><div style="margin-top:5px;" class="btn-group" role="group" aria-label="java"><a href="#" class="btn btn-secondary btn-lg gray-btn active" disabled>Reset</a><a href="#" class="btn btn-secondary btn-lg gray-btn" id="reset-java">Java 8</a><a href="#" class="btn btn-secondary btn-lg gray-btn" id="reset-java17">Java 17</a></div><br><div style="margin-top:5px;" class="btn-group" role="group" aria-label="Basic example"><a class="btn btn-secondary btn-lg gray-btn active" disabled>Game path</a><button type="button" class="btn btn-secondary btn-lg material-icons" id="folder-btn">folder</button><button type="button" class="btn btn-secondary btn-lg material-icons" id="folder-reset-btn">refresh</button></div>`;

        // <============= Hide on start =============>
        const hideClose = document.getElementById("hide-close");

        store.get("hide-close") ? hideClose.checked = true : hideClose.checked = false;

        hideClose.addEventListener('change', () => hideClose.checked ? store.set('hide-close', true) : store.delete('hide-close'));

        // <============= Java 8 reset =============>
        const java8btn = document.getElementById("reset-java");

        java8btn.addEventListener("click", async () => {
            java8btn.disabled = true;

            if (store.get("java8") === "auto") fs.rmdirSync(`${__dirname}/assets/java/8`, { recursive: true });
            store.delete("java8");

            return await MCsetup();
        });

        // <============= Java 17 reset =============>
        const java17btn = document.getElementById("reset-java17");

        java17btn.addEventListener("click", async () => {
            java17btn.disabled = true;

            if (store.get("java17") === "auto") fs.rmdirSync(`${__dirname}/assets/java/17`, { recursive: true });
            store.delete("java17");

            return await MCsetup();
        });

        // <============= Discord RPC =============>
        const rpcCheck = document.getElementById("rpc");

        store.get('rpc') ? rpcCheck.checked = true : rpcCheck.checked = false;

        rpcCheck.addEventListener('change', async function () {
            rpcCheck.checked ? store.set('rpc', true) : store.delete('rpc');

            return toast("Please restart the launcher", "RPC setting changed", "Just now");
        });

        // <============= Path =============>
        const resetFolder = document.getElementById("folder-reset-btn");
        const pathbtn = document.getElementById("folder-btn");

        if (store.get("path")) {
            pathbtn.innerHTML = "folder_off";
            pathbtn.disabled = true;
        } else resetFolder.disabled = true;

        pathbtn.addEventListener("click", async () => {
            const path = await ipcRenderer.invoke('open-folder-dialog');

            if (!path) return settingsMenu();

            if (fs.existsSync(`${process.env.APPDATA}/Prince527's MC Launcher/minecraft`)) fs.unlinkSync(`${process.env.APPDATA}/Prince527's MC Launcher/minecraft`, { recursive: true });

            store.set('path', path);

            for (instance of require(`${__dirname}/assets/json/pack.json`).instances) {
                if (instance.url) store.delete(`${instance.name}-version`);
            }

            resetFolder.disabled = false;
            pathbtn.innerHTML = "folder_off";
            pathbtn.disabled = true;

            return toast("You game path has been changed successfully", "Game path changed", "Just now");
        });

        resetFolder.addEventListener("click", async () => {
            if (!store.get("path")) return settingsMenu();
            store.delete("path");

            pathbtn.innerHTML = "folder";
            pathbtn.disabled = false;

            return toast("You game path has been reset successfully", "Game path reset", "Just now");
        });
    });
}

function resetHTML() {
    document.getElementById("options-btn-html-div").innerHTML = `<button class="btn btn-secondary material-icons user icon" style="position:absolute;bottom:15px;right:15px;" id="options-btn-html">settings</button>`;
    document.getElementById("account_type").innerHTML = `<h1>Prince527's MC launcher</h1>`;
    document.getElementById("dropdown-select-html").innerHTML = "";
    document.getElementById("folder-btn-html-div").innerHTML = "";

    for (instance of require(`${__dirname}/assets/json/pack.json`).instances) {
        document.getElementById("dropdown-select-html").innerHTML += `<a onclick="btnSetup({ name: '${instance.name === null ? '' : instance.name}', version: '${instance.version === null ? '' : instance.version}', modded: '${instance.modded === null ? '' : instance.modded}', folder: ${instance.folder === null ? '' : instance.folder}, url: '${instance.url === null ? '' : instance.url}' })" href="#">${instance.name}</a>`;
    }

    return settingsMenu();
}

resetHTML();

async function java17() {
    if (fs.existsSync(`${__dirname}/assets/java/17/java`) || store.get("java17")) return resetHTML();

    document.getElementById("account_type").innerHTML = `<h1>Java 17 setup</h1><button type="button" class="btn btn-secondary btn-lg" id="java17-auto">Automatic</button><button type="button" class="btn btn-secondary btn-lg" id="java17-manuel">Manuel</button>`
    document.getElementById("dropdown-select-html").innerHTML = "";
    document.getElementById("options-btn-html-div").innerHTML = "";

    document.getElementById("java17-auto").addEventListener("click", async () => {
        document.getElementById("account_type").innerHTML = `<h1>Downloading required files</h1>`

        store.set('java17', "auto");

        if (!fs.existsSync(`${__dirname}/assets/java/17`)) fs.mkdirSync(`${__dirname}/assets/java/17`);

        const dl = new DownloaderHelper("https://prince527github.github.io/Prince527-MC-launcher/files/java/17/java.7z", `${__dirname}/assets/java/17`);

        dl.on('end', () => {
            _7z.unpack(`${__dirname}/assets/java/17/java.7z`, `${__dirname}/assets/java/17/`, err => {
                if (err) return console.log(err);
                if (!err) {
                    fs.unlink(`${__dirname}/assets/java/17/java.7z`, (err) => {
                        if (err) return console.log(err);
                        resetHTML();
                    });
                }
            });
        });
        dl.start();
    });

    document.getElementById("java17-manuel").addEventListener("click", async function () {
        const file = await ipcRenderer.invoke('open-file-java');
        if (file === null) return MCsetup();

        store.set('java17', String(file));

        resetHTML();
    });
}

async function MCsetup() {
    if (!fs.existsSync(`${__dirname}/assets/java/log4jspatcher.jar`)) {
        if (!updateOnlineStatus()) {
            toast("Please connect to the internet", "Log4jPatcher not found", "Just now");
            return resetHTML();
        }

        const dl = new DownloaderHelper('https://prince527github.github.io/Prince527-MC-launcher/files/patch/log4jspatcher.jar', `${__dirname}/assets/java`);

        dl.on('end', () => console.log('Download Completed'));
        dl.start();
    }

    if (!fs.existsSync(`${__dirname}/assets/java/8/java`) || !store.get("java8")) {
        if (!updateOnlineStatus()) {
            toast("Please connect to the internet", "Java not found", "Just now");
            return resetHTML();
        }

        document.getElementById("account_type").innerHTML = `<h1>Java 8 setup</h1><button type="button" class="btn btn-secondary btn-lg" id="java-auto">Automatic</button><button type="button" class="btn btn-secondary btn-lg" id="java-manuel">Manuel</button>`
        document.getElementById("dropdown-select-html").innerHTML = "";
        document.getElementById("options-btn-html-div").innerHTML = "";

        document.getElementById("java-auto").addEventListener("click", async function () {
            document.getElementById("account_type").innerHTML = `<h1>Downloading required files</h1>`

            if (!fs.existsSync(`${__dirname}/assets/java/8`)) fs.mkdirSync(`${__dirname}/assets/java/8`, { recursive: true });

            store.set('java8', "auto");
            const dl = new DownloaderHelper("https://prince527github.github.io/Prince527-MC-launcher/files/java/8/java.7z", `${__dirname}/assets/java/8`);

            dl.on('end', () => {
                _7z.unpack(`${__dirname}/assets/java/8/java.7z`, `${__dirname}/assets/java/8/`, err => {
                    if (err) return console.log(err);
                    if (!err) {
                        fs.unlink(`${__dirname}/assets/java/8/java.7z`, (err) => {
                            if (err) return console.log(err);
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

            store.set('java8', String(file));

            java17();
        });
    } else return java17();
}

MCsetup();

function openFolder(path) {
    require('child_process').exec('start "" "' + path + '"');
}