/**
 * Filename: init.ts
 * Author: Soulaymen Chouri
 * Date: 2023-2024
 *
 * Description:
 *     API for typec init command
 *
 * Type-C Compiler, Copyright (c) 2023-2024 Soulaymen Chouri. All rights reserved.
 * This file is licensed under the terms described in the LICENSE.md.
 */


import fs from "fs";
import path from "path";
import {
    checkForStdLibUpdate,
    downloadAndInstallStdLib,
    stdlibExists,
} from "./stdlib";

export async function initProject(folder: string) {
    const folderPath = path.resolve(folder);

    // Check if the folder already exists
    if (fs.existsSync(folderPath)) {
        // Check if the folder is empty
        const isEmpty = fs.readdirSync(folderPath).length === 0;
        if (!isEmpty) {
            console.error(
                `Error: The folder '${folderPath}' is not empty. Aborting project initialization.`,
            );
            process.exit(1);
        }
    } else {
        // Create the folder recursively if it does not exist
        fs.mkdirSync(folderPath, { recursive: true });
    }

    // Check if the standard library is installed
    if (!stdlibExists()) {
        console.log("Standard library not found. Installing...");
        await downloadAndInstallStdLib();
    } else {
        console.log("Standard library found.");
        checkForStdLibUpdate();
    }

    // Folder is either newly created or empty, proceed with initialization
    let folderName = path.basename(folderPath);

    // Create 'module.json' with the specified contents
    let moduleContent = {
        name: folderName,
        version: "1.0.0",
        author: "Your Name",
        dependencies: [],
        description: "Generated by Type-C CLI",
        compiler: {
            target: "runnable",
            entry: "main.tc",
        },
    };

    fs.writeFileSync(
        path.join(folderPath, "module.json"),
        JSON.stringify(moduleContent, null, 2), // Pretty print JSON
        "utf-8",
    );

    // Create 'main.tc' with the default content
    const mainTcContent = `from std.string import String
from std.io import println

fn main() -> u32 {
   println("hello, world!")
   return 0
}`;
    fs.writeFileSync(
        path.join(folderPath, "main.tc"),
        mainTcContent.trim(),
        "utf-8",
    );

    console.log(`Initialized a new project in: ${folderPath}`);
}
