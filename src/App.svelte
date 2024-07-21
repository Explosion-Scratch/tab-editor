<script>
  import defaultProject, {
    deserializeProject,
  } from "./lib/helpers/defaultProject.js";
  import Editor from "./lib/components/Editor.svelte";
  import { onMount } from "svelte";
  let p;
  onMount(() => {
    try {
      let stored =
        new URLSearchParams(location.search).get("p") || localStorage.project;
      if (!stored) {
        throw new Error("Invalid");
      }
      p = deserializeProject(stored);
      if (!p) {
        throw new Error("Can't deserialize");
      }
    } catch (e) {
      console.log(e);
      p =
        deserializeProject(
          'G4RgtADA7GBMAsAfEsB0IBsAaV8eZz3WwmIBIRSDV9sb6zjasQQn6AOHDx6vunDl7YAnO2pEuuYc3aDyY-rMFUMZKHM1C5G6t24z6ehnMUDUUnlvpDd5leLUBWa7MyGsGTZY82TBF2opeXhfeSFA7EjPJjssOMjDY3lfIn0LML9M9KtkrJRNNIsDEHhXBkpynzi-FPYiIp8zcKzo2uKM9pTVQl7OAzQ8uoIAZmsfGh72xikJeQmCQft-bDYh1EYsKbzGIkX6vtDHNzp+GeUs46uzly5bmK4NR+Lbza6Nvx3ynEQAUwBPABSAAcAFoAYQAkhhIQA7AByEAAmgB1JwAayRAA1AejIQBLADu+IARgBbABiABdQQBlaGQgA2iNRGOxuIJxIAJgAJABqAFcAIZo2GQgBWAHt8QAlACqgJ5MoAohSKZzSbAWVjQYyAMb-aEogBeAEUAM4AWX+hONABkACKWq1E-5YrEQAC8iBEED+QIgIpAjLlsEZsPJFIgXJxjIl0utHAgGsjNPpMPFluA8Kh5rhACEABZ6hGMiHQgGA-GglFRg3Q63E8m+unQ+E8kAiIA',
        ) || defaultProject;
    }
  });
  let helpShowing = false;
  const help = [
    ["tab", "Switch between advancing horizontally and vertically"],
    ["space", "Advance forwards without editing notes in the current cell"],
    ["shift + space", "Advance backwards"],
    ["[number]", "Type a fret number"],
    ["Backspace", "Delete the current note"],
    ["p", "Play the project"],
    ["c", "Copy project as ascii"],
    ["u", "Copy URL to project"],
    ["r", "Reset project"]
  ];
</script>

<svelte:window
  on:keyup={(e) => e.key === "Escape" && helpShowing && (helpShowing = false)}
/>
<div class="container">
  <h2>Guitar Tab Editor</h2>
  {#if helpShowing}
    <div class="modal" on:click={() => (helpShowing = false)}>
      <div class="modal_inner" on:click|stopPropagation>
        <button class="close" on:click={() => (helpShowing = false)}>x</button>
        <h2>How to use</h2>
        <table>
          {#each help as [a, b]}
            <tr>
              <td><b>{a}</b></td>
              <td>{b}</td>
            </tr>
          {/each}
        </table>
      </div>
    </div>
  {/if}
  {#if p}<Editor on:showHelp={() => (helpShowing = true)} project={p}
    ></Editor>{/if}
</div>

<style lang="less">
  .container {
    font-family: "Courier New", Courier, monospace;
    width: 100vw;
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
  }

  .modal {
    position: fixed;
    inset: 0;
    z-index: 100;
    background: #0003;
    display: grid;
    place-items: center;
  }
  .modal_inner {
    padding: 10px 10px;
    padding-bottom: 20px;
    background: white;
    border-radius: 4px;
    position: relative;
  }
  .close {
    position: absolute;
    top: 5px;
    right: 5px;
    background: #0001;
    border: none;
    cursor: pointer;
  }
  table {
    border-spacing: 20px 0;
  }
  .modal h2 {
    text-align: center;
    font-weight: 100;
  }
</style>
