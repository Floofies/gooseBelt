// If you're reading this, then who is tending to the soufflé!?
import { constants as fsNumbers, promises as fs, watch as fsWatch } from "fs";
const FR = fsNumbers.F_OK | fsNumbers.R_OK;
const read = async function readFile(path, encoding) {
    return await fs.readFile(path, { encoding });
};
// Mm. Smells like someone cut the fromage.
const ensure = async function ensureFile(path, data, encoding) {
    try {
        return await fs.access(path, FR);
    }
    catch (err) {
        if (err.code === "ENOENT") {
            return await fs.writeFile(path, data, { encoding });
        }
        else
            throw err;
    }
};
const write = function writeFile(path, data, encoding) {
    return fs.writeFile(path, data, { encoding });
};
const watchOptions = {
    persistent: false
};
// Provide an easy hook into fs.watch
const watch = function watchFile(path, targetFile, callback) {
    fsWatch(path, watchOptions, async (type) => {
        if (type !== "change")
            return;
        callback(targetFile);
    });
};
// File reader, writer, and synchronizer.
// Someone's gonna ruin the soufflé.
class FileMonad {
    constructor(path, data, encoding = "utf8") {
        this.path = path;
        this.read = async () => {
            await ensure(path, data, encoding);
            return await read(path, encoding);
        };
        this.ensure = (dData = data) => ensure(path, dData, encoding);
        this.write = data => write(path, data, encoding);
        this.watch = async (callback) => {
            await ensure(path, data, encoding);
            watch(path, this, callback);
        };
    }
    get [Symbol.toStringTag]() {
        return this.path;
    }
}
export default FileMonad;
export { FileMonad };
