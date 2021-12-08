#!/usr/bin/env node
// SMS Alert Agent for ITWatchDogs MicroGoose
// Pop quiz: What is the sound made by a goose?
// Answer: Various loud honks, barks, and cackles. Also some hisses.
// The MicroGoose happens to speak XML, which sounds quite similar.
import xmlParser from "xml-js";
import FileMonad from "./lib/FileMonad.js";
import SyncMonad from "./lib/SyncMonad.js";
const isProd: boolean = process.env.NODE_ENV === "production";
const isTTY: boolean = process.stdout.isTTY;
const confPath: string = process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'] + "/.flock.json";
const smsURL: string = "https://textbelt.com/text";
// Looks like cleanup on Aisle Four.
class HTTPError extends Error {
	constructor (message: string | Error) {
		if (message instanceof Error) super(message.message);
		else super(message);
		this.name = "HTTPError";
	}
}
interface FetchOpts {
	method?: string,
	headers?: HeadersInit,
	body?: string
};
async function httpFetch(url: string, opts?: FetchOpts): Promise<Response> {
	try {
		const res: Response = await fetch(url, opts);
		// Throw an error if the HTTP Response is not acceptable.
		if (!res.ok)
			throw new HTTPError(`${res.status} ${res.statusText}`);
		return res;
	} catch (err) {
		throw new HTTPError((<Error>err).message);
	}
}
interface SmsOpts {
	key?: string,
	phone?: string,
	message: string
}
// Send a HTTP POST request to the TextBelt API.
function httpSms(message: string) {
	const smsOpts: SmsOpts = {
		key: process.env.smsKey,
		phone: process.env.smsNum,
		message: message,
	};
	const httpOpts: FetchOpts = {
		method: "post",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(smsOpts)
	};
	return httpFetch(smsURL, httpOpts);
}
async function notify(message: string) {
	if (!isProd && isTTY) console.log(message);
	try {
		await httpSms(message);
	} catch (err) {
		console.error(err);
	}
}
type Alarm = xmlParser.Attributes;
function alarmToString(alarm: Alarm) {
	return <string> [
		alarm["alarm-num"],
		alarm["device-id"],
		alarm.field,
		alarm.limtype,
		alarm.limit,
		alarm.delay,
		alarm.repeat,
		alarm.email,
		alarm.actions
	].join("");
}
interface GooseData {
	server: {
		devices: {
			device: any
		},
		alarms: {
			alarm: any
		},
	}
}
// Poll one goose at a time
const parserOptions = { compact: true };
async function pollGoose(host: string) {
	// It speaks to us... That's one smart goose.
	const res = await httpFetch("http://" + host + "/data.xml");
	// This goose speaks XML, so we'll convert it to a JS object tree.
	// "No way. Not possible," they said. But it's true.
	const gooseData = <xmlParser.ElementCompact> xmlParser.xml2js(await res.text(), parserOptions);
	// It's climate data and alarm data!
	const data = {
		devices: <Array<xmlParser.ElementCompact>> gooseData.server.devices.device,
		alarms: <Array<xmlParser.ElementCompact>> gooseData.server.alarms.alarm
	};
	if (!Array.isArray(data.alarms)) data.alarms = [data.alarms];
	if (!Array.isArray(data.devices)) data.devices = [data.devices];
	return data;
}
export interface Configuration {
	pollrate: number,
	devices: {
		[key: string]: string
	}
}
export const defaultConfig: Configuration = {
	pollrate: 300,
	devices: {}
};
// Hello! Come, come and bring your goose, and read with me.
export async function agent() {
	// There is a configuration file, .flock.json.
	// It will be inside the current user's home/userprofile folder.
	// We will safely synchronize configuration with filesystem via a JSON state monad.
	const confFile = new FileMonad(confPath, JSON.stringify(defaultConfig))
	const state = new SyncMonad(confFile);
	await state.syncState();
	// The active Set records all currently tripped alarms as unique strings!
	// Important to remember: The user might change the alarms mid-flight!
	const active: Set<string> = new Set();
	// poller sends 1 HTTP request to each MicroGoose device,
	// and it expects XML in the responses.
	(async function poller() {
		// Get the most recent version of the configuration file.
		const config = JSON.parse(state.getState());
		for (const gooseName in config.devices) try {
			const host = <string> config.devices[gooseName];
			const data = await pollGoose(host);
			for (const node of data.alarms) {
				// Let's break these out for each alarm.
				const alarm = <Alarm> node._attributes;
				// Network topology is not known. Be careful.
				const device = data.devices.find(device => device.id === alarm["device-id"]);
				if (!device) continue;
				// TODO: Innards of device could all be undefined:
				// Here be dragons
				// We serialize the alarm into a unique string.
				const alarmStr = alarmToString(alarm);
				// We correlate the alarm with the device's climate data.
				const curField = device.field.find((field: xmlParser.ElementCompact) => field._attributes.key === alarm.field)._attributes;
				// What is the name of your goose?
				const nickname = `MicroGoose ${gooseName}`;
				// We now have a description of an alarm, a sensor, and untripped/tripped status.
				const statusStr = `${alarm.limtype} ${curField.niceName}꞉ ${curField.value} ⁄ ${alarm.limit}`;
				const tripped = alarm.status === "Tripped";
				if (active.has(alarmStr)) {
					// The alarm is in the active Set.
					// If the alarm is still in tripped state,
					// then the user was already notified.
					// Avoid double-notification.
					// TODO: Maybe make this tweakable..
					if (tripped) continue;
					// The alarm changed to untripped status.
					// Remove it from active, and notify the user.
					active.delete(alarmStr);
					notify(`✅CLEAR✅${nickname} UNTRIPPED ${statusStr}`);
				} else if (tripped) {
					// The alarm was not in tripped status before, but is now,
					// add it to active, and notify the user.
					active.add(alarmStr);
					notify(`⚠️ALERT⚠️${nickname} TRIPPED ${statusStr}`);
				}
			}
		} catch (err) {
			console.error(err);
		}
		// Convert user's pollrate/seconds to miliseconds.
		// Set timer for next HTTP poller attempt.
		setTimeout(poller, config.pollrate * 1000);
	})();
};