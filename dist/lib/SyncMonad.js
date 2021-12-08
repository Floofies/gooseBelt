import { StateMonad } from "./StateMonad.js";
// State monad which synchronizes with a file monad
class SyncMonad extends StateMonad {
    constructor(file, init) {
        super(init instanceof StateMonad ? init.getState() : init);
        this.syncState = async () => {
            this.setState(await file.read());
        };
        // Synchronize with the monad
        file.watch(this.syncState);
    }
}
export default SyncMonad;
