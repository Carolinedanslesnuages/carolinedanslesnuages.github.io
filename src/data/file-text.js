/**
 * Reads the text of a project file from GitHub (raw.githubusercontent.com, open to any site), only
 * when it is opened. Texts already read are kept for the visit. Returns null when GitHub cannot be
 * reached: the caller then offers a link to the file.
 */
const readTexts = new Map();

export function readFileText(rawAddress) {
  if (!readTexts.has(rawAddress)) {
    const reading = fetch(rawAddress)
      .then((response) => (response.ok ? response.text() : null))
      .catch(() => null);
    readTexts.set(rawAddress, reading);
    // A failed reading is not kept: the next opening tries again.
    reading.then((text) => text === null && readTexts.delete(rawAddress));
  }
  return readTexts.get(rawAddress);
}
