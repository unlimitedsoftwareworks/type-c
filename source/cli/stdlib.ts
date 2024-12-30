/**
 * Filename: stdlib.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 *
 * Description:
 *     API for typec stdlib command
 *
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */

import { TypeC } from "../compiler";

/**
 * Safe imports for Node.js specific modules
 */
const nodeModules = {
    fs: typeof window === "undefined" ? require("fs") : null,
    path: typeof window === "undefined" ? require("path") : null,
    os: typeof window === "undefined" ? require("os") : null,
    execSync: typeof window === "undefined" ? require("child_process").execSync : null
};

let STD_LIB_REPO_URL = "";
let STD_LIB_PATH = "";
let COMMIT_HASH_FILE = "";

/**
 * Safely imports execSync for Node environments only
 * @returns The execSync function or undefined if in browser
 */
function getExecSync(): typeof import("child_process").execSync | undefined {
    if (typeof window === "undefined") {
        // Node.js environment
        return require("child_process").execSync;
    }
    return undefined;
}

const execSync = getExecSync();

export function initStdLib() {
    if (!nodeModules.path || !nodeModules.os) {
        throw new Error("Standard library initialization requires Node.js environment");
    }
    STD_LIB_REPO_URL = "https://github.com/unlimitedsoftwareworks/stdlib";
    STD_LIB_PATH = nodeModules.path.join(nodeModules.os.homedir(), ".typec", "stdlib");
    COMMIT_HASH_FILE = nodeModules.path.join(STD_LIB_PATH, "commit_hash");
    TypeC.TCCompiler.stdlibDir = STD_LIB_PATH;
}

export function getStdLibPath(): string {
    return STD_LIB_PATH;
}

export async function downloadAndInstallStdLib() {
    if (!nodeModules.fs || !nodeModules.path || !nodeModules.os) {
        throw new Error("Standard library installation requires Node.js environment");
    }

    // Create the .typec directory if it doesn't exist
    const typecPath = nodeModules.path.join(nodeModules.os.homedir(), ".typec");
    if (!nodeModules.fs.existsSync(typecPath)) {
        nodeModules.fs.mkdirSync(typecPath, { recursive: true });
    }

    if (!isGitAvailable()) {
        console.error(
            "Error: Git is not available. Please install Git to continue.",
        );
        process.exit(1);
    }

    try {
        console.log("Cloning the standard library...");
        execSync!(`git clone ${STD_LIB_REPO_URL} ${STD_LIB_PATH}`, {
            stdio: "inherit",
        });

        // Store the latest commit hash locally
        const latestCommitHash = getLatestCommitHash(STD_LIB_PATH);
        nodeModules.fs.writeFileSync(COMMIT_HASH_FILE, latestCommitHash, "utf-8");

        console.log("Standard library installed successfully.");
    } catch (error) {
        console.error("Error: Failed to clone the standard library.", error);
        process.exit(1);
    }
}

export function isGitAvailable(): boolean {
    if (!execSync) {
        return false; // Not in Node environment
    }
    try {
        execSync("git --version", { stdio: "ignore" });
        return true;
    } catch (error) {
        return false;
    }
}

export function getLatestCommitHash(repoPath: string): string {
    if (!execSync) {
        throw new Error("Git operations are only available in Node.js environment");
    }
    return execSync("git rev-parse HEAD", { cwd: repoPath }).toString().trim();
}

export function getRemoteLatestCommitHash(repoUrl: string): string {
    if (!execSync) {
        throw new Error("Git operations are only available in Node.js environment");
    }
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
    if (!nodeModules.fs) {
        throw new Error("Standard library checks require Node.js environment");
    }
    if (!nodeModules.fs.existsSync(COMMIT_HASH_FILE)) {
        console.warn(
            "Warning: Commit hash file not found. You may need to update the standard library.",
        );
        return;
    }

    const localCommitHash = nodeModules.fs.readFileSync(COMMIT_HASH_FILE, "utf-8").trim();
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
    if (!nodeModules.fs) {
        throw new Error("Standard library checks require Node.js environment");
    }
    return nodeModules.fs.existsSync(STD_LIB_PATH);
}

export function updateStdLib() {
    if (!execSync) {
        throw new Error("Git operations are only available in Node.js environment");
    }
    if (!nodeModules.fs) {
        throw new Error("Standard library updates require Node.js environment");
    }
    if (!nodeModules.fs.existsSync(STD_LIB_PATH)) {
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
        nodeModules.fs.writeFileSync(COMMIT_HASH_FILE, latestCommitHash, "utf-8");

        console.log("Standard library updated successfully.");
    } catch (error) {
        console.error("Error: Failed to update the standard library.", error);
        process.exit(1);
    }
}
