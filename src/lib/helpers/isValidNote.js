export default function isValidNote(note) {
  return !isNaN(parseInt(note?.value));
}
