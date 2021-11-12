#!/usr/bin/env node
// JSON file reader/writer class.
const fileSystem = require("fs");
const fs = fileSystem.promises;
const FR = fileSystem.constants.F_OK | fileSystem.constants.R_OK;
// Read JSON from disk as JS object.
async function readDisk(path) {
	return JSON.parse(await fs.readFile(path, { encoding: "utf8" }));
}
// Write JS object to disk as JSON.
function writeDisk(path, state) {
	return fs.writeFile(path, JSON.stringify(state));
}
// Watch JSON on disk and synchonize with monad when changes occur.
function watchDisk(path, monad) {
	fileSystem.watch(path, { persistent: false }, async type => {
		if (type !== "change") return;
		monad.setState(await readDisk(path));
	});
}
// Attempt to access JSON on disk or create it if it's missing.
async function checkDisk(path, defaultState) {
	try {
		await fs.access(path, FR);
	} catch (err) {
		if (err.code === "ENOENT")
			await fs.writeFile(path, JSON.stringify(defaultState));
		else throw err;
	}
}
// StateMonad performs the data furnishing operations of the application.
// Data is managed/swapped here safely, and it will not change it internally.
class StateMonad {
	constructor(path, defaultState) {
		var state = defaultState;
		this.getState = function () {
			return state;
		};
		this.setState = function (newState) {
			state = newState;
		};
		return (async () => {
			await checkDisk(path, defaultState);
			state = await readDisk(path);
			watchDisk(path, this);
			return this;
		})();
	}
	static checkDisk = checkDisk;
	static readDisk = readDisk;
	static writeDisk = writeDisk;
}
module.exports = StateMonad;