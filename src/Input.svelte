<script context="module">
    import prepData, {init} from './data.js'

    let streams = ['thermal', 'industrial', 'motor', 'manufacturing', 'design', 'railway']
    let now = new Date()
    let semester = now.getMonth() > 7 ? '1' : '2'
    let rawData = {
        streams: [{}, {5: ['design', 'thermal']}],
        rooms: {
            general: '311 313 310 319 338 339 nb011',
            drawing: '320 321',
            workshop: 'Workshop',
            computer: 'Lab 6'
        },
        days: '5',
        semester,
        year: now.getFullYear() - (semester == '1' ? 0 : 1),
        students: [[20, 10], [32, 23, 78], [12], [23, 23, 34], [78, 14, 15, 13, 15]],
        ects: ['5', '5'],
        mergeBelow: 40,
        ectsDiv: {2: '2', 3: '1 2', 5: '2 3', 6: '3 3', 7: '2 5'} // how to divide ectses
    }

    export function getInput() {
        let semester = Number(rawData.semester)
        let bySec = nums => Object.fromEntries(nums.map((num, i) => [i + 1, isNaN(num) ? 0 : Number(num)]))
        let byStream = nums => Object.fromEntries(nums.map((num, i) => [streams[i], isNaN(num) ? 0 : Number(num)]))
        let weekDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
        let ectsDiv = {}
        for (let [ects, divs] of Object.entries(rawData.ectsDiv))
            ectsDiv[ects] = divs.replace(/[^ \d]/g, '').split(' ').filter(div => div).map(div => Number(div))
        let data = {
            rooms: Object.fromEntries(Object.entries(rawData.rooms).map(([label, rooms]) => [label, rooms.split(/(\s|,)+/).map(rm => rm.trim()).filter(rm => rm)])),
            semester,
            year: rawData.year,
            days: weekDays.slice(0, Number(rawData.days)),
            periods: rawData.ects.map(num => Number(num)),
            students: {
                1: bySec(rawData.students[0]),
                2: bySec(rawData.students[1]),
                3: bySec(rawData.students[2]),
                4: rawData.semester == '1' ? bySec(rawData.students[3]) : byStream(rawData.students[3]),
                5: byStream(rawData.students[4])
            },
            mergeBelow: rawData.mergeBelow,
            ectsDiv
        }
        return {...data, year: data.year, semester: data.semester}
    }
</script>

<script>
    let data = rawData
    let labels = [[], []], ectses = [[], []]
    fetch('/init', {method: 'POST'}).then(res => res.json().then(json => {
        labels = json.labels
        ectses = json.ectses
        data.streams = json.streams
    }))

    function addSection(index) {
        return function(eve) {
            data.students[index].push('')
            data.students[index] = data.students[index]
            eve.preventDefault()
        }
    }

    function remSection(index) {
        return function(eve) {
            if (data.students[index].length > 1) {
                data.students[index] = [...data.students[index].slice(0, -1)]
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

<form class="noprint">
    <fieldset>
        <legend>General</legend>
        <div>
            <label for="year">Year:</label>
            <input type="number" min="1970" max="10000" id="year" bind:value={data.year}>
            <span class="end-year">/ {data.year + 1}</span>
        </div>
        <div>
            <label for="sem">Semester:</label>
            <select name="semester" id="sem" bind:value={data.semester}>
                <option>1</option>
                <option>2</option>
            </select>
        </div>
            <label for="days">Days per week:</label>
            <select name="days" id="days" bind:value={data.days}>
                <option>5</option>
                <option>6</option>
                <option>7</option>
            </select>
        <div>
            <label for="mergeBelow">Merge classes if sum &lt;</label>
            <input id="mergeBelow" type="number" min="1" max="99" bind:value={rawData.mergeBelow}>
        </div>
        <div class="ects">
            <span>ECTS divisions (space separated)</span>
            {#each ectses[data.semester - 1] as ects}
                <label>{ects}:</label>
                <input type="text" bind:value={data.ectsDiv[ects]}>
            {/each}
        </div>
    </fieldset>
    <fieldset>
        <legend>Rooms (space separated)</legend>
        <table>
            {#each labels[data.semester-1] as label}
                <tr>
                    <td>{label}</td>
                    <td></td>
                    <td><input type="text" bind:value={data.rooms[label]}></td>
                </tr>
            {/each}
        </table>
    </fieldset>
    <fieldset>
        <legend>Students</legend>
        <table>
            {#each Object.entries(data.streams[data.semester - 1]) as [batch, streams]}
                <tr>
                    <th>Y{batch}</th>
                    {#if streams.length}
                        {#each [...streams.entries()] as [i, stream]}
                            <td>{stream}:</td>
                            <td><input type="number" min="1" max="99" bind:value={data.students[batch - 1][i]}></td>
                        {/each}
                    {:else}
                        {#each [...data.students[batch - 1].entries()] as [i, _]}
                            <td>S{i + 1}:</td>
                            <td><input type="number" min="1" max="99" bind:value={data.students[batch - 1][i]}></td>
                        {/each}
                        <td><button on:click={addSection(batch - 1)}>+</button></td>
                        <td><button on:click={remSection(batch - 1)}>x</button></td>
                    {/if}
                </tr>
            {/each}
        </table>
    </fieldset>
</form>

<style>

    th {
        padding-right: 1em
    }

    td {
        text-align: right;
        min-width: 2em;
    }

    input[type=text] {
        width: 50vw;
    }
    
    input[type=number] {
        width: 3em
    }

    #year {
        width: 4em
    }

    .end-year {
        font-family: sans-serif;
        font-size: 90%
    }

    .ects > label {
        margin-left: 1.5em
    }
    
    .ects > input {
        width: 3em
    }

    button {
        padding: 0.2em;
        padding-right: .5em;
        padding-left: .5em
    }

    select {
        background: transparent;
        border: 2px solid #888;
    }

    :global(input) {
        border: none;
        border-bottom: solid cyan 1px;
        padding: .2em;
        background-color: lightgrey
    }

    @media(print) {
        form {
            display: none
        }
    }
</style>
