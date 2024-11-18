import fs from "fs";
import path from "path";
import os from "os";
import { execSync } from "child_process";

const STD_LIB_REPO_URL = "https://github.com/unlimitedsoftwareworks/stdlib";
const STD_LIB_PATH = path.join(os.homedir(), ".typec", "stdlib");
const COMMIT_HASH_FILE = path.join(STD_LIB_PATH, "commit_hash");

export function getStdLibPath(): string {
    return STD_LIB_PATH;
}

export async function downloadAndInstallStdLib() {
    // Create the .typec directory if it doesn't exist
    const typecPath = path.join(os.homedir(), ".typec");
    if (!fs.existsSync(typecPath)) {
        fs.mkdirSync(typecPath, { recursive: true });
    }

    if (!isGitAvailable()) {
        console.error(
            "Error: Git is not available. Please install Git to continue.",
        );
        process.exit(1);
    }

    try {
        console.log("Cloning the standard library...");
        execSync(`git clone ${STD_LIB_REPO_URL} ${STD_LIB_PATH}`, {
            stdio: "inherit",
        });

        // Store the latest commit hash locally
        const latestCommitHash = getLatestCommitHash(STD_LIB_PATH);
        fs.writeFileSync(COMMIT_HASH_FILE, latestCommitHash, "utf-8");

        console.log("Standard library installed successfully.");
    } catch (error) {
        console.error("Error: Failed to clone the standard library.", error);
        process.exit(1);
    }
}

export function isGitAvailable(): boolean {
    try {
        execSync("git --version", { stdio: "ignore" });
        return true;
    } catch (error) {
        return false;
    }
}

export function getLatestCommitHash(repoPath: string): string {
    return execSync("git rev-parse HEAD", { cwd: repoPath }).toString().trim();
}

export function getRemoteLatestCommitHash(repoUrl: string): string {
    try {
        const result = execSync(`git ls-remote ${repoUrl} HEAD`).toString();
        return result.split("\t")[0];
    } catch (error) {
        console.error(
            "Error: Unable to get the latest commit hash from the remote repository.",
            error,
        );
        return "";
    }
}

export function checkForStdLibUpdate() {
    if (!fs.existsSync(COMMIT_HASH_FILE)) {
        console.warn(
            "Warning: Commit hash file not found. You may need to update the standard library.",
        );
        return;
    }

    const localCommitHash = fs.readFileSync(COMMIT_HASH_FILE, "utf-8").trim();
    const remoteCommitHash = getRemoteLatestCommitHash(STD_LIB_REPO_URL);

    if (remoteCommitHash && localCommitHash !== remoteCommitHash) {
        console.warn(
            "Warning: A newer version of the standard library is available. Please update it.\nuse `typec stdlib update` to update the standard library.",
        );
    } else {
        console.log("Standard library is up to date.");
    }
}

export function stdlibExists() {
    return fs.existsSync(STD_LIB_PATH);
}

export function updateStdLib() {
    if (!fs.existsSync(STD_LIB_PATH)) {
        console.error(
            "Error: Standard library not found. Please install it first using 'typec init'.",
        );
        process.exit(1);
    }

    if (!isGitAvailable()) {
        console.error(
            "Error: Git is not available. Please install Git to continue.",
        );
        process.exit(1);
    }

    try {
        console.log("Updating the standard library...");
        execSync(`git pull`, { cwd: STD_LIB_PATH, stdio: "inherit" });

        // Update the commit hash file with the new hash
        const latestCommitHash = getLatestCommitHash(STD_LIB_PATH);
        fs.writeFileSync(COMMIT_HASH_FILE, latestCommitHash, "utf-8");

        console.log("Standard library updated successfully.");
    } catch (error) {
        console.error("Error: Failed to update the standard library.", error);
        process.exit(1);
    }
}
