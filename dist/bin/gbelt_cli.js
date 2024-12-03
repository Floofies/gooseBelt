#!/usr/bin/env node
import FileMonad from "../lib/FileMonad.js";
import CommandProcessor from "../lib/CLP.js";
import { defaultConfig } from "../index.js";
const helpString = [
    "Goose Belt CLI syntax:",
    "\t$ gbelt <command> <...operands>",
    "Commands:",
    "List all devices:\n\tlist",
    "Set polling interval:\n\tpoll <seconds>",
    "Add a device:\n\tadd <nickname> <host>",
    "Remove a device:\n\tremove <nickname>"
].join("\n");
const confPath = process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'] + "/.flock.json";
function missingOp() {
    process.exitCode = 1;
    return "Missing input operand";
}
async function cliReactor() {
    const configFile = await new FileMonad(confPath, JSON.stringify(defaultConfig));
    const config = JSON.parse(await configFile.read());
    const reactor = {
        _default: () => {
            return helpString;
        },
        help: () => {
            return helpString;
        },
        list: (nickname) => {
            return "HTTP polling interval: " + config.pollrate + " seconds.";
            // TODO: console.table(config.devices);
        },
        poll: async (pollrate) => {
            config.pollrate = Number(pollrate);
            await configFile.write(config);
        },
        add: async (nickname, host) => {
            config.devices[nickname] = host;
            await configFile.write(config);
        },
        remove: async (nickname) => {
            if (delete config.devices[nickname])
                await configFile.write(config);
        }
    };
    const args = {
        list: ["nickname?"],
        poll: ["pollrate"],
        add: ["nickname", "host"],
        remove: ["nickname"]
    };
    // Read/write to the configuration file via the command-line
    const cli = new CommandProcessor(reactor, args);
    const output = await cli.exec(process.argv[2], process.argv[3], process.argv[4]) ?? "\n";
    process.stdout.write(output);
}
