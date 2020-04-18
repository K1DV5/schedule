<script>
    import Input from './Input.svelte'
    import Sections from './Sections.svelte'
    import Rooms from './Rooms.svelte'
    import Subjects from './Subjects.svelte'
    /* import makeSchedule from './algo' */

    let periods = ['08:00-08:40 am', '08:50-09:30 am', '09:40-10:20 am', '10:30-11:10 am', '11:20-12:00 am', '01:30-02:10 pm', '02:20-03:00 pm', '03:10-03:50 pm', '04:00-01:40 pm', '04:50-05:30 pm']

    let schedule = {}
    let shown = 'section'
    /* let buttonText = 'Rooms' */

    function changeShown(to) {
        return function() {
            shown = to
        }
    }

    let rawData = {
        streams: ['thermal', 'industrial', 'motor', 'manufacturing', 'design', 'railway'],
        rooms: '311 313 310 319 320 321 338 339',
        days: '5',
        semester: '1',
        students: [[20, 10], [12, 23, 78], [12], [23, 23, 34], [78, 34, 45, 23, 45]],
        ects: ['5', '5']
    }

    let schWorker = new Worker('algo.js')
    schWorker.addEventListener('message', event => {schedule = event.data; console.log(event.data.treq)})

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
        schedule = {progress: true}
        schWorker.postMessage(data)
    }

    function makeTable(data, label) {
        let entries = Object.entries(data)
        let rows = []
        for (let i = 0; i < 10; i++) rows.push(Array(entries.length))
        for (let [col, [day, schDay]] of entries.entries()) {
            let row = 0, offset = 0
            for (let [half, schHalf] of Object.entries(schDay)) {
                if (half[2] === '_') continue
                for (let session of schHalf) {
                    let content = label(session)
                    rows[row + offset][col] = {session: content, span: session.ects, color: session.color}
                    offset += session.ects
                }
                for (let i = 0; i < 5 - offset; i++) rows[row + offset + i][col] = {session: '', span: 1}  // horizontal filler
                row = 5, offset = 0
            }
        }
        return rows
    }

</script>

<main>
    <Input data={rawData} />
    <button on:click={generate}>Generate</button>
    {#if schedule.success}
        <div>Found on trial {schedule.trial + 1}. Required: {schedule.required}, Available: {schedule.available}</div>
        <div>
            <button class="tab{shown == 'section' ? '' : 'NC'}" on:click={changeShown('section')}>Sections</button>
            <button class="tab{shown == 'room' ? '' : 'NC'}" on:click={changeShown('room')}>Rooms</button>
            <button class="tab{shown == 'subject' ? '' : 'NC'}" on:click={changeShown('subject')}>Subject/Teacher</button>
        </div>
        {#if shown == 'section'}
            <Sections data={schedule.schedule.bySection} periods={periods} table={makeTable}/>
        {:else if shown == 'room'}
            <Rooms data={schedule.schedule.byRoom} periods={periods} table={makeTable}/>
        {:else if shown == 'subject'}
            <Subjects data={schedule.schedule.bySubject} periods={periods} table={makeTable}/>
        {/if}
    {:else if schedule.required < schedule.available}
        <div>Please try again, {schedule.required} &lt; {schedule.available}</div>
    {:else if schedule.progress}
        <div>Loading...</div>
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
