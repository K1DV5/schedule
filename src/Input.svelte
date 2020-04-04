<script>
    export let data

    function addSection(yr) {
        return function(eve) {
            data.students[yr-1].push('')
            data.students[yr-1] = data.students[yr-1]
            eve.preventDefault()
        }
    }

    function remSection(yr) {
        return function(eve) {
            if (data.students[yr - 1].length > 1) {
                data.students[yr - 1] = [...data.students[yr - 1].slice(0, -1)]
            }
            eve.preventDefault()
        }
    }
</script>

<form>
    <div>
        <label for="sem">Semester:</label>
        <select name="semester" id="sem" bind:value={data.semester}>
            <option>1</option>
            <option>2</option>
        </select>
    </div>
    <div>
        <label for="days">Days per week:</label>
        <select name="days" id="days" bind:value={data.days}>
            <option>5</option>
            <option>6</option>
            <option>7</option>
        </select>
    </div>
    <div>
        <label for="ects">ECTS per day</label>
        <table id="ects">
            <tr>
                <td>Morning:</td>
                <td class="input" contenteditable bind:innerHTML={data.ects[0]}></td>
                <td>Afternoon:</td>
                <td class="input" contenteditable bind:innerHTML={data.ects[1]}></td>
            </tr>
        </table>
    </div>
    <div>
        <label for="rooms">Rooms (space separated):</label>
        <td style="display:inline" class="input" contenteditable id="rooms" bind:innerHTML={data.rooms}></td>
    </div>
    <div>
        <label for="sec1">Sections</label>
        <table>
            <tr>
                <th>Y1</th>
                {#each [...data.students[0].entries()] as [i, num]}
                    <td>S{i + 1}:</td>
                    <td contenteditable class="input" bind:innerHTML={data.students[0][i]}>{num}</td>
                {/each}
                <td><button on:click={addSection(1)}>+</button></td>
                <td><button on:click={remSection(1)}>x</button></td>
            </tr>
            <tr>
                <th>Y2</th>
                {#each [...data.students[1].entries()] as [i, num]}
                    <td>S{i + 1}:</td>
                    <td contenteditable class="input" bind:innerHTML={data.students[1][i]}>{num}</td>
                {/each}
                <td><button on:click={addSection(2)}>+</button></td>
                <td><button on:click={remSection(2)}>x</button></td>
            </tr>
            <tr>
                <th>Y3</th>
                {#each [...data.students[2].entries()] as [i, num]}
                    <td>S{i + 1}:</td>
                    <td contenteditable class="input" bind:innerHTML={data.students[2][i]}>{num}</td>
                {/each}
                <td><button on:click={addSection(3)}>+</button></td>
                <td><button on:click={remSection(3)}>x</button></td>
            </tr>
            <tr>
                <th>Y4</th>
                {#if data.semester == '1'}
                    {#each [...data.students[3].entries()] as [i, num]}
                        <td>{(data.semester == '1' ? 'S' : '') + (i + 1)}:</td>
                        <td contenteditable class="input" bind:innerHTML={data.students[3][i]}>{num}</td>
                    {/each}
                    <td><button on:click={addSection(4)}>+</button></td>
                    <td><button on:click={remSection(4)}>x</button></td>
                {:else}
                    {#each [...data.streams.entries()] as [i, stream]}
                        <td>{stream}:</td>
                        <td contenteditable class="input" bind:innerHTML={data.students[3][i]}>{data.students[3][i] || ''}</td>
                    {/each}
                {/if}
            </tr>
            <tr>
                <th>Y5</th>
                {#each [...data.streams.entries()] as [i, stream]}
                    <td>{stream}:</td>
                    <td contenteditable class="input" bind:innerHTML={data.students[4][i]}>{data.students[4][i] || ''}</td>
                {/each}
            </tr>
        </table>
    </div>
</form>

<style>
    * {
        /* font-family: sans-serif; */
    }
    input.sec {
        width: 2em;
    }

    th {
        padding-right: 1em
    }

    td {
        text-align: right;
        min-width: 2em;
    }
    
    td.input {
        text-align: right;
        border-bottom: solid cyan 1px;
    }

    button {
        padding: 0.2em;
        padding-right: .5em;
        padding-left: .5em
    }

    input {
        border: none;
        border-bottom: solid cyan 1px;
        padding: .2em
    }
</style>
