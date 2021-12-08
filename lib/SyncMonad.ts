import { FileMonad } from "./FileMonad.js";
import { StateMonad } from "./StateMonad.js";
import { PathLike } from "fs";
interface SyncMonad {
	syncState: () => Promise<void>
}
// State monad which synchronizes with a file monad
class SyncMonad extends StateMonad<string> {
	constructor(file: FileMonad, init?: string | StateMonad<string>) {
		super(init instanceof StateMonad ? init.getState() : init);
		this.syncState = async () => {
			this.setState(await file.read());
		};
		// Synchronize with the monad
		file.watch(this.syncState);
	}
}
export default SyncMonad;