<script>
    export let data = {}
    export let periods = []

    function makeTable(data) {
        let sectionSchedule = []
        for (let [batch, schBat] of Object.entries(data)) {
            for (let [section, schSec] of Object.entries(schBat)) {
                let entries = Object.entries(schSec)
                let rows = []
                for (let i = 0; i < 10; i++) rows.push(Array(entries.length))
                for (let [col, [day, schDay]] of entries.entries()) {
                    let row = 0
                    let offset = 0
                    for (let [half, schHalf] of Object.entries(schDay)) {
                        if (half[2] === '_') continue
                        for (let session of schHalf) {
                            let content = `${session.subject.code}\n${session.subject.title}\nRoom ${session.room}`
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
                sectionSchedule.push({batch, section, schedule: rows})
            }
        }
        return sectionSchedule
    }

</script>

{#each makeTable(data) as schSec}
    <div>
        <h3>Year {schSec.batch} Section {schSec.section}</h3>
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
            {#each [...schSec.schedule.entries()] as [i, row]}
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
    :global(table) {
        border-collapse: collapse
    }
    :global(td) {
        white-space: pre-line;
        text-align: center
    }
</style>
