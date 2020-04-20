<script>
    import Input from './Input.svelte'
    import Table, {toTables} from './Table.svelte'

    let schWorker = new Worker('algo.js')
    schWorker.onmessage = event => {
        /* console.log(event.data) */
        schedule = toTables(event.data)
    }

    let schedule = {}
    let shown = 'section'

    function changeShown(to) {
        return function() {
            shown = to
        }
    }

    let rawData = {
        streams: ['thermal', 'industrial', 'motor', 'manufacturing', 'design', 'railway'],
        rooms: '311 313 310 319 320 321 338 339 1',
        days: '5',
        semester: '1',
        students: [[20, 10], [12, 23, 78], [12], [23, 23, 34], [78, 34, 45, 23, 45]],
        ects: ['5', '5']
    }

    async function generate() {
        let bySec = nums => Object.fromEntries(nums.map((num, i) => [i + 1, isNaN(num) ? 0 : Number(num)]))
        let byStream = nums => Object.fromEntries(nums.map((num, i) => [rawData.streams[i], isNaN(num) ? 0 : Number(num)]))
        let weekDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
        let data = {
            rooms: rawData.rooms.split(/(\s|,)+/).map(rm => rm.trim()).filter(rm => rm),
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
            subjects: await (await fetch('/subjects.txt')).text()
        }
        schWorker.postMessage(data)
    }

</script>

<main>
    <Input data={rawData} />
    <button on:click={generate}>Generate</button>
    {#if schedule.progress}
        <div>Required: {schedule.required} available: {schedule.available}</div>
        <div>Loading...</div>
    {:else if schedule.success}
        <div>Found on trial {schedule.trial + 1}. Required: {schedule.required}, Available: {schedule.available}</div>
        <div>
            <button class="tab{shown == 'section' ? '' : 'NC'}" on:click={changeShown('section')}>Sections</button>
            <button class="tab{shown == 'room' ? '' : 'NC'}" on:click={changeShown('room')}>Rooms</button>
            <button class="tab{shown == 'subject' ? '' : 'NC'}" on:click={changeShown('subject')}>Subject/Teacher</button>
        </div>
        <Table data={schedule.bySection} visible={shown == 'section'}/>
        <Table data={schedule.byRoom} visible={shown == 'room'}/>
        <Table data={schedule.bySubject} visible={shown == 'subject'}/>
    {:else if schedule.required < schedule.available}
        <div>Please try again, required: {schedule.required} &lt; {schedule.available} (available)</div>
    {:else if schedule.required != undefined}
        <div>Required is {schedule.required} &gt; {schedule.available} (available)</div>
    {/if}
</main>

<style>
    .tabNC {
        border: none;
        border-bottom: 2px solid #888;
    }

    .tab {
        border-bottom: none;
    }

    :global(button) {
        background: transparent;
        border: 2px solid #888;
        padding: .5em;
    }

    :global(select) {
        background: transparent;
        border: 2px solid #888;
    }
</style>
