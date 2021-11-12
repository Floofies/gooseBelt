#!/usr/bin/env node
const StateMonad = require("../src/lib/StateMonad.js");
const helpString = [
	"Goose Belt CLI syntax:",
	"\t$ gbelt <command> <...operands>",
	"Commands:",
	"List all devices:\n\tlist",
	"Set polling interval:\n\tpoll <seconds>",
	"Add a device:\n\tadd <nickname> <host>",
	"Remove a device:\n\tremove <nickname>"
];
const confPath = process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'] + "/.flock.json";
const defaultConfig = {
	pollrate: 300,
	devices: []
};
// Read/write to the configuration file via the command-line
async function cli(command, op1, op2) {
	const config = await StateMonad.readDisk(confPath, defaultConfig);
	if (!command) console.log(helpString);
	else if (command === "list")
		console.table(config.devices);
	else if (command === "poll")
		if (!op1) process.exitCode = 1;
		else {
			config.pollrate = op1;
			await StateMonad.writeDisk(confPath, config);
		}
	else if (command === "add")
		if (!op1 || !op2) process.exitCode = 1;
		else {
			config.devices[op1] = op2;
			await StateMonad.writeDisk(confPath, config);
		}
	else if (command === "remove") {
		if (!op1) process.exitCode = 1;
		else if (delete config.devices[op1])
			await StateMonad.writeDisk(confPath, config);
	} else {
		console.error(`Unrecognized command \"${command}\".`);
		process.exitCode = 1;
	}
}
cli(process.argv[2], process.argv[3]);