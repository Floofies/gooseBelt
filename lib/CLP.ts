// Reactor Dispatcher for Command Line Processing
type Command = string;
type Operand = string;
type Output = string | void | Promise<string | void>;
type Executor = (...operands: Operand[]) => Output;
type OpsArray = Array<any>;
type ArgsArray = Array<Operand>;
// Executor arguments are keyed with command strings mapped to operand lists.
interface ArgsInitializer {
	[key: Command]: ArgsArray
}
// Reactor object is keyed with command strings mapped to executor callbacks.
interface Reactor {
	[key: Command]: Executor
}
interface Dispatcher {
	executors: Reactor,
	args: ArgsInitializer,
}
// Guns don’t kill mutants, I kill mutants.
function missingOps(operands: ArgsArray) {
	return () => `Command is missing input operands: "${operands.join(`", "`)}"`;
}
function invalidCmd(command: Command) {
	return () => `Command not recognized: "${String(command)}"`
}
const _noCmd = () => `No command was given.`
function noCmd() {
	return _noCmd;
}
class Dispatcher {
	constructor(init?: Reactor, args?: ArgsInitializer) {
		this.executors = {};
		this.args = {};
		this.add(init, args);
	}
	add(init: Reactor, args?: ArgsInitializer): void {
		for (const cmdStr in init)
			if (args && cmdStr in args)
				this.addCommand(cmdStr, init[cmdStr], args[cmdStr]);
			else
				this.addCommand(cmdStr, init[cmdStr])
	}
	addCommand(cmdStr: Command, executor: Executor, args?: ArgsArray): void {
		this.executors[cmdStr] = executor;
		if (Array.isArray(args) && args.length)
			this.args[cmdStr] = args;
		else
			this.args[cmdStr] = [];
	}
	// Find a matching executor for a given command:
	parse(command: Command, operands: OpsArray): Executor {
		if (!command)
			if ("_default" in this.executors)
				return this.executors._default;
			else return noCmd();
		if (!(command in this.executors))
			return invalidCmd(command);
		const expOps = this.args[command];
		if (expOps.length) {
			if (!operands.length)
				return missingOps(expOps);
			if (operands.length !== expOps.length) {
				const missing = expOps.slice(operands.length - 1, this.args[command].length - 1);
				const required = missing.filter(op => op[op.length - 1] !== "?");
				if (required.length)
					return missingOps(required);
			}
		}
		return this.executors[command];
	}
	// Execute a command immediately or return "false" if no executor:
	async exec(command: Command, ...operands: Array<Operand>): Promise<string | void> {
		const executor = this.parse(command, operands);
		return await executor(...operands);
	}
}
export default Dispatcher;