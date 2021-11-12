#!/usr/bin/env node
// SMS Alert Agent for ITWatchDogs MicroGoose
const fetch = require("node-fetch");
const xmlParser = require("xml-js");
const StateMonad = require("./lib/StateMonad.js");
const isProd = process.env.NODE_ENV === "production";
const isTTY = process.stdout.isTTY;
const parserOptions = { compact: true };
const confPath = process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'] + "/.flock.json";
const defaultConfig = {
	pollrate: 300,
	devices: {}
};
const smsURL = "https://textbelt.com/text";
// Convert XML into a JS object.
function parseXml(xml) {
	// Pop quiz: What is the sound made by a goose?
	// Answer: Various loud honks, barks, and cackles. Also some hisses.
	// The MicroGoose happens to speak XML, which sounds quite similar.
	return xmlParser.xml2js(xml, parserOptions);
}
// Throw an error if the HTTP Response is not acceptable.
function httpCheck(res) {
	if (!res.ok)
		throw new Error(`HTTP Error: ${res.status} ${res.statusText}`);
	return res;
}
// Create and send a HTTP GET request.
async function httpGet(url) {
	return httpCheck(await fetch("http://" + url));
}
// Create and send a HTTP POST request and attached body data.
async function httpPost(url, data, type) {
	return httpCheck(await fetch(smsURL, {
		method: "post",
		headers: { "Content-Type": type },
		body: data
	}));
}
// Create and send a HTTP POST request to the TextBelt API.
function httpSms(message) {
	const smsOpts = JSON.stringify({
		phone: process.env.smsNum,
		message: message,
		key: process.env.smsKey
	});
	return httpPost(smsURL, smsOpts, "application/json");
}
// Create and send a HTTP GET request. Convert the Response data into an object.
async function httpXml(host) {
	const res = await httpGet(host + "/data.xml");
	return parseXml(await res.text());
}
async function notify(message) {
	if (!isProd && isTTY) console.log(message);
	try {
		await httpSms(message);
	} catch (err) {
		console.error(err);
	}
}
function alarmToString(alarm) {
	return [
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
// Hello! Come, come and bring your goose, and read with me.
(async function agent() {
	// There is a configuration file, .flock.json.
	// It will be inside the current user's home/userprofile folder.
	// We will safely read/write our configuration to disk via a JSON state monad.
	const state = await new StateMonad(confPath, defaultConfig);
	// The active Set records all currently tripped alarms as unique strings!
	// Important to remember! The user might change the alarms mid-flight!
	const active = new Set();
	// poller sends 1 HTTP request to each MicroGoose device,
	// and it expects XML in the responses.
	(async function poller() {
		// Get the most recent version of the configuration file.
		const config = await state.getState();
		for (const gooseName in config.devices) try {
			const host = config.devices[gooseName];
			// It speaks to us... That's one smart goose.
			const honker = await httpXml(host);
			// Honk!?
			// It's climate data and alarm data!
			const data = {
				devices: honker.server.devices.device,
				alarms: honker.server.alarms.alarm
			};
			if (!Array.isArray(data.alarms)) data.alarms = [data.alarms];
			for (const node of data.alarms) {
				// Let's break these out for each alarm.
				const alarm = node._attributes;
				// Network topology is not known. Be careful.
				const device = Array.isArray(data.devices) ? data.devices.find(device => device.id === alarm["device-id"]) : data.devices;
				// We serialize the alarm into a unique string.
				const alarmStr = alarmToString(alarm);
				// We correlate the alarm with the device's climate data.
				const curField = device.field.find(field => field._attributes.key === alarm.field)._attributes;
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
		// Convert user's seconds to miliseconds.
		// Set timer for next HTTP poller attempt.
		setTimeout(poller, config.pollrate * 1000);
	})();
})();