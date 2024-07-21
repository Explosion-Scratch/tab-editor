export const REGEX = {
    timeSignature: /(?<beats>[0-9]+)\/(?<note>[0-9]+)/i,
    get(key) {
        if (!this[key]) {
            throw new Error(`The key ${key} doesn't exist in REGEX`)
        }
        return this[key].toString().slice(1).split('/')[0]
    },
    gen(key, modifiers) {
        if (!this[key]) {
            throw new Error(`The key ${key} doesn't exist in REGEX`)
        }
        return new RegExp(this.get(key), modifiers)
    }
}
