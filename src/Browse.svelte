<script>
    import Table from './Table.svelte'

    let schedules = []
    let shown = null
    let tab = 'section'

    function refresh() {
        fetch('http://localhost/get', {method: 'post'}).then(res => {
            res.json().then(data => {
                for (let [i, schedule] of schedules.entries()) {
                    let key = schedule.year + '-' + schedule.semester
                    if (data.hasOwnProperty(key)) {
                        if (data[key].created !== schedule.created) {
                            schedules[i] = data[key]
                        }
                    } else {
                        schedules.splice(i, 1)
                    }
                    delete data[key]
                }
                for (let [key, schedule] of Object.entries(data)) {
                    let [year, semester] = key.split('-')
                    schedules.push({year: Number(year), semester: Number(semester), ...schedule})
                }
                schedules = schedules.sort((a, b) => a.year < b.year ? -1 : 1)
            })
        })
    }

    function delSch() {
        if (shown === null) return
        fetch('http://localhost', {method: 'delete', headers: {year: shown.year, semester: shown.semester}}).then(res => {
            if (res.status == 200) {
                refresh()
                shown = null
            } else {
                alert(res.statusText)
            }
        })
    }

</script>

{#if shown === null}
    {refresh() || ''}
    {#each [...schedules.entries()] as [i, schedule]}
        <div on:click={() => shown = {i, ...schedules[i]}} class="item">
            {schedule.year} Semester {schedule.semester}
        </div>
    {/each}
{:else}
<div class="shown" style="display:{shown === null ? 'none' : 'block'}">
    <button on:click={() => shown = null}>Back</button>
    <button on:click={delSch}>Delete</button>
    <div>
        {shown.year} Semester {shown.semester}
        <div class="noprint message">{shown.message}</div>
        <div class="noprint tabs">
            <button class="tab{tab == 'section' ? '' : 'NC'}" on:click={() => tab = 'section'}>Sections</button>
            <button class="tab{tab == 'room' ? '' : 'NC'}" on:click={() => tab = 'room'}>Rooms</button>
            <button class="tab{tab == 'subject' ? '' : 'NC'}" on:click={() => tab = 'subject'}>Subject/Teacher</button>
        </div>
        <Table data={shown.bySection} kind="section" visible={tab == 'section'}/>
        <Table data={shown.byRoom} kind="room" visible={tab == 'room'}/>
        <Table data={shown.bySubject} kind="subject" visible={tab == 'subject'}/>
    </div>
</div>
{/if}

<style>
    .item {
        border: solid grey;
        padding: 1em;
        margin-top: 1em
    }

    .item:hover {
        cursor: pointer
    }

    .shown {
        margin-top: 1em
    }
</style>
