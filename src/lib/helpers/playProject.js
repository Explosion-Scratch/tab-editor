import * as Tone from "tone";
import isValidNote from "./isValidNote";

export default async function play(notes, tuning, bpm) {
  const strings = tuning.tuning.split("").map((i, idx) => Tone.Frequency(`${i}${tuning.octaves[idx]}`).valueOf());
  console.log({strings})
  console.log(notes);

  const getFret = (fret, stringNum) => Tone.Frequency(strings[stringNum]).transpose(fret);
  const noteAt = (x, y) => notes[x][y];
  const now = Tone.now();
  const secondsPerBeat = 60 / bpm / 4;
  const getNoteLength = (x, y) => {
    let len = 1;
    const MAX_LEN = 36;
    while (!isValidNote(noteAt(x++, y)) && len < MAX_LEN){
        len++;
    }
    return len * secondsPerBeat;
  }

  // Synth
  await Tone.start();
  const synth = new Tone.PolySynth(Tone.Synth).toDestination();
    console.log({secondsPerBeat});
  for (let noteColIdx = 0; noteColIdx < notes.length; noteColIdx++) {
    let time = now + noteColIdx * secondsPerBeat;
    const allNotesNow = notes[noteColIdx];
    for (let strIdx = 0; strIdx < allNotesNow.length; strIdx++) {
      let currentNote = allNotesNow[strIdx]?.value;
      if (!isValidNote(allNotesNow[strIdx])) {
        continue;
      }
      let frequency = getFret(parseInt(currentNote), strIdx);
      synth.triggerAttackRelease(frequency, getNoteLength(noteColIdx, strIdx), time);
    }
  }

//   synth.triggerAttack("D4", now);
//   synth.triggerAttack("F4", now + 0.5);
//   synth.triggerAttack("A4", now + 1);
//   synth.triggerAttack("C5", now + 1.5);
//   synth.triggerAttack("E5", now + 2);
//   synth.triggerRelease(["D4", "F4", "A4", "C5", "E5"], now + 4);
  return;
}

function incr(note, countHalfSteps) {
  let isDown = countHalfSteps < 0;
  let out = note;
  for (let i = 0; i < Math.abs(countHalfSteps); i++) {
    out = halfStep(out, !isDown);
  }
  return out;
}
function halfStep(note, up = true) {
  let factor = Math.pow(2, 1 / 12);
  return up ? note * factor : note / factor;
}
