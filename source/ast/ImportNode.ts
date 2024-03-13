import {SymbolLocation} from "./symbol/SymbolLocation";


export class ImportNode {
    /**
     * The path to the file to import.
     * for example: std.io.console
     * [std, io, console]
     */
    basePath: string[];

    /**
     * The alias for the import.
     * for example: std.io.console as Console
     * [Console]
     */
    alias: string;

    /**
     * The actual name of the import.
     * for example: std.io.console as Console
     * [console]
     */
    actualName: string;

    location: SymbolLocation;

    constructor(location: SymbolLocation, basePath: string[], alias: string, actualName: string) {
        this.location = location;
        this.basePath = basePath;
        this.alias = alias;
        this.actualName = actualName;
    }
}