require('uaup-js').Update({
    useGithub: true,
    gitRepo: "Prince527-MC-launcher",
    gitUsername: "Prince527GitHub",
    appName: "Prince527-MC-launcher",
    appExecutableName: "Prince527's MC Launcher.exe",
    progressBar: document.getElementById("progress"),
    label: document.getElementById("label"),
    stageTitles: {
        Checking: "Checking For Updates!",
        Found: "Update Found!",
        NotFound: "No Update Found.",
        Downloading: "Downloading...",
        Unzipping: "Installing...",
        Cleaning: "Finalizing...",
        Launch: "Launching..."
    }
});