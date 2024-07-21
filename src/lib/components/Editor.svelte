<script>
  import { createEventDispatcher, onMount } from "svelte";
  import {
    deserializeProject,
    getEmptyMeasures,
    parseProject,
    serializeProject,
  } from "../helpers/defaultProject";
  import playProject from "../helpers/playProject";

  const dispatch = createEventDispatcher();
  export let project = {};
  let defaultNote = "-";
  let insertingNoteLength;
  // / 4: How many notes like insertingNoteLength go into 1 beat
  $: noteMoveMult =
    project.displayNotes /
    ((insertingNoteLength / 4) * project.beatsPerMeasure);
  let spacer = defaultNote;
  let ascii;
  // Container el
  let cont;
  // Editor el
  let editorEl;
  let cursor = {
    col: 0,
    row: 0,
    // horizontal / vertical
    moveMode: "horizontal",
  };
  let measuresPerLine = 2;

  $: Object.assign(window, {
    project,
    cursor,
    noteMoveMult,
    ascii,
    render,
    sumTextHorizontally,
    renderToString,
    serializeProject,
    deserializeProject,
  });
  $: {
    let s = serializeProject(project);
    localStorage.project = s;
    history.replaceState("", "", `?p=${encodeURIComponent(s)}`);
  }

  const updateCell = (fn) => {
    let out =
      typeof fn === "function" ? fn(project.notes[cursor.col][cursor.row]) : fn;
    out = typeof out === "string" ? { value: out } : out;
    out.noteLength = insertingNoteLength;
    project.notes[cursor.col][cursor.row] = out;
  };
  const getCell = () => project.notes[cursor.col][cursor.row];

  onMount(() => {
    console.log(project);
    project = parseProject(project);
    insertingNoteLength =
      project.noteGetsBeat * (project.displayNotes / project.beatsPerMeasure);
  });

  let keyTimeout;

  function renderToString() {
    const MAX_MEASURES_PER_LINE = 2;
    let r = render()?.map((measure) =>
      measure.map((row) => row.join("")).join("\n"),
    );
    if (!r) {
      return "";
    }
    const END = "|";
    const START = project.tuning.tuning
      .split("")
      .map((i) => i + END)
      .join("\n");
    return chunkArray(r, MAX_MEASURES_PER_LINE)
      .map((group) =>
        sumTextHorizontally(
          ...group.map((measure) => {
            return measure
              .split("\n")
              .map((i) => i + END)
              .join("\n");
          }),
        ),
      )
      .map((i) => sumTextHorizontally(START, i))
      .join("\n\n\n");
  }
  function chunkArray(arr, size) {
    return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
      arr.slice(i * size, (i + 1) * size),
    );
  }
  // Each item is a 2d array
  function sumTextHorizontally(...arr) {
    let out = [];
    arr = arr.map((i) => {
      return typeof i === "string" ? i.split("\n").map((i) => i.split("")) : i;
    });
    const maxLen = Math.max(...arr.map((i) => i.length));
    for (let i = 0; i < maxLen; i++) {
      let curr = [];
      for (let item of arr) {
        curr.push(item[i]);
      }
      out.push(curr);
    }
    let maxLengths = [];
    for (let i = 0; i < arr.length; i++) {
      let curr = [];
      for (let j of out) {
        curr.push(j[i]?.length);
      }
      maxLengths.push(Math.max(...curr));
    }
    return out
      .map((i) => {
        return i.map((j, idx) => j.join("").padEnd(maxLengths[idx])).join("");
      })
      .join("\n");
  }
  function render() {
    let out = [];
    let divider = "|";
    const COL_SEL = ".col:has(.text)";
    if (!cont.querySelector(COL_SEL)) {
      return;
    }
    let cols = [...cont.querySelectorAll(COL_SEL)];
    let len = cols[0].querySelectorAll(".text").length;
    debugger;
    for (let i = 0; i < len; i++) {
      let running = [];
      for (let c of cols) {
        running.push(
          c.querySelectorAll(`.text`)[i]?.innerText?.replace(/\n/g, ""),
        );
      }
      out.push(running);
    }
    let measureIndexes = [];
    out[0].forEach((i, idx) => i === divider && measureIndexes.push(idx));

    let measures = [];
    let prev = 0;
    // TODO: Refactor logic score starts with string names
    for (let idx of measureIndexes) {
      measures.push(out.map((i) => i.slice(prev + divider.length, idx)));
      prev = idx;
    }
    return measures.slice(1);
  }
  function handleKey(key, e) {
    let shouldMove = false;
    let backwards = false;
    const DEFAULT_TIMEOUT = 200;
    let timeout = DEFAULT_TIMEOUT;

    if (key === "Tab") {
      pauseEvent(e);
      cursor.moveMode =
        cursor.moveMode === "horizontal" ? "vertical" : "horizontal";
      return;
    }
    if (key.startsWith("Arrow")) {
      pauseEvent(e);
      timeout = 0;
    }
    const clickButton = (text) =>
      [...editorEl.querySelectorAll("button")]
        .find((i) => i.innerText?.toLowerCase() === text?.toLowerCase())
        ?.click();
    console.log({ key });
    if (key === "p") {
      clickButton("Play");
    }
    if (key === "u") {
      clickButton("Copy URL");
    }
    if (key === "c") {
      clickButton("Copy as ASCII");
    }
    if (key === "r") {
      clickButton("Reset");
    }
    if (key === "ArrowRight") {
      moveCursor(1, 0);
    } else if (key === "ArrowLeft") {
      moveCursor(-1, 0);
    } else if (key === "ArrowUp") {
      moveCursor(0, 1);
    } else if (key === "ArrowDown") {
      moveCursor(0, -1);
    }
    let toMove = null;
    if (key === "Backspace") {
      timeout = 0;
      // Don't move twice
      if (keyTimeout) {
        clearTimeout(keyTimeout);
      }
      pauseEvent(e);
      if (getCell()?.value?.length > 1) {
        shouldMove = false;
      } else {
        shouldMove = true;
      }
      updateCell((c) =>
        c?.value
          ? { ...c, value: c.value.toString().slice(0, c.value?.length - 1) }
          : c,
      );
      // if (cursor.moveMode === "horizontal") {
      backwards = true;
      // }
    }
    if (e.code === "ShiftRight") {
      insertingNoteLength /= 2;
    }
    if (e.code === "ShiftLeft") {
      insertingNoteLength *= 2;
    }
    if (e.code.startsWith("Shift")) {
      pauseEvent(e);
      return;
    }
    if (key === " ") {
      if (e.shiftKey) {
        backwards = true;
      }
      pauseEvent(e);
      shouldMove = true;
      timeout = 0;
    }
    if (!isNaN(parseInt(key))) {
      let v = (getCell()?.value || "") + key.toString();
      const MAX = 29;
      if (parseInt(v) > MAX) {
        // Basically auto advance because nobody types fret 39 or whatever
        timeout = 20;
      } else {
        timeout = DEFAULT_TIMEOUT;
      }
      console.log({ v, timeout, key });
      shouldMove = true;
      // TODO: Handle leading key strokes e.g. typing 13
      if (keyTimeout) {
        clearTimeout(keyTimeout);
      }
      updateCell((curr) =>
        parseInt(v) < MAX && keyTimeout
          ? { value: curr.value.toString() + key }
          : { value: key },
      );
    }
    // debugger;
    if (shouldMove) {
      let getMovefn = ({ toMove: mv, backwards }) => {
        if (!mv && backwards) {
          mv = cursor.moveMode === "horizontal" ? [-1, 0] : [0, 1];
        }
        return () =>
          moveCursor(
            ...(mv || (cursor.moveMode === "horizontal" ? [1, 0] : [0, -1])),
          );
      };
      let movefn = getMovefn({ toMove, backwards });
      let val = getCell();
      let row = cursor.row;
      keyTimeout = setTimeout(() => {
        movefn();
        let a = [
          new Array(project.notes[0].length).fill({ value: "" }).map((i) => i),
        ];
        a[0][row] = val;
        playProject(a, project.tuning, project.bpm);
      }, timeout);
    }
    project.notes = structuredClone(project.notes);
  }
  function moveCursor(x, y) {
    x *= noteMoveMult;
    cursor.col += x;
    cursor.row += y * -1;
    const dimensions = {
      x: project.notes.length - 1,
      y: project.notes[0].length - 1,
    };
    if (cursor.col < 0) {
      cursor.col = dimensions.x;
    }
    if (cursor.row < 0) {
      cursor.row = dimensions.y;
    }
    if (cursor.col > dimensions.x) {
      cursor.col = 0;
    }
    if (cursor.row > dimensions.y) {
      cursor.row = 0;
    }
    cursor.col = roundNearest(cursor.col, noteMoveMult);
    console.log({ cursor });
  }
  function roundNearest(num, mod) {
    return Math.floor(num / mod) * mod;
  }
  function pauseEvent(e) {
    e.stopPropagation();
    e.preventDefault();
    e.cancelBubble = true;
    e.returnValue = false;
    return false;
  }
  function getRow(row, off) {
    return row;
  }
  function getCol(col, off) {
    return col + off * project.displayNotes * measuresPerLine;
  }
  function toast(text, timeout = 3000) {
    let t = document.createElement("div");
    console.log(
      window.toast_time,
      Date.now(),
      Date.now() < window.toast_time,
      document.querySelector("#copy_toast"),
    );
    if (
      Date.now() < window.toast_time &&
      document.querySelector("#copy_toast")
    ) {
      t = document.querySelector("#copy_toast");
      t.innerText = text;
      clearTimeout(window.toast_1_int);
      clearTimeout(window.toast_2_int);
      t.style.bottom = "3px";
      window.toast_time = Date.now() + (timeout - 600);
      window.toast_1_int = setTimeout(
        () => (t.style.bottom = "-200px"),
        timeout - 500,
      );
      window.toast_2_int = setTimeout(() => t.remove(), timeout);
      return;
    } else {
      document.querySelector("#copy_toast")?.remove();
    }
    t.id = "copy_toast";
    t.setAttribute(
      "style",
      `
      position: fixed;
      bottom: -200px;
      z-index: 1000000000;
      transition: bottom .5s cubic-bezier(.44,.57,.44,1.25);
      border-radius: 1000px;
      background: #000a;
      border: 1px solid #0009;
      color: white;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 4px 15px;
      left: 50vw;
      transform: translate(-50%, -50%);
      font-family: monospace;
      width: fit-content;
      `,
    );
    document.body.insertAdjacentElement("afterend", t);
    t.innerText = text;
    setTimeout(() => {
      t.style.bottom = "3px";
    }, 10);
    window.toast_time = Date.now() + (timeout - 600);
    window.toast_1_int = setTimeout(
      () => (t.style.bottom = "-200px"),
      timeout - 500,
    );
    window.toast_2_int = setTimeout(() => t.remove(), timeout);
  }
</script>

<svelte:window
  on:keyup|capture|preventDefault|stopPropagation={(e) => handleKey(e.key, e)}
/>
<div class="editor" bind:this={editorEl}>
  <div class="top">
    Mode: {cursor.moveMode}, Time signature: {project.timeSignature
      ?.timeSignature}, Inserting a 1/{insertingNoteLength} note, BPM:
    <span
      class="bpm"
      on:click={() =>
        (project.bpm = parseInt(prompt("BPM?")) || project.bpm || 90)}
      >{project.bpm}</span
    >
    <div class="buttons">
      <button
        on:click={() => (playProject(project.notes, project.tuning, project.bpm, (col) => (cursor.col = col)),toast('Playing'))}
      >
        Play
      </button>
      <button on:click={() => (navigator.clipboard.writeText(location.href),toast('Copied URL'))}>
        Copy URL
      </button>
      <button on:click={() => (navigator.clipboard.writeText(renderToString()),toast('Copied ASCII'))}>
        Copy as ASCII
      </button>
      <button
        on:click={() =>
          confirm("Are you sure you want to delete all notes?") &&
          (project.notes = project.notes.map((i) =>
            i.map((j) => ({ ...j, value: "" })),
          ),toast('Cleared notes!'))}
      >
        Clear
      </button>
      <button
        on:click={() =>
          confirm("Are you sure?") &&
          (localStorage.clear(),
          history.replaceState("", "", "?"),
          toast('Reset!'),
          location.reload())}
      >
        Reset
      </button>
      <button
        on:click={() =>
          (project.notes = [
            ...project.notes,
            ...getEmptyMeasures(1, project.displayNotes),
          ],toast('Added measure'))}
      >
        Add Measure
      </button>
      <button on:click={() => dispatch("showHelp")}>Help</button>
    </div>
  </div>
  {#if project?.notes && project?.tuning?.tuning}
    <div class="notes" bind:this={cont}>
      {#each chunkArray(project.notes, project.displayNotes * measuresPerLine) as notes, off}
        <div class="line">
          <div class="col">
            {#each project.tuning.tuning.split("") as tuneLetter}
              <div class="tuning_letter">{tuneLetter}</div>
            {/each}
          </div>
          {#each notes as note_stack, col}
            {#if col % project.displayNotes === 0}
              <div class="col divider">
                {#each note_stack as row}
                  <div
                    class="text"
                    class:hl-primary={(cursor.moveMode === "horizontal" &&
                      cursor.row === getRow(row, off)) ||
                      (cursor.moveMode === "vertical" &&
                        cursor.col === getCol(col, off))}
                    class:hl-secondary={(cursor.moveMode === "vertical" &&
                      cursor.row === getRow(row, off)) ||
                      (cursor.moveMode === "horizontal" &&
                        cursor.col === getCol(col, off))}
                  >
                    |
                  </div>
                {/each}
              </div>
            {/if}
            <div class="col">
              {#each note_stack as note, row}
                <div
                  class="note text"
                  data-col={getCol(col, off)}
                  data-row={getRow(row, off)}
                  on:click={() =>
                    (cursor = {
                      ...cursor,
                      col: getCol(col, off),
                      row: getRow(row, off),
                    })}
                  class:hl-primary={(cursor.moveMode === "horizontal" &&
                    cursor.row === getRow(row, off)) ||
                    (cursor.moveMode === "vertical" &&
                      cursor.col == getCol(col, off))}
                  class:hl-secondary={(cursor.moveMode === "vertical" &&
                    cursor.row === getRow(row, off)) ||
                    (cursor.moveMode === "horizontal" &&
                      cursor.col == getCol(col, off))}
                >
                  {#if note.value?.length < 2}{spacer}{/if}
                  <span
                    class="note_inner"
                    class:cursor={cursor.col === getCol(col, off) &&
                      cursor.row === getRow(row, off)}
                  >
                    {note.value || defaultNote}
                  </span>
                  {spacer}
                </div>
              {/each}
            </div>
          {/each}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style lang="less">
  @hl-primary: fade(blue, 10%);
  @hl-secondary: fade(red, 10%);
  .buttons {
    margin-top: 0.5em;
  }
  .line {
    display: flex;
    margin: 30px 0;
  }
  .cursor {
    border: 1px solid black;
  }
  .note.hl-primary {
    background: @hl-primary;
  }
  .note.hl-secondary {
    background: @hl-secondary;
  }
  .note {
    display: flex;
  }
  .notes {
    display: flex;
    flex-direction: column;
  }
  .line {
    display: flex;
    margin: 30px 0;
  }
  .note {
    display: flex;
  }
</style>
