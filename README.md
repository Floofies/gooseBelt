# Goose Belt

>"Honk softly and carry a big cellphone; your servers will go far."
> - President Theodore Goosevelt

HTTP based SMS alert agent for ITWatchDogs' MicroGoose Climate Monitor device. Sends alerts via the TextBelt REST API: https://textbelt.com

## How-To

To use this software, you must supply a TextBelt API key and a valid 10-digit phone number. See *Environment Variables*

The MicroGoose is unauthenticated because it publicly exposes sensor and alarm data as XML via HTTP at `/data.xml`

It is reccomended to use Goose Belt with an init system (systemd) or process manager (pm2).

### Environment Variables

Two environment variables are required:

- `smsKey` is your TextBelt REST API key.
- `smsNum` is the 10-digit phone number you would like to send alerts to.

### Command-Line Interface

`gbelt` is Goose Belt's CLI-based management script, which can be used to add and remove devices to be monitored.

To use `gbelt` ensure that the NPM package is installed globally by using `-g`.

Using `gbelt add <nickname> <host>`, you can add the nickname and hostname/IP-address of the device(s) to be monitored (polled via HTTP).

A nickname is also useful to differentiate multiple MicroGoose devices, and it is included in the SMS.

*Add a MicroGoose:*
```shell
$ gbelt add MyGoose 192.168.123.123
```

*Remove a MicroGoose:*
```shell
$ gbelt remove 192.168.123.123
```
*Set the HTTP polling rate in seconds:*
```shell
$ gbelt poll 300
```

*List all connected devices:*
```shell
$ gbelt list
```

*Start Goose Belt in your TTY:*
```shell
$ gbelt start
```