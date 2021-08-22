<script context="module">
    import prepData, {init} from './data.js'

    let weekDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
    let now = new Date()
    let semester = now.getMonth() > 7 ? '1' : '2'
    let rawData = {
        streams: [{}, {}],
        rooms: {},  // {drawing: '322 344', ...}
        days: '5',
        semester,
        year: now.getFullYear() - (semester == '1' ? 0 : 1),
        students: [],  // [[12, 34], []...]
        ects: ['5', '5'],
        mergeBelow: 40,
        ectsDiv: {} // how to divide ectses
    }

    export function getInput() {
        let ectsDiv = {}
        for (let [ects, divs] of Object.entries(rawData.ectsDiv)) {
            ectsDiv[ects] = divs.replace(/[^ \d]/g, '').split(' ').filter(div => div).map(div => Number(div))
            if (!ectsDiv[ects].length) {
                return alert('You need to give the division for ECTS ' + ects + '.')
            }
        }
        let semester = Number(rawData.semester)
        let students = {}
        for (let [batch, streams] of Object.entries(rawData.streams[semester - 1])) {
            if (streams.length) {
                students[batch] = {}
                for (let [i, stream] of streams.entries())
                    students[batch][stream] = rawData.students[batch - 1][i] || 0
            } else {
                students[batch] = {}
                for (let [i, num] of rawData.students[batch - 1].entries())
                    students[batch][i + 1] = num
            }
        }
        return {
            rooms: Object.fromEntries(Object.entries(rawData.rooms).map(([label, rooms]) => [label, rooms.split(/(\s|,)+/).map(rm => rm.trim()).filter(rm => rm)])),
            semester,
            year: rawData.year,
            days: weekDays.slice(0, Number(rawData.days)),
            periods: rawData.ects.map(num => Number(num)),
            students,
            mergeBelow: rawData.mergeBelow,
            ectsDiv
        }
    }
</script>

<script>
    let data = rawData
    let labels = [[], []], ectses = [[], []]
    fetch('/init', {method: 'POST'}).then(res => res.json().then(json => {
        labels = json.labels
        ectses = json.ectses
        data.streams = json.streams
        // prepare students input places
        let maxBatch = Math.max(...[0, 1].map(i => Object.keys(json.streams[i])).flat().map(Number))
        for (let iBatch = 0; iBatch < maxBatch; iBatch++)
            data.students[iBatch] = ['']
        // cached from last operation
        let cache = json.input_cache
        if (!cache) return
        for (let [label, rooms] of Object.entries(cache.rooms))
            data.rooms[label] = rooms.join(' ')
        for (let [batch, students] of Object.entries(cache.students))
            data.students[batch - 1] = Object.values(students)
        data.mergeBelow = cache.mergeBelow
        for (let [ects, div] of Object.entries(cache.ectsDiv))
            data.ectsDiv[ects] = div.join(' ')
        data.days = cache.days.length
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
