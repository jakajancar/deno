import Dirent from "./_fs_dirent.ts";

export default class Dir {
  private dirPath: string | Uint8Array;
  private syncIterator!: Iterator<Deno.DirEntry> | null;
  private asyncIterator!: AsyncIterator<Deno.DirEntry> | null;

  constructor(path: string | Uint8Array) {
    this.dirPath = path;
  }

  get path(): string {
    if (this.dirPath instanceof Uint8Array) {
      return new TextDecoder().decode(this.dirPath);
    }
    return this.dirPath;
  }

  read(callback?: Function): Promise<Dirent | null> {
    return new Promise(async (resolve, reject) => {
      try {
        if (!this.asyncIterator) {
          this.asyncIterator = Deno.readdir(this.path)[Symbol.asyncIterator]();
        }

        const result: Dirent | null = await (await this.asyncIterator?.next())
          .value;
        resolve(result ? result : null);

        if (callback) {
          callback(null, result ? result : null);
        }
      } catch (err) {
        if (callback) {
          callback(err, null);
        }
        reject(err);
      }
    });
  }

  readSync(): Dirent | null {
    if (!this.syncIterator) {
      this.syncIterator = Deno.readdirSync(this.path)![Symbol.iterator]();
    }

    const file: Deno.DirEntry = this.syncIterator.next().value;

    return file ? new Dirent(file) : null;
  }

  /**
   * Unlike Node, Deno does not require managing resource ids for reading
   * directories, and therefore does not need to close directories when
   * finished reading.
   */
  close(callback?: Function): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (callback) {
          callback(null);
        }
        resolve();
      } catch (err) {
        if (callback) {
          callback(err);
        }
        reject(err);
      }
    });
  }

  /**
   * Unlike Node, Deno does not require managing resource ids for reading
   * directories, and therefore does not need to close directories when
   * finished reading
   */
  closeSync(): void {
    //No op
  }

  async *[Symbol.asyncIterator](): AsyncIterableIterator<Dirent> {
    try {
      while (true) {
        const dirent: Dirent | null = await this.read();
        if (dirent === null) {
          break;
        }
        yield dirent;
      }
    } finally {
      await this.close();
    }
  }
}
