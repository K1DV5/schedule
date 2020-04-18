<script>
    export let data = {}
    export let periods = []
    export let table
    let days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

    function makeTable(data) {
        // label callback
        let label = session => `${(isNaN(session.section) ? '' : 'Section ') + session.section}\n\nRoom ${session.room}`
        let subjectSchedule = []
        for (let [batch, schBat] of Object.entries(data)) {
            for (let [subject, schSub] of Object.entries(schBat)) {
                subjectSchedule.push({subject, schedule: table(schSub, label)})
            }
        }
        return subjectSchedule
    }

</script>

{#each makeTable(data) as schSub}
    <div>
        <h3>{schSub.subject}</h3>
        <table border="1">
            <tr>
                <th>Time</th>
                {#each days.slice(0, schSub.schedule[0].length) as day}
                    <th>{day}</th>
                {/each}
            </tr>
            {#each [...schSub.schedule.entries()] as [i, row]}
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
