<script context="module">
    let rawData = {
        streams: ['thermal', 'industrial', 'motor', 'manufacturing', 'design', 'railway'],
        rooms: [
            ['general', '311 313 310 319 338 339 nb011 nb012 nb013'],
            ['drawing', '320 321'],
            ['workshop', 'Workshop'],
            ['computer', 'Lab'],
        ],
        days: '5',
        semester: '1',
        students: [[20, 10], [12, 23, 78], [12], [23, 23, 34], [78, 34, 45, 23, 45]],
        ects: ['5', '5']
    }

    export function getInput() {
        let bySec = nums => Object.fromEntries(nums.map((num, i) => [i + 1, isNaN(num) ? 0 : Number(num)]))
        let byStream = nums => Object.fromEntries(nums.map((num, i) => [rawData.streams[i], isNaN(num) ? 0 : Number(num)]))
        let weekDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
        let data = {
            rooms: Object.fromEntries(rawData.rooms.map(([label, rooms]) => [label, rooms.split(/(\s|,)+/).map(rm => rm.trim()).filter(rm => rm)])),
            semester: Number(rawData.semester),
            days: weekDays.slice(0, Number(rawData.days)),
            periods: rawData.ects.map(num => Number(num)),
            students: {
                1: bySec(rawData.students[0]),
                2: bySec(rawData.students[1]),
                3: bySec(rawData.students[2]),
                4: rawData.semester == '1' ? bySec(rawData.students[3]) : byStream(rawData.students[3]),
                5: byStream(rawData.students[4])
            },
        }
        return data
    }
</script>

<script>
    let data = rawData

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

    function addRoomLabel(eve) {
        data.rooms.push({label: '', rooms: ''})
        data.rooms = data.rooms
        eve.preventDefault()
    }

    function remRoomLabel(index) {
        return function(eve) {
            data.rooms.splice(index, 1)
            data.rooms = data.rooms
            eve.preventDefault()
        }
    }

</script>

<form>
    <fieldset>
        <legend>General</legend>
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
    </fieldset>
    <fieldset>
        <legend>Rooms (space separated)</legend>
        <table>
            {#each [...data.rooms.entries()] as [i, roomGroup]}
                <tr>
                    {#if roomGroup.label == 'general'}
                        <td>{roomGroup[0]}</td>
                    {:else}
                        <td class="input" contenteditable bind:innerHTML={roomGroup[0]}>{roomGroup[0]}</td>
                    {/if}
                    <td></td>
                    <td class="input" contenteditable bind:innerHTML={roomGroup[1]}>{roomGroup[1]}</td>
                    {#if roomGroup[0] !== 'general'}
                        <td><button on:click={remRoomLabel(i)}>x</button></td>
                    {/if}
                </tr>
            {/each}
            <tr>
                <td><button on:click={addRoomLabel}>+</button></td>
            </tr>
        </table>
    </fieldset>
    <fieldset>
        <legend>Students</legend>
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
    </fieldset>
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

    @media(print) {
        form {
            display: none
        }
    }
</style>
