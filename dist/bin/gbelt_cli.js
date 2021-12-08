#!/usr/bin/env node
import FileMonad from "../lib/FileMonad";
import CommandProcessor from "../lib/CLP";
import { defaultConfig } from "../index";
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
/*
async function clp(command, op1, op2) {
    const configFile = await new FileMonad(confPath, JSON.stringify(defaultConfig));
    const config = JSON.parse(await configFile.read());
    if (!command) return helpString;
    else if (command === "list") {
        return "HTTP polling interval: " + config.pollrate + " seconds.";
        // TODO: console.table(config.devices);
    } else if (command === "poll") {
        if (!op1) return missingOp();
        config.pollrate = op1;
        await configFile.write(config);
    } else if (command === "add") {
        if (!op1 || !op2) return missingOp();
        config.devices[op1] = op2;
        await configFile.write(confPath, config);
    } else if (command === "remove") {
        if (!op1) return missingOp();
        if (delete config.devices[op1])
            await configFile.write(confPath, config);
    } else {
        process.exitCode = 1;
        return `Unrecognized command \"${command}\".`;
    }
}*/ 
