<script>
    export let data = {}
    export let visible = 1
</script>

<script context="module">
    let days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    let periods = ['08:00-08:40 am', '08:50-09:30 am', '09:40-10:20 am', '10:30-11:10 am', '11:20-12:00 am', '12:00am-01:30pm', '01:30-02:10 pm', '02:20-03:00 pm', '03:10-03:50 pm', '04:00-01:40 pm', '04:50-05:30 pm']

    let label = {
        section: session => `${session.subject.code}\n${session.subject.title}\nRoom ${session.room}`,
        subject: session => `${(isNaN(session.section) ? '' : 'Section ') + session.section}\n\nRoom ${session.room}`,
        room: session => `Year ${session.batch}\n${isNaN(session.section) ? session.section : 'Section ' + session.section}\n${session.subject.code}\n${session.subject.title}`
    }

    function table(data, label) {
        let entries = Object.entries(data)
        let rows = []
        for (let i = 0; i < 11; i++) rows.push(Array(entries.length))
        for (let [col, [day, schDay]] of entries.entries()) {
            let row = 0, offset = 0
            for (let [half, schHalf] of Object.entries(schDay)) {
                for (let session of schHalf) {
                    if (session === null) {
                        rows[row + offset][col] = {session: '', span: 1}
                        offset += 1
                    } else if (session !== 1) {
                        let content = label(session)
                        rows[row + offset][col] = {session: content, span: session.ects, color: session.color}
                        offset += session.ects
                    }
                }
                rows[5][0] = {session: 'Lunch Break', span: 1, width: entries.length}
                row = 6, offset = 0
            }
        }
        return rows
    }

    export function toTables(data) {
        let sched = {...data}
        if (data.success) {
            // section
            sched.bySection = []
            for (let [batch, schBat] of Object.entries(data.bySection)) {
                for (let [section, schSec] of Object.entries(schBat)) {
                    sched.bySection.push({title: 'Year ' + batch + ' Section ' + section, schedule: table(schSec, label.section)})
                }
            }
            // subject
            sched.bySubject = []
            for (let [batch, schBat] of Object.entries(data.bySubject)) {
                for (let [subject, schSub] of Object.entries(schBat)) {
                    sched.bySubject.push({title: subject, schedule: table(schSub, label.subject)})
                }
            }
            // room
            sched.byRoom = []
            for (let [room, schRm] of Object.entries(data.byRoom)) {
                sched.byRoom.push({title: room, schedule: table(schRm, label.room)})
            }
        }
        return sched
    }

</script>

<div style="display:{visible ? 'block' : 'none'}">
    {#each data as data}
        <div>
            <h3>{data.title}</h3>
            <table border="1">
                <tr>
                    <th>Time</th>
                    {#each days.slice(0, data.schedule[0].length) as day}
                        <th>{day}</th>
                    {/each}
                </tr>
                {#each [...data.schedule.entries()] as [i, row]}
                    <tr>
                    <th class="time">{periods[i]}</th>
                    {#each row as col}
                        {#if col}
                            <td rowspan={col.span} colspan={col.width} style="{'background:#' + col.color}">{col.session}</td>
                        {/if}
                    {/each}
                    </tr>
                {/each}
            </table>
        </div>
    {/each}
</div>

<style>
    .time {
        text-align: start
    }
    table {
        border-collapse: collapse
    }
    td, th {
        font-size: 8pt;
        width: 3cm;
        height: 1cm
    }
    td {
        white-space: pre-line;
        text-align: center
    }
</style>
