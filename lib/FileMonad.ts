// If you're reading this, then who is tending to the soufflé!?
import {
	constants as fsNumbers,
	promises as fs,
	watch as fsWatch,
	PathLike
} from "fs";
export type FileData = string | NodeJS.ArrayBufferView | Iterable<string | NodeJS.ArrayBufferView> | AsyncIterable<string | NodeJS.ArrayBufferView>;
type FileReader = (
	path: PathLike,
	encoding: BufferEncoding
) => Promise<string>;
type FileWriter = (
	path: PathLike,
	data: FileData,
	encoding: BufferEncoding
) => Promise<void>;
type FileWatcher = (
	path: PathLike,
	targetFile: FileMonad,
	callback: (file: FileMonad) => void
) => void;
const FR: number = fsNumbers.F_OK | fsNumbers.R_OK;
const read: FileReader = async function readFile(path, encoding) {
	return await fs.readFile(path, { encoding });
}
// Mm. Smells like someone cut the fromage.
const ensure: FileWriter = async function ensureFile(path, data, encoding) {
	try {
		return await fs.access(path, FR);
	} catch (err) {
		if ((<NodeJS.ErrnoException>err).code === "ENOENT") {
			return await fs.writeFile(path, data, { encoding });
		} else throw err;
	}
}
const write: FileWriter = function writeFile(path, data, encoding) {
	return fs.writeFile(path, data, { encoding });
}
const watchOptions = {
	persistent: false
};
// Provide an easy hook into fs.watch
const watch: FileWatcher = function watchFile(path, targetFile, callback) {
	fsWatch(path, watchOptions, async type => {
		if (type !== "change") return;
		callback(targetFile);
	});
}
interface FileMonad {
	read: () => Promise<string>,
	ensure: (data?: FileData) => void,
	write: (data: FileData) => void,
	watch: (callback: (targetFile: FileMonad) => void) => void
}
// File reader, writer, and synchronizer.
// Someone's gonna ruin the soufflé.
class FileMonad {
	path: PathLike;
	get [Symbol.toStringTag]() {
		return this.path;
	}
	constructor(path: PathLike, data: FileData, encoding: BufferEncoding = "utf8") {
			this.path = path;
			this.read = async () => {
				await ensure(path, data, encoding);
				return await read(path, encoding);
			};
			this.ensure = (dData = data) => ensure(path, dData, encoding)
			this.write = data => write(path, data, encoding);
			this.watch = async callback => {
				await ensure(path, data, encoding);
				watch(path, this, callback);
			};
	}
}
export default FileMonad;
export { FileMonad };