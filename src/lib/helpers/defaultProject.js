import { REGEX } from "./utils";
import LZString from "lz-string";
export const lookup = {
  tunings: {
    // Lookup either by id or by name
    standard: {
      id: "standard",
      name: "Standard",
      tuning: "EBGDAE",
      octaves: [2, 2, 3, 3, 3, 4].reverse(),
    },
  },
  timeSignatures: {
    common_time: {
      aliases: ["common"],
      id: "common_time",
      timeSignature: "4/4",
    },
    cut_time: {
      aliases: ["cut"],
      id: "cut_time",
      timeSignature: "2/4",
    },
  },
};

export function parseProject(project) {
  if (typeof project.timeSignature === "string") {
    project.timeSignature = Object.entries(lookup.timeSignatures).find(
      (i) =>
        i[0] === project.timeSignature ||
        i[1].aliases?.includes(project.timeSignature) ||
        i[1].id === project.timeSignature
    )?.[1] || {
      timeSignature: project.timeSignature,
      name: project.timeSignature,
    };
  }
  if (typeof project.tuning === "string") {
    project.tuning = Object.entries(lookup.tunings).find(
      (i) =>
        i[0] === project.tuning ||
        i[1].aliases?.includes(project.tuning) ||
        i[1].id === project.tuning
    )?.[1] || {
      tuning: project.tuning,
      name: project.tuning,
    };
  }

  if (!project.timeSignature?.timeSignature) {
    console.log(project);
    throw new Error("Time signature invalid");
  }
  if (!REGEX.timeSignature.test(project.timeSignature.timeSignature)) {
    console.log(project);
    throw new Error("Time signature invalid");
  }
  project.timeSignature.parsed = Object.fromEntries(
    Object.entries(
      project.timeSignature.timeSignature.match(REGEX.timeSignature).groups
    ).map((i) => [i[0], parseInt(i[1], 10)])
  );
  const defaults = {
    stringCount: 6,
  };
  if (!project.bpm) {
    project.bpm = 90;
  }
  project = { ...defaults, ...project };
  project.beatsPerMeasure = project.timeSignature.parsed.beats;
  project.noteGetsBeat = project.timeSignature.parsed.note;
  // TODO: Check this
  project.displayNotes = project.beatsPerMeasure * 4;
  if (!project.notes?.length){
    project.notes = getEmptyMeasures(2, project.displayNotes);
  }
  return project;
}

const KEYS_TO_SERIALIZE = ["notes", "tuning", "bpm", "timeSignature"];
const NOTE_KEYS = ["value", "noteLength"];
const DIVIDERS = {
  note: {
    line: "$",
    note: ",",
    key: ".",
  },
  key: "|",
};
const jsonSerializer = {
  encode: (a) => btoa(JSON.stringify(a)),
  decode: (a) => JSON.parse(atob(a)),
};
const serializers = {
  default: {
    encode: (a) => a.toString(),
    decode: (a) => a,
  },
  bpm: {
    encode: (a) => a.toString(),
    decode: (a) => parseInt(a),
  },
  timeSignature: jsonSerializer,
  tuning: jsonSerializer,
  notes: {
    encode: (a) =>
      a
        .map((b) =>
          b
            .map((note) =>
              NOTE_KEYS.map((i) => note[i] || "").join(DIVIDERS.note.key)
            )
            .join(DIVIDERS.note.note)
        )
        .join(DIVIDERS.note.line),
    decode: (a) =>
      a
        .split(DIVIDERS.note.line)
        .map((line) =>
          line
            .split(DIVIDERS.note.note)
            .map((note) =>
              Object.fromEntries(
                note
                  .split(DIVIDERS.note.key)
                  .map((i, idx) => [NOTE_KEYS[idx], i])
                  .map(([k, v]) => ([k, k === 'noteLength' ? parseInt(v) : v]))
              )
            )
        ),
  },
};

const VERSION = "v1-07-24";
const COMPRESSION_METHOD = "EncodedURIComponent";
export const serializeProject = (project) => {
  return LZString["compressTo" + COMPRESSION_METHOD](
    VERSION +
      DIVIDERS.key +
      KEYS_TO_SERIALIZE.map((i) => [i, project[i]])
        .map(([k, v]) => (serializers[k] || serializers.default).encode(v))
        .join(DIVIDERS.key)
  );
};
export const deserializeProject = (project) => {
  Object.assign(window, {LZString})
  let [version, ...split] = LZString["decompressFrom" + COMPRESSION_METHOD](
    project
  ).split(DIVIDERS.key);
  if (version !== VERSION) {
    throw new Error("Unsupported version");
  }
  return parseProject(
    Object.fromEntries(
      split
        .map((i, idx) => [KEYS_TO_SERIALIZE[idx], i])
        .map(([k, encoded]) => [
          k,
          (serializers[k] || serializers.default).decode(encoded),
        ])
    )
  );
};

export const getEmptyMeasures = (count, displayNotes) => new Array(displayNotes * count)
  .fill(new Array(stringCount).fill(""))
  .map((i) => i.map((j) => ({ value: "" })))

const stringCount = 6;
export default {
  // Can specify either one of "standard" or a string like "dadgad" or an array of string names
  // Or object with {name: "Drop D", tuning: ["d", "a", "d", "g", "b", "e"]}
  tuning: "standard",
  // Time signature
  // One of: common_time cut_time or a [num]/[num] pair
  timeSignature: "3/4",
  stringCount,
  bpm: 90,
  //   Value of each note can be a fret number or for hammerons and pulloffs could be "h-[fret]" or "po-fret" to pulloff or hammeron from previous note
  notes: [],
};
