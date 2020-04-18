<script>
    export let data = {}
    export let periods = []
    export let table
    let days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

    function makeTable(data) {
        let schedule = []
        let label = session => `Year ${session.batch}\n${isNaN(session.section) ? session.section : 'Section ' + session.section}\n${session.subject.code}\n${session.subject.title}`
        for (let [room, schRm] of Object.entries(data)) {
            schedule.push({room, schedule: table(schRm, label)})
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
                {#each days.slice(0, schRm.schedule[0].length) as day}
                    <th>{day}</th>
                {/each}
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
