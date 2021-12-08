#!/usr/bin/env node
import Dispatcher from "./CLP.js";
import FileMonad from "./FileMonad.js";
import StateMonad from "./StateMonad.js";
import SyncMonad from "./SyncMonad.js";
import { promises as fs, constants as fsNumbers } from "fs";
const FR = fsNumbers.F_OK | fsNumbers.R_OK;
const messages = [];
let failures = 0;
let passes = 0;
function fail(message) {
    failures++;
    messages.push(`FAILED: ${message}`);
}
function pass(message) {
    passes++;
    messages.push(`Passed: ${message}`);
}
async function test(message, testFunc, checkFunc) {
    try {
        const result = await testFunc();
        if (checkFunc(result))
            pass(message);
        else
            fail(`${message}\n\t(Bad result: "${result}")`);
    }
    catch (err) {
        fail(`${message}:\n\tCaused by Error:\n\t${err.toString()}`);
    }
}
async function makeTemp() {
    try {
        await fs.mkdir("./temp");
    }
    catch (err) {
        if (err.code === "EEXIST") {
            await cleanupTemp();
            await fs.mkdir("./temp");
        }
        else
            throw err;
    }
}
async function cleanupTemp() {
    try {
        await fs.rmdir("./temp", { recursive: true });
    }
    catch (err) {
        if (err.code !== "ENOENT")
            process.stdout.write(`Error encountered while cleaning up temp directory:\n\t${err.toString()}\n`);
        else
            throw err;
    }
}
(async () => {
    process.stdout.write("Beginning tests...\n");
    await makeTemp();
    await Promise.allSettled([
        test("Dispatcher Exec 0 Operands", async () => {
            const reactor = {
                "testCommand1": () => "HelloWorld"
            };
            const disp = new Dispatcher(reactor);
            return await disp.exec("testCommand1");
        }, result => result === "HelloWorld"),
        test("Dispatcher Exec 1 Operand", async () => {
            const reactor = {
                "testCommand2": (op1) => `Hello ${op1}`
            };
            const args = {
                "testCommand2": ["Operand1"]
            };
            const disp = new Dispatcher(reactor, args);
            return await disp.exec("testCommand2", "World");
        }, result => result === "Hello World"),
        test("Dispatcher Exec 2 Operands", async () => {
            const reactor = {
                "testCommand3": (op1, op2) => `Hello ${op1} ${op2}`
            };
            const args = {
                "testCommand3": ["Operand1", "Operand2"]
            };
            const disp = new Dispatcher(reactor, args);
            return await disp.exec("testCommand3", "There", "World");
        }, result => result === "Hello There World"),
        test("Dispatcher Exec Missing Operands", async () => {
            const reactor = {
                "testCommand4": (op1) => `Hello ${op1}`
            };
            const args = {
                "testCommand4": ["Operand1", "Operand2"]
            };
            const disp = new Dispatcher(reactor, args);
            return await disp.exec("testCommand4");
        }, result => result === `Command is missing input operands: "Operand1", "Operand2"`),
        test("Dispatcher Exec Invalid Command", async () => {
            const reactor = {
                "testCommand5": () => `HelloWorld`
            };
            const disp = new Dispatcher(reactor);
            return await disp.exec("This Command Does Not Exist");
        }, result => result === `Command not recognized: "This Command Does Not Exist"`),
        test("StateMonad", () => {
            const stateMonad = new StateMonad("HelloWorld2");
            return stateMonad.getState();
        }, result => result === "HelloWorld2"),
        test("FileMonad", async () => {
            const fileMonad = await new FileMonad("./temp/FileMonadTestFile", "HelloWorld1");
            return await fileMonad.read();
        }, result => result === "HelloWorld1"),
        test("SyncMonad", async () => {
            const fileMonad = await new FileMonad("./temp/SyncMonadTestFile", "HelloWorld2");
            const syncMonad = new SyncMonad(fileMonad);
            await syncMonad.syncState();
            return await syncMonad.getState();
        }, result => result === "HelloWorld2")
    ]);
    messages.push(`Tests complete. ${passes} tests passed. ${failures} tests failed.\n`);
    if (failures)
        process.exitCode = 1;
    process.stdout.write(messages.join("\n") + "\n");
    await cleanupTemp();
})();
