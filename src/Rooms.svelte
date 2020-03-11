<script>
    export let data = {}
    export let periods = []

    function makeTable(data) {
        let schedule = []
        for (let [room, schRm] of Object.entries(data)) {
            let entries = Object.entries(schRm)
            let rows = []
            for (let i = 0; i < 10; i++) rows.push(Array(entries.length))
            for (let [col, [day, schDay]] of entries.entries()) {
                let row = 0
                let offset = 0
                for (let [half, schHalf] of Object.entries(schDay)) {
                    if (half[2] === '_') continue
                    for (let session of schHalf) {
                        let content = `Year ${session.batch} Section ${session.section + 1}, ${session.subject.code}, ${session.subject.title}`
                        rows[row + offset][col] = {session: content, span: session.ects, color: session.color}
                        offset += session.ects
                    }
                    for (let i = 0; i < 5 - offset; i++) {
                        rows[row + offset + i][col] = {session: '', span: 1}  // horizontal filler
                    }
                    row += 5
                    offset = 0
                }
            }
            schedule.push({room, schedule: rows})
        }
        return schedule
    }

</script>

{#each makeTable(data) as schRm}
    <div>
        <h3>Room {schRm.room}</h3>
        <table border="1">
            <tr>
                <th>Time</th>
                <th>Monday</th>
                <th>Tuesday</th>
                <th>Wednesday</th>
                <th>Thursday</th>
                <th>Friday</th>
                <th>Saturday</th>
            </tr>
            {#each [...schRm.schedule.entries()] as [i, row]}
                <tr>
                <th class="time">{periods[i]}</th>
                {#each row as col}
                    {#if col}
                        <td rowspan="{col.span}" style="{'background:#' + col.color}">{col.session}</td>
                    {/if}
                {/each}
                </tr>
            {/each}
        </table>
    </div>
{/each}


<style>
    .time {
        text-align: start
    }
    td, th {
        font-size: 8pt;
        width: 3cm;
        height: 1cm
    }
</style>
